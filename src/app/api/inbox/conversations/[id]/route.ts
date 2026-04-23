// src/app/api/inbox/conversations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { prisma }                    from "@/lib/prisma";
import { sendInboxMessageEmail }     from "@/lib/inboxMailer";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// ── GET /api/inbox/conversations/[id] ─────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id: convoId } = await params;
  const userId = session.user.id;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: convoId, userId } },
  });

  if (!participant || participant.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Mark as read
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: convoId, userId } },
    data:  { lastReadAt: new Date() },
  });

  const conversation = await prisma.conversation.findUnique({
    where: { id: convoId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id:         true,
              name:       true,
              image:      true,
              role:       true,
              position:   true,
              department: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: { id: true, name: true, image: true, role: true },
          },
          attachments: true,
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation });
}

// ── POST /api/inbox/conversations/[id] ────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id: convoId } = await params;
  const userId = session.user.id;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: convoId, userId } },
  });

  if (!participant || participant.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.body?.trim()) {
    return NextResponse.json({ error: "Message body required" }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: convoId,
        senderId:       userId,
        body:           body.body.trim(),
      },
      include: {
        sender:      { select: { id: true, name: true, image: true, role: true } },
        attachments: true,
      },
    }),
    prisma.conversation.update({
      where: { id: convoId },
      data:  { updatedAt: new Date() },
    }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: convoId, userId } },
      data:  { lastReadAt: new Date() },
    }),
  ]);

  // ── Send email notifications to all OTHER active participants ─────────────
  // Get conversation subject + all other participants' emails
  const conversation = await prisma.conversation.findUnique({
    where:   { id: convoId },
    select:  { subject: true },
  });

  const otherParticipants = await prisma.conversationParticipant.findMany({
    where: {
      conversationId: convoId,
      userId:         { not: userId }, // exclude sender
      deletedAt:      null,            // only active participants
    },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  const senderName = message.sender.name ?? "Someone";
  const subject    = conversation?.subject ?? "New Message";
  const msgBody    = body.body.trim();

  // Fire-and-forget email to all other participants
  Promise.all(
    otherParticipants.map((p) =>
      sendInboxMessageEmail({
        to:            p.user.email,
        recipientName: p.user.name ?? p.user.email,
        senderName,
        subject,
        messageBody:   msgBody,
      }).catch((err) => {
        console.error(`Failed to send reply email to ${p.user.email}:`, err);
      })
    )
  );

  return NextResponse.json({ message }, { status: 201 });
}

// ── DELETE /api/inbox/conversations/[id] ──────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const { id: convoId } = await params;
  const userId = session.user.id;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: convoId, userId } },
  });

  if (!participant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId: convoId, userId } },
    data:  { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}