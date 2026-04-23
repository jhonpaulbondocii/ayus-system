import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id:            true,
        name:          true,
        email:         true,
        image:         true,
        role:          true,
        department:    true,
        position:      true,
        pronouns:      true,
        bio:           true,
        contactNumber: true, // ← added
        createdAt:     true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, pronouns, bio, position, department, contactNumber } = body; // ← added

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name          !== undefined && { name          }),
        ...(pronouns      !== undefined && { pronouns      }),
        ...(bio           !== undefined && { bio           }),
        ...(position      !== undefined && { position      }),
        ...(department    !== undefined && { department    }),
        ...(contactNumber !== undefined && { contactNumber }), // ← added
      },
      select: {
        id:            true,
        name:          true,
        email:         true,
        department:    true,
        position:      true,
        pronouns:      true,
        bio:           true,
        contactNumber: true, // ← added
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("PATCH /api/profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}