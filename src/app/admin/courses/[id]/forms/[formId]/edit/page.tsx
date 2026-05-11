// src/app/admin/courses/[id]/forms/[formId]/edit/page.tsx

import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseFormCreateEditPage from "@/components/admin/AdminCourseFormCreateEditPage";

type Props = { params: Promise<{ id: string; formId: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;

  return (
    <CourseLayout courseId={id} activeItem="Forms" subItem="Edit Form">
      <AdminCourseFormCreateEditPage />
    </CourseLayout>
  );
}