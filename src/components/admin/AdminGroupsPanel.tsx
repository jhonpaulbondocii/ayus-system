"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface GroupEntry {
  id:         string;
  name:       string;
  courseName: string;
  courseId:   string;
}

interface AdminGroupsPanelProps {
  onClose:     () => void;
  onNavigate?: (url: string) => void;
}

export default function AdminGroupsPanel({ onClose, onNavigate }: AdminGroupsPanelProps) {
  const router = useRouter();
  const [groups,  setGroups]  = useState<GroupEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/courses")
      .then(r => r.json())
      .then(async (d) => {
        const courses: { id: string; name: string }[] = d.courses ?? [];
        const allGroups: GroupEntry[] = [];

        await Promise.all(
          courses.map(async (course) => {
            try {
              const res  = await fetch(`/api/admin/courses/${course.id}/groupsets`);
              const data = await res.json();
              const sets: { id: string; name: string }[] = data.groupSets ?? [];
              sets.forEach(gs => {
                allGroups.push({
                  id:         gs.id,
                  name:       gs.name,
                  courseId:   course.id,
                  courseName: course.name,
                });
              });
            } catch { /* skip */ }
          })
        );

        setGroups(allGroups);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const navigate = (url: string) => {
    if (onNavigate) { onNavigate(url); }
    else { router.push(url); onClose(); }
  };

  // Group entries by courseName
  const grouped = groups.reduce<Record<string, GroupEntry[]>>((acc, g) => {
    if (!acc[g.courseName]) acc[g.courseName] = [];
    acc[g.courseName].push(g);
    return acc;
  }, {});

  const courseNames = Object.keys(grouped);

  return (
    <div
      className="fixed top-0 left-16 h-full w-72 bg-white border-r border-gray-200 shadow-xl z-[110] flex flex-col"
      style={{ fontFamily: "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 shrink-0 border-b border-gray-100">
        <h1 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Groups</h1>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400"
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#7b1113"; e.currentTarget.style.color = "#7b1113"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#9ca3af"; }}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* All Groups link */}
      <div className="px-4 py-3 shrink-0 border-b border-gray-100">
        <button
          onClick={() => navigate("/admin/groups")}
          style={{ fontSize: 12, fontWeight: 600, color: "#7b1113", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
        >
          All Groups
        </button>
      </div>

      {/* Grouped list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p style={{ fontSize: 12, color: "#9ca3af", padding: "12px 16px" }}>Loading...</p>
        ) : courseNames.length === 0 ? (
          <p style={{ fontSize: 12, color: "#9ca3af", padding: "12px 16px" }}>No groups yet.</p>
        ) : (
          courseNames.map(courseName => (
            <div key={courseName} style={{ padding: "12px 16px 6px" }}>
              {/* Course label */}
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: 6 }}>
                {courseName}
              </p>
              {/* Groups under this course */}
              {grouped[courseName].map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/admin/courses/${g.courseId}/people?tab=groups&groupSet=${g.id}`)}
                  style={{
                    background: "none", border: "none",
                    borderBottom: i < grouped[courseName].length - 1 ? "1px solid #f9fafb" : "none",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    gap: 8, padding: "6px 0", width: "100%", textAlign: "left",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                >
                  {/* dot */}
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7b1113", flexShrink: 0, display: "inline-block" }}/>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#7b1113", lineHeight: 1.3 }}>
                    {g.name}
                  </span>
                </button>
              ))}
              {/* Section divider */}
              <div style={{ borderTop: "1px solid #f0e4e4", marginTop: 8 }}/>
            </div>
          ))
        )}
      </div>
    </div>
  );
}