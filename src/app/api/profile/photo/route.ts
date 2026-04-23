import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CloudinaryUploadResult = { secure_url: string };

function uploadToCloudinary(buffer: Buffer, folder: string): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) return reject(new Error("No secure_url returned"));
        resolve({ secure_url: result.secure_url });
      }
    );

    stream.end(buffer);
  });
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (typeof err === "object" && err !== null) {
    // common shapes: { message }, { error: { message } }
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;

    const maybeNested = (err as { error?: unknown }).error;
    if (typeof maybeNested === "object" && maybeNested !== null) {
      const nestedMsg = (maybeNested as { message?: unknown }).message;
      if (typeof nestedMsg === "string") return nestedMsg;
    }
  }

  if (typeof err === "string") return err;
  return "Upload failed";
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const folder = process.env.CLOUDINARY_FOLDER || "profile-pictures";

    const uploaded = await uploadToCloudinary(buffer, folder);
    const imageUrl = uploaded.secure_url;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        position: true,
        pronouns: true,
        bio: true,
        image: true,
      },
    });

    return NextResponse.json({ imageUrl, user: updatedUser }, { status: 200 });
  } catch (err: unknown) {
    console.error("PROFILE PHOTO UPLOAD ERROR:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}