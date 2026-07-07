// src/app/api/admin/repositories/[repositoryId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = { id?: string; role?: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repositoryId } = await params;

  const repository = await prisma.repositories.findUnique({
    where: { id: repositoryId },
    include: {
      assignments: {
        select: { id: true, title: true, dueDate: true, points: true, status: true, description: true },
      },
      repository_files: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
          submissions: { select: { id: true, status: true, grade: true, feedback: true, submittedAt: true } },
        },
        orderBy: { uploadedAt: "desc" },
      },
      activity_logs: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!repository) return NextResponse.json({ error: "Repository not found" }, { status: 404 });

  return NextResponse.json({ repository });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repositoryId } = await params;
  const body   = await req.json();
  const userId = (session.user as SessionUser)?.id ?? "";

  const repository = await prisma.repositories.update({
    where: { id: repositoryId },
    data:  { name: body.name },
  });

  await prisma.activityLog.create({
    data: {
      repositoryId,
      userId,
      action:     "UPDATE",
      targetType: "repository",
      targetId:   repositoryId,
      targetName: body.name,
    },
  });

  return NextResponse.json({ repository });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ repositoryId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repositoryId } = await params;
  const userId = (session.user as SessionUser)?.id ?? "";

  const repo = await prisma.repositories.findUnique({
    where: { id: repositoryId },
    select: { name: true },
  });

  await prisma.activityLog.create({
    data: {
      repositoryId,
      userId,
      action:     "DELETE",
      targetType: "repository",
      targetId:   repositoryId,
      targetName: repo?.name ?? "Unknown",
    },
  });

  await prisma.repositories.delete({ where: { id: repositoryId } });

  return NextResponse.json({ success: true });
}