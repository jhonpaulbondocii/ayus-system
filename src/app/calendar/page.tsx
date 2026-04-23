// src/app/calendar/page.tsx
import MainLayout from "@/components/layout/MainLayout";
import CalendarPage from "@/components/staff/CalendarPage";

export default function Calendar() {
  return (
    <MainLayout>
      <CalendarPage />
    </MainLayout>
  );
}