import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where:  { id: courseId },
      select: { officeType: true, status: true },
    });
    if (!course || course.officeType !== "GUIDANCE" || course.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Invalid form" }, { status: 403 });
    }

    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const folder = `guidance/${courseId}`;

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder, resource_type: "auto" },
        (err, res) => err ? reject(err) : resolve(res as { secure_url: string })
      ).end(buffer);
    });

    return NextResponse.json({ fileUrl: result.secure_url });
  } catch (err) {
    console.error("[POST /guidance/upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}