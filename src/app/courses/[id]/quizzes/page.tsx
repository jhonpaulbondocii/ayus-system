import MainLayout from "@/components/layout/MainLayout";
import QuizzesPage from "@/components/staff/QuizzesPage";

type Props = { params: Promise<{ courseId: string }> };

export default async function QuizzesRoute({ params }: Props) {
  const { courseId } = await params;
  return (
    <MainLayout>
      <QuizzesPage courseId={courseId} />
    </MainLayout>
  );
}