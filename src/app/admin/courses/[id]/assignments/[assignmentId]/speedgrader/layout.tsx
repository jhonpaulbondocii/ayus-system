// src/app/admin/courses/[id]/assignments/[assignmentId]/speedgrader/layout.tsx
// NOTE: This file is intentionally minimal.
// The IconBar/sidebar is suppressed via AdminLayout.tsx (pathname.includes("/speedgrader") check).
// This layout just passes children through cleanly.

export default function SpeedGraderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}