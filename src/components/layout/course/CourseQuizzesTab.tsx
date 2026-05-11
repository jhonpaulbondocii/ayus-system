// src/components/layout/course/CourseQuizzesTab.tsx
"use client";

import CourseFormsPage from "@/components/layout/CourseFormsPage";

interface Props {
  courseId: string;
  isHead?: boolean;
  canManageForms?: boolean;
  currentUserId?: string | null;
}

export default function CourseQuizzesTab({ courseId, isHead, canManageForms, currentUserId }: Props) {
  return (
    <CourseFormsPage
      courseId={courseId}
      isHead={isHead}
      canManageForms={canManageForms}
      currentUserId={currentUserId}
    />
  );
}