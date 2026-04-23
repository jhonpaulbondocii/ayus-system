// src/app/api/admin/courses/[id]/assignments/[assignmentId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

type RouteContext = {
  params: Promise<{ id: string; assignmentId: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id: courseId, assignmentId } = await context.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment || assignment.courseId !== courseId) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    // ── Resolve creator from the current session ──────────────────────────────
    // Since the Assignment schema has no createdById field, we identify the
    // creator as the currently logged-in admin/staff viewing or managing the course.
    // For display purposes we look up their enrollment in this specific course
    // so we can show their correct courseRole (e.g. "Head", "Staff", "Admin").
    let creator = null;

    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string })?.id ?? null;

    if (sessionUserId) {
      const enrollment = await prisma.courseEnrollment.findFirst({
        where: { userId: sessionUserId, courseId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (enrollment) {
        creator = {
          id: enrollment.user.id,
          name: enrollment.user.name ?? "Unknown",
          email: enrollment.user.email,
          courseRole: enrollment.courseRole,
          createdAt: assignment.createdAt.toISOString(),
        };
      } else {
        // Session user exists but is not enrolled in this course (e.g. super-admin).
        // Fall back to their user record with a generic role label.
        const user = await prisma.user.findUnique({
          where: { id: sessionUserId },
          select: { id: true, name: true, email: true, role: true },
        });
        if (user) {
          creator = {
            id: user.id,
            name: user.name ?? "Unknown",
            email: user.email,
            courseRole: user.role, // "ADMIN" | "STAFF"
            createdAt: assignment.createdAt.toISOString(),
          };
        }
      }
    }

    return NextResponse.json({ assignment, creator });
  } catch (error) {
    console.error("ASSIGNMENT GET ERROR:", error);
    return NextResponse.json({ error: "Failed to fetch assignment." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { assignmentId } = await context.params;
    const body = await req.json();

    const data: Record<string, unknown> = {};

    if (body.status          !== undefined) data.status          = body.status;
    if (body.title           !== undefined) data.title           = body.title;
    if (body.description     !== undefined) data.description     = body.description;
    if (body.points          !== undefined) data.points          = Number(body.points);
    if (body.assignmentGroup !== undefined) data.assignmentGroup = body.assignmentGroup;
    if (body.assignees       !== undefined) data.assignees       = body.assignees;

    // ── Date fields ────────────────────────────────────────────────────────────
    if (body.dueDate !== undefined) {
      if (body.dueDate) {
        const d = new Date(`${body.dueDate} ${body.dueTime || "11:59 PM"}`);
        data.dueDate = isNaN(d.getTime()) ? null : d;
      } else {
        data.dueDate = null;
      }
    }

    if (body.availableFrom !== undefined) {
      if (body.availableFrom) {
        const d = new Date(`${body.availableFrom} ${body.availableFromTime || "12:00 AM"}`);
        data.availableFrom = isNaN(d.getTime()) ? null : d;
      } else {
        data.availableFrom = null;
      }
    }

    if (body.availableUntil !== undefined) {
      if (body.availableUntil) {
        const d = new Date(`${body.availableUntil} ${body.untilTime || "11:59 PM"}`);
        data.availableUntil = isNaN(d.getTime()) ? null : d;
      } else {
        data.availableUntil = null;
      }
    }

    const assignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("ASSIGNMENT PATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update assignment." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { assignmentId } = await context.params;

    await prisma.assignment.delete({ where: { id: assignmentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ASSIGNMENT DELETE ERROR:", error);
    return NextResponse.json({ error: "Failed to delete assignment." }, { status: 500 });
  }
}