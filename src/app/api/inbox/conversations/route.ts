// src/app/api/inbox/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import { Prisma }                    from "@/generated/prisma";
import { sendInboxMessageEmail }     from "@/lib/inboxMailer";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// ── GET /api/inbox/conversations ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = new URL(req.url);
  const mailbox  = searchParams.get("mailbox")  ?? "inbox";
  const courseId = searchParams.get("courseId") ?? undefined;

  const userId = session.user.id;

  const participantWhere: Prisma.ConversationParticipantWhereInput =
    mailbox === "archived"
      ? { userId, deletedAt: { not: null } }
      : { userId, deletedAt: null };

  if (mailbox === "sent") {
    (participantWhere as Prisma.ConversationParticipantWhereInput & { isAuthor?: boolean }).isAuthor = true;
  }

  const participantRows = await prisma.conversationParticipant.findMany({
    where: participantWhere,
    include: {
  conversation: {
    include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: { select: { id: true, name: true, image: true } },
            },
          },
          participants: {
            where:   { deletedAt: null },
            include: {
              user: {
                select: { id: true, name: true, image: true, role: true },
              },
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const rows = participantRows.filter((p) => 
  p.conversation !== null && 
  (!courseId || p.conversation.courseId === courseId)
);

  type ParticipantRow   = (typeof rows)[number];
  type ConvoParticipant = ParticipantRow["conversation"]["participants"][number];

  const conversations = rows.map((p: ParticipantRow) => {
    const convo   = p.conversation;
    const lastMsg = convo.messages[0] ?? null;

    const others = convo.participants
      .filter((cp: ConvoParticipant) => cp.userId !== userId)
      .map((cp: ConvoParticipant) => ({
        id:    cp.user.id,
        name:  cp.user.name,
        image: cp.user.image,
        role:  cp.user.role,
      }));

    const isUnread =
      lastMsg !== null &&
      lastMsg.sender.id !== userId &&
      (p.lastReadAt === null || lastMsg.createdAt >= p.lastReadAt);

    return {
      id:           convo.id,
      subject:      convo.subject,
      scope:        convo.scope,
      courseId:     convo.courseId,
      participants: others,
      preview:      lastMsg ? lastMsg.body.slice(0, 120) : "",
      date:         (lastMsg?.createdAt ?? convo.createdAt).toISOString(),
      unread:       isUnread,
    };
  });

  const result = mailbox === "unread"
    ? conversations.filter((c) => c.unread)
    : conversations;

  return NextResponse.json({ conversations: result });
}

// ── POST /api/inbox/conversations ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const senderId = session.user.id;

  let body: {
    subject?:      string;
    body?:         string;
    recipientIds?: string[];
    courseId?:     string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subject, body: msgBody, recipientIds, courseId } = body;

  if (
    !subject?.trim() ||
    !msgBody?.trim() ||
    !Array.isArray(recipientIds) ||
    recipientIds.length === 0
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const uniqueRecipients = [
    ...new Set(recipientIds.filter((id: string) => id !== senderId)),
  ];

  if (uniqueRecipients.length === 0) {
    return NextResponse.json(
      { error: "At least one other recipient is required" },
      { status: 400 }
    );
  }

  // Verify all recipients exist and get their email + name for notifications
  const existingUsers = await prisma.user.findMany({
    where:  { id: { in: uniqueRecipients } },
    select: { id: true, name: true, email: true },
  });

  if (existingUsers.length !== uniqueRecipients.length) {
    return NextResponse.json(
      { error: "One or more recipients not found" },
      { status: 404 }
    );
  }

  // Get sender name for the email
  const sender = await prisma.user.findUnique({
    where:  { id: senderId },
    select: { name: true },
  });

  const senderName = sender?.name ?? "Someone";

  // Create conversation + first message atomically
  const conversation = await prisma.conversation.create({
    data: {
      subject:  subject.trim(),
      courseId: courseId ?? null,
      scope:    courseId ? "COURSE" : "DIRECT",
      participants: {
        create: [
          { userId: senderId, isAuthor: true },
          ...uniqueRecipients.map((uid: string) => ({
            userId:   uid,
            isAuthor: false,
          })),
        ],
      },
      messages: {
        create: {
          senderId,
          body: msgBody.trim(),
        },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: {
            select: { id: true, name: true, image: true, role: true },
          },
          attachments: true,
        },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, image: true, role: true },
          },
        },
      },
    },
  });

  // Mark sender's own copy as read immediately
  const senderParticipant = conversation.participants.find(
    (p) => p.userId === senderId
  );
  if (senderParticipant) {
    await prisma.conversationParticipant.update({
      where: { id: senderParticipant.id },
      data:  { lastReadAt: new Date() },
    });
  }

  // ── Send email notifications to all recipients (fire-and-forget) ──────────
  const emailPromises = existingUsers.map((recipient) =>
    sendInboxMessageEmail({
      to:            recipient.email,
      recipientName: recipient.name ?? recipient.email,
      senderName,
      subject:       subject.trim(),
      messageBody:   msgBody.trim(),
    }).catch((err) => {
      // Log but don't fail the request if email fails
      console.error(`Failed to send email to ${recipient.email}:`, err);
    })
  );

  // Fire-and-forget — don't await so the API response is fast
  Promise.all(emailPromises);

  return NextResponse.json({ conversation }, { status: 201 });
}