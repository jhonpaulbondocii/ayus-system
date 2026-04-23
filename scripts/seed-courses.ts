// scripts/seed-courses.ts
// Run: npx tsx scripts/seed-courses.ts

import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const COLORS = [
  "#7b1113","#d41e00","#e66000","#f5a623",
  "#6d9b00","#2d7a2d","#00695c","#0770a2",
  "#1565c0","#4527a0","#6a0dad","#37474f",
  "#546e7a","#78909c","#5d4037","#e91e8c",
];

const courses = [
  // ── Administrative / Office Units ──────────────────────────────────────────
  { name: "Campus Care Initiative",                                                code: "CCI"    },
  { name: "Homeroom Guidance",                                                     code: "HG"     },
  { name: "Records Management",                                                    code: "RM"     },
  { name: "Public and Media Affairs",                                              code: "PMA"    },
  { name: "Local Industry Linkages",                                               code: "LIL"    },
  { name: "Alumni Affairs",                                                        code: "AA"     },
  { name: "Disaster Risk Reduction and Management",                                code: "DRRM"   },
  { name: "Skills and Technical Development",                                      code: "STD"    },
  { name: "Gender and Development – Information Campaign",                         code: "GAD-IC" },
  { name: "Gender and Development – Technical Support",                            code: "GAD-TS" },
  { name: "International Partnerships and Programs",                               code: "IPP"    },
  { name: "Planning and Development",                                              code: "PD"     },
  { name: "ISO / Quality Assurance",                                               code: "ISO-QA" },
  { name: "Culture and the Arts",                                                  code: "CA"     },
  { name: "Sports Development",                                                    code: "SD"     },
  { name: "Admissions",                                                            code: "ADM"    },
  { name: "Multi-Faith Services",                                                  code: "MFS"    },
  { name: "Career Advising Unit",                                                  code: "CAU"    },
  { name: "Guidance and Testing Center",                                           code: "GTC"    },
  { name: "Affirmative Unit",                                                      code: "AU"     },
  { name: "Student Council",                                                       code: "SC"     },
  { name: "Student Publication",                                                   code: "SP"     },
  { name: "Data Privacy",                                                          code: "DPO"    },
  { name: "Management Information Systems",                                        code: "MIS"    },
  { name: "Extension Services",                                                    code: "ES"     },
  { name: "Research Management",                                                   code: "ResM"   },
  { name: "Occupational Safety and Health",                                        code: "OSH"    },
  { name: "Physical Plant and Facilities",                                         code: "PPF"    },
  { name: "Knowledge Management and Innovation",                                   code: "KMI"    },
  { name: "Quality Management Systems / Accreditation / Institutional Assessment", code: "QMS"   },
  { name: "Admissions, Counseling and Testing",                                    code: "ACT"    },
  { name: "Student Welfare and Formation",                                         code: "SWF"    },
  { name: "Student Affairs",                                                       code: "SA"     },
  { name: "Curriculum and Instruction",                                            code: "CI"     },

  // ── Degree Programs ─────────────────────────────────────────────────────────
  { name: "Bachelor of Science in Information Technology",                         code: "BSIT"   },
  { name: "Bachelor of Science in Industrial Technology",                          code: "BSIndT" },
  { name: "Bachelor of Science in Hospitality Management",                         code: "BSHM"   },
  { name: "Bachelor of Physical Education",                                        code: "BPEd"   },
  { name: "Bachelor of Secondary Education",                                       code: "BSEd"   },
  { name: "Bachelor of Science in Accountancy",                                    code: "BSA"    },
  { name: "Bachelor of Technology and Livelihood Education",                       code: "BTLEd"  },
  { name: "Bachelor of Elementary Education",                                      code: "BEEd"   },
  { name: "Bachelor of Science in Business Administration",                        code: "BSBA"   },
];

async function main() {
  console.log("🌱 Seeding courses...\n");

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    const color  = COLORS[i % COLORS.length];

    const existing = await prisma.course.findFirst({
      where: { name: course.name },
    });

    if (existing) {
      console.log(`⏭️  Skipped (exists): ${course.name}`);
      skipped++;
      continue;
    }

    await prisma.course.create({
      data: {
        name:   course.name,
        code:   course.code,
        color,
        status: "PUBLISHED",
      },
    });

    console.log(`✅ Created: ${course.name} (${course.code})`);
    created++;
  }

  console.log(`\n🎉 Done! Created: ${created} | Skipped: ${skipped}`);
}

main()
  .catch(e => { console.error("❌ Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());