"use client";

// src/components/admin/SpeedGrader.tsx

import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string; title: string; points: number;
  dueDate: string | null; courseId: string;
  status: "PUBLISHED" | "UNPUBLISHED";
}

interface StoredEntry {
  entryId:    string;
  label:      string;
  type:       string;
  fileUrl:    string | null;
  fileName:   string | null;
  textEntry:  string | null;
  websiteUrl: string | null;
  required:   boolean;
}

interface Submission {
  id:          string;
  userId:      string;
  userName:    string | null;
  userEmail:   string;
  status:      string;
  grade:       number | null;
  fileUrl:     string | null;   // may be JSON v2 or plain URL
  submittedAt: string | null;
  feedback:    string | null;
  textEntry:   string | null;
  websiteUrl:  string | null;
  // Parsed by submissions API
  isMulti?:    boolean;
  entries?:    StoredEntry[];
  allFileUrls?: { label: string; url: string }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function normalizeFileUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/") || url.startsWith("http")) return url;
  return `/uploads/submissions/${url}`;
}

function isPdf(url: string | null)   { return !!url && /\.pdf$/i.test(url.split("?")[0]); }
function isImage(url: string | null) { return !!url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.split("?")[0]); }

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(/[\s,]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  }
  return email.slice(0, 2).toUpperCase();
}

// Parse raw fileUrl — may be JSON v2 multi-entry or plain URL
function parseStoredFileUrl(raw: string | null): {
  isMulti: boolean;
  entries: StoredEntry[];
  fileUrl: string | null;
} {
  if (!raw) return { isMulti: false, entries: [], fileUrl: null };
  if (raw.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { version?: number; entries?: StoredEntry[] };
      if (parsed.version === 2 && Array.isArray(parsed.entries)) {
        return { isMulti: true, entries: parsed.entries, fileUrl: null };
      }
    } catch { /* not JSON */ }
  }
  return { isMulti: false, entries: [], fileUrl: raw };
}

