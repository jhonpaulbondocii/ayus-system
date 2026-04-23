"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface GroupSetItem {
  id: string;
  name: string;
  courseName: string;
  courseId: string;
  groupCount: number;
  memberCount: number;
  createdAt: string;
}

export default function AdminGroupsPage() {
  const router = useRouter();
  const [groupSets, setGroupSets] = useState<GroupSetItem[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/admin/groupsets")
      .then(r => r.json())
      .then(d => { setGroupSets(d.groupSets ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const goToGroupSet = (gs: GroupSetItem) => {
    router.push(`/admin/courses/${gs.courseId}/people?tab=groups&groupSet=${gs.id}`);
  };

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif",
      padding: "24px 32px",
      background: "#fff",
      minHeight: "100vh",
    }}>

      {/* Breadcrumb */}
      <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Groups
      </p>
      <div style={{ borderBottom: "1px solid #f0e4e4", marginBottom: 24 }} />

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 16, marginTop: 0 }}>
          Current Groups
        </h2>

        {loading ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
        ) : groupSets.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>No Groups</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f0e4e4" }}>
                {[["Group", "33%"], ["Course", "50%"], ["Term", "17%"]].map(([label, w]) => (
                  <th key={label} style={{
                    textAlign: "left", padding: "8px 0",
                    fontSize: 11, fontWeight: 700, color: "#7b1113",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    width: w,
                  }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupSets.map((gs, i) => (
                <tr key={gs.id}
                  style={{ borderBottom: "1px solid #f9fafb", background: i % 2 === 0 ? "#fff" : "#fdf8f8" }}>
                  <td style={{ padding: "10px 0", fontSize: 13 }}>
                    <button
                      onClick={() => goToGroupSet(gs)}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#7b1113", fontSize: 13, fontWeight: 600 }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                    >
                      {gs.name}
                    </button>
                  </td>
                  <td style={{ padding: "10px 0", fontSize: 13, color: "#4b5563" }}>
                    {gs.courseName}
                  </td>
                  <td style={{ padding: "10px 0", fontSize: 13, color: "#9ca3af" }}>
                    {""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}