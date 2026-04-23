// src/app/api/courses/[id]/announcements/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

type Props = {
  params: Promise<{ id: string }>;
};

// ✅ GET
export async function GET(_req: NextRequest, { params }: Props) {
  const { id: courseId } = await params;

  const access = await requireCoursePermission(courseId, "view_announcements");
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const announcements = await prisma.announcement.findMany({
    where: { courseId },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ announcements });
}

// 🔴 POST (CREATE ANNOUNCEMENT)
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { id: courseId } = await params;

    const access = await requireCoursePermission(courseId, "manage_announcements");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();

    const {
      title,
      content,
      bodyText,
      bodyHtml,
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
        : "";

    const finalBodyHtml =
      typeof bodyHtml === "string"
        ? bodyHtml
        : typeof content === "string"
        ? content
        : "";

    if (!title || (!finalBodyText.trim() && !finalBodyHtml.trim())) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        courseId,
        title: String(title).trim(),
        bodyText: finalBodyText,
        bodyHtml: finalBodyHtml,
        author: access.courseRole || access.systemRole || "Admin",
        assignTo: Array.isArray(assignTo) ? assignTo : ["Everyone"],
        allowComment:
          typeof allowComment === "boolean"
            ? allowComment
            : typeof allowComments === "boolean"
            ? allowComments
            : true,
        allowLiking: Boolean(allowLiking),
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
        attachments: Array.isArray(attachments) && attachments.length > 0
          ? {
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
            }
          : undefined,
      },
      include: {
        attachments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ announcement });
  } catch (error) {
    console.error("COURSE ANNOUNCEMENTS POST ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create announcement." },
      { status: 500 }
    );
  }
}