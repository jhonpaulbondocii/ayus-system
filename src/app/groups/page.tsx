"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";

interface GroupItem {
  id:         string;
  name:       string;
  courseName: string;
  courseId:   string;
  term:       string | null;
}

export default function Groups() {
  const router = useRouter();
  const [groups,  setGroups]  = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then(r => r.json())
      .then(d => { setGroups(d.groups ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const goToGroup = (g: GroupItem) => {
    router.push(`/courses/${g.courseId}/groups/${g.id}`);
  };

  // Group by courseName — same pattern as admin
  const grouped = groups.reduce<Record<string, GroupItem[]>>((acc, g) => {
    if (!acc[g.courseName]) acc[g.courseName] = [];
    acc[g.courseName].push(g);
    return acc;
  }, {});

  const courseNames = Object.keys(grouped);

  return (
    <MainLayout>
      <div
        style={{
          fontFamily: "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif",
          padding: "24px 32px",
          background: "#fff",
          minHeight: "100vh",
        }}
      >
        {/* Breadcrumb label */}
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#9ca3af",
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Groups
        </p>

        {/* Divider */}
        <div style={{ borderBottom: "1px solid #f0e4e4", marginBottom: 24 }} />

        <section>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#111827",
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            My Groups
          </h2>

          {loading ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading...</p>
          ) : groups.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>No groups assigned yet.</p>
          ) : (
            courseNames.map(courseName => (
              <div key={courseName} style={{ marginBottom: 28 }}>

                {/* Course section header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "#9ca3af",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {courseName}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "#f0e4e4" }} />
                </div>

                {/* Table */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f0e4e4" }}>
                      {([["Group", "44%"], ["Course", "38%"], ["Term", "18%"]] as [string, string][]).map(([label, w]) => (
                        <th
                          key={label}
                          style={{
                            textAlign: "left",
                            padding: "8px 0",
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#7b1113",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            width: w,
                          }}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[courseName].map((g, i) => (
                      <tr
                        key={g.id}
                        style={{
                          borderBottom: "1px solid #f9fafb",
                          background: i % 2 === 0 ? "#fff" : "#fdf8f8",
                        }}
                      >
                        {/* Group name */}
                        <td style={{ padding: "10px 0", fontSize: 13 }}>
                          <button
                            onClick={() => goToGroup(g)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              color: "#7b1113",
                              fontSize: 13,
                              fontWeight: 600,
                              fontFamily: "inherit",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#7b1113",
                                flexShrink: 0,
                                display: "inline-block",
                              }}
                            />
                            {g.name}
                          </button>
                        </td>

                        {/* Course */}
                        <td style={{ padding: "10px 0", fontSize: 13, color: "#4b5563" }}>
                          {g.courseName}
                        </td>

                        {/* Term */}
                        <td style={{ padding: "10px 0", fontSize: 13, color: "#9ca3af" }}>
                          {g.term ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </section>
      </div>
    </MainLayout>
  );
}