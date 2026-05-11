// src/app/courses/[id]/forms/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CourseFormsPage from "@/components/layout/CourseFormsPage";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function FormsPage({ params }: Props) {
  const { id: courseId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as { id?: string; role?: string };

  return (
    <div className="h-full">
      <CourseFormsPage
        courseId={courseId}
        currentUserId={user.id ?? null}
      />
    </div>
  );
}