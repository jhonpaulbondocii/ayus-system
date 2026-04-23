import CourseLayout from "@/components/admin/CourseLayout";
import CourseSyllabusPage from "@/components/admin/CourseSyllabusPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Syllabus">
      <CourseSyllabusPage />
    </CourseLayout>
  );
}