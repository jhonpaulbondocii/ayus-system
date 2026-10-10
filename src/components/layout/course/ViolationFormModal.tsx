"use client";
// src/components/layout/course/ViolationFormModal.tsx

import { useEffect, useState } from "react";
import {
  MAROON, FONT, SEVERITIES, SEVERITY_LABEL, input, textarea, btn, btnPrimary, Field,
  type StudentLite,
} from "./osaShared";

type VType = { id: string; code: string; name: string; severity: string };

export type SaveResult = {
  caseNo: string;
  escalated: boolean;
  priorCount: number;
  dismissalOnFirst: boolean;
};

export default function ViolationFormModal({
  base, onClose, onSaved,
}: {
  base: string; // /api/courses/:id/osa
  onClose: () => void;
  onSaved: (r: SaveResult) => void;
}) {
  const [types, setTypes] = useState<VType[]>([]);
  const [studentQ, setStudentQ] = useState("");
  const [results, setResults] = useState<StudentLite[]>([]);
  const [student, setStudent] = useState<StudentLite | null>(null);
  const [typeId, setTypeId] = useState("");
  const [incidentDate, setIncidentDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${base}/violation-types`)
      .then((r) => r.json())
      .then((d) => setTypes(d.items ?? []))
      .catch(() => setError("Hindi ma-load ang violation types."));
  }, [base]);

  // student search (debounced)
  useEffect(() => {
    if (student || studentQ.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${base}/students?q=${encodeURIComponent(studentQ.trim())}`)
        .then((r) => r.json())
        .then((d) => setResults((d.students ?? []).slice(0, 8)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [studentQ, student, base]);

  async function save() {
    setError("");
    if (!student) return setError("Pumili ng student.");
    if (!typeId) return setError("Pumili ng violation type.");
    if (!incidentDate) return setError("Incident date is required.");
    setSaving(true);
    try {
      const res = await fetch(`${base}/violations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  studentId: student.id, violationTypeId: typeId, incidentDate,
  location, description, reportedBy,
})
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Failed to save.");
      onSaved({
        caseNo: data.violation.caseNo,
        escalated: !!data.escalated,
        priorCount: data.priorCount ?? 0,
        dismissalOnFirst: !!data.dismissalOnFirst,
      });
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "92vh", overflowY: "auto", fontFamily: FONT }}>
        <div style={{ background: MAROON, color: "#fff", padding: "14px 18px", fontWeight: 800, fontSize: 14 }}>
          Record Violation
        </div>
        <div style={{ padding: 18, display: "grid", gap: 12 }}>
          {error && (
            <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
              {error}
            </div>
          )}

          <Field label="Student *">
            {student ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", fontSize: 13 }}>
                <div style={{ flex: 1 }}>
                  <b>{student.name}</b>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>
                    {student.studentNumber}{student.course ? ` · ${student.course}` : ""}{student.yearSection ? ` · ${student.yearSection}` : ""}
                  </div>
                </div>
                <button style={btn} onClick={() => { setStudent(null); setStudentQ(""); }}>Change</button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input style={input} placeholder="I-type ang pangalan o student number…" value={studentQ} onChange={(e) => setStudentQ(e.target.value)} />
                {results.length > 0 && (
                  <div style={{ position: "absolute", top: 38, left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 20px rgba(0,0,0,.08)", zIndex: 5, maxHeight: 220, overflowY: "auto" }}>
                    {results.map((s) => (
                      <div key={s.id} onMouseDown={(e) => { e.preventDefault(); setStudent(s); setResults([]); }} style={{ padding: "8px 10px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f3f4f6" }}>
                        <b>{s.name}</b>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{s.studentNumber}{s.course ? ` · ${s.course}` : ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Field>

          <Field label="Violation Type *">
            <select style={input} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">— Pumili —</option>
              {SEVERITIES.map((sev) => {
                const group = types.filter((t) => t.severity === sev);
                if (!group.length) return null;
                return (
                  <optgroup key={sev} label={SEVERITY_LABEL[sev]}>
                    {group.map((t) => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </Field>


<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
  <Field label="Incident Date *">
    <input style={input} type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} />
  </Field>
  <Field label="Location">
    <input style={input} value={location} onChange={(e) => setLocation(e.target.value)} />
  </Field>
  <Field label="Reported By">
    <input style={input} value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} />
  </Field>
</div>

          <Field label="Description">
            <textarea style={textarea} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
          <button style={{ ...btn, flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
          <button style={{ ...btnPrimary, flex: 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}