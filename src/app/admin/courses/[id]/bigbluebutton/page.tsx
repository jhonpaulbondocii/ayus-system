// src/app/admin/courses/[id]/bigbluebutton/page.tsx
import CourseLayout from "@/components/admin/CourseLayout";
import BigBlueButtonPage from "@/components/admin/BigBlueButtonPage";

interface Props { params: { id: string } }

export default function Page({ params }: Props) {
  return (
    <CourseLayout courseId={params.id} courseName="Computing Studies" activeItem="BigBlueButton">
      <BigBlueButtonPage />
    </CourseLayout>
  );
}