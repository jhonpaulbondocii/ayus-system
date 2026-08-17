"use client";

import { useRouter } from "next/navigation";
import AdminAssignmentForm from "@/components/admin/AdminAssignmentForm";

interface Props {
  courseId: string;
  assignmentId: string;
}

export default function AssignmentEditClient({ courseId, assignmentId }: Props) {
  const router = useRouter();

  return (
    <AdminAssignmentForm
      courseId={courseId}
      assignmentId={assignmentId}
      onSaved={() => router.push(`/admin/courses/${courseId}/assignments`)}
      onCancel={() => router.push(`/admin/courses/${courseId}/assignments`)}
    />
  );
}