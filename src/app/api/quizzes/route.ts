import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "courseId required" }, { status: 400 });
    }

    // Fetch the current user's name so we can match against assignTo
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });

    const userName = currentUser?.name ?? "";

    const quizzes = await prisma.quiz.findMany({
      where: {
        courseId,
        published: true,
        // Only return quizzes assigned to "Everyone" or to this specific staff member by name
        assignTo: {
          hasSome: ["Everyone", userName],
        },
      },
      include: {
        questions: {
          include: { answers: true, matchPairs: true },
          orderBy: { order: "asc" },
        },
        attempts: {
          where: { userId: session.user.id },
          orderBy: { submittedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error("GET /api/quizzes error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}