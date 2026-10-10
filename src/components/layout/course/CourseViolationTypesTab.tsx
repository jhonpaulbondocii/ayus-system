"use client";
// src/components/layout/course/CourseViolationTypesTab.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { SANCTIONS } from "@/server/osa/violation-types-data";

type VType = {
  id: string;
  code: string;
  name: string;
  severity: "MINOR" | "SERIOUS" | "VERY_SERIOUS";
  dismissalOnFirst: boolean;
  defaultSanction: string | null;
  isActive: boolean;
};

type Form = {
  code: string;
  name: string;
  severity: VType["severity"];
  dismissalOnFirst: boolean;
  defaultSanction: string;
};

const EMPTY: Form = { code: "", name: "", severity: "MINOR", dismissalOnFirst: false, defaultSanction: "" };

const SEV_LABEL: Record<VType["severity"], string> = { MINOR: "Minor", SERIOUS: "Serious", VERY_SERIOUS: "Very Serious" };

const input: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, boxSizing: "border-box" };
const btn: React.CSSProperties = { padding: "8px 14px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 13 };
const btnPrimary: React.CSSProperties = { ...btn, background: "#cc2a27", color: "#fff", border: "1px solid #cc2a27" };

export default function CourseViolationTypesTab({ courseId, isHead }: { courseId: string; isHead: boolean }) {
  const base = `/api/courses/${courseId}/osa/violation-types`;
  const [items, setItems] = useState<VType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<"ALL" | VType["severity"]>("ALL");
  const [modal, setModal] = useState<{ id: string | null; form: Form } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(base);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [base, isHead]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter(
      (i) => (sev === "ALL" || i.severity === sev) && (!s || i.name.toLowerCase().includes(s) || i.code.toLowerCase().includes(s))
    );
  }, [items, q, sev]);

  async function call(url: string, method: string, body?: unknown) {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Request failed");
    return json;
  }

  async function save() {
    if (!modal) return;
    setSaving(true);
    setError("");
    try {
      const f = modal.form;
      const payload = { ...f, defaultSanction: f.defaultSanction || null };
      if (modal.id) await call(`${base}/${modal.id}`, "PATCH", payload);
      else await call(base, "POST", payload);
      setModal(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }


  async function remove(i: VType) {
    if (!confirm(`Delete "${i.code}"? Existing violation records that used it will be kept.`)) return;
    try {
      await call(`${base}/${i.id}`, "DELETE");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }


  const set = (patch: Partial<Form>) => modal && setModal({ ...modal, form: { ...modal.form, ...patch } });

  return (
    <div style={{ padding: 24, height: "100%", overflowY: "auto", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Violation Types</h2>
          <div style={{ color: "#777", fontSize: 13, marginTop: 2 }}>Based on the DHVSU Student Manual 2019, Sec. 78</div>
        </div>
        {isHead && (
          <button style={btnPrimary} onClick={() => setModal({ id: null, form: EMPTY })}>+ Add type</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input style={{ ...input, maxWidth: 280 }} placeholder="Search code or name..."value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ ...input, maxWidth: 180 }} value={sev} onChange={(e) => setSev(e.target.value as typeof sev)}>
          <option value="ALL">All severities</option>
          <option value="MINOR">Minor</option>
          <option value="SERIOUS">Serious</option>
          <option value="VERY_SERIOUS">Very Serious</option>
        </select>
      </div>

      {error && <div style={{ background: "#fdeaea", color: "#cc2a27", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ color: "#777" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#777", border: "1px dashed #ddd", borderRadius: 8 }}>
          No violation types found.
        </div>
      ) : (
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 280px)", border: "1px solid #eee", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 1, background: "#fafafa" }}>
              <tr style={{ background: "#fafafa", textAlign: "left" }}>
                <th style={{ padding: 10 }}>Code</th>
                <th style={{ padding: 10 }}>Offense</th>
                <th style={{ padding: 10 }}>Severity</th>
                <th style={{ padding: 10 }}>Sanction</th>
                {isHead && <th style={{ padding: 10 }}></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: 10, whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12 }}>{i.code}</td>
                  <td style={{ padding: 10 }}>{i.name}</td>
                  <td style={{ padding: 10, whiteSpace: "nowrap" }}>{SEV_LABEL[i.severity]}</td>
                  <td style={{ padding: 10, fontSize: 13 }}>
                    {i.dismissalOnFirst ? "Immediate dropping/exclusion" : i.defaultSanction || "Per Disciplinary Council"}
                  </td>
                  {isHead && (
                    <td style={{ padding: 10, whiteSpace: "nowrap", textAlign: "right" }}>
                      <button
                        style={{ ...btn, padding: "4px 10px" }}
                        onClick={() =>
                          setModal({
                            id: i.id,
                            form: {
                              code: i.code,
                              name: i.name,
                              severity: i.severity,
                              dismissalOnFirst: i.dismissalOnFirst,
                              defaultSanction: i.defaultSanction || "",
                            },
                          })
                        }
                      >
                        Edit
                      </button>{" "}
                      <button style={{ ...btn, padding: "4px 10px", color: "#cc2a27" }} onClick={() => remove(i)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => !saving && setModal(null)}>
          <div style={{ background: "#fff", borderRadius: 10, width: 520, maxWidth: "94vw", maxHeight: "90vh", overflowY: "auto", padding: 22 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal.id ? "Edit violation type" : "Add violation type"}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <label>
                <div style={{ fontSize: 13, marginBottom: 4 }}>Code *</div>
                <input style={input} value={modal.form.code} onChange={(e) => set({ code: e.target.value })} placeholder="e.g. 78.1-b.6" />
              </label>
              <label>
                <div style={{ fontSize: 13, marginBottom: 4 }}>Offense *</div>
                <input style={input} value={modal.form.name} onChange={(e) => set({ name: e.target.value })} />
              </label>
              <label>
                <div style={{ fontSize: 13, marginBottom: 4 }}>Severity</div>
                <select style={input} value={modal.form.severity} onChange={(e) => set({ severity: e.target.value as Form["severity"] })}>
                  <option value="MINOR">Minor</option>
                  <option value="SERIOUS">Serious</option>
                  <option value="VERY_SERIOUS">Very Serious</option>
                </select>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={modal.form.dismissalOnFirst} onChange={(e) => set({ dismissalOnFirst: e.target.checked })} />
                Immediate dropping/exclusion even on first offense
              </label>
              <label>
                <div style={{ fontSize: 13, marginBottom: 4 }}>Default sanction (optional)</div>
                <select style={input} value={modal.form.defaultSanction} onChange={(e) => set({ defaultSanction: e.target.value })}>
                  <option value="">Per Disciplinary Council</option>
                  {SANCTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button style={btn} disabled={saving} onClick={() => setModal(null)}>Cancel</button>
              <button style={btnPrimary} disabled={saving || !modal.form.code.trim() || !modal.form.name.trim()} onClick={save}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}