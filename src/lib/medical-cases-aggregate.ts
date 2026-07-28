// src/lib/medical-cases-aggregate.ts
//
// Shared query + aggregation logic for the Medical Cases Summary feature.
// Used by:
//   - src/app/api/courses/[id]/medical-cases-summary/route.ts        (on-screen table)
//   - src/app/api/courses/[id]/medical-cases-summary/export/route.ts (Excel export)

import { prisma } from "@/lib/prisma";
import {
  FIXED_BODY_SYSTEMS,
  COLLEGE_CODES,
  COURSE_TO_COLLEGE,
  type CollegeCode,
} from "@/lib/medical-cases-config";

export interface ConditionAgg {
  id:           string;
  name:         string;
  countsByDept: Record<CollegeCode, number>;
  total:        number;
}

export interface BodySystemAgg {
  id:           string;
  name:         string;
  letter:       string;
  order:        number;
  conditions:   ConditionAgg[];
  countsByDept: Record<CollegeCode, number>;
  total:        number;
}

export interface MedicalCasesSummary {
  departments:       CollegeCode[];
  bodySystems:       BodySystemAgg[];
  grandTotal:        number;
  grandCountsByDept: Record<CollegeCode, number>;
}

function emptyCollegeCounts(): Record<CollegeCode, number> {
  const obj = {} as Record<CollegeCode, number>;
  COLLEGE_CODES.forEach(c => { obj[c] = 0; });
  return obj;
}

/**
 * Ensures the 18 fixed Body Systems exist for this course. Idempotent —
 * safe to call on every request. Does NOT touch/seed conditions; those
 * remain fully editable via the Manage Categories modal.
 */
export async function ensureFixedBodySystems(courseId: string) {
  const existing = await prisma.bodySystem.findMany({
    where: { courseId },
    select: { id: true, name: true },
  });
  const existingNames = new Set(existing.map(b => b.name));

  const missing = FIXED_BODY_SYSTEMS.filter(def => !existingNames.has(def.name));
  if (missing.length === 0) return;

  await prisma.$transaction(
    missing.map(def =>
      prisma.bodySystem.create({
        data: { courseId, name: def.name, order: def.order },
      })
    )
  );
}

interface AggregateOptions {
  courseId:         string;
  dateFrom?:        Date;
  dateTo?:          Date;
  bodySystemId?:    string;
  conditionId?:     string;
}

export async function computeMedicalCasesSummary(
  opts: AggregateOptions
): Promise<MedicalCasesSummary> {
  const { courseId, dateFrom, dateTo, bodySystemId, conditionId } = opts;

  await ensureFixedBodySystems(courseId);

  const bodySystems = await prisma.bodySystem.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: { conditions: { orderBy: { order: "asc" } } },
  });

  const bodySystemLetter = new Map(
    FIXED_BODY_SYSTEMS.map(def => [def.name, def.letter])
  );

  // Fetch patient records with a linked medical condition (the only reliable
  // source of body-system attribution — PatientRecord.bodySystemId is legacy
  // and not used here).
  const records = await prisma.patientRecord.findMany({
    where: {
      courseId,
      medicalConditionId: {
        not: null,
        ...(conditionId ? { equals: conditionId } : {}),
      },
      ...(bodySystemId ? { medicalCondition: { bodySystemId } } : {}),
      ...(dateFrom || dateTo ? {
        visitDate: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo   ? { lte: dateTo }   : {}),
        },
      } : {}),
    },
    select: {
      medicalConditionId: true,
      student: { select: { course: true } },
    },
  });

  // conditionId -> college -> count, and conditionId -> total
  const condCounts = new Map<string, Record<CollegeCode, number>>();
  const condTotals  = new Map<string, number>();

  for (const r of records) {
    const cid = r.medicalConditionId!;
    if (!condCounts.has(cid)) condCounts.set(cid, emptyCollegeCounts());
    condTotals.set(cid, (condTotals.get(cid) ?? 0) + 1);

    const college = r.student.course ? COURSE_TO_COLLEGE[r.student.course] : undefined;
    if (college) {
      const bucket = condCounts.get(cid)!;
      bucket[college] += 1;
    }
  }

  const bodySystemAggs: BodySystemAgg[] = bodySystems
    .filter(bs => !bodySystemId || bs.id === bodySystemId)
    .map(bs => {
      const conditions: ConditionAgg[] = bs.conditions
        .filter(c => !conditionId || c.id === conditionId)
        .map(c => ({
          id: c.id,
          name: c.name,
          countsByDept: condCounts.get(c.id) ?? emptyCollegeCounts(),
          total: condTotals.get(c.id) ?? 0,
        }));

      const countsByDept = emptyCollegeCounts();
      let total = 0;
      conditions.forEach(c => {
        total += c.total;
        COLLEGE_CODES.forEach(code => { countsByDept[code] += c.countsByDept[code]; });
      });

      return {
        id: bs.id,
        name: bs.name,
        letter: bodySystemLetter.get(bs.name) ?? "",
        order: bs.order,
        conditions,
        countsByDept,
        total,
      };
    });

  const grandCountsByDept = emptyCollegeCounts();
  let grandTotal = 0;
  bodySystemAggs.forEach(bs => {
    grandTotal += bs.total;
    COLLEGE_CODES.forEach(code => { grandCountsByDept[code] += bs.countsByDept[code]; });
  });

  return {
    departments: [...COLLEGE_CODES],
    bodySystems: bodySystemAggs,
    grandTotal,
    grandCountsByDept,
  };
}