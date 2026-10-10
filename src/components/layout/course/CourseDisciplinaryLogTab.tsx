"use client";
// src/components/layout/course/CourseDisciplinaryLogTab.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import {
  FONT, SEVERITIES, SEVERITY_LABEL,
  input, btn, btnPrimary, fmtDate, type ViolationRow,
} from "./osaShared";
import ViolationFormModal from "./ViolationFormModal";
import ViolationDetailDrawer from "./ViolationDetailDrawer";

function fmtTime(d: string | null | undefined) {
  if (!d) return "";
  const s = String(d);
  // kung date-only (walang time part), huwag mag-display ng time
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) || s.endsWith("T00:00:00.000Z")) return "";
  return new Date(s).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
}
function toLocalISO(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export default function CourseDisciplinaryLogTab({
  courseId,
  isHead,
}: {
  courseId: string;
  isHead: boolean;
}) {
  const base = `/api/courses/${courseId}/osa`;
  const [rows, setRows] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [violation, setViolation] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [types, setTypes] = useState<{ id: string; code: string; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (severity) sp.set("severity", severity);
      const res = await fetch(`${base}/violations?${sp.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRows(data.violations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [base, q, severity]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetch(`${base}/violation-types`)
      .then((r) => r.json())
      .then((d) => setTypes(d.items ?? []))
      .catch(() => {});
  }, [base]);

  // courses derived from rows — no separate fetch needed

  const displayed = useMemo(() => {
    const list = rows.filter((r) => {
      const day = toLocalISO(r.incidentDate);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      if (violation && r.violationType.name !== violation) return false;
      if (courseFilter && r.student.course !== courseFilter) return false;
      return true;
    });
    list.sort((a, b) => {
      const diff = new Date(a.incidentDate).getTime() - new Date(b.incidentDate).getTime();
      return sortDir === "asc" ? diff : -diff;
    });
    return list;
  }, [rows, dateFrom, dateTo, violation, courseFilter, sortDir]);

  const courses = useMemo(
    () => [...new Set(rows.map((r) => r.student.course).filter(Boolean))].sort() as string[],
    [rows]
  );

  const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 800, color: "#374151", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "9px 10px", fontSize: 12.5, borderTop: "1px solid #f3f4f6" };

  const presets = [
    { label: "Today", fn: () => { const d = toLocalISO(new Date()); setDateFrom(d); setDateTo(d); } },
    { label: "Yesterday", fn: () => { const x = new Date(); x.setDate(x.getDate() - 1); const d = toLocalISO(x); setDateFrom(d); setDateTo(d); } },
    { label: "This Week", fn: () => { const x = new Date(); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); setDateFrom(toLocalISO(x)); setDateTo(toLocalISO(new Date())); } },
    { label: "This Month", fn: () => { const n = new Date(); setDateFrom(toLocalISO(new Date(n.getFullYear(), n.getMonth(), 1))); setDateTo(toLocalISO(n)); } },
  ];
  const hasFilter = !!(dateFrom || dateTo || violation || courseFilter);
  const [showExport, setShowExport] = useState(false);

  function printExport() {
    const rows_html = displayed.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td style="font-family:monospace">${r.caseNo}</td>
        <td>${fmtDate(r.incidentDate)}</td>
        <td>${r.student.name}<br/><small>${r.student.studentNumber}</small></td>
        <td>${r.student.course ?? "—"}</td>
        <td>${r.violationType.name}</td>
        <td>${SEVERITY_LABEL[r.severity] ?? r.severity}</td>
      </tr>
    `).join("");

    const filterDesc = [
      dateFrom && `From: ${fmtDate(dateFrom)}`,
      dateTo && `To: ${fmtDate(dateTo)}`,
      violation && `Violation: ${violation}`,
      courseFilter && `Course: ${courseFilter}`,
      severity && `Severity: ${SEVERITY_LABEL[severity] ?? severity}`,
    ].filter(Boolean).join(" · ");

    const html = `<!DOCTYPE html><html><head><title>Disciplinary Log</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; margin: 24px; color: #111; }
      h2 { font-size: 16px; margin: 0 0 2px; }
      .sub { font-size: 11px; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th { background: #7b1113; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
      td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
      tr:nth-child(even) td { background: #f9fafb; }
      small { color: #6b7280; font-size: 10px; }
      .footer { margin-top: 16px; font-size: 10px; color: #9ca3af; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h2>Disciplinary Log</h2>
    <div class="sub">${filterDesc || "All records"} · ${displayed.length} case(s) · Printed ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</div>
    <table>
      <thead><tr>
        <th>#</th><th>Case No.</th><th>Date</th><th>Student</th>
        <th>Course</th><th>Violation</th><th>Severity</th>
      </tr></thead>
      <tbody>${rows_html}</tbody>
    </table>
    <div class="footer">Generated from the OSA Disciplinary Log System</div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  return (
    <div style={{ padding: 24, fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Disciplinary Log</h2>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>{displayed.length} case(s)</p>
        </div>
        <input style={{ ...input, width: 220 }} placeholder="Case no., student, violation…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ ...input, width: 140 }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severity</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>)}
        </select>
        <button style={{ ...btn, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setShowExport(true)}>
          ↓ Export
        </button>
        <button style={btnPrimary} onClick={() => setShowForm(true)}>+ Record violation</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select style={{ ...input, width: 260 }} value={violation} onChange={(e) => setViolation(e.target.value)}>
          <option value="">All violations</option>
          {types.map((t) => <option key={t.id} value={t.name}>{t.code} — {t.name}</option>)}
        </select>
        <select style={{ ...input, width: 200 }} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="">All courses</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "#6b7280" }}>From</span>
        <input type="date" style={{ ...input, width: 150 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ fontSize: 12, color: "#6b7280" }}>To</span>
        <input type="date" style={{ ...input, width: 150 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        {presets.map((p) => (
          <button key={p.label} onClick={p.fn}
            style={{ padding: "5px 9px", fontSize: 11, fontWeight: 700, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#6b7280", cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
        {hasFilter && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); setViolation(""); setCourseFilter(""); }}
            style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#7b1113" }}>
            Clear filters
          </button>
        )}
      </div>


      {error && <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              <th style={th}>Case No.</th>
              <th style={th}>
                <button
                  onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  title={sortDir === "desc" ? "Newest first" : "Oldest first"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: 0, cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }}
                >
                  Date <ArrowUpDown size={12} />
                </button>
              </th>
              <th style={th}>Student</th>
              <th style={th}>Course</th>
              <th style={th}>Student ID</th>
              <th style={th}>Violation</th>
              <th style={th}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={{ ...td, color: "#9ca3af" }} colSpan={7}>Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td style={{ ...td, color: "#9ca3af" }} colSpan={7}>Walang nahanap na case.</td></tr>
            ) : displayed.map((r) => (
              <tr key={r.id} onClick={() => setOpenId(r.id)} style={{ cursor: "pointer" }}>
                <td style={{ ...td, fontFamily: "monospace" }}>{r.caseNo}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
  {fmtDate(r.incidentDate)}{fmtTime(r.incidentDate) ? ` · ${fmtTime(r.incidentDate)}` : ""}
</td>
                <td style={td}>
                  <b>{r.student.name}</b>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{r.student.studentNumber}</div>
                </td>
                <td style={td}>{r.student.course ?? "—"}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>{r.student.studentNumber}</td>
                <td style={td}>{r.violationType.name}</td>
                <td style={td}>{SEVERITY_LABEL[r.severity] ?? r.severity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ViolationFormModal
          base={base}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}
      {openId && (
        <ViolationDetailDrawer
          base={base}
          id={openId}
          isHead={isHead}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}

      {showExport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => setShowExport(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 420, fontFamily: FONT, overflow: "hidden" }}>
            <div style={{ background: "#7b1113", color: "#fff", padding: "14px 18px", fontWeight: 800, fontSize: 14 }}>
              Export Disciplinary Log
            </div>
            <div style={{ padding: 18, display: "grid", gap: 12 }}>
              <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", fontSize: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: "#374151" }}>Active Filters</div>
                {!hasFilter && !severity && !q ? (
                  <div style={{ color: "#6b7280" }}>No filters applied — all <b>{displayed.length}</b> case(s) will be exported.</div>
                ) : (
                  <div style={{ color: "#374151", lineHeight: 1.8 }}>
                    {q && <div>Search: <b>{q}</b></div>}
                    {severity && <div>Severity: <b>{SEVERITY_LABEL[severity]}</b></div>}
                    {violation && <div>Violation: <b>{violation}</b></div>}
                    {courseFilter && <div>Course: <b>{courseFilter}</b></div>}
                    {dateFrom && <div>From: <b>{fmtDate(dateFrom)}</b></div>}
                    {dateTo && <div>To: <b>{fmtDate(dateTo)}</b></div>}
                    <div style={{ marginTop: 6, color: "#7b1113", fontWeight: 700 }}>{displayed.length} case(s) will be exported.</div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>
                A print dialog will open. Save as PDF or print directly.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "12px 18px", borderTop: "1px solid #f3f4f6", background: "#fafafa" }}>
              <button style={{ ...btn, flex: 1 }} onClick={() => setShowExport(false)}>Cancel</button>
              <button style={{ ...btnPrimary, flex: 1 }} onClick={() => { setShowExport(false); setTimeout(printExport, 100); }}>
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}