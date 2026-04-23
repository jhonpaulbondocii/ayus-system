import CourseLayout from "@/components/admin/CourseLayout";
import QuizzesPage from "@/components/admin/QuizzesPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Quizzes">
      <QuizzesPage courseId={id} />
    </CourseLayout>
  );
}