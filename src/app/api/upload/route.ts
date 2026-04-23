// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Generate unique filename — timestamp + original name
  const timestamp = Date.now();
  const ext       = path.extname(file.name);
  const safeName  = file.name.replace(/[^a-z0-9._-]/gi, "_").toLowerCase();
  const filename  = `${timestamp}_${safeName}`;

  // Save to public/uploads/submissions/
  const uploadDir = path.join(process.cwd(), "public", "uploads", "submissions");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  // Return the public URL
  const fileUrl = `/uploads/submissions/${filename}`;
  return NextResponse.json({ fileUrl });
}