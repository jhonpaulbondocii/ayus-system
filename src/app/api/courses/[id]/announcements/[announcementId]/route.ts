// src/app/api/courses/[id]/announcements/[announcementId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

type Props = {
  params: Promise<{ id: string; announcementId: string }>;
};

// ✅ GET — fetch single announcement
export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id: courseId, announcementId } = await params;

    const access = await requireCoursePermission(courseId, "view_announcements");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId, courseId },
      include: {
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!announcement) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("ANNOUNCEMENT GET ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch announcement." }, { status: 500 });
  }
}

// ✅ PATCH — update announcement (Head only)
export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const { id: courseId, announcementId } = await params;

    const access = await requireCoursePermission(courseId, "manage_announcements");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId, courseId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }

    const body = await req.json();

    const {
      title,
      bodyText,
      bodyHtml,
      content,
      assignTo,
      allowComments,
      allowComment,
      allowLiking,
      availableFrom,
      availableUntil,
      attachments,
    } = body;

    const finalBodyText =
      typeof bodyText === "string"
        ? bodyText
        : typeof content === "string"
        ? content
        : existing.bodyText;

    const finalBodyHtml =
      typeof bodyHtml === "string"
        ? bodyHtml
        : typeof content === "string"
        ? content
        : existing.bodyHtml;

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        title: title ? String(title).trim() : existing.title,
        bodyText: finalBodyText,
        bodyHtml: finalBodyHtml,
        assignTo: Array.isArray(assignTo) ? assignTo : existing.assignTo,
        allowComment:
          typeof allowComment === "boolean"
            ? allowComment
            : typeof allowComments === "boolean"
            ? allowComments
            : existing.allowComment,
        allowLiking:
          typeof allowLiking === "boolean" ? allowLiking : existing.allowLiking,
        availableFrom: availableFrom
          ? new Date(availableFrom)
          : availableFrom === null
          ? null
          : existing.availableFrom,
        availableUntil: availableUntil
          ? new Date(availableUntil)
          : availableUntil === null
          ? null
          : existing.availableUntil,
        // Replace attachments if provided
        ...(Array.isArray(attachments)
          ? {
              attachments: {
                deleteMany: {},
                create: attachments.map(
                  (file: {
                    name?: string;
                    url?: string;
                    size?: number;
                    mimeType?: string;
                  }) => ({
                    name: file.name ?? "Attachment",
                    url: file.url ?? "",
                    size: Number(file.size ?? 0),
                    mimeType: file.mimeType ?? "",
                  })
                ),
              },
            }
          : {}),
      },
      include: {
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ announcement: updated });
  } catch (error) {
    console.error("ANNOUNCEMENT PATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update announcement." }, { status: 500 });
  }
}

// ✅ DELETE — delete announcement (Head only)
export async function DELETE(_req: NextRequest, { params }: Props) {
  try {
    const { id: courseId, announcementId } = await params;

    const access = await requireCoursePermission(courseId, "manage_announcements");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const existing = await prisma.announcement.findUnique({
      where: { id: announcementId, courseId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
    }

    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ANNOUNCEMENT DELETE ERROR:", error);
    return NextResponse.json({ error: "Failed to delete announcement." }, { status: 500 });
  }
}