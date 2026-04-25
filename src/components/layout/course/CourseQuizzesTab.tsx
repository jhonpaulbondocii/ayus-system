// src/components/layout/course/CourseQuizzesTab.tsx
"use client";

import CourseFormsPage from "@/components/layout/CourseFormsPage";

interface Props {
  courseId: string;
}

export default function CourseQuizzesTab({ courseId }: Props) {
  return <CourseFormsPage courseId={courseId} />;
}