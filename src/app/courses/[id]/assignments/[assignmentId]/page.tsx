// src/app/courses/[id]/assignments/[assignmentId]/page.tsx
import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string; assignmentId: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  // Redirect to the course assignments tab — the sidebar lives there
  redirect(`/courses/${id}?tab=Assignments`);
}