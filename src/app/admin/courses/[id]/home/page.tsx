import CourseLayout from "@/components/admin/CourseLayout";
import CourseHomePage from "@/components/admin/CourseHomePage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Home">
      <CourseHomePage courseId={id} courseName="" />
    </CourseLayout>
  );
}