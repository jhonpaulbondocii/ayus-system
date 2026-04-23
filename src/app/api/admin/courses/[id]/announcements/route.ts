// src/app/api/admin/courses/[id]/announcements/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendAnnouncementEmail } from "@/lib/announcements-mailer";
import { resolveAnnouncementRecipients } from "@/lib/resolve-recipients";

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ id: string }>;
};

type IncomingAttachment = {
  name: string;
  url: string;
  size: number;
  mimeType: string;
};

function parseDateTime(value: unknown) {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const announcements = await prisma.announcement.findMany({
      where: { courseId: id },
      include: {
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ── Enrich each announcement with the real author name from CourseEnrollment ──
    const enriched = await Promise.all(
      announcements.map(async (a) => {
        // If author looks like a real name (not "Admin"/"Head"/"Staff"), keep it
        // Otherwise try to find the real name via the user who created it
        // We store authorId on announcement if available, else fall back to author field
        let resolvedAuthor = a.author;

        // Try to look up by name match in enrollments to get the display name
        // (This handles legacy announcements saved with role names)
        const looksLikeRole = ["admin", "head", "staff", "teacher", "student"].includes(
          (a.author ?? "").toLowerCase().trim()
        );

        if (looksLikeRole) {
          // Try to find the enrollment that matches — look for Head role in this course
          const headEnrollment = await prisma.courseEnrollment.findFirst({
            where: {
              courseId: id,
              courseRole: { in: ["Head", "HEAD", "Admin", "ADMIN"] },
            },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          });
          if (headEnrollment?.user?.name) {
            resolvedAuthor = headEnrollment.user.name;
          }
        }

        return { ...a, author: resolvedAuthor };
      })
    );

    return NextResponse.json({ announcements: enriched });
  } catch (error) {
    console.error("ADMIN ANNOUNCEMENTS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcements." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // ── Get the logged-in user's actual name ──────────────────────────────────
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string })?.id ?? null;

    let authorName = "Unknown";
    if (sessionUserId) {
      const enrollment = await prisma.courseEnrollment.findFirst({
        where: { userId: sessionUserId, courseId: id },
        include: { user: { select: { name: true } } },
      });
      if (enrollment?.user?.name) {
        authorName = enrollment.user.name;
      } else {
        const user = await prisma.user.findUnique({
          where: { id: sessionUserId },
          select: { name: true },
        });
        if (user?.name) authorName = user.name;
      }
    }

    const body = await req.json();

    const title = String(body?.title ?? "").trim();
    const bodyText = String(body?.bodyText ?? "");
    const bodyHtml = String(body?.bodyHtml ?? "");
    const assignTo: string[] = Array.isArray(body?.assignTo)
      ? body.assignTo
          .map((item: unknown) => String(item).trim())
          .filter(Boolean)
      : ["Everyone"];

    const allowComment = Boolean(body?.allowComment);
    const allowLiking = Boolean(body?.allowLiking);
    const availableFrom = parseDateTime(body?.availableFrom);
    const availableUntil = parseDateTime(body?.availableUntil);

    const attachments: IncomingAttachment[] = Array.isArray(body?.attachments)
      ? body.attachments
          .map((file: unknown): IncomingAttachment => {
            const f = file as {
              name?: string; url?: string; size?: number; mimeType?: string;
            };
            return {
              name: String(f?.name ?? "").trim(),
              url: String(f?.url ?? "").trim(),
              size: Number(f?.size ?? 0),
              mimeType: String(f?.mimeType ?? ""),
            };
          })
          .filter((file: IncomingAttachment) => Boolean(file.name && file.url))
      : [];

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        courseId: id,
        title,
        bodyText,
        bodyHtml,
        author: authorName, // ✅ Always the real name
        assignTo: assignTo.length ? assignTo : ["Everyone"],
        allowComment,
        allowLiking,
        availableFrom,
        availableUntil,
        attachments: {
          create: attachments.map((file: IncomingAttachment) => ({
            name: file.name,
            url: file.url,
            size: file.size,
            mimeType: file.mimeType,
          })),
        },
      },
      include: {
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });

    // Fire-and-forget email notifications
    resolveAnnouncementRecipients(id, assignTo)
      .then((recipients) => {
        return Promise.allSettled(
          recipients.map((r) =>
            sendAnnouncementEmail({
              to: r.email,
              recipientName: r.name,
              announcementTitle: title,
              announcementBodyHtml: bodyHtml,
              postedBy: authorName,
              courseTitle: course.name ?? "Course",
            })
          )
        );
      })
      .catch((err) => console.error("Announcement email error:", err));

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error("ADMIN ANNOUNCEMENTS POST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create announcement." },
      { status: 500 }
    );
  }
}