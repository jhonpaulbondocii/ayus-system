// src/app/admin/courses/[id]/people/[userId]/page.tsx
import CourseLayout from "@/components/admin/CourseLayout";
import UserDetailsPage from "@/components/admin/UserDetailsPage";

type Props = { params: Promise<{ id: string; userId: string }> };

export default async function Page({ params }: Props) {
  const { id, userId } = await params;
  return (
    <CourseLayout courseId={id} activeItem="People">
      <UserDetailsPage courseId={id} userId={userId} />
    </CourseLayout>
  );
}