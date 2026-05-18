import CourseLayout from "@/components/admin/CourseLayout";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Files">
      <div>Files coming soon...</div>
    </CourseLayout>
  );
}