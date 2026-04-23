// src/app/inbox/page.tsx
import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { redirect }         from "next/navigation";
import MainLayout           from "@/components/layout/MainLayout";
import InboxPage            from "@/components/staff/InboxPage";

export default async function Inbox() {
  const session = await getServerSession(authOptions);

  // If not logged in, redirect to login
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <MainLayout>
      <InboxPage currentUserId={session.user.id} />
    </MainLayout>
  );
}