"use client";
// src/components/layout/course/ViolationDetailDrawer.tsx

import { ParentContactsSection, NotesSection } from "./ViolationExtras";
import { useCallback, useEffect, useState } from "react";
import {
  MAROON, FONT, SEVERITY_LABEL, SEVERITY_COLOR,
  input, textarea, btn, btnPrimary, Badge, Field, dateOnly, fmtDate,
  type ViolationDetail,
} from "./osaShared";

const h3: React.CSSProperties = { margin: "18px 0 8px", fontSize: 12, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: ".04em" };

type Form = {
  hearingDate: string; hearingResult: string;
  sanction: string; sanctionDays: string; sanctionStart: string; sanctionEnd: string;
  decidedBy: string; decidedAt: string;
  appealed: boolean; appealResult: string;
  location: string; description: string;
};

function toForm(v: ViolationDetail): Form {
  return {
    hearingDate: dateOnly(v.hearingDate),
    hearingResult: v.hearingResult ?? "",
    sanction: v.sanction ?? "",
    sanctionDays: v.sanctionDays?.toString() ?? "",
    sanctionStart: dateOnly(v.sanctionStart),
    sanctionEnd: dateOnly(v.sanctionEnd),
    decidedBy: v.decidedBy ?? "",
    decidedAt: dateOnly(v.decidedAt),
    appealed: v.appealed,
    appealResult: v.appealResult ?? "",
    location: v.location ?? "",
    description: v.description ?? "",
  };
}

export default function ViolationDetailDrawer({
  base, id, isHead, onClose, onChanged,
}: {
  base: string; // /api/courses/:id/osa
  id: string;
  isHead: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [v, setV] = useState<ViolationDetail | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${base}/violations/${id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setV(data.violation);
      setForm(toForm(data.violation));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [base, id]);

  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof Form>(k: K, val: Form[K]) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, [k]: val } : f));
  };

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${base}/violations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sanctionDays: form.sanctionDays === "" ? null : Number(form.sanctionDays) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Failed to save.");
      setSaved(true);
      onChanged();
      load();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!v || !confirm(`I-delete ang case ${v.caseNo}?`)) return;
    const res = await fetch(`${base}/violations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error ?? "Failed to delete.");
    onChanged();
    onClose();
  }

  const two = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as const;
  const check = (label: string, checked: boolean, onChange: (b: boolean) => void) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#374151" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,.3)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, height: "100%", background: "#fff", overflowY: "auto", fontFamily: FONT, display: "flex", flexDirection: "column" }}>
        <div style={{ background: MAROON, color: "#fff", padding: "14px 18px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 14 }}>{v ? `Case ${v.caseNo}` : "Violation"}</div>
          <button onClick={onClose} style={{ background: "transparent", border: 0, color: "#fff", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: 18, flex: 1 }}>
          {loading && <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</div>}
          {error && (
            <div style={{ color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px", fontSize: 12, marginBottom: 10 }}>
              {error}
            </div>
          )}

          {v && form && (
            <>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{v.student.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                {v.student.studentNumber}{v.student.course ? ` · ${v.student.course}` : ""}{v.student.yearSection ? ` · ${v.student.yearSection}` : ""}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <Badge text={SEVERITY_LABEL[v.severity] ?? v.severity} color={SEVERITY_COLOR[v.severity] ?? SEVERITY_COLOR.MINOR} />
                <span style={{ fontSize: 12, color: "#374151" }}>{v.violationType.code} — {v.violationType.name}</span>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                Incident: {fmtDate(v.incidentDate)}{v.reportedBy ? ` · Reported by ${v.reportedBy}${v.reportedByRole ? ` (${v.reportedByRole})` : ""}` : ""}
                {v.resolvedAt ? ` · Resolved ${fmtDate(v.resolvedAt)}` : ""}
              </div>

              <h3 style={h3}>Incident</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <Field label="Location"><input style={input} value={form.location} onChange={(e) => set("location", e.target.value)} /></Field>
                <Field label="Description"><textarea style={textarea} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
              </div>

                            <h3 style={h3}>Hearing</h3>
              <div style={two}>
                <Field label="Hearing Date"><input style={input} type="date" value={form.hearingDate} onChange={(e) => set("hearingDate", e.target.value)} /></Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field label="Hearing Result"><textarea style={textarea} value={form.hearingResult} onChange={(e) => set("hearingResult", e.target.value)} /></Field>
              </div>

              <h3 style={h3}>Sanction & Decision</h3>
              <div style={{ display: "grid", gap: 12 }}>
                <Field label="Sanction"><input style={input} value={form.sanction} onChange={(e) => set("sanction", e.target.value)} placeholder="e.g. Suspension, Community service" /></Field>
                <div style={two}>
                  <Field label="Days"><input style={input} type="number" min={0} value={form.sanctionDays} onChange={(e) => set("sanctionDays", e.target.value)} /></Field>
                  <div />
                  <Field label="Sanction Start"><input style={input} type="date" value={form.sanctionStart} onChange={(e) => set("sanctionStart", e.target.value)} /></Field>
                  <Field label="Sanction End"><input style={input} type="date" value={form.sanctionEnd} onChange={(e) => set("sanctionEnd", e.target.value)} /></Field>
                  <Field label="Decided By"><input style={input} value={form.decidedBy} onChange={(e) => set("decidedBy", e.target.value)} placeholder="Dean, Prefect, VP-SA…" /></Field>
                  <Field label="Decided At"><input style={input} type="date" value={form.decidedAt} onChange={(e) => set("decidedAt", e.target.value)} /></Field>
                </div>
              </div>

              <h3 style={h3}>Appeal</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {check("Has appeal", form.appealed, (b) => set("appealed", b))}
                {form.appealed && (
                  <Field label="Appeal Result"><textarea style={textarea} value={form.appealResult} onChange={(e) => set("appealResult", e.target.value)} /></Field>
                )}
              </div>

              <h3 style={h3}>Parent Contacts ({v.parentContacts.length})</h3>
              <ParentContactsSection
                base={base}
                violationId={id}
                contacts={v.parentContacts}
                guardianName={v.student.guardianName}
                guardianContact={v.student.guardianContact}
                onChanged={load}
              />

              <h3 style={h3}>Remarks ({v.notes.length})</h3>
              <NotesSection
                base={base}
                violationId={id}
                notes={v.notes}
                onChanged={load}
              />
            </>
          )}
        </div>

        {v && form && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "12px 18px", borderTop: "1px solid #f3f4f6", background: "#fafafa", position: "sticky", bottom: 0 }}>
            {isHead && <button style={{ ...btn, color: "#b91c1c" }} onClick={remove}>Delete</button>}
            <div style={{ flex: 1, fontSize: 12, color: "#166534" }}>{saved ? "Naka-save na ✓" : ""}</div>
            <button style={btn} onClick={onClose}>Close</button>
            <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        )}
      </div>
    </div>
  );
}