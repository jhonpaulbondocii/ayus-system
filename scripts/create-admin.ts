// scripts/create-admin.ts
// Run: npx ts-node scripts/create-admin.ts

import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email    = "admin@psu.edu.ph"; // ← palitan ng email mo
  const password = "admin123";          // ← palitan ng password mo
  const name     = "Admin";             // ← palitan ng name mo

  const hash = await bcrypt.hash(password, 10);

  // Kung may existing user na — i-update lang ang password
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data:  { password: hash, role: "ADMIN", status: "APPROVED" },
    });
    console.log(`✅ Updated password for ${email}`);
  } else {
    // Kung wala pa — gumawa ng bago
    await prisma.user.create({
      data: {
        email,
        name,
        password: hash,
        role:     "ADMIN",
        status:   "APPROVED",
      },
    });
    console.log(`✅ Created admin user: ${email}`);
  }

  console.log(`🔑 Password hash: ${hash}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());