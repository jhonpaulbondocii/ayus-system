// src/app/courses/[id]/people/[userId]/page.tsx
import MainLayout from "@/components/layout/MainLayout";
import CoursePersonPage from "@/components/layout/CoursePersonPage";

type Props = { params: Promise<{ id: string; userId: string }> };

export default async function Page({ params }: Props) {
  const { id, userId } = await params;
  return (
    <MainLayout>
      <CoursePersonPage courseId={id} userId={userId} />
    </MainLayout>
  );
}