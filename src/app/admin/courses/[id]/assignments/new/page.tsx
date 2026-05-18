// src/app/admin/courses/[id]/assignments/new/page.tsx
import { Suspense } from "react";
import CourseLayout from "@/components/admin/CourseLayout";
import CreateAssignmentPage from "@/components/admin/CreateAssignmentPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Assignments" subItem="Create new">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64 text-sm text-gray-400">
            Loading...
          </div>
        }
      >
        <CreateAssignmentPage courseId={id} />
      </Suspense>
    </CourseLayout>
  );
}