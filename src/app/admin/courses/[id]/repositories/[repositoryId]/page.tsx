// src/app/admin/courses/[id]/repositories/[repositoryId]/page.tsx
import CourseLayout from "@/components/admin/CourseLayout";
import AdminRepositoryPage from "@/components/admin/AdminRepositoryPage";

type Props = { params: Promise<{ id: string; repositoryId: string }> };

export default async function Page({ params }: Props) {
  const { id, repositoryId } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Repositories">
      <AdminRepositoryPage courseId={id} repositoryId={repositoryId} />
    </CourseLayout>
  );
}