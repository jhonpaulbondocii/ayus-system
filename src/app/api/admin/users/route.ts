// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/mailer";
import { z } from "zod";
import bcrypt from "bcryptjs";

type SessionUser = { role?: string };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const user = session.user as SessionUser;
  if (user?.role !== "ADMIN") return null;
  return session;
}

// ── GET — list all users ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const email  = searchParams.get("email");
  const search = searchParams.get("search");

  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "DEACTIVATED" } : {}),
      ...(email  ? { email: { contains: email, mode: "insensitive" } } : {}),
      ...(search ? {
        OR: [
          { name:  { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    select: {
      id:               true,
      name:             true,
      email:            true,
      department:       true,
      position:         true,
      employmentStatus: true,
      accountType:      true,
      contactNumber:    true,
      status:           true,
      role:             true,
      createdAt:        true,
      image:            true,
    },
    orderBy: { createdAt: "desc" },
    take: search ? 10 : undefined,
  });

  return NextResponse.json({ users });
}

// ── POST — create a new user (admin-created) ─────────────────────────────────
const CreateSchema = z.object({
  name:             z.string().min(1),
  email:            z.string().email(),
  password:         z.string().min(6),
  department:       z.string().nullable().optional(),
  position:         z.string().nullable().optional(),
  employmentStatus: z.string().nullable().optional(),
  accountType:      z.string().nullable().optional(),
  contactNumber:    z.string().nullable().optional(),
  status:           z.enum(["PENDING", "APPROVED", "REJECTED", "DEACTIVATED"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, department, position, employmentStatus, accountType, contactNumber, status } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password:         hashedPassword,
      department:       department       ?? null,
      position:         position         ?? null,
      employmentStatus: employmentStatus ?? null,
      accountType:      accountType      ?? null,
      contactNumber:    contactNumber    ?? null,
      status:           status           ?? "APPROVED",
      role:             "STAFF",
    },
    select: {
      id:               true,
      name:             true,
      email:            true,
      department:       true,
      position:         true,
      employmentStatus: true,
      accountType:      true,
      contactNumber:    true,
      status:           true,
      role:             true,
      createdAt:        true,
      image:            true,
    },
  });

  sendWelcomeEmail({ to: email, name, email, password })
    .catch((err) => console.error("Failed to send welcome email:", err));

  return NextResponse.json({
    user: { ...user, plainPassword: password },
  }, { status: 201 });
}

// ── PATCH — approve / reject / deactivate / reactivate ──────────────────────
const PatchSchema = z.object({
  userId: z.string(),
  action: z.enum(["approve", "reject", "deactivate", "reactivate"]),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { userId, action } = parsed.data;

  const newStatus =
    action === "approve"    ? ("APPROVED"    as const) :
    action === "reject"     ? ("REJECTED"    as const) :
    action === "deactivate" ? ("DEACTIVATED" as const) :
                              ("APPROVED"    as const);

  const user = await prisma.user.update({
    where: { id: userId },
    data:  { status: newStatus },
    select: {
      id:               true,
      name:             true,
      email:            true,
      department:       true,
      position:         true,
      employmentStatus: true,
      accountType:      true,
      contactNumber:    true,
      status:           true,
      role:             true,
      createdAt:        true,
      image:            true,
    },
  });

  return NextResponse.json({ message: `User ${action}d successfully`, user });
}

// ── DELETE — single or bulk delete ───────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Try body first (bulk), then query param (single)
  let userIds: string[] = [];
  let userId: string | null = null;

  try {
    const body = await req.json();
    if (body?.userIds?.length) userIds = body.userIds;
    else if (body?.userId)     userId  = body.userId;
  } catch {
    // No body — fall back to query params
  }

  if (!userId && userIds.length === 0) {
    const { searchParams } = new URL(req.url);
    userId  = searchParams.get("userId");
    const q = searchParams.get("userIds");
    if (q) userIds = q.split(",").map(id => id.trim()).filter(Boolean);
  }

  // Bulk delete
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    return NextResponse.json({ success: true, message: `${userIds.length} user(s) deleted` });
  }

  // Single delete
  if (!userId) return NextResponse.json({ error: "userId or userIds required" }, { status: 400 });
  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ success: true, message: "User deleted successfully" });
}