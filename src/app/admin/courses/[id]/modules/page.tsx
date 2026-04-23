import CourseLayout from "@/components/admin/CourseLayout";
import ModulesPage from "@/components/admin/ModulesPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Modules">
      <ModulesPage />
    </CourseLayout>
  );
}