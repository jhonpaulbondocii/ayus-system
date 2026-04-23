import { Suspense } from "react";
import AdminLoginPage from "@/components/admin/AdminLoginPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminLoginPage />
    </Suspense>
  );
}