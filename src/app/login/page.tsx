import { Suspense } from "react";
import LoginPage from "@/components/ui/LoginPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}