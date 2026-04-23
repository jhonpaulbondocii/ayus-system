import { Suspense } from "react";
import AdminCalendarPage from "@/components/admin/AdminCalendarPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminCalendarPage />
    </Suspense>
  );
}