// src/app/notifications/page.tsx
import MainLayout from "@/components/layout/MainLayout";
import NotificationSettings from "@/components/staff/NotificationSettings";

export default function NotificationsPage() {
  return (
    <MainLayout>
      <NotificationSettings />
    </MainLayout>
  );
}