import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where:  { email: "admin@psu.edu.ph" },
    update: {},
    create: {
      name:       "PSU Admin",
      email:      "admin@psu.edu.ph",
      password:   adminPassword,
      role:       "ADMIN",
      status:     "APPROVED",
      department: "IT Administration",
      position:   "System Administrator",
    },
  });
  console.log("✅ Admin created: admin@psu.edu.ph");

  const staffPassword = await bcrypt.hash("staff123", 12);

  const staffList = [
    { name: "Dr. Vicky P. Vital",    email: "vvital@psu.edu.ph",     department: "Computing Studies", position: "Department Head" },
    { name: "Hipolito, John C.",     email: "jchipolito@psu.edu.ph", department: "Computing Studies", position: "Faculty" },
    { name: "Yambao, Jaymark",       email: "jyambao@psu.edu.ph",    department: "Computing Studies", position: "Faculty" },
    { name: "Guadalupe, Ariel",      email: "aguadalupe@psu.edu.ph", department: "Computing Studies", position: "Faculty" },
    { name: "Dela Cruz, Kit Alfred", email: "kdelacruz@psu.edu.ph",  department: "Computing Studies", position: "Faculty" },
    { name: "Miranda, John Paul",    email: "jpmiranda@psu.edu.ph",  department: "Computing Studies", position: "Faculty" },
    { name: "Quizon, Nhica",         email: "nquizon@psu.edu.ph",    department: "Computing Studies", position: "Faculty" },
  ];

  for (const s of staffList) {
    await prisma.user.upsert({
      where:  { email: s.email },
      update: {},
      create: { ...s, password: staffPassword, role: "STAFF", status: "APPROVED" },
    });
  }
  console.log(`✅ ${staffList.length} approved staff created`);

  const pendingList = [
    { name: "Reyes, Maria Santos",  email: "msreyes@psu.edu.ph",    department: "Information Technology", position: "Faculty" },
    { name: "Cruz, Emmanuel T.",    email: "etcruz@psu.edu.ph",     department: "Computer Science",       position: "Faculty" },
    { name: "Santos, Patricia L.",  email: "plsantos@psu.edu.ph",   department: "Information Technology", position: "Faculty" },
    { name: "Bautista, Rodel M.",   email: "rmbautista@psu.edu.ph", department: "Computer Science",       position: "Faculty" },
  ];

  for (const p of pendingList) {
    await prisma.user.upsert({
      where:  { email: p.email },
      update: {},
      create: { ...p, password: staffPassword, role: "STAFF", status: "PENDING" },
    });
  }
  console.log(`✅ ${pendingList.length} pending users created`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());