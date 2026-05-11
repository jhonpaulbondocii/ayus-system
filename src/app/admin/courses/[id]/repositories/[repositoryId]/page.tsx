// src/app/admin/courses/[id]/repositories/[repositoryId]/page.tsx
import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseRepositoriesPage from "@/components/admin/AdminCourseRepositoriesPage";

type Props = { params: Promise<{ id: string; repositoryId: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Repositories">
      <AdminCourseRepositoriesPage courseId={id} />
    </CourseLayout>
  );
}