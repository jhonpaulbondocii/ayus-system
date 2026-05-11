// src/app/admin/courses/[id]/forms/new/page.tsx

import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseFormCreateEditPage from "@/components/admin/AdminCourseFormCreateEditPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <CourseLayout courseId={id} activeItem="Forms" subItem="New Form">
      <AdminCourseFormCreateEditPage />
    </CourseLayout>
  );
}