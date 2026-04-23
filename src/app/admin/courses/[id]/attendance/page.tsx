// src/app/admin/courses/[id]/attendance/page.tsx

import CourseLayout from "@/components/admin/CourseLayout";
import AttendancePage from "@/components/admin/AttendancePage";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  // Fetch course name server-side — no loading flicker, no empty string
  const course = await prisma.course.findUnique({
    where: { id },
    select: { name: true },
  });

  return (
    <CourseLayout courseId={id} activeItem="Attendance" courseName={course?.name ?? ""}>
      <AttendancePage courseId={id} courseName={course?.name ?? ""} />
    </CourseLayout>
  );
}