// ── File Viewer ───────────────────────────────────────────────────────────────
function FileViewer({
  fileUrl,
  zoom,
  pdfPage,
  pdfTotal,
  setPdfTotal,
}: {
  fileUrl:     string | null;
  zoom:        number;
  pdfPage:     number;
  pdfTotal:    number;
  setPdfTotal: (n: number) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const url = normalizeFileUrl(fileUrl);

  if (!url) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 mt-32"
      style={{ color: "rgba(255,255,255,.25)" }}>
      <svg className="w-14 h-14 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round"/>
      </svg>
      <p className="text-sm">No file submitted</p>
    </div>
  );

  if (isPdf(url)) return (
    <div className="bg-white shadow-2xl transition-transform"
      style={{ transform: `scale(${zoom})`, transformOrigin: "top center", width: 850, minHeight: 1100 }}>
      <iframe ref={iframeRef} src={`${url}#page=${pdfPage}`} className="w-full"
        style={{ height: Math.round(1100 * zoom) + "px", border: "none" }}
        onLoad={() => {
          try {
            const doc = (iframeRef.current?.contentWindow as unknown as {
              PDFViewerApplication?: { pdfDocument?: { numPages?: number } };
            })?.PDFViewerApplication;
            if (doc?.pdfDocument?.numPages) setPdfTotal(doc.pdfDocument.numPages);
          } catch {}
        }}/>
    </div>
  );

  if (isImage(url)) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Submission"
      className="max-w-full shadow-2xl rounded transition-transform"
      style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}/>
  );

  return (
    <div className="flex flex-col items-center gap-4 mt-32">
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,.08)" }}>
        <svg className="w-10 h-10" style={{ color: "rgba(255,255,255,.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="text-sm" style={{ color: "rgba(255,255,255,.4)" }}>{url.split("/").pop()}</p>
      <a href={url} download target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-lg"
        style={{ background: MAROON }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round"/>
        </svg>
        Download to view
      </a>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SpeedGraderClient({
  courseId, assignmentId, initialStudentId,
}: { courseId: string; assignmentId: string; initialStudentId: string | null }) {

  const [assignment,  setAssignment]  = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [gradeInput,  setGradeInput]  = useState("");
  const [statusInput, setStatusInput] = useState("None");
  const [comment,     setComment]     = useState("");
  const [saving,      setSaving]      = useState(false);
  const [savedFlash,  setSavedFlash]  = useState(false);
  const [pdfPage,     setPdfPage]     = useState(1);
  const [pdfTotal,    setPdfTotal]    = useState(1);
  const [zoom,        setZoom]        = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Which entry is active in the viewer (for multi-entry submissions)
  const [activeEntryIdx, setActiveEntryIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`),
          fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions`),
        ]);
        const [aData, sData] = await Promise.all([aRes.json(), sRes.json()]);
        if (cancelled) return;
        const subs: Submission[] = sData.submissions ?? [];
        const jumpIdx = initialStudentId ? subs.findIndex(s => s.userId === initialStudentId) : -1;
        setAssignment(aData.assignment ?? null);
        setSubmissions(subs);
        if (jumpIdx >= 0) setCurrentIdx(jumpIdx);
        setLoading(false);
      } catch { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [courseId, assignmentId, initialStudentId]);

  const current   = submissions[currentIdx] ?? null;
  const currentId = current?.id;

  // Parse multi-entry data for the current submission
  const parsedSubmission = current
    ? (() => {
        // Submissions API already parses this, but handle both cases
        if (current.isMulti && current.entries) {
          return { isMulti: true, entries: current.entries };
        }
        const parsed = parseStoredFileUrl(current.fileUrl);
        return parsed;
      })()
    : null;

  const fileEntries: (StoredEntry | null)[] = parsedSubmission?.isMulti
    ? (parsedSubmission.entries ?? [])
    : [null]; // null = use legacy single fileUrl

  // Active entry for viewer
  const activeEntry = parsedSubmission?.isMulti
    ? (parsedSubmission.entries ?? [])[activeEntryIdx] ?? null
    : null;

  const activeFileUrl = activeEntry
    ? normalizeFileUrl(activeEntry.fileUrl)
    : normalizeFileUrl(current?.fileUrl ?? null);

  useLayoutEffect(() => {
    if (!current) return;
    setGradeInput(current.grade != null ? String(current.grade) : "");
    setStatusInput(current.status === "GRADED" ? "Graded" : "None");
    setPdfPage(1);
    setActiveEntryIdx(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const saveGrade = useCallback(async () => {
    if (!current || !assignment) return;
    setSaving(true);
    const res = await fetch(
      `/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions/${current.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade:    gradeInput !== "" ? parseFloat(gradeInput) : null,
          feedback: comment || null,
          status:   gradeInput !== "" ? "GRADED" : current.status,
        }),
      }
    );
    const data = await res.json() as { submission?: Submission };
    if (data.submission) {
      setSubmissions(prev => prev.map(s =>
        s.id === current.id
          ? { ...s, grade: data.submission!.grade, status: data.submission!.status, feedback: data.submission!.feedback }
          : s
      ));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    }
    setSaving(false);
  }, [current, assignment, gradeInput, comment, courseId, assignmentId]);

  const submitComment = useCallback(async () => {
    if (!comment.trim() || !current) return;
    await saveGrade();
    setComment("");
  }, [comment, current, saveGrade]);

  const gradedCount = submissions.filter(s => s.grade != null).length;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: "#1a0a0a", fontFamily: FONT }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-white/10 rounded-full animate-spin" style={{ borderTopColor: MAROON }}/>
        <p className="text-sm text-white/40">Loading SpeedGrader...</p>
      </div>
    </div>
  );

  if (!assignment) return (
    <div className="h-screen flex items-center justify-center" style={{ background: "#1a0a0a", fontFamily: FONT }}>
      <p className="text-sm text-white/40">Assignment not found.</p>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden select-none" style={{ fontFamily: FONT, background: "#f4f4f3" }}>

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 shrink-0 h-12 z-20 text-white" style={{ background: MAROON }}>
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <p className="text-[13px] font-bold leading-tight truncate max-w-sm">{assignment.title}</p>
          <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,.55)" }}>
            {assignment.dueDate ? `Due ${fmtDateTime(assignment.dueDate)}` : "No due date"}
            {" · "}
            <span className="hover:underline cursor-pointer font-semibold" style={{ color: "rgba(255,255,255,.75)" }}
              onClick={() => window.open(`/admin/courses/${courseId}/assignments/${assignmentId}`, "_blank")}>
              {assignment.status === "PUBLISHED" ? "Published" : "Unpublished"}
            </span>
          </p>
        </div>

        {/* Student nav */}
        <div className="flex items-center gap-2 mx-6">
          <button onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}
            className="w-6 h-6 flex items-center justify-center rounded transition-all disabled:opacity-30"
            style={{ background: "rgba(255,255,255,.15)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>

          <div className="flex flex-col items-center">
            {current && (
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                  style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>
                  {getInitials(current.userName, current.userEmail)}
                </div>
                <span className="text-[12px] font-semibold max-w-30 truncate">
                  {current.userName ?? current.userEmail}
                </span>
              </div>
            )}
            <span className="text-[10px]" style={{ color: "rgba(255,255,255,.45)" }}>
              {submissions.length === 0 ? "No submissions" : `${currentIdx + 1} / ${submissions.length} Students`}
            </span>
          </div>

          <button onClick={() => setCurrentIdx(i => Math.min(submissions.length - 1, i + 1))}
            disabled={currentIdx >= submissions.length - 1}
            className="w-6 h-6 flex items-center justify-center rounded transition-all disabled:opacity-30"
            style={{ background: "rgba(255,255,255,.15)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Counts + sidebar toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center">
            <p className="text-[13px] font-black leading-tight">{gradedCount}/{submissions.length}</p>
            <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,.45)" }}>Graded</p>
          </div>
          <div className="w-px h-6" style={{ background: "rgba(255,255,255,.15)" }}/>
          <div className="text-center">
            <p className="text-[13px] font-black leading-tight">{submissions.length}</p>
            <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,.45)" }}>Students</p>
          </div>
          <div className="w-px h-6 ml-1" style={{ background: "rgba(255,255,255,.15)" }}/>
          <button onClick={() => setSidebarOpen(o => !o)}
            className="w-7 h-7 flex items-center justify-center rounded transition-all"
            style={{ color: "rgba(255,255,255,.6)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── File Viewer ── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "#3a3a38" }}>

          {/* Viewer toolbar */}
          <div className="flex items-center gap-3 px-4 py-2 shrink-0 border-b"
            style={{ background: "#2c2c2a", borderColor: "rgba(0,0,0,.3)" }}>

            {/* Entry tabs for multi-file submissions */}
            {parsedSubmission?.isMulti && (parsedSubmission.entries?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1 mr-2">
                {(parsedSubmission.entries ?? []).map((entry, idx) => (
                  <button key={entry.entryId ?? idx}
                    onClick={() => { setActiveEntryIdx(idx); setPdfPage(1); }}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold transition-all"
                    style={activeEntryIdx === idx
                      ? { background: MAROON, color: "#fff" }
                      : { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)" }}>
                    {entry.label || entry.type || `Entry ${idx + 1}`}
                    {entry.required && (
                      <span className="ml-1 opacity-70">*</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {isPdf(activeFileUrl) && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,.5)" }}>Page</span>
                <button onClick={() => setPdfPage(p => Math.max(1, p - 1))} disabled={pdfPage <= 1}
                  className="w-5 h-5 flex items-center justify-center disabled:opacity-30"
                  style={{ color: "rgba(255,255,255,.5)" }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <input type="number" min={1} max={pdfTotal} value={pdfPage}
                  onChange={e => setPdfPage(Math.max(1, Math.min(pdfTotal, parseInt(e.target.value) || 1)))}
                  className="w-10 text-center rounded text-[12px] px-1 py-0.5 focus:outline-none text-white"
                  style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)" }}/>
                <button onClick={() => setPdfPage(p => Math.min(pdfTotal, p + 1))} disabled={pdfPage >= pdfTotal}
                  className="w-5 h-5 flex items-center justify-center disabled:opacity-30"
                  style={{ color: "rgba(255,255,255,.5)" }}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,.35)" }}>of {pdfTotal}</span>
              </div>
            )}

            <div className="flex-1"/>

            {/* Zoom */}
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="w-6 h-6 flex items-center justify-center rounded text-base font-bold"
                style={{ color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.05)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}>−</button>
              <span className="text-[11px] w-10 text-center" style={{ color: "rgba(255,255,255,.5)" }}>
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                className="w-6 h-6 flex items-center justify-center rounded text-base font-bold"
                style={{ color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.05)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.15)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.05)")}>+</button>
              <button onClick={() => setZoom(1)} className="ml-1 text-[11px] px-1"
                style={{ color: "rgba(255,255,255,.35)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.7)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.35)")}>Reset</button>
            </div>

            {activeFileUrl && (
              <a href={activeFileUrl} download target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] transition-all"
                style={{ color: "rgba(255,255,255,.5)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.5)")}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeLinecap="round"/>
                </svg>
                Download
              </a>
            )}
          </div>

          {/* File display area */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-6">
            {!current ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 mt-32"
                style={{ color: "rgba(255,255,255,.2)" }}>
                <svg className="w-16 h-16 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-sm">No submissions</p>
              </div>
            ) : (
              <>
                {/* Text entry display */}
                {(() => {
                  const entry = activeEntry;
                  if (entry?.textEntry) return (
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full"
                      style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>
                        {entry.label || "Text Entry"}
                      </p>
                      <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: entry.textEntry }}/>
                    </div>
                  );
                  if (!parsedSubmission?.isMulti && current.textEntry) return (
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full"
                      style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
                      <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: current.textEntry }}/>
                    </div>
                  );
                  return null;
                })()}

                {/* Website URL display */}
                {(() => {
                  const entry = activeEntry;
                  const url = entry?.websiteUrl ?? (!parsedSubmission?.isMulti ? current.websiteUrl : null);
                  if (url && !activeEntry?.fileUrl && !current.textEntry) return (
                    <div className="flex flex-col items-center gap-3 mt-32">
                      <svg className="w-12 h-12" style={{ color: "rgba(255,255,255,.3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round"/>
                      </svg>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-bold hover:underline" style={{ color: MAROON }}>
                        {url}
                      </a>
                    </div>
                  );
                  return null;
                })()}

                {/* File display */}
                {activeFileUrl && (
                  <FileViewer
                    fileUrl={activeFileUrl}
                    zoom={zoom}
                    pdfPage={pdfPage}
                    pdfTotal={pdfTotal}
                    setPdfTotal={setPdfTotal}
                  />
                )}

                {/* Empty state for this entry */}
                {activeEntry && !activeEntry.fileUrl && !activeEntry.textEntry && !activeEntry.websiteUrl && (
                  <div className="flex flex-col items-center justify-center gap-3 mt-32"
                    style={{ color: "rgba(255,255,255,.25)" }}>
                    <svg className="w-14 h-14 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round"/>
                    </svg>
                    <p className="text-sm">
                      {activeEntry.required ? "No content submitted (required)" : "Nothing submitted for this entry"}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        {sidebarOpen && (
          <div className="w-72 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">

              {/* Student selector */}
              <div className="px-4 py-3 border-b border-gray-100">
                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: MAROON }}>
                  Submission to view
                </label>
                <select value={current?.id ?? ""}
                  onChange={e => { const idx = submissions.findIndex(s => s.id === e.target.value); if (idx >= 0) setCurrentIdx(idx); }}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] text-gray-700 bg-white focus:outline-none appearance-none cursor-pointer"
                  style={{ fontFamily: FONT }}
                  onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                  onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")}>
                  {submissions.length === 0
                    ? <option value="">No submissions</option>
                    : submissions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.userName ?? s.userEmail}
                        {s.submittedAt ? ` — ${new Date(s.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : " — Not submitted"}
                        {s.grade != null ? ` (${s.grade} pts)` : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Submitted files summary */}
              {current && (
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>
                    Submitted Files
                    {parsedSubmission?.isMulti && (
                      <span className="ml-1 text-gray-400 font-normal normal-case tracking-normal">
                        ({(parsedSubmission.entries ?? []).length} entries)
                      </span>
                    )}
                  </p>

                  {parsedSubmission?.isMulti ? (
                    <div className="space-y-2">
                      {(parsedSubmission.entries ?? []).map((entry, idx) => (
                        <button key={entry.entryId ?? idx}
                          onClick={() => { setActiveEntryIdx(idx); setPdfPage(1); }}
                          className="w-full text-left p-2 rounded-lg border transition-all"
                          style={{
                            borderColor: activeEntryIdx === idx ? MAROON : "#e5e7eb",
                            background:  activeEntryIdx === idx ? "#fdf8f8" : "#fff",
                          }}>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[11px] font-bold truncate" style={{ color: activeEntryIdx === idx ? MAROON : "#374151" }}>
                              {entry.label || entry.type || `Entry ${idx + 1}`}
                            </span>
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded-full text-white shrink-0"
                              style={{ background: entry.required ? MAROON : "#9ca3af" }}>
                              {entry.required ? "REQ" : "OPT"}
                            </span>
                          </div>
                          {entry.fileUrl ? (
                            <p className="text-[10px] text-gray-500 truncate">
                              📎 {entry.fileName ?? entry.fileUrl.split("/").pop() ?? "File"}
                            </p>
                          ) : entry.textEntry ? (
                            <p className="text-[10px] text-gray-500 truncate">✏️ Text entry</p>
                          ) : entry.websiteUrl ? (
                            <p className="text-[10px] text-gray-500 truncate">🔗 {entry.websiteUrl}</p>
                          ) : (
                            <p className="text-[10px] text-gray-400 italic">Nothing submitted</p>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    // Legacy single file
                    current.fileUrl && !current.fileUrl.startsWith("{") ? (
                      <a href={normalizeFileUrl(current.fileUrl) ?? "#"} download target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[12px] font-semibold hover:underline"
                        style={{ color: MAROON }}>
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round"/>
                        </svg>
                        {(normalizeFileUrl(current.fileUrl) ?? "").split("/").pop()}
                      </a>
                    ) : (
                      <p className="text-[11px] text-gray-400">No files submitted</p>
                    )
                  )}
                </div>
              )}

              {/* Assessment */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>Assessment</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-gray-400 block mb-1">
                      Grade out of {assignment.points}
                    </label>
                    <input type="number" min="0" max={assignment.points}
                      value={gradeInput}
                      onChange={e => setGradeInput(e.target.value)}
                      placeholder="—"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[13px] font-bold text-gray-800 focus:outline-none bg-white"
                      style={{ fontFamily: FONT }}
                      onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                      onBlur={e  => { e.currentTarget.style.borderColor = "#e5e7eb"; void saveGrade(); }}/>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-semibold text-gray-400 block mb-1">Status</label>
                    <select value={statusInput} onChange={e => setStatusInput(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] text-gray-700 bg-white focus:outline-none appearance-none cursor-pointer"
                      style={{ fontFamily: FONT }}
                      onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                      onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")}>
                      <option>None</option>
                      <option>Graded</option>
                      <option>Excused</option>
                      <option>Missing</option>
                      <option>Late</option>
                    </select>
                  </div>
                </div>
                {savedFlash && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-green-600 font-bold">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
                    Grade saved
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="px-4 py-3 flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Comments</p>

                {current?.feedback && (
                  <div className="rounded-xl p-3 border border-gray-100" style={{ background: "#fdf8f8" }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white shrink-0"
                        style={{ background: MAROON }}>
                        {getInitials(current.userName, current.userEmail)}
                      </div>
                      <span className="text-[11px] font-bold text-gray-700">{current.userName ?? current.userEmail}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{fmtDateTime(current.submittedAt)}</span>
                    </div>
                    <p className="text-[12px] text-gray-600 leading-relaxed">{current.feedback}</p>
                  </div>
                )}

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100" style={{ background: "#fdf8f8" }}>
                    {["B","I","U"].map(f => (
                      <button key={f}
                        className="w-5 h-5 flex items-center justify-center text-[11px] font-bold text-gray-500 rounded hover:text-[#7b1113] transition-colors"
                        onMouseEnter={e => (e.currentTarget.style.background = "#fef2f2")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <textarea value={comment} onChange={e => setComment(e.target.value)}
                    placeholder="Leave a comment..."
                    rows={4}
                    className="w-full px-3 py-2 text-[12px] text-gray-700 resize-none focus:outline-none bg-white placeholder:text-gray-300"
                    style={{ fontFamily: FONT }}/>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button onClick={submitComment} disabled={saving || !comment.trim()}
                    className="px-4 py-1.5 text-white text-[12px] font-black rounded-lg disabled:opacity-40 transition-all"
                    style={{ background: MAROON, fontFamily: FONT }}
                    onMouseEnter={e => { if (!saving && comment.trim()) e.currentTarget.style.opacity = ".85"; }}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                    {saving ? "Saving..." : "Submit"}
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-1">
                  <button className="text-[11px] font-bold hover:underline block" style={{ color: MAROON }}>
                    Reassign Assignment
                  </button>
                  <button className="text-[11px] font-bold hover:underline block" style={{ color: MAROON }}>
                    Download Submission Comments
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom */}
            <div className="border-t border-gray-200 px-4 py-3 shrink-0" style={{ background: "#fdf8f8" }}>
              <p className="text-[11px] text-gray-400 font-medium">
                {gradedCount} out of {submissions.length} Submissions Graded
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}