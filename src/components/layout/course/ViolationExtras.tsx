"use client";
// src/components/layout/course/ViolationExtras.tsx

import { useState } from "react";
import { input, textarea, btn, btnPrimary, Field, fmtDate, type ParentContactRow, type NoteRow } from "./osaShared";

async function call(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.error ?? "Failed.";
  } catch {
    return "Network error.";
  }
}

const card: React.CSSProperties = { border: "1px solid #f3f4f6", borderRadius: 8, padding: "8px 10px", marginBottom: 6, fontSize: 12 };
const errBox: React.CSSProperties = { color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "6px 8px", fontSize: 12, marginBottom: 8 };

const METHOD_LABEL: Record<string, string> = { CALL: "Call", SMS: "SMS", LETTER: "Letter", PERSONAL: "Personal" };
const ATT_LABEL: Record<string, string> = { YES: "Attended", NO: "Did not attend", NO_RESPONSE: "No response" };

// ============ PARENT CONTACTS ============
export function ParentContactsSection({
  base, violationId, contacts, guardianName, guardianContact, onChanged,
}: {
  base: string; violationId: string; contacts: ParentContactRow[];
  guardianName?: string | null; guardianContact?: string | null; onChanged: () => void;
}) {
  const url = `${base}/violations/${violationId}/contacts`;
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editF, setEditF] = useState({ attendance: "NO_RESPONSE", contactPerson: "", relationship: "" });
  const [f, setF] = useState({
    contactedAt: new Date().toISOString().slice(0, 10), method: "CALL",
    lastName: "", firstName: "", middleName: "",
    relationship: "", attendance: "NO_RESPONSE",
  });
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function add() {
    setBusy(true); setError("");
    const err = await call(url, "POST", {
      contactedAt: f.contactedAt,
      method: f.method,
      contactPerson: [f.lastName, f.firstName, f.middleName].filter(Boolean).join(", "),
      relationship: f.relationship,
      attendance: f.attendance,
    });
    setBusy(false);
    if (err) return setError(err);
    setAdding(false);
    setF((p) => ({ ...p, lastName: "", firstName: "", middleName: "", relationship: "", attendance: "NO_RESPONSE" }));
    onChanged();
  }

  function startEdit(c: ParentContactRow) {
    setEditingId(c.id);
    setEditF({ attendance: c.attendance, contactPerson: c.contactPerson ?? "", relationship: c.relationship ?? "" });
  }

  async function saveEdit(id: string) {
    setBusy(true); setError("");
    const err = await call(`${url}/${id}`, "PATCH", editF);
    setBusy(false);
    if (err) return setError(err);
    setEditingId(null);
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Delete this contact record?")) return;
    const err = await call(`${url}/${id}`, "DELETE");
    if (err) return setError(err);
    onChanged();
  }

  return (
    <div>
      {guardianName || guardianContact ? (
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
          Guardian: {guardianName ?? "—"}{guardianContact ? ` · ${guardianContact}` : ""}
        </div>
      ) : null}
      {error && <div style={errBox}>{error}</div>}

      {contacts.length === 0 && !adding && <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>No contacts logged yet.</div>}

      {contacts.map((c) => (
        <div key={c.id} style={card}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <b>{fmtDate(c.contactedAt)}</b> · {METHOD_LABEL[c.method] ?? c.method}
            </div>
            {editingId !== c.id && (
              <>
                <button style={{ ...btn, height: 26 }} onClick={() => startEdit(c)}>Edit</button>
                <button style={{ ...btn, height: 26, color: "#b91c1c" }} onClick={() => remove(c.id)}>Delete</button>
              </>
            )}
          </div>

          {editingId === c.id ? (
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="Contact Person">
                  <input style={input} value={editF.contactPerson} onChange={(e) => setEditF((p) => ({ ...p, contactPerson: e.target.value }))} />
                </Field>
                <Field label="Relationship">
                  <select style={input} value={editF.relationship} onChange={(e) => setEditF((p) => ({ ...p, relationship: e.target.value }))}>
                    <option value="">— Select —</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field label="Attendance">
                  <select style={input} value={editF.attendance} onChange={(e) => setEditF((p) => ({ ...p, attendance: e.target.value }))}>
                    {Object.entries(ATT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...btn, flex: 1 }} onClick={() => setEditingId(null)} disabled={busy}>Cancel</button>
                <button style={{ ...btnPrimary, flex: 1 }} onClick={() => saveEdit(c.id)} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ color: "#6b7280", marginTop: 2 }}>
                {c.contactPerson ? `${c.contactPerson}${c.relationship ? ` (${c.relationship})` : ""} · ` : ""}{ATT_LABEL[c.attendance] ?? c.attendance}
              </div>
            </>
          )}
        </div>
      ))}

      {adding ? (
        <div style={{ ...card, background: "#fafafa", display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Date"><input style={input} type="date" value={f.contactedAt} onChange={(e) => set("contactedAt", e.target.value)} /></Field>
            <Field label="Method">
              <select style={input} value={f.method} onChange={(e) => set("method", e.target.value)}>
                {Object.entries(METHOD_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Last Name"><input style={input} value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
            <Field label="First Name"><input style={input} value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
            <Field label="Middle Name"><input style={input} value={f.middleName} onChange={(e) => set("middleName", e.target.value)} /></Field>
            <Field label="Relationship">
              <select style={input} value={f.relationship} onChange={(e) => set("relationship", e.target.value)}>
                <option value="">— Select —</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Sibling">Sibling</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Attendance">
              <select style={input} value={f.attendance} onChange={(e) => set("attendance", e.target.value)}>
                {Object.entries(ATT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn, flex: 1 }} onClick={() => setAdding(false)} disabled={busy}>Cancel</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={add} disabled={busy}>{busy ? "Saving…" : "Save contact"}</button>
          </div>
        </div>
      ) : (
        <button style={btn} onClick={() => setAdding(true)}>+ Add contact</button>
      )}
    </div>
  );
}

// ============ NOTES ============
export function NotesSection({
  base, violationId, notes, onChanged,
}: {
  base: string; violationId: string; notes: NoteRow[]; onChanged: () => void;
}) {
  const url = `${base}/violations/${violationId}/notes`;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add() {
    if (!text.trim()) return;
    setBusy(true); setError("");
    const err = await call(url, "POST", { body: text });
    setBusy(false);
    if (err) return setError(err);
    setText("");
    onChanged();
  }

  async function remove(id: string) {
    if (!confirm("Delete this remark?")) return;
    const err = await call(`${url}/${id}`, "DELETE");
    if (err) return setError(err);
    onChanged();
  }

  return (
    <div>
      {error && <div style={errBox}>{error}</div>}
      {notes.length === 0 && <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>No remarks yet.</div>}
      {notes.map((n) => (
        <div key={n.id} style={card}>
          <div style={{ display: "flex", alignItems: "center", color: "#9ca3af", fontSize: 11 }}>
            <div style={{ flex: 1 }}>{fmtDate(n.createdAt)}</div>
            <button style={{ ...btn, height: 24, fontSize: 11, color: "#b91c1c" }} onClick={() => remove(n.id)}>Delete</button>
          </div>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 2 }}>{n.body}</div>
        </div>
      ))}
      <textarea style={textarea} placeholder="Add a remark…" value={text} onChange={(e) => setText(e.target.value)} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
        <button style={btnPrimary} onClick={add} disabled={busy || !text.trim()}>{busy ? "Saving…" : "Add remark"}</button>
      </div>
    </div>
  );
}