// Run: npx tsx prisma/seed-violation-types.ts
// Optional: npx tsx prisma/seed-violation-types.ts <courseId>   (isang office lang)
//
// Hindi ino-overwrite ang existing na types (skipDuplicates sa courseId + code).
import { PrismaClient } from "../src/generated/prisma"; // ADJUST kung iba ang gamit mo sa src/lib/prisma
import { VIOLATION_TYPE_ROWS } from "../src/server/osa/violation-types-data";

const prisma = new PrismaClient();

async function main() {
  const onlyId = process.argv[2];
  const courses = await prisma.course.findMany({
    where: onlyId ? { id: onlyId } : { officeType: "OSA" },
    select: { id: true, name: true },
  });

  if (courses.length === 0) {
    console.log("Walang OSA office na nahanap. Gumawa muna ng office na may type na OSA.");
    return;
  }

  for (const c of courses) {
    const res = await prisma.violationType.createMany({
      data: VIOLATION_TYPE_ROWS.map((r) => ({ ...r, courseId: c.id })),
      skipDuplicates: true,
    });
    console.log(`${c.name} (${c.id}): ${res.count} bagong violation types`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());