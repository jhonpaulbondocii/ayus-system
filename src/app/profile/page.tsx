// src/app/profile/page.tsx
import MainLayout from "@/components/layout/MainLayout";
import ProfilePage from "@/components/staff/ProfilePage";

export default function Profile() {
  return (
    <MainLayout>
      <ProfilePage />
    </MainLayout>
  );
}