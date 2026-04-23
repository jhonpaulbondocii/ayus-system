// src/app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = { role?: string };

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return session;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  if (!await requireAuth())
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, image: true,
      pronouns: true, position: true, department: true,
      bio: true,           // ← added
      contactNumber: true, // ← added
      role: true, status: true, createdAt: true,
    },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user });
}