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

const FONT = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

function GroupItem({ g, onClick }: { g: GroupEntry; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        background: hovered ? "#fdf8f8" : "none",
        border: "none",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer",
        padding: "7px 4px",
        borderRadius: 4,
        fontFamily: FONT,
        transition: "background 0.1s",
      }}
    >
      <p style={{ fontSize: 13, color: "#7b1113", fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
        {g.name}
      </p>
      <p style={{ fontSize: 11, color: "#9ca3af", margin: "1px 0 0", fontWeight: 500 }}>
        {g.courseName}
      </p>
    </button>
  );
}

export default function AdminGroupsPanel({ onClose, onNavigate }: AdminGroupsPanelProps) {
  const router = useRouter();
  const [groups,  setGroups]  = useState<GroupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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

  return (
    <>
      {/* Backdrop on mobile */}
      {isMobile && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.2)",
            zIndex: 109,
          }}
          onClick={onClose}
        />
      )}

      <div
        style={{
          position: "fixed",
          fontFamily: FONT,
          background: "#fff",
          zIndex: 110,
          display: "flex",
          flexDirection: "column",
          // Mobile: bottom sheet
          // Desktop: side panel
          ...(isMobile
            ? {
                bottom: 0,
                left: 0,
                right: 0,
                height: "75vh",
                borderRadius: "16px 16px 0 0",
                borderTop: "1px solid #e8d5d5",
                boxShadow: "0 -4px 20px rgba(123,17,19,0.08)",
              }
            : {
                top: 0,
                left: 64,
                height: "100%",
                width: 288,
                borderRight: "1px solid #e8d5d5",
                boxShadow: "2px 0 10px rgba(123,17,19,0.06)",
              }
          ),
        }}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 9999, background: "#e5e7eb" }} />
          </div>
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isMobile ? "10px 16px 10px" : "14px 16px 12px",
            borderBottom: "1px solid #f0e4e4",
            flexShrink: 0,
          }}
        >
          <h1 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>Groups</h1>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid #e5e7eb", borderRadius: 6,
              background: "none", cursor: "pointer", color: "#9ca3af",
              transition: "all 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7b1113"; e.currentTarget.style.color = "#7b1113"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#9ca3af"; }}
          >
            <X size={12} />
          </button>
        </div>

        {/* All Groups link */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0e4e4", flexShrink: 0 }}>
          <button
            onClick={() => navigate("/admin/groups")}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: 13, fontWeight: 700, color: "#7b1113", fontFamily: FONT,
            }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
          >
            All Groups
          </button>
        </div>

        <div style={{ height: 1, background: "#e8d5d5", margin: "0 16px", flexShrink: 0 }} />

        {/* Group list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
          ) : groups.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>No groups yet.</p>
          ) : (
            groups.map(g => (
              <GroupItem
                key={g.id}
                g={g}
                onClick={() => navigate(`/admin/courses/${g.courseId}/people?tab=groups&groupSet=${g.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}