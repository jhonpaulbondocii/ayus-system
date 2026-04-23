import CourseLayout from "@/components/admin/CourseLayout";
import CourseOutcomesPage from "@/components/admin/CourseOutcomesPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Outcomes">
      <CourseOutcomesPage />
    </CourseLayout>
  );
}