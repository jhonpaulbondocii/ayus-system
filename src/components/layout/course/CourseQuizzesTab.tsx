// src/components/layout/course/CourseQuizzesTab.tsx
"use client";

import CourseFormsPage from "@/components/layout/CourseFormsPage";

interface Props {
  courseId: string;
  isHead?: boolean;
  isStaff?: boolean;
  isFaculty?: boolean;
  canDelete?: boolean;
  canManageForms?: boolean;
  currentUserId?: string | null;
}

export default function CourseQuizzesTab({
  courseId,
  isHead,
  isStaff,
  isFaculty,
  canDelete = false,
  canManageForms,
  currentUserId,
}: Props) {
  return (
    <CourseFormsPage
      courseId={courseId}
      isHead={isHead}
      isStaff={isStaff}
      isFaculty={isFaculty}
      canDelete={canDelete}
      canManageForms={canManageForms}
      currentUserId={currentUserId}
    />
  );
}