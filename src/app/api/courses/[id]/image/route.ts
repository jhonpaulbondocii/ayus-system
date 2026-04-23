import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id)
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (!file.type.startsWith("image/"))
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64, {
      folder:         "course-images",
      public_id:      `course_${id}`,
      overwrite:      true,
      transformation: [{ width: 800, height: 450, crop: "fill", quality: "auto" }],
    });

    await prisma.course.update({
      where: { id },
      data:  { image: result.secure_url },
    });

    // ← Revalidate dashboard and course pages
    revalidatePath("/admin/dashboard");
    revalidatePath(`/admin/courses/${id}`);

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}