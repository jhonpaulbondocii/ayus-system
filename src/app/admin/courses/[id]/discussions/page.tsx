import CourseLayout from "@/components/admin/CourseLayout";
import CourseDiscussionsPage from "@/components/admin/CourseDiscussionsPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Discussions">
      <CourseDiscussionsPage />
    </CourseLayout>
  );
}