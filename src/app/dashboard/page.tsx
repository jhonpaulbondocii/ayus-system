// src/app/dashboard/page.tsx
import MainLayout from "@/components/layout/MainLayout";
import DashboardPage from "@/components/staff/DashboardPage";

export default function Dashboard() {
  return (
    <MainLayout>
      <DashboardPage />
    </MainLayout>
  );
}