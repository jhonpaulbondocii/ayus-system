import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoursePermission } from "@/lib/course-access";

type RouteContext = {
  params: Promise<{ id: string; announcementId: string }>;
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id: courseId, announcementId } = await context.params;

    const access = await requireCoursePermission(courseId, "manage_announcements");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const existing = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        courseId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found." },
        { status: 404 }
      );
    }

    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    return NextResponse.json({
      success: true,
      viewer: {
        systemRole: access.systemRole,
        courseRole: access.courseRole,
      },
    });
  } catch (error) {
    console.error("ADMIN ANNOUNCEMENTS DELETE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement." },
      { status: 500 }
    );
  }
}

// ← DITO IDAGDAG, pagkatapos ng closing brace ng DELETE
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: courseId, announcementId } = await context.params;
    const access = await requireCoursePermission(courseId, "manage_announcements");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const existing = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        courseId,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Announcement not found." },
        { status: 404 }
      );
    }
    const body = await req.json();
    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(body.locked !== undefined && { locked: body.locked }),
        ...(body.allowComments !== undefined && { allowComments: body.allowComments }),
      },
    });
    return NextResponse.json({ success: true, announcement: updated });
  } catch (error) {
    console.error("ADMIN ANNOUNCEMENTS PATCH ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update announcement." },
      { status: 500 }
    );
  }
}