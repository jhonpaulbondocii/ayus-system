import CourseLayout from "@/components/admin/CourseLayout";
import RubricsPage from "@/components/admin/RubricsPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Rubrics">
      <RubricsPage />
    </CourseLayout>
  );
}