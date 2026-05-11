// src/app/api/courses/[id]/assignments/[assignmentId]/rubric/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RatingInput {
  id?: string;
  points: number;
  name: string;
  description?: string;
  order: number;
}

interface CriterionInput {
  id?: string;
  name: string;
  description?: string;
  points: number;
  enableRange?: boolean;
  order: number;
  ratings: RatingInput[];
}

interface RubricBody {
  title: string;
  type?: string;
  ratingDisplay?: string;
  ratingOrder?: string;
  scoring?: string;
  doNotPostToGradebook?: boolean;
  useForGrading?: boolean;
  hideScoreTotal?: boolean;
  criteria: CriterionInput[];
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const rubric = await prisma.rubric.findUnique({
      where: { assignmentId },
      include: {
        criteria: {
          orderBy: { order: "asc" },
          include: {
            ratings: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    return NextResponse.json({ rubric: rubric ?? null });
  } catch (error) {
    console.error("[RUBRIC GET]", error);
    return NextResponse.json({ error: "Failed to fetch rubric" }, { status: 500 });
  }
}

// ── POST (create or update) ────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { id, assignmentId } = await params;
    const body = (await req.json()) as RubricBody;
    const {
      title, type, ratingDisplay, ratingOrder, scoring,
      doNotPostToGradebook, useForGrading, hideScoreTotal, criteria,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Rubric title is required" }, { status: 400 });
    }
    if (!criteria || criteria.length === 0) {
      return NextResponse.json({ error: "At least one criterion is required" }, { status: 400 });
    }

    const pointsPossible = criteria.reduce((sum, c) => sum + (c.points ?? 0), 0);

    const existing = await prisma.rubric.findUnique({
      where: { assignmentId },
    });

    let rubric;

    if (existing) {
      await prisma.rubricCriterion.deleteMany({ where: { rubricId: existing.id } });

      rubric = await prisma.rubric.update({
        where: { id: existing.id },
        data: {
          title,
          type: type ?? "scale",
          ratingDisplay: ratingDisplay ?? "level",
          ratingOrder: ratingOrder ?? "high_low",
          scoring: scoring ?? "scored",
          doNotPostToGradebook: doNotPostToGradebook ?? false,
          useForGrading: useForGrading ?? false,
          hideScoreTotal: hideScoreTotal ?? false,
          pointsPossible,
          criteria: {
            create: criteria.map((c, ci) => ({
              name: c.name,
              description: c.description ?? "",
              points: c.points,
              enableRange: c.enableRange ?? false,
              order: c.order ?? ci,
              ratings: {
                create: (c.ratings ?? []).map((r, ri) => ({
                  points: r.points,
                  name: r.name,
                  description: r.description ?? "",
                  order: r.order ?? ri,
                })),
              },
            })),
          },
        },
        include: {
          criteria: {
            orderBy: { order: "asc" },
            include: { ratings: { orderBy: { order: "asc" } } },
          },
        },
      });
    } else {
      rubric = await prisma.rubric.create({
        data: {
          assignmentId,
          courseId: id,
          title,
          type: type ?? "scale",
          ratingDisplay: ratingDisplay ?? "level",
          ratingOrder: ratingOrder ?? "high_low",
          scoring: scoring ?? "scored",
          doNotPostToGradebook: doNotPostToGradebook ?? false,
          useForGrading: useForGrading ?? false,
          hideScoreTotal: hideScoreTotal ?? false,
          pointsPossible,
          criteria: {
            create: criteria.map((c, ci) => ({
              name: c.name,
              description: c.description ?? "",
              points: c.points,
              enableRange: c.enableRange ?? false,
              order: c.order ?? ci,
              ratings: {
                create: (c.ratings ?? []).map((r, ri) => ({
                  points: r.points,
                  name: r.name,
                  description: r.description ?? "",
                  order: r.order ?? ri,
                })),
              },
            })),
          },
        },
        include: {
          criteria: {
            orderBy: { order: "asc" },
            include: { ratings: { orderBy: { order: "asc" } } },
          },
        },
      });
    }

    return NextResponse.json({ rubric }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error("[RUBRIC POST]", error);
    return NextResponse.json({ error: "Failed to save rubric" }, { status: 500 });
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const existing = await prisma.rubric.findUnique({
      where: { assignmentId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Rubric not found" }, { status: 404 });
    }

    await prisma.rubric.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RUBRIC DELETE]", error);
    return NextResponse.json({ error: "Failed to delete rubric" }, { status: 500 });
  }
}