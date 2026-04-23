import CourseLayout from "@/components/admin/CourseLayout";
import CourseSettingsPage from "@/components/admin/CourseSettingsPage";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  const course = await prisma.course.findUnique({
    where:  { id },
    select: {
      name:   true,
      code:   true,
      status: true,
      image:  true,
    },
  });

  return (
    <CourseLayout courseId={id} courseName={course?.name ?? ""} activeItem="Settings">
      <CourseSettingsPage
        courseId={id}
        initialName={course?.name   ?? ""}
        initialCode={course?.code   ?? ""}
        initialStatus={course?.status ?? "UNPUBLISHED"}
        initialImage={course?.image  ?? ""}
      />
    </CourseLayout>
  );
}