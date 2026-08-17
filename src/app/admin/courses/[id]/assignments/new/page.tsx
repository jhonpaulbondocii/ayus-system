import { Suspense } from "react";
import CourseLayout from "@/components/admin/CourseLayout";
import AssignmentNewClient from "./AssignmentNewClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ name?: string; points?: string; group?: string }>;
};

export default async function Page(props: Props) {
  const searchParams = await props.searchParams;
  const { id } = await props.params;
  const sp = searchParams ? await searchParams : {};

  return (
    <CourseLayout courseId={id} activeItem="Assignments" subItem="Create new">
      <Suspense fallback={<div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>}>
        <AssignmentNewClient
          courseId={id}
          initialName={sp.name}
          initialPoints={sp.points}
          initialGroup={sp.group}
        />
      </Suspense>
    </CourseLayout>
  );
}