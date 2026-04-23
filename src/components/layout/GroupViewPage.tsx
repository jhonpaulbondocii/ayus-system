"use client";

// src/components/layout/GroupViewPage.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GroupHomePage from "@/components/layout/GroupHomePage";

interface GroupDetail {
  id:         string;
  name:       string;
  courseId:   string;
  courseName: string;
}

export default function GroupViewPage({ courseId, groupId }: { courseId: string; groupId: string }) {
  const router   = useRouter();
  const [group,    setGroup]    = useState<GroupDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/groups/${groupId}`)
      .then(r => r.json())
      .then(d => {
        if (!d?.group) setNotFound(true);
        else setGroup(d.group);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [courseId, groupId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      Loading...
    </div>
  );

  if (notFound || !group) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-sm text-gray-500">Group not found.</p>
      <button onClick={() => router.back()} className="text-sm text-[#0770a2] hover:underline">
        ← Go back
      </button>
    </div>
  );

  return (
    <GroupHomePage
      groupName={group.name}
      parentName={group.courseName}
      onBack={() => router.push(`/courses/${courseId}`)}
      courseId={courseId}
      groupId={groupId}
    />
  );
}