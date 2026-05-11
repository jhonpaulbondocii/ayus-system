// src/app/admin/courses/[id]/forms/page.tsx

import CourseLayout from "@/components/admin/CourseLayout";
import AdminCourseFormsPage from "@/components/admin/AdminCourseFormsPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string })?.id ?? null;
  const currentUserName = session?.user?.name ?? null;

  return (
    <CourseLayout courseId={id} activeItem="Forms">
      <AdminCourseFormsPage
        courseId={id}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
    </CourseLayout>
  );
}