// src/app/api/courses/[id]/people/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */

type Params = { params: Promise<{ id: string }> };

/** Returns the caller's enrollment in the course, or null. */
async function getCallerEnrollment(userId: string, courseId: string) {
  return prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

/* ─────────────────────────────────────────────────────────────────
   GET /api/courses/[id]/people
   — Returns all enrolled people in the course
───────────────────────────────────────────────────────────────── */
export async function GET(
  _req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  /* Must be enrolled or a global ADMIN to view */
  const caller = await getCallerEnrollment(session.user.id, courseId);
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";
  if (!caller && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const enrollments = await prisma.courseEnrollment.findMany({
    where: { courseId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          pronouns: true,
          position: true,
          accountType: true,
          status: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const people = enrollments.map((e) => ({
    id: e.user.id,
    name: e.user.name,
    email: e.user.email,
    image: e.user.image,
    pronouns: e.user.pronouns,
    position: e.user.position,
    accountType: e.user.accountType,
    role: e.courseRole,
    status: e.user.status,
  }));

  return NextResponse.json({ people });
}

/* ─────────────────────────────────────────────────────────────────
   POST /api/courses/[id]/people
   Body: { email: string; role?: string }
   — Email-based enrollment; role defaults to "Staff"
   — Only callers with courseRole "Head" (or global ADMIN) may enroll
───────────────────────────────────────────────────────────────── */
export async function POST(
  req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  /* ── Permission check ──────────────────────────────────────── */
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || caller.courseRole !== "Head") {
      return NextResponse.json(
        { error: "Only Heads or Admins can add people." },
        { status: 403 }
      );
    }
  }

  /* ── Parse body ────────────────────────────────────────────── */
  let email: string;
  let role: string;

  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();
    role = (body.role ?? "Staff").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  /* Basic email format guard */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format." },
      { status: 422 }
    );
  }

  /* ── Look up the user ──────────────────────────────────────── */
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, status: true },
  });

  if (!user) {
    return NextResponse.json(
      { message: "No account found with that email address." },
      { status: 404 }
    );
  }

  /* ── Check for existing enrollment ────────────────────────── */
  const existing = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });

  if (existing) {
    return NextResponse.json(
      { message: "This person is already enrolled in the course." },
      { status: 409 }
    );
  }

  /* ── Enroll ────────────────────────────────────────────────── */
  const enrollment = await prisma.courseEnrollment.create({
    data: {
      userId: user.id,
      courseId,
      courseRole: role,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          pronouns: true,
          position: true,
          accountType: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      message: "Enrolled successfully.",
      person: {
        id: enrollment.user.id,
        name: enrollment.user.name,
        email: enrollment.user.email,
        image: enrollment.user.image,
        pronouns: enrollment.user.pronouns,
        position: enrollment.user.position,
        accountType: enrollment.user.accountType,
        role: enrollment.courseRole,
        status: enrollment.user.status,
      },
    },
    { status: 201 }
  );
}

/* ─────────────────────────────────────────────────────────────────
   DELETE /api/courses/[id]/people
   Body: { userId: string }
   — Removes a user's enrollment from the course
   — Only "Head" courseRole or global ADMIN may remove
───────────────────────────────────────────────────────────────── */
export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId } = await params;

  /* ── Permission check ──────────────────────────────────────── */
  const isAdmin = (session.user as { role?: string }).role === "ADMIN";

  if (!isAdmin) {
    const caller = await getCallerEnrollment(session.user.id, courseId);
    if (!caller || caller.courseRole !== "Head") {
      return NextResponse.json(
        { error: "Only Heads or Admins can remove people." },
        { status: 403 }
      );
    }
  }

  /* ── Parse body ────────────────────────────────────────────── */
  let userId: string;

  try {
    const body = await req.json();
    userId = (body.userId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  /* ── Guard: cannot remove yourself ────────────────────────── */
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "You cannot remove yourself from the course." },
      { status: 400 }
    );
  }

  /* ── Check enrollment exists ───────────────────────────────── */
  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment) {
    return NextResponse.json(
      { error: "Enrollment not found." },
      { status: 404 }
    );
  }

  /* ── Delete enrollment ─────────────────────────────────────── */
  await prisma.courseEnrollment.delete({
    where: { userId_courseId: { userId, courseId } },
  });

  return NextResponse.json({ message: "Removed successfully." });
}