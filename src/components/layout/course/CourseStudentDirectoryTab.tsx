"use client";
// src/components/layout/course/CourseStudentDirectoryTab.tsx
// READ-ONLY: students cannot be added, edited, or deleted here.

import { useEffect, useMemo, useState } from "react";
import {
  FONT, MAROON, SEVERITY_LABEL, SEVERITY_COLOR, STATUS_LABEL, STATUS_COLOR,
  input, btn, Badge, fmtDate, type ViolationRow,
} from "./osaShared";

type StudentRow = {
  id: string;
  studentNumber: string;
  name: string;
  course: string | null;
  email?: string | null;
  department?: string | null;
  birthDate?: string | null;
  dateOfBirth?: string | null;
  age?: number | null;
  guardianName?: string | null;
  guardianContact?: string | null;
};

// Auto-compute age from birthdate
function computeAge(birth?: string | null): number | null {
  if (!birth) return null;
  const b = new Date(birth);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 ? age : null;
}

const birthOf = (s: StudentRow) => s.birthDate ?? s.dateOfBirth ?? null;
const ageOf = (s: StudentRow) => computeAge(birthOf(s)) ?? s.age ?? null;

export default function CourseStudentDirectoryTab({
  courseId,
}: {
  courseId: string;
  isHead?: boolean;
}) {
  const base = `/api/courses/${courseId}/osa`;
  const [q, setQ] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<StudentRow | null>(null);

  // student list (debounced search)
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`${base}/students?q=${encodeURIComponent(q.trim())}`)
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(d.error ?? "Failed to load");
          setStudents(d.students ?? []);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [base, q]);

  const courses = useMemo(
    () => [...new Set(students.map((s) => s.course).filter(Boolean))].sort() as string[],
    [students]
  );

  const filtered = useMemo(
    () => students.filter((s) => !courseFilter || s.course === courseFilter),
    [students, courseFilter]
  );

  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 800, color: "#374151", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "9px 10px", fontSize: 12.5, borderTop: "1px solid #f3f4f6" };

  return (
    <div style={{ padding: 24, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Student Directory</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>
            {filtered.length} student(s) · View only. Click a student to view their records.
          </p>
        </div>
        <input
          style={{ ...input, width: 240 }}
          placeholder="Name, student no., or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          style={{ ...input, width: 220 }}
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="">All courses</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Student No.</th>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Course</th>
              <th style={th}>Birthdate</th>
              <th style={th}>Age</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={{ ...td, color: "#9ca3af" }} colSpan={6}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td style={{ ...td, color: "#9ca3af" }} colSpan={6}>No students found.</td></tr>
            ) : filtered.map((s) => (
              <tr
                key={s.id}
                onClick={() => setSelected(s)}
                style={{ cursor: "pointer", background: selected?.id === s.id ? "#fdf8f8" : undefined }}
              >
                <td style={{ ...td, fontFamily: "monospace" }}>{s.studentNumber}</td>
                <td style={td}><b>{s.name}</b></td>
                <td style={td}>{s.email ?? "—"}</td>
                <td style={td}>{s.course ?? "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{birthOf(s) ? fmtDate(birthOf(s)) : "—"}</td>
                <td style={td}>{ageOf(s) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <StudentRecordPanel base={base} student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ───────────── Student record panel (violation history) ─────────────
function StudentRecordPanel({
  base, student, onClose,
}: {
  base: string; student: StudentRow; onClose: () => void;
}) {
  const [cases, setCases] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${base}/violations?q=${encodeURIComponent(student.studentNumber)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Failed to load");
        if (!cancelled) {
          const all: ViolationRow[] = d.violations ?? [];
          setCases(all.filter((v) => v.student.id === student.id));
        }
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [base, student.id, student.studentNumber]);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const count = (sev: string) => cases.filter((c) => c.severity === sev).length;
  const open = cases.filter((c) => c.status === "OPEN" || c.status === "UNDER_REVIEW").length;
  const latest = cases.length
    ? [...cases].sort((a, b) => +new Date(b.incidentDate) - +new Date(a.incidentDate))[0]
    : null;

  const initials = student.name
    .split(/[ ,]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");

  const sectionTitle: React.CSSProperties = {
    margin: "0 0 10px", fontSize: 12, fontWeight: 800, color: MAROON,
    textTransform: "uppercase", letterSpacing: 0.6,
  };
  const card: React.CSSProperties = {
    border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff", marginBottom: 16,
  };

  const field = (label: string, value?: string | number | null) => (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: value ? "#111827" : "#9ca3af", wordBreak: "break-word" }}>
        {value !== null && value !== undefined && value !== "" ? value : "—"}
      </div>
    </div>
  );

  const stats = [
    { l: "Total Cases", v: cases.length, c: "#111827" },
    { l: "Minor", v: count("MINOR"), c: "#b45309" },
    { l: "Serious", v: count("SERIOUS"), c: "#c2410c" },
    { l: "Very Serious", v: count("VERY_SERIOUS"), c: "#b91c1c" },
    { l: "Active", v: open, c: MAROON },
  ];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 200, display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#f9fafb", width: "100%", maxWidth: 760, height: "100%", overflowY: "auto", fontFamily: FONT, boxShadow: "-8px 0 24px rgba(0,0,0,.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: MAROON, color: "#fff", padding: "20px 24px", display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,.18)",
            display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 17, flexShrink: 0,
          }}>
            {initials || "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{student.name}</div>
            <div style={{ fontSize: 12.5, opacity: 0.85, fontFamily: "monospace", marginTop: 2 }}>
              {student.studentNumber}{student.course ? ` · ${student.course}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              height: 34, padding: "0 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,.7)",
              background: "#fff", color: MAROON, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: FONT,
            }}
          >
            ✕ Close
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Student information */}
          <div style={card}>
            <h3 style={sectionTitle}>Student Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px 24px" }}>
              {field("Student No.", student.studentNumber)}
              {field("Email", student.email)}
              {field("Course", student.course)}
              {field("Birthdate", birthOf(student) ? fmtDate(birthOf(student)) : null)}
              {field("Age", ageOf(student))}
            </div>
          </div>

          {/* Guardian information */}
          {(student.guardianName || student.guardianContact) && (
            <div style={card}>
              <h3 style={sectionTitle}>Guardian Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px 24px" }}>
                {field("Guardian Name", student.guardianName)}
                {field("Guardian Contact", student.guardianContact)}
              </div>
            </div>
          )}

          {/* Disciplinary summary */}
          <div style={card}>
            <h3 style={sectionTitle}>Disciplinary Summary</h3>
            {loading ? (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>Loading…</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                  {stats.map((s) => (
                    <div key={s.l} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", background: "#fafafa" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 12 }}>
                  Latest incident: <b style={{ color: "#111827" }}>{latest ? fmtDate(latest.incidentDate) : "None on record"}</b>
                </div>
              </>
            )}
          </div>

          {/* Violation history */}
          <div style={card}>
            <h3 style={sectionTitle}>Violation History ({cases.length})</h3>

            {error && <div style={{ color: "#b91c1c", fontSize: 13 }}>{error}</div>}
            {loading ? (
              <div style={{ fontSize: 13, color: "#9ca3af" }}>Loading…</div>
            ) : cases.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280", padding: "12px 0" }}>
                No violations recorded for this student.
              </div>
            ) : (
              cases.map((c) => (
                <div key={c.id} style={{ border: "1px solid #e5e7eb", borderLeft: `4px solid ${MAROON}`, borderRadius: 8, padding: "12px 14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13 }}>{c.caseNo}</span>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Incident date: {fmtDate(c.incidentDate)}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{c.violationType.name}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge text={SEVERITY_LABEL[c.severity] ?? c.severity} color={SEVERITY_COLOR[c.severity] ?? SEVERITY_COLOR.MINOR} />
                    <Badge text={STATUS_LABEL[c.status] ?? c.status} color={STATUS_COLOR[c.status] ?? STATUS_COLOR.OPEN} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}