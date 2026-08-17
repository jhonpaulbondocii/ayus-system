import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const count = await prisma.libraryCardRequest.count({
      where: {
        courseId: id,
        status: { in: ["READY", "RELEASED"] },
      },
    });

    const nextNo = count + 1;
    const padded = String(nextNo).padStart(5, "0");

    return NextResponse.json({ cardNo: padded });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to generate card number" },
      { status: 500 }
    );
  }
}