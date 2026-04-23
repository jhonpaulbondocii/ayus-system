// src/app/api/admin/repositories/[repositoryId]/files/[fileId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unlink } from "fs/promises";
import path from "path";

type SessionUser = { id?: string };

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ repositoryId: string; fileId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repositoryId, fileId } = await params;
  const userId = (session.user as SessionUser)?.id ?? "";

  const file = await prisma.repositoryFile.findUnique({
    where: { id: fileId },
    select: { fileName: true, fileUrl: true },
  });

  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

  // Delete physical file if it's a local upload
  if (file.fileUrl.startsWith("/uploads/")) {
    try {
      const filePath = path.join(process.cwd(), "public", file.fileUrl);
      await unlink(filePath);
    } catch {
      // File may not exist on disk — continue anyway
    }
  }

  await prisma.repositoryFile.delete({ where: { id: fileId } });

  await prisma.activityLog.create({
    data: {
      repositoryId,
      userId,
      action:     "DELETE",
      targetType: "file",
      targetId:   fileId,
      targetName: file.fileName,
    },
  });

  return NextResponse.json({ success: true });
}