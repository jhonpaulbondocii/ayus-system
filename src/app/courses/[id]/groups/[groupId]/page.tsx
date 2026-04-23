// src/app/courses/[id]/groups/[groupId]/page.tsx
import MainLayout from "@/components/layout/MainLayout";
import GroupViewPage from "@/components/layout/GroupViewPage";

type Props = { params: Promise<{ id: string; groupId: string }> };

export default async function Page({ params }: Props) {
  const { id, groupId } = await params;
  return (
    <MainLayout>
      <GroupViewPage courseId={id} groupId={groupId} />
    </MainLayout>
  );
}