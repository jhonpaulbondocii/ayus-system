import CourseLayout from "@/components/admin/CourseLayout";
import CourseFilesPage from "@/components/admin/CourseFilesPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Files">
      <CourseFilesPage />
    </CourseLayout>
  );
}