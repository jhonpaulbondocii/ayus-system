import { Suspense } from "react";
import CourseLayout from "@/components/admin/CourseLayout";
import CoursePeoplePage from "@/components/admin/CoursePeoplePage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="People">
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>}>
        <CoursePeoplePage />
      </Suspense>
    </CourseLayout>
  );
}