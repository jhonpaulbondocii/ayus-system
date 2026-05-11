// src/app/admin/courses/[id]/forms/[formId]/page.tsx

import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseFormDetailPage from "@/components/admin/AdminCourseFormDetailPage";

type Props = { params: Promise<{ id: string; formId: string }> };

export default async function Page({ params }: Props) {
  const { id, formId } = await params;

  return (
    <CourseLayout courseId={id} activeItem="Forms" subItem="View Form">
      <AdminCourseFormDetailPage courseId={id} formId={formId} />
    </CourseLayout>
  );
}