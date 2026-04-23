import { Suspense } from "react";
import MainLayout from "@/components/layout/MainLayout";
import CourseViewPage from "@/components/layout/CourseViewPage";

type Props = { params: Promise<{ id: string }> };

export default async function CoursePage({ params }: Props) {
  const { id } = await params;
  return (
    <MainLayout>
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>}>
        <CourseViewPage courseId={id} />
      </Suspense>
    </MainLayout>
  );
}