"use client";

import { useRouter } from "next/navigation";
import AdminAssignmentForm from "@/components/admin/AdminAssignmentForm";

interface Props {
  courseId: string;
  initialName?: string;
  initialPoints?: string;
  initialGroup?: string;
}

export default function AssignmentNewClient({
  courseId,
  initialName,
  initialPoints,
  initialGroup,
}: Props) {
  const router = useRouter();

  return (
    <AdminAssignmentForm
      courseId={courseId}
      initialName={initialName}
      initialPoints={initialPoints}
      initialGroup={initialGroup}
      onSaved={() => router.push(`/admin/courses/${courseId}/assignments`)}
      onCancel={() => router.push(`/admin/courses/${courseId}/assignments`)}
    />
  );
}