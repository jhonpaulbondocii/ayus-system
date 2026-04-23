import CourseLayout from "@/components/admin/CourseLayout";
import CourseAnnouncementsPage from "@/components/admin/CourseAnnouncementsPage";

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return (
    <CourseLayout courseId={id} activeItem="Announcements">
      <CourseAnnouncementsPage courseId={id} />
    </CourseLayout>
  );
}