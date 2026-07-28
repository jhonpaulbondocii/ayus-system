import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import to match your project

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const count = await prisma.libraryCardRequest.count({
      where: {
        courseId: params.id,
        status: { in: ["READY", "RELEASED"] },
      },
    });

    const nextNo = count + 1;
    const padded = String(nextNo).padStart(5, "0");

    return NextResponse.json({ cardNo: padded });
  } catch (e) {
    return NextResponse.json({ error: "Failed to generate card number" }, { status: 500 });
  }
}