import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export async function resolveAnnouncementRecipients(
  courseId: string,
  assignTo: string[]
): Promise<{ email: string; name: string }[]> {
  // "Everyone" → all users enrolled in the course regardless of role
  if (assignTo.includes("Everyone")) {
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    return enrollments.map((e) => ({
      email: e.user.email,
      name: e.user.name,
    }));
  }

  const recipients: { email: string; name: string }[] = [];

  for (const target of assignTo) {
    // Check if target matches a courseRole (e.g. "Student", "Teacher", "TA")
    const byRole = await prisma.courseEnrollment.findMany({
      where: {
        courseId,
        courseRole: { equals: target, mode: "insensitive" },
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (byRole.length > 0) {
      byRole.forEach((e) =>
        recipients.push({ email: e.user.email, name: e.user.name })
      );
      continue;
    }

    // Check if target matches a specific enrolled user's name
    const byName = await prisma.courseEnrollment.findFirst({
      where: {
        courseId,
        user: { name: { equals: target, mode: "insensitive" } },
      },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (byName) {
      recipients.push({ email: byName.user.email, name: byName.user.name });
    }
  }

  // Deduplicate by email
  const seen = new Set<string>();
  return recipients.filter(({ email }) => {
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });
}