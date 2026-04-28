// src/app/api/announcements/route.ts
import { NextResponse }    from "next/server";
import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import { prisma }          from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Get every course this user belongs to
  const enrollments = await prisma.courseEnrollment.findMany({
    where:  { userId },
    select: { courseId: true },
  });
  const courseIds = enrollments.map((e) => e.courseId);

  if (courseIds.length === 0)
    return NextResponse.json({ announcements: [] });

  const announcements = await prisma.announcement.findMany({
    where: {
      courseId: { in: courseIds },
      // Only published / currently-available announcements
      OR: [
        { availableFrom: null },
        { availableFrom: { lte: new Date() } },
      ],
    },
    include: {
      course:      { select: { id: true, name: true, code: true, color: true } },
      attachments: { select: { id: true, name: true, url: true, size: true, mimeType: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const result = announcements.map((a) => ({
    id:          a.id,
    title:       a.title,
    bodyText:    a.bodyText,
    bodyHtml:    a.bodyHtml,
    author:      a.author,
    authorId:    a.authorId,
    createdAt:   a.createdAt.toISOString(),
    course:      a.course,
    attachments: a.attachments,
  }));

  return NextResponse.json({ announcements: result });
}