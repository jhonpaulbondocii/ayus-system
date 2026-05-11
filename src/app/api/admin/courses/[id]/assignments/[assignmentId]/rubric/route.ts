// src/app/api/admin/courses/[id]/assignments/[assignmentId]/rubric/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;

  const rubric = await prisma.rubric.findUnique({
    where: { assignmentId },
    include: {
      criteria: {
        orderBy: { order: "asc" },
        include: { ratings: { orderBy: { order: "asc" } } },
      },
    },
  });

  return NextResponse.json({ rubric: rubric ?? null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId, assignmentId } = await params;
  const body = await req.json() as {
    title: string;
    type: string;
    ratingDisplay: string;
    ratingOrder: string;
    scoring: string;
    doNotPostToGradebook: boolean;
    useForGrading: boolean;
    hideScoreTotal: boolean;
    criteria: {
      name: string;
      description?: string;
      points: number;
      enableRange: boolean;
      order: number;
      ratings: { points: number; name: string; description?: string; order: number }[];
    }[];
  };

  // Upsert rubric
  const existing = await prisma.rubric.findUnique({ where: { assignmentId } });

  if (existing) {
    // Delete old criteria (cascade deletes ratings)
    await prisma.rubricCriterion.deleteMany({ where: { rubricId: existing.id } });

    const rubric = await prisma.rubric.update({
      where: { assignmentId },
      data: {
        title: body.title,
        type: body.type,
        ratingDisplay: body.ratingDisplay,
        ratingOrder: body.ratingOrder,
        scoring: body.scoring,
        doNotPostToGradebook: body.doNotPostToGradebook,
        useForGrading: body.useForGrading,
        hideScoreTotal: body.hideScoreTotal,
        pointsPossible: body.criteria.reduce((sum, c) => sum + c.points, 0),
        criteria: {
          create: body.criteria.map(c => ({
            name: c.name,
            description: c.description ?? null,
            points: c.points,
            enableRange: c.enableRange,
            order: c.order,
            ratings: { create: c.ratings },
          })),
        },
      },
      include: { criteria: { include: { ratings: true } } },
    });
    return NextResponse.json({ rubric });
  }

  const rubric = await prisma.rubric.create({
    data: {
      assignmentId,
      courseId,
      title: body.title,
      type: body.type,
      ratingDisplay: body.ratingDisplay,
      ratingOrder: body.ratingOrder,
      scoring: body.scoring,
      doNotPostToGradebook: body.doNotPostToGradebook,
      useForGrading: body.useForGrading,
      hideScoreTotal: body.hideScoreTotal,
      pointsPossible: body.criteria.reduce((sum, c) => sum + c.points, 0),
      criteria: {
        create: body.criteria.map(c => ({
          name: c.name,
          description: c.description ?? null,
          points: c.points,
          enableRange: c.enableRange,
          order: c.order,
          ratings: { create: c.ratings },
        })),
      },
    },
    include: { criteria: { include: { ratings: true } } },
  });

  return NextResponse.json({ rubric });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;

  await prisma.rubric.delete({ where: { assignmentId } });
  return NextResponse.json({ ok: true });
}