"use client";

// src/components/admin/AdminRepositoryPage.tsx

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Image, Film, Music, Archive, Eye, Download,
  Trash2, RefreshCw, CheckCircle, Clock, Folder,
  ChevronDown, ChevronRight, Pencil, ExternalLink, X, Check, Files,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RepoFile {
  id: string; fileName: string; fileUrl: string;
  fileSize: number | null; mimeType: string | null; uploadedAt: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  submission: { id: string; status: string; grade: number | null; feedback: string | null; submittedAt: string | null } | null;
}
interface Repository {
  id: string; name: string; createdAt: string;
  assignment: { id: string; title: string; dueDate: string | null; points: number; status: string; description: string | null; assignmentGroup: string };
  files: RepoFile[]; logs: ActivityLog[];
}
interface ActivityLog {
  id: string; action: string; targetType: string | null; targetName: string | null; createdAt: string;
  metadata: Record<string, string> | null;
  user: { id: string; name: string | null; email: string; image: string | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate  = (iso: string | null) => !iso ? "—" : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
const fmtSize  = (b: number | null) => !b ? "—" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
const isImage  = (u: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(u.split("?")[0]);
const isPdf    = (u: string) => /\.pdf$/i.test(u.split("?")[0]);
const isVideo  = (u: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(u.split("?")[0]);
const isAudio  = (u: string) => /\.(mp3|wav|ogg|m4a|aac)$/i.test(u.split("?")[0]);
const isDoc    = (u: string) => /\.(doc|docx)$/i.test(u.split("?")[0]);
const isSheet  = (u: string) => /\.(xls|xlsx)$/i.test(u.split("?")[0]);
const isZip    = (u: string) => /\.(zip|rar|7z)$/i.test(u.split("?")[0]);

const LOG_CFG: Record<string, { bg: string; text: string; border: string }> = {
  UPLOAD: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  DELETE: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  GRADE:  { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  CREATE: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff" },
  UPDATE: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  SUBMIT: { bg: "#ecfeff", text: "#0891b2", border: "#a5f3fc" },
};

// ─── File Type Icon ───────────────────────────────────────────────────────────
function FTIcon({ url, size = 14 }: { url: string; size?: number }) {
  const p = { size, className: "shrink-0" };
  if (isImage(url))  return <Image    {...p} style={{ color: "#0891b2" }}/>;
  if (isPdf(url))    return <FileText {...p} style={{ color: "#dc2626" }}/>;
  if (isVideo(url))  return <Film     {...p} style={{ color: "#7c3aed" }}/>;
  if (isAudio(url))  return <Music    {...p} style={{ color: "#2563eb" }}/>;
  if (isDoc(url))    return <FileText {...p} style={{ color: "#1d4ed8" }}/>;
  if (isSheet(url))  return <FileText {...p} style={{ color: "#16a34a" }}/>;
  if (isZip(url))    return <Archive  {...p} style={{ color: "#92400e" }}/>;
  return <FileText {...p} style={{ color: "#6b7280" }}/>;
}

// ─── User Avatar ──────────────────────────────────────────────────────────────
function UAv({ name, image, size = 28 }: { name: string | null; image: string | null; size?: number }) {
  const pal = ["#7b1113","#1d4ed8","#16a34a","#ea580c","#7c3aed","#0891b2"];
  const idx = (name?.charCodeAt(0) ?? 0) % pal.length;
  if (image) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name ?? ""} className="rounded-full object-cover shrink-0 ring-2 ring-white" style={{ width: size, height: size }}/>
  );
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center font-black ring-2 ring-white text-white"
      style={{ width: size, height: size, background: pal[idx], fontSize: size * 0.38 }}>
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

// ─── Status Pill ─────────────────────────────────────────────────────────────
function SPill({ status }: { status: string }) {
  const cfg: Record<string, [string,string,string,string]> = {
    GRADED:    ["#f0fdf4","#15803d","#bbf7d0","#22c55e"],
    SUBMITTED: ["#eff6ff","#1d4ed8","#bfdbfe","#3b82f6"],
    PENDING:   ["#f9fafb","#6b7280","#e5e7eb","#9ca3af"],
    OVERDUE:   ["#fef2f2","#dc2626","#fecaca","#ef4444"],
  };
  const [bg,text,border,dot] = cfg[status] ?? cfg.PENDING;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{ background: bg, color: text, border: `1px solid ${border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }}/>
      {status.toLowerCase()}
    </span>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ file, points, onClose, onGrade }: {
  file: RepoFile; points: number; onClose: () => void;
  onGrade: (id: string, grade: number | null, feedback: string) => Promise<void>;
}) {
  const [grade,    setGrade]    = useState(file.submission?.grade != null ? String(file.submission.grade) : "");
  const [feedback, setFeedback] = useState(file.submission?.feedback ?? "");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const save = async () => {
    setSaving(true);
    await onGrade(file.id, grade !== "" ? parseFloat(grade) : null, feedback);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const preview = () => {
    if (isImage(file.fileUrl)) return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={file.fileUrl} alt={file.fileName} className="max-w-full max-h-full object-contain rounded-lg"/>
    );
    if (isVideo(file.fileUrl)) return (
      <video src={file.fileUrl} controls className="max-w-full max-h-full rounded-lg" style={{ maxHeight: "calc(85vh - 100px)" }}/>
    );
    if (isAudio(file.fileUrl)) return (
      <div className="flex flex-col items-center gap-8 py-24">
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "rgba(123,17,19,0.12)" }}>
          <Music size={40} style={{ color: MAROON }}/>
        </div>
        <audio ref={audioRef} src={file.fileUrl} controls className="w-80"/>
      </div>
    );
    if (isPdf(file.fileUrl)) return (
      <iframe src={file.fileUrl} className="w-full rounded-lg" style={{ height: "calc(85vh - 80px)" }} title={file.fileName}/>
    );
    return (
      <div className="flex flex-col items-center gap-5 py-24 text-gray-400">
        <FTIcon url={file.fileUrl} size={52}/>
        <p className="text-sm font-medium">Preview not available</p>
        <a href={file.fileUrl} download target="_blank" rel="noopener noreferrer"
          className="text-sm font-bold hover:underline" style={{ color: MAROON }}>↓ Download to view</a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl overflow-hidden flex shadow-2xl w-full"
        style={{ maxWidth: 980, maxHeight: "92vh", fontFamily: FONT }} onClick={e => e.stopPropagation()}>

        <div className="flex-1 bg-gray-950 flex items-center justify-center overflow-auto p-6 min-h-0">
          {preview()}
        </div>

        <div className="w-64 flex flex-col shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100" style={{ background: MAROON }}>
            <div className="flex items-center gap-2 min-w-0">
              <FTIcon url={file.fileUrl} size={13}/>
              <span className="text-xs font-bold text-white truncate">{file.fileName}</span>
            </div>
            <button onClick={onClose} className="shrink-0 ml-2 text-white/60 hover:text-white transition-colors"><X size={15}/></button>
          </div>

          <div className="flex-1 px-4 py-5 space-y-5 overflow-y-auto">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-2" style={{ color: MAROON }}>Student</p>
              <div className="flex items-center gap-2.5">
                <UAv name={file.user.name} image={file.user.image} size={32}/>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{file.user.name ?? "—"}</p>
                  <p className="text-[10px] text-gray-400 truncate">{file.user.email}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white" style={{ background: MAROON }}>
                Submission Info
              </div>
              <div className="divide-y divide-gray-50 px-3">
                {[["Submitted", fmtShort(file.uploadedAt)], ["File size", fmtSize(file.fileSize)]].map(([k,v]) => (
                  <div key={k} className="flex justify-between items-center py-2.5">
                    <span className="text-[10px] text-gray-400 font-semibold">{k}</span>
                    <span className="text-[11px] font-bold text-gray-700">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-[10px] text-gray-400 font-semibold">Status</span>
                  <SPill status={file.submission?.status ?? "PENDING"}/>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ color: MAROON }}>Grade</p>
              <div className="flex items-center gap-2 mb-3">
                <input type="number" min={0} max={points} value={grade} onChange={e => setGrade(e.target.value)}
                  placeholder="0" className="w-16 h-9 border-2 rounded-lg px-2 text-sm font-black text-center focus:outline-none"
                  style={{ borderColor: MAROON, color: MAROON }}/>
                <span className="text-xs text-gray-400 font-semibold">/ {points} pts</span>
              </div>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="Write feedback for student..." rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gray-300 resize-none text-gray-700 placeholder:text-gray-300"/>
              <button onClick={save} disabled={saving}
                className="mt-2 w-full h-9 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: saved ? "#16a34a" : MAROON }}>
                {saving ? <><RefreshCw size={12} className="animate-spin"/> Saving...</>
                : saved  ? <><Check size={12}/> Saved!</>
                : "Save Grade"}
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <a href={file.fileUrl} download={file.fileName} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors">
                <Download size={13}/> Download file
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── File Row ─────────────────────────────────────────────────────────────────
function FileRow({ file, points, onPreview, onDelete }: {
  file: RepoFile; points: number; onPreview: (f: RepoFile) => void; onDelete: (id: string) => void;
}) {
  const late = file.submission?.submittedAt && new Date(file.uploadedAt) > new Date(file.submission.submittedAt);
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-red-50/20 transition-colors group border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <FTIcon url={file.fileUrl} size={14}/>
        <button onClick={() => onPreview(file)} className="text-sm font-semibold truncate text-left transition-colors hover:underline" style={{ color: MAROON }}>
          {file.fileName}
        </button>
      </div>
      <div className="flex items-center gap-2 w-44 shrink-0">
        <UAv name={file.user.name} image={file.user.image} size={22}/>
        <span className="text-xs text-gray-600 font-medium truncate">{file.user.name ?? file.user.email}</span>
      </div>
      <div className="w-32 shrink-0">
        <span className={`text-xs font-medium ${late ? "text-red-500" : "text-gray-400"}`}>{fmtShort(file.uploadedAt)}</span>
        {late && <span className="ml-1 text-[9px] font-black text-red-500 bg-red-50 border border-red-200 px-1 py-0.5 rounded">LATE</span>}
      </div>
      <span className="text-xs text-gray-400 w-14 shrink-0 text-right">{fmtSize(file.fileSize)}</span>
      <div className="w-24 shrink-0 flex justify-center"><SPill status={file.submission?.status ?? "PENDING"}/></div>
      <div className="w-16 shrink-0 text-right">
        {file.submission?.grade != null
          ? <span className="text-xs font-black" style={{ color: MAROON }}>{file.submission.grade}<span className="text-gray-400 font-normal">/{points}</span></span>
          : <span className="text-xs text-gray-300">—</span>}
      </div>
      <div className="flex items-center gap-1 w-20 shrink-0 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onPreview(file)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <Eye size={12}/>
        </button>
        <a href={file.fileUrl} download={file.fileName} target="_blank" rel="noopener noreferrer"
          className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <Download size={12}/>
        </a>
        <button onClick={() => onDelete(file.id)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors">
          <Trash2 size={12}/>
        </button>
      </div>
    </div>
  );
}

// ─── Folder Section ───────────────────────────────────────────────────────────
function FolderSection({ name, files, points, onPreview, onDelete }: {
  name: string; files: RepoFile[]; points: number;
  onPreview: (f: RepoFile) => void; onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const graded = files.filter(f => f.submission?.grade != null).length;
  const done   = files.length > 0 && graded === files.length;
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left border-b border-gray-100 transition-colors hover:bg-gray-50">
        {open ? <ChevronDown size={14} className="text-gray-400 shrink-0"/> : <ChevronRight size={14} className="text-gray-400 shrink-0"/>}
        <Folder size={15} className="shrink-0 text-amber-500"/>
        <span className="text-sm font-bold text-gray-700 flex-1">{name}</span>
        <span className="text-xs text-gray-400 shrink-0">{files.length} file{files.length !== 1 ? "s" : ""}</span>
        {files.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2"
            style={{ background: done ? "#f0fdf4" : "#f9fafb", color: done ? "#15803d" : "#6b7280", border: `1px solid ${done ? "#bbf7d0" : "#e5e7eb"}` }}>
            {graded}/{files.length} graded
          </span>
        )}
      </button>
      {open && (
        files.length === 0
          ? <div className="px-14 py-4 text-xs text-gray-400 italic">No submissions yet</div>
          : files.map(f => <FileRow key={f.id} file={f} points={points} onPreview={onPreview} onDelete={onDelete}/>)
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminRepositoryPage({ repositoryId, courseId }: { repositoryId: string; courseId: string }) {
  const router = useRouter();
  const [repository,  setRepository]  = useState<Repository | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<"files" | "logs">("files");
  const [previewFile, setPreviewFile] = useState<RepoFile | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState("");
  const [savingName,  setSavingName]  = useState(false);

  useEffect(() => {
    fetch(`/api/admin/repositories/${repositoryId}`)
      .then(r => r.json())
      .then(d => { setRepository(d.repository ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [repositoryId]);

  const deleteFile = async (fileId: string) => {
    if (!confirm("Delete this file permanently?")) return;
    await fetch(`/api/admin/repositories/${repositoryId}/files/${fileId}`, { method: "DELETE" });
    setRepository(prev => prev ? { ...prev, files: prev.files.filter(f => f.id !== fileId) } : null);
    if (previewFile?.id === fileId) setPreviewFile(null);
  };

  const handleGrade = async (fileId: string, grade: number | null, feedback: string) => {
    const file = repository?.files.find(f => f.id === fileId);
    if (!file?.submission) return;
    await fetch(`/api/admin/courses/${courseId}/assignments/${repository!.assignment.id}/submissions/${file.submission.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade, feedback: feedback || null, status: "GRADED" }),
    });
    const upd = (f: RepoFile) => f.id !== fileId ? f : { ...f, submission: f.submission ? { ...f.submission, grade, feedback, status: "GRADED" } : f.submission };
    setRepository(prev => prev ? { ...prev, files: prev.files.map(upd) } : null);
    setPreviewFile(prev => prev?.id === fileId ? upd(prev) : prev);
  };

  const saveName = async () => {
    if (!nameInput.trim() || !repository) return;
    setSavingName(true);
    const res = await fetch(`/api/admin/repositories/${repositoryId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput }),
    });
    if ((await res.json()).repository) setRepository(prev => prev ? { ...prev, name: nameInput } : null);
    setEditingName(false); setSavingName(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400" style={{ fontFamily: FONT }}>
      <RefreshCw size={16} className="animate-spin"/> Loading...
    </div>
  );
  if (!repository) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ fontFamily: FONT }}>
      <p className="text-sm text-gray-500">Repository not found.</p>
      <button onClick={() => router.back()} className="text-sm font-bold hover:underline" style={{ color: MAROON }}>← Go back</button>
    </div>
  );

  const { files, assignment, logs } = repository;
  const graded    = files.filter(f => f.submission?.grade != null).length;
  const submitted = files.filter(f => f.submission?.status === "SUBMITTED").length;
  const pct       = files.length > 0 ? Math.round((graded / files.length) * 100) : 0;
  const groupName = assignment.assignmentGroup || "Assignments";

  const logsByDate: Record<string, ActivityLog[]> = {};
  logs.forEach(log => {
    const d = new Date(log.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    (logsByDate[d] ??= []).push(log);
  });

  // All stat cards — uniform, no highlighting
  const STATS = [
    { label: "Total Files",    value: files.length, icon: <Files size={14}/>,       accent: "#2d3b45" },
    { label: "Graded",         value: graded,        icon: <CheckCircle size={14}/>, accent: "#15803d" },
    { label: "Awaiting Grade", value: submitted,     icon: <Clock size={14}/>,       accent: "#b45309" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8f8f7]" style={{ fontFamily: FONT }}>

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-1.5" style={{ color: MAROON }}>Repository</p>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  className="border-2 rounded-xl px-3 py-1.5 text-lg font-black focus:outline-none w-72"
                  style={{ borderColor: MAROON }}/>
                <button onClick={saveName} disabled={savingName}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: MAROON }}>
                  {savingName ? "..." : "Save"}
                </button>
                <button onClick={() => setEditingName(false)} className="text-xs text-gray-400 hover:text-gray-600 font-medium">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 truncate">{repository.name}</h1>
                <button onClick={() => { setNameInput(repository.name); setEditingName(true); }}
                  className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5"><Pencil size={14}/></button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-gray-500">
              <span className="font-bold text-gray-700">{assignment.title}</span>
              <span className="text-gray-300">·</span>
              {assignment.dueDate ? <span>Due <span className="font-semibold text-gray-700">{fmtDate(assignment.dueDate)}</span></span> : <span>No due date</span>}
              <span className="text-gray-300">·</span>
              <span className="font-semibold">{assignment.points} pts</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-1">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${
              assignment.status === "PUBLISHED" ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
              {assignment.status.toLowerCase()}
            </span>
            <button onClick={() => router.push(`/admin/courses/${courseId}/assignments/${assignment.id}`)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all">
              <ExternalLink size={12}/> View Assignment
            </button>
          </div>
        </div>

        {/* Stat cards — all uniform white, no highlights */}
        <div className="grid grid-cols-4 gap-3">
          {STATS.map(s => (
            <div key={s.label} className="border border-gray-200 rounded-xl px-4 py-3.5 flex items-center gap-3 bg-white shadow-sm">
              <div className="rounded-lg p-2 shrink-0" style={{ background: "#f3f4f6", color: s.accent }}>
                {s.icon}
              </div>
              <div>
                <p className="text-xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-xs font-semibold mt-0.5 text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}

          {/* Progress card */}
          <div className="border border-gray-200 rounded-xl px-4 py-3.5 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Progress</span>
              <span className="text-lg font-black tabular-nums" style={{ color: MAROON }}>{pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: MAROON }}/>
            </div>
            <p className="text-[10px] text-gray-400 font-semibold">{graded} of {files.length} graded</p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-gray-200 px-8 shrink-0">
        <div className="flex gap-1">
          {(["files","logs"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-3 text-sm font-bold border-b-2 transition-all"
              style={activeTab === tab ? { borderColor: MAROON, color: MAROON } : { borderColor: "transparent", color: "#9ca3af" }}>
              {tab === "files" ? `Files (${files.length})` : `Activity Log (${logs.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">

        {activeTab === "files" && (
          <div className="m-5 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "#fdf2f2" }}>
                  <Folder size={32} style={{ color: MAROON }}/>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-700">No files yet</p>
                  <p className="text-xs text-gray-400 mt-1">Files will appear when students submit their work</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
                  {[
                    { label: "Name",      cls: "flex-1" },
                    { label: "Student",   cls: "w-44" },
                    { label: "Submitted", cls: "w-32" },
                    { label: "Size",      cls: "w-14 text-right" },
                    { label: "Status",    cls: "w-24 text-center" },
                    { label: "Grade",     cls: "w-16 text-right" },
                    { label: "",          cls: "w-20" },
                  ].map(h => (
                    <div key={h.label} className={`text-[10px] font-black uppercase tracking-widest ${h.cls}`} style={{ color: MAROON }}>
                      {h.label}
                    </div>
                  ))}
                </div>
                <FolderSection name={groupName} files={files} points={assignment.points} onPreview={setPreviewFile} onDelete={deleteFile}/>
              </>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <div className="m-5 space-y-4">
            {logs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-100">
                  <FileText size={22} className="text-gray-300"/>
                </div>
                <p className="text-sm font-semibold text-gray-400">No activity yet</p>
              </div>
            ) : Object.entries(logsByDate).map(([day, dayLogs]) => (
              <div key={day} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
                  <span className="text-xs font-black" style={{ color: MAROON }}>{day}</span>
                  <span className="text-[10px] text-gray-400 font-semibold">{dayLogs.length} event{dayLogs.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {dayLogs.map(log => {
                    const lc = LOG_CFG[log.action] ?? { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };
                    return (
                      <div key={log.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <UAv name={log.user.name} image={log.user.image} size={32}/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-800">{log.user.name ?? log.user.email}</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                              style={{ background: lc.bg, color: lc.text, borderColor: lc.border }}>
                              {log.action}
                            </span>
                            {log.targetName && <span className="text-xs text-gray-500 truncate">{log.targetName}</span>}
                          </div>
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium tabular-nums shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewFile && (
        <PreviewModal file={previewFile} points={assignment.points} onClose={() => setPreviewFile(null)} onGrade={handleGrade}/>
      )}
    </div>
  );
}