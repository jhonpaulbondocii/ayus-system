"use client";

// src/components/layout/course/CourseAssignmentDetail.tsx
// FIXES:
//   1. Rubric always rendered (not gated by isManager) — view-only for non-managers,
//      full edit for managers. Uses /api/courses/ endpoint like rest of component.
//   2. Mobile Quick Actions strip (SpeedGrader, View Submissions, Edit) shown on ≤1023px,
//      hidden on desktop where sidebar shows those links.
//   3. Rubric card overflow:"visible" so modals/dropdowns never clip on small screens.

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Zap, CheckCircle, Circle, Pencil,
  Upload, Users, X, Trash2, FileText,
  ChevronDown, Check, RefreshCw, Search,
  AlertCircle, Clock, Star, PackageOpen,
  Eye, ExternalLink, MoreVertical, Download,
} from "lucide-react";
import {
  MAROON, FONT,
  fmtDue, fmtDate,
  isoToDate, isoToTime,
} from "./helpers";
import type { Assignment, Section, Staff } from "./types";

// ── Types ──────────────────────────────────────────────────────────────────────
type AssignmentWithRole = Assignment & {
  _assignmentRole?: "manager" | "submitter";
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherRole?: string | null;
  _publisherId?: string | null;
  assignees?: string[];
  allowedAttempts?: number | null;
};

interface EnrolledUser { id: string; name: string; email?: string; courseRole?: string; }
interface Submission {
  id?: string; fileUrl: string | null; fileName?: string | null;
  userName: string | null; userEmail: string; userId: string;
  submittedAt: string | null; points?: number | null; grade?: string | null;
  textEntry?: string | null; onlineUrl?: string | null; feedback?: string | null;
  status?: string | null; daysLate?: number | null; isLate?: boolean; isMissing?: boolean;
  allFileUrls?: { label: string; url: string }[];
}
interface AssignRow {
  id: number; assignees: { id: string; label: string }[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}
type ActiveTab = "overview" | "submissions";
type FilterStatus = "all" | "submitted" | "graded" | "missing" | "late" | "excused";
type SortType = "name" | "newest" | "oldest" | "grade";

interface RawStaffUser { id: string; name?: string; userName?: string; email?: string; courseRole?: string; }
interface AssignmentPatchResponse {
  assignment?: { dueDate?: string | null; availableFrom?: string | null; availableUntil?: string | null; status?: string; };
}

// ── Rubric Types ───────────────────────────────────────────────────────────────
interface RubricRating { id?: string; points: number; name: string; description: string; order: number; }
interface RubricCriterion {
  id?: string; name: string; description: string; points: number;
  enableRange: boolean; order: number; ratings: RubricRating[];
}
interface Rubric {
  id?: string; title: string; type: string; ratingDisplay: string; ratingOrder: string; scoring: string;
  doNotPostToGradebook: boolean; useForGrading: boolean; hideScoreTotal: boolean;
  pointsPossible: number; criteria: RubricCriterion[];
}

const DEFAULT_RATINGS: RubricRating[] = [
  { points: 4, name: "Exceeds",     description: "", order: 0 },
  { points: 3, name: "Mastery",     description: "", order: 1 },
  { points: 2, name: "Near",        description: "", order: 2 },
  { points: 1, name: "Below",       description: "", order: 3 },
  { points: 0, name: "No Evidence", description: "", order: 4 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function buildAssignTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m += 30) {
      const hh = ((h + 11) % 12) + 1;
      list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
    }
  return list;
}
const ASSIGN_TIMES = buildAssignTimes();

function normalizeOpt(opt: string): string {
  const o = opt.toLowerCase().replace(/\s+/g, "_");
  if (o.includes("text"))                         return "online_text_entry";
  if (o.includes("file"))                         return "file_upload";
  if (o.includes("url") || o.includes("website")) return "online_url";
  if (o.includes("media"))                        return "media_recording";
  if (o.includes("annotation"))                   return "student_annotation";
  return o;
}
const OPT_LABELS: Record<string, string> = {
  online_text_entry:  "Text Entry",
  file_upload:        "File Upload",
  online_url:         "Website URL",
  media_recording:    "Media Recording",
  student_annotation: "Student Annotation",
};

function fmtLocalCourse(date: string, time: string) {
  if (!date) return null;
  const d = new Date(`${date} ${time || "11:59 PM"}`);
  if (isNaN(d.getTime())) return null;
  return `Local: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function resolveAssigneesLabel(assignees: string[], users: EnrolledUser[]): string {
  if (!assignees || assignees.length === 0) return "Everyone";
  const names = assignees.map(id => users.find(u => u.id === id)?.name ?? id);
  return names.length === 1 ? names[0] : `${names.length} staff`;
}
function getAvailabilityStatus(a: AssignmentWithRole) {
  const now = new Date();
  if (a.status !== "PUBLISHED") return { canSubmit: false, statusLabel: "Not Published", statusColor: "#9ca3af" };
  const from  = a.availableFrom  ? new Date(a.availableFrom)  : null;
  const until = a.availableUntil ? new Date(a.availableUntil) : null;
  if (from  && now < from)  return { canSubmit: false, statusLabel: `Opens ${fmtDate(a.availableFrom)}`,  statusColor: "#f59e0b" };
  if (until && now > until) return { canSubmit: false, statusLabel: "Closed",                             statusColor: "#ef4444" };
  return { canSubmit: true, statusLabel: "Open for submissions", statusColor: "#22c55e" };
}
function isLateCheck(submittedAt: string | null, dueDate: string | null) {
  if (!submittedAt || !dueDate) return false;
  return new Date(submittedAt) > new Date(dueDate);
}
function getGradeColor(points: number, max: number) {
  if (max === 0) return "#6b7280";
  const p = points / max;
  if (p >= 0.9)  return "#16a34a";
  if (p >= 0.75) return "#65a30d";
  if (p >= 0.6)  return "#d97706";
  return "#dc2626";
}
function isImage(url: string) { return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url.split("?")[0]); }
function isPdf(url: string)   { return /\.pdf$/i.test(url.split("?")[0]); }
function computeStats(submissions: Submission[], dueDate: string | null) {
  const submitted = submissions.filter(s => s.submittedAt != null);
  const missing   = submissions.filter(s => !s.submittedAt);
  const graded    = submissions.filter(s => (s.points != null || s.grade != null) && s.status !== "EXCUSED");
  const late      = submitted.filter(s => s.status === "LATE" || s.isLate || isLateCheck(s.submittedAt, dueDate));
  const scored    = graded.filter(s => s.points != null);
  const avgScore  = scored.length > 0
    ? Math.round(scored.reduce((a, s) => a + (s.points ?? 0), 0) / scored.length * 10) / 10
    : null;
  return { submitted, missing, graded, late, avgScore };
}
function openSpeedGrader(url: string) {
  const mob = /Mobi|Android|iPad|Tablet/i.test(navigator.userAgent) || window.innerWidth < 1024;
  if (mob) window.location.href = url;
  else window.open(url, "_blank");
}

// ── Role Badge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null | undefined }) {
  if (!role) return null;
  const n = role.toUpperCase();
  const map: Record<string, React.CSSProperties> = {
    ADMIN:   { background: "#fef2f2", color: MAROON,    border: "1px solid #fecaca" },
    HEAD:    { background: "#fff7ed", color: "#c2410c",  border: "1px solid #fed7aa" },
    STAFF:   { background: "#eff6ff", color: "#1d4ed8",  border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9",  border: "1px solid #ddd6fe" },
  };
  const style = map[n] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
  return (
    <span style={{ ...style, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {n}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ["#0e7490", "#1d4ed8", "#16a34a", "#ea580c", "#7c3aed", MAROON];
  const color  = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", fontWeight: 900, fontSize: size * 0.38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ sub, dueDate }: { sub: Submission; dueDate: string | null }) {
  const isExcused = sub.status === "EXCUSED";
  const late   = sub.status === "LATE" || sub.isLate || isLateCheck(sub.submittedAt, dueDate);
  const graded = (sub.points != null || sub.grade != null) && !isExcused;
  if (!sub.submittedAt)
    return <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#fef2f2",color:MAROON,border:"1px solid #f0c0c0",whiteSpace:"nowrap" }}><AlertCircle size={9}/> Missing</span>;
  if (isExcused)
    return <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#f3f4f6",color:"#6b7280",border:"1px solid #e5e7eb",whiteSpace:"nowrap" }}>Excused</span>;
  if (graded && !late)
    return <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#f0fdf4",color:"#15803d",border:"1px solid #bbf7d0",whiteSpace:"nowrap" }}><Check size={9}/> Graded</span>;
  if (late)
    return <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#fef2f2",color:"#dc2626",border:"1px solid #fecaca",whiteSpace:"nowrap" }}>Late</span>;
  return <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#eff6ff",color:"#1d4ed8",border:"1px solid #bfdbfe",whiteSpace:"nowrap" }}><Check size={9}/> Submitted</span>;
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ title, onConfirm, onCancel, deleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.4)",padding:"0 16px" }} onClick={onCancel}>
      <div style={{ background:"#fff",borderRadius:16,boxShadow:"0 20px 40px rgba(0,0,0,.2)",width:"100%",maxWidth:400,overflow:"hidden",fontFamily:FONT }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"16px 20px",borderBottom:"1px solid #fce8e8",background:"#fef2f2",display:"flex",alignItems:"center",gap:8 }}>
          <Trash2 size={15} style={{ color:MAROON }}/>
          <span style={{ fontSize:14,fontWeight:900,color:MAROON }}>Delete Assignment</span>
        </div>
        <div style={{ padding:20 }}>
          <p style={{ fontSize:13,color:"#374151",lineHeight:1.6,margin:0 }}>
            Are you sure you want to delete <strong>&ldquo;{title}&rdquo;</strong>? This cannot be undone.
          </p>
        </div>
        <div style={{ padding:"12px 20px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",display:"flex",justifyContent:"flex-end",gap:8 }}>
          <button onClick={onCancel} disabled={deleting} style={{ height:36,padding:"0 16px",border:"1px solid #e5e7eb",borderRadius:10,fontSize:13,fontWeight:600,color:"#374151",cursor:"pointer",background:"#fff" }}>Cancel</button>
          <button onClick={onConfirm} disabled={deleting} style={{ height:36,padding:"0 16px",borderRadius:10,fontSize:13,fontWeight:900,color:"#fff",cursor:"pointer",background:MAROON,border:"none",opacity:deleting ? .6 : 1 }}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grade Modal ────────────────────────────────────────────────────────────────
function GradeModal({ sub, assignment, onClose, onSave }: {
  sub: Submission; assignment: AssignmentWithRole; onClose: () => void;
  onSave: (userId: string, points: number | null, feedback: string, status: string) => Promise<void>;
}) {
  const existing = sub.points ?? (sub.grade != null ? parseFloat(sub.grade) : null);
  const [score,    setScore]    = useState<string>(existing != null ? String(existing) : "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [status,   setStatus]   = useState(sub.status ?? "SUBMITTED");
  const [saving,   setSaving]   = useState(false);
  const maxPts = assignment.points;
  const pct = score !== "" && !isNaN(parseFloat(score)) ? Math.round((parseFloat(score) / maxPts) * 100) : null;
  const handleSave = async () => {
    setSaving(true);
    await onSave(sub.userId, score !== "" ? parseFloat(score) : null, feedback, status);
    setSaving(false);
    onClose();
  };
  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,.4)" }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:"20px 20px 0 0",boxShadow:"0 -8px 32px rgba(0,0,0,.2)",width:"100%",maxWidth:480,overflow:"hidden",fontFamily:FONT,maxHeight:"calc(100dvh - 100px)",display:"flex",flexDirection:"column" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 20px",background:MAROON,flexShrink:0 }}>
          <Avatar name={sub.userName ?? sub.userEmail} size={36}/>
          <div style={{ flex:1,minWidth:0 }}>
            <p style={{ fontSize:10,fontWeight:900,color:"rgba(255,255,255,.6)",textTransform:"uppercase",letterSpacing:"0.08em",margin:0 }}>Grading</p>
            <p style={{ fontSize:14,fontWeight:900,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{sub.userName ?? sub.userEmail}</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.6)" }}><X size={16}/></button>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"16px 20px" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,padding:"10px 14px",background:"#f9fafb",borderRadius:10,border:"1px solid #f3f4f6" }}>
            <p style={{ fontSize:12,fontWeight:600,color:"#6b7280",margin:0 }}>{assignment.title}</p>
            <p style={{ fontSize:12,fontWeight:900,color:MAROON,margin:0 }}>Max: {maxPts} pts</p>
          </div>
          {sub.submittedAt && (
            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"#f9fafb",borderRadius:10,border:"1px solid #f3f4f6",marginBottom:16 }}>
              <Clock size={12} style={{ color:"#9ca3af" }}/>
              <p style={{ fontSize:12,color:"#6b7280",margin:0 }}>Submitted: {fmtDateTime(sub.submittedAt)}</p>
            </div>
          )}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:8 }}>Score</label>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
              <input type="number" min={0} max={maxPts} value={score} onChange={e=>setScore(e.target.value)} placeholder="—"
                style={{ flex:1,height:48,textAlign:"center",fontSize:20,fontWeight:900,border:`2px solid ${score !== "" ? MAROON : "#e5e7eb"}`,borderRadius:12,outline:"none",color:MAROON,fontFamily:FONT }}/>
              <span style={{ fontSize:14,fontWeight:700,color:"#9ca3af" }}>/ {maxPts}</span>
              {pct !== null && <span style={{ fontSize:14,fontWeight:900,color:getGradeColor(parseFloat(score), maxPts) }}>{pct}%</span>}
            </div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {[100,90,80,70,60,0].map(p=>{
                const val = Math.round((p/100)*maxPts);
                const isActive = parseFloat(score)===val;
                return (
                  <button key={p} type="button" onClick={()=>setScore(String(val))}
                    style={{ padding:"4px 10px",fontSize:11,fontWeight:700,border:"1px solid",borderRadius:8,cursor:"pointer",borderColor:isActive?MAROON:"#e5e7eb",background:isActive?MAROON:"#fff",color:isActive?"#fff":"#6b7280" }}>
                    {p}% ({val})
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:6 }}>Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)}
              style={{ width:"100%",height:38,border:"1px solid #e5e7eb",borderRadius:10,padding:"0 12px",fontSize:13,background:"#fff",outline:"none",fontFamily:FONT }}>
              <option value="SUBMITTED">Submitted</option>
              <option value="GRADED">Graded</option>
              <option value="LATE">Late</option>
              <option value="MISSING">Missing</option>
              <option value="EXCUSED">Excused</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:6 }}>Feedback (Optional)</label>
            <textarea value={feedback} onChange={e=>setFeedback(e.target.value)} rows={3} placeholder="Write feedback..."
              style={{ width:"100%",padding:"10px 12px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:10,outline:"none",resize:"none",fontFamily:FONT,boxSizing:"border-box" }}/>
          </div>
        </div>
        <div style={{ display:"flex",gap:8,padding:"12px 20px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1,height:40,border:"1px solid #e5e7eb",borderRadius:12,fontSize:14,fontWeight:600,color:"#374151",cursor:"pointer",background:"#fff" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex:1,height:40,borderRadius:12,fontSize:14,fontWeight:900,color:"#fff",cursor:"pointer",background:MAROON,border:"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6,opacity:saving ? .6 : 1 }}>
            <Star size={13}/>{saving ? "Saving..." : "Save Grade"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── File Preview Modal ─────────────────────────────────────────────────────────
function FilePreviewModal({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const files = useMemo(() => {
    if (sub.allFileUrls && sub.allFileUrls.length > 0) return sub.allFileUrls;
    if (sub.fileUrl) return [{ label: sub.fileName ?? "File", url: sub.fileUrl }];
    return [] as { label: string; url: string }[];
  }, [sub]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const resolved = selectedUrl && files.some(f => f.url === selectedUrl) ? selectedUrl : files[0]?.url ?? null;
  const selFile  = files.find(f => f.url === resolved) ?? files[0] ?? null;
  const url      = selFile?.url ?? sub.onlineUrl ?? null;
  if ((!url && !sub.textEntry) || files.length === 0) return null;
  const fileName = selFile?.label ?? sub.fileName ?? "File";
  const isImg    = url ? isImage(url) : false;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.6)",padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:"95vw",height:"90dvh",display:"flex",flexDirection:"column",overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:MAROON,flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,minWidth:0 }}>
            <FileText size={13} style={{ color:"rgba(255,255,255,.7)",flexShrink:0 }}/>
            <span style={{ fontSize:13,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{fileName}</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:12,flexShrink:0 }}>
            {url && <>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.7)",display:"flex",alignItems:"center",gap:4 }}><ExternalLink size={11}/> Open</a>
              <a href={url} download={fileName} style={{ fontSize:11,fontWeight:700,color:"rgba(255,255,255,.7)",display:"flex",alignItems:"center",gap:4 }}><Download size={11}/> Download</a>
            </>}
            <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.6)" }}><X size={15}/></button>
          </div>
        </div>
        {files.length > 1 && (
          <div style={{ display:"flex",gap:8,padding:"10px 16px 0",overflowX:"auto",background:"#fff",borderBottom:"1px solid #f3f4f6" }}>
            {files.map((f, fi) => (
              <button key={fi} onClick={()=>setSelectedUrl(f.url)}
                style={{ padding:"6px 10px",borderRadius:8,border:resolved===f.url?`1px solid ${MAROON}`:"1px solid #e5e7eb",background:resolved===f.url?"#fef2f2":"#fff",color:resolved===f.url?MAROON:"#374151",fontSize:11,fontWeight:700,whiteSpace:"nowrap",cursor:"pointer" }}>
                {f.label}
              </button>
            ))}
          </div>
        )}
        <div style={{ flex:1,overflow:"hidden",background:"#f3f4f6",minHeight:300 }}>
          {!url ? (
            <div style={{ height:"100%",overflowY:"auto",padding:"24px 32px" }}>
              {sub.textEntry
                ? <div style={{ fontSize:13,color:"#374151",lineHeight:1.75 }} dangerouslySetInnerHTML={{ __html: sub.textEntry }}/>
                : <p style={{ fontSize:13,color:"#9ca3af",fontStyle:"italic" }}>No content to preview.</p>}
            </div>
          ) : isImg ? (
            <div style={{ height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={fileName} style={{ maxWidth:"100%",maxHeight:"100%",objectFit:"contain",borderRadius:8 }}/>
            </div>
          ) : isPdf(url) ? (
            <iframe src={url} title={fileName} style={{ width:"100%",height:"100%",border:"none",display:"block" }}/>
          ) : (
            <div style={{ height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,color:"#9ca3af" }}>
              <FileText size={48}/>
              <p style={{ fontSize:13 }}>Preview not available.</p>
              <a href={url} download={fileName} style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:700,padding:"8px 16px",borderRadius:10,color:"#fff",background:MAROON,textDecoration:"none" }}>
                <Download size={13}/> Download to view
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Criterion Modal ────────────────────────────────────────────────────────────
function CriterionModal({ initial, onSave, onClose }: {
  initial?: RubricCriterion; onSave: (c: RubricCriterion) => void; onClose: () => void;
}) {
  const [name,        setName]        = useState(initial?.name        ?? "");
  const [desc,        setDesc]        = useState(initial?.description ?? "");
  const [enableRange, setEnableRange] = useState(initial?.enableRange ?? false);
  const [ratings,     setRatings]     = useState<RubricRating[]>(
    initial?.ratings?.length ? initial.ratings : [...DEFAULT_RATINGS.map(r => ({ ...r }))]
  );
  const maxPts = Math.max(...ratings.map(r => r.points), 0);
  const updateRating = (i: number, field: keyof RubricRating, val: string | number) =>
    setRatings(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const addRating    = () => setRatings(p => [...p, { points: 0, name: "", description: "", order: p.length }]);
  const removeRating = (i: number) => setRatings(p => p.filter((_, idx) => idx !== i));
  const handleSave   = () => {
    if (!name.trim()) { alert("Criterion name is required."); return; }
    const sorted = [...ratings].sort((a, b) => b.points - a.points).map((r, i) => ({ ...r, order: i }));
    onSave({ id: initial?.id, name: name.trim(), description: desc, points: maxPts, enableRange, order: initial?.order ?? 0, ratings: sorted });
  };
  const sortedForDisplay = [...ratings].sort((a, b) => b.points - a.points);
  return (
    <div style={{ position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,.5)",padding:0 }} onClick={onClose}>
      <div style={{ background:"#fff",borderRadius:"20px 20px 0 0",boxShadow:"0 -8px 32px rgba(0,0,0,.2)",width:"100%",maxWidth:640,maxHeight:"90dvh",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:FONT }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #f3f4f6",flexShrink:0 }}>
          <h3 style={{ fontSize:15,fontWeight:900,color:"#111827",margin:0 }}>{initial ? "Edit Criterion" : "Create Criterion"}</h3>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#9ca3af" }}><X size={16}/></button>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"16px 20px" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
            <div>
              <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:6 }}>Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Criterion name"
                style={{ width:"100%",height:38,border:"1px solid #e5e7eb",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",fontFamily:FONT,boxSizing:"border-box" }}/>
            </div>
            <div>
              <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:6 }}>Description</label>
              <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Optional"
                style={{ width:"100%",border:"1px solid #e5e7eb",borderRadius:10,padding:"8px 12px",fontSize:12,outline:"none",resize:"none",fontFamily:FONT,boxSizing:"border-box" }}/>
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
            <label style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#374151",cursor:"pointer" }}>
              <input type="checkbox" checked={enableRange} onChange={e=>setEnableRange(e.target.checked)} style={{ accentColor:MAROON }}/> Enable Range
            </label>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:22,fontWeight:900,color:MAROON }}>{maxPts}</span>
              <span style={{ fontSize:12,fontWeight:600,color:"#6b7280" }}>Points</span>
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <div style={{ display:"grid",gridTemplateColumns:"48px 70px 1fr 1fr 28px",gap:6,minWidth:380 }}>
              {["Disp","Points","Rating Name","Description",""].map(h=>(
                <p key={h} style={{ fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",margin:"0 0 6px" }}>{h}</p>
              ))}
              {sortedForDisplay.map((r, i) => {
                const realIdx = ratings.indexOf(r);
                return (<>
                  <div key={`d${i}`} style={{ width:36,height:36,borderRadius:8,background:MAROON,color:"#fff",fontSize:13,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center" }}>{r.points}</div>
                  <input key={`p${i}`} type="number" min={0} value={r.points} onChange={e=>updateRating(realIdx,"points",parseFloat(e.target.value)||0)} style={{ height:36,border:"1px solid #e5e7eb",borderRadius:8,padding:"0 8px",fontSize:12,textAlign:"center",outline:"none" }}/>
                  <input key={`n${i}`} value={r.name} onChange={e=>updateRating(realIdx,"name",e.target.value)} placeholder="Rating Name" style={{ height:36,border:"1px solid #e5e7eb",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none" }}/>
                  <input key={`desc${i}`} value={r.description} onChange={e=>updateRating(realIdx,"description",e.target.value)} placeholder="Description" style={{ height:36,border:"1px solid #e5e7eb",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none" }}/>
                  <button key={`rm${i}`} onClick={()=>removeRating(realIdx)} style={{ background:"none",border:"none",cursor:"pointer",color:"#d1d5db",display:"flex",alignItems:"center",justifyContent:"center" }}><Trash2 size={13}/></button>
                </>);
              })}
            </div>
            <button onClick={addRating} style={{ marginTop:10,fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer" }}>+ Add Rating</button>
          </div>
        </div>
        <div style={{ display:"flex",gap:8,padding:"12px 20px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1,height:40,border:"1px solid #e5e7eb",borderRadius:12,fontSize:14,fontWeight:600,color:"#374151",cursor:"pointer",background:"#fff" }}>Cancel</button>
          <button onClick={handleSave} style={{ flex:1,height:40,borderRadius:12,fontSize:14,fontWeight:900,color:"#fff",cursor:"pointer",background:MAROON,border:"none" }}>Save Criterion</button>
        </div>
      </div>
    </div>
  );
}

// ── Rubric Section ─────────────────────────────────────────────────────────────
// isManager=true → full edit/delete/create; false → view-only (read the rubric, no buttons)
function RubricSection({ courseId, assignmentId, isManager }: {
  courseId: string; assignmentId: string; isManager: boolean;
}) {
  const [rubric,    setRubric]    = useState<Rubric | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [form, setForm] = useState<Omit<Rubric,"pointsPossible"|"criteria">>({
    title:"", type:"scale", ratingDisplay:"level", ratingOrder:"high_low", scoring:"scored",
    doNotPostToGradebook:false, useForGrading:false, hideScoreTotal:false,
  });
  const [criteria,       setCriteria]       = useState<RubricCriterion[]>([]);
  const [criterionModal, setCriterionModal] = useState<{open:boolean;index:number|null}>({open:false,index:null});

  useEffect(() => {
    fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`)
      .then(r => r.json())
      .then(d => { setRubric((d as {rubric?:Rubric}).rubric ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [courseId, assignmentId]);

  const openCreate = () => {
    if (rubric) {
      setForm({ title:rubric.title, type:rubric.type, ratingDisplay:rubric.ratingDisplay, ratingOrder:rubric.ratingOrder, scoring:rubric.scoring, doNotPostToGradebook:rubric.doNotPostToGradebook, useForGrading:rubric.useForGrading, hideScoreTotal:rubric.hideScoreTotal });
      setCriteria(rubric.criteria.map(c => ({ ...c, ratings:[...c.ratings] })));
    } else {
      setForm({ title:"", type:"scale", ratingDisplay:"level", ratingOrder:"high_low", scoring:"scored", doNotPostToGradebook:false, useForGrading:false, hideScoreTotal:false });
      setCriteria([]);
    }
    setShowModal(true);
  };

  const handleSaveCriterion = (c: RubricCriterion) => {
    if (criterionModal.index !== null) setCriteria(p => p.map((item, i) => i === criterionModal.index ? {...c, order:i} : item));
    else setCriteria(p => [...p, {...c, order:p.length}]);
    setCriterionModal({open:false, index:null});
  };

  const handleSaveRubric = async () => {
    if (!form.title.trim()) { alert("Rubric name is required."); return; }
    if (!criteria.length)   { alert("Add at least one criterion."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, criteria}),
      });
      const d = await res.json();
      if (!res.ok) { alert(`Error: ${(d as {error?:string}).error ?? "Failed"}`); setSaving(false); return; }
      setRubric((d as {rubric:Rubric}).rubric);
      setShowModal(false);
      fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`)
        .then(r => r.json()).then(d => setRubric((d as {rubric?:Rubric}).rubric ?? null)).catch(() => {});
    } catch { alert("Network error."); }
    setSaving(false);
  };

  const handleDeleteRubric = async () => {
    if (!confirm("Delete this rubric?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/courses/${courseId}/assignments/${assignmentId}/rubric`, {method:"DELETE"});
      setRubric(null);
    } catch { alert("Failed to delete rubric."); }
    setDeleting(false);
  };

  const totalPts = criteria.reduce((s, c) => s + c.points, 0);
  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#9ca3af",padding:"8px 0" }}>
      <RefreshCw size={12} style={{ animation:"spin 1s linear infinite" }}/> Loading rubric…
    </div>
  );

  // ── View-only mode (non-managers) ──────────────────────────────────────────
  if (!isManager) {
    if (!rubric) return (
      <p style={{ fontSize:12,color:"#9ca3af",fontStyle:"italic",margin:0 }}>No rubric attached to this assignment.</p>
    );
    return (
      <div style={{ border:"1px solid #e5e7eb",borderRadius:14,overflow:"hidden" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid #fce8e8",background:"#fdf2f2",flexWrap:"wrap",gap:8 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
            <p style={{ fontSize:12,fontWeight:900,color:MAROON,margin:0 }}>Rubric — {rubric.title}</p>
            {rubric.useForGrading && <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#f0fdf4",color:"#15803d",border:"1px solid #bbf7d0" }}>Used for grading</span>}
          </div>
          <span style={{ fontSize:12,fontWeight:900,color:MAROON }}>{rubric.pointsPossible} pts</span>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%",fontSize:12,borderCollapse:"collapse",minWidth:400 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid #f3f4f6",background:"#f9fafb" }}>
                <th style={{ textAlign:"left",padding:"8px 14px",fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",width:140 }}>Criteria</th>
                {(rubric.criteria[0]?.ratings ?? []).slice().sort((a,b)=>rubric.ratingOrder==="high_low"?b.points-a.points:a.points-b.points).map((r,i)=>(
                  <th key={i} style={{ textAlign:"center",padding:"8px 10px",fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af" }}>
                    {r.name}{rubric.ratingDisplay==="points"&&<span style={{ display:"block",fontWeight:900,fontSize:12,color:MAROON }}>{r.points} pts</span>}
                  </th>
                ))}
                <th style={{ textAlign:"center",padding:"8px 10px",fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af" }}>Pts</th>
              </tr>
            </thead>
            <tbody>
              {rubric.criteria.map((c, ci) => {
                const sorted = c.ratings.slice().sort((a,b)=>rubric.ratingOrder==="high_low"?b.points-a.points:a.points-b.points);
                return (
                  <tr key={ci} style={{ background:ci%2===0?"#fff":"#fafafa" }}>
                    <td style={{ padding:"10px 14px",fontWeight:700,color:"#1f2937",fontSize:12,verticalAlign:"top" }}>
                      {c.name}
                      {c.description && <p style={{ fontSize:10,color:"#9ca3af",fontWeight:400,margin:"3px 0 0" }}>{c.description}</p>}
                    </td>
                    {sorted.map((r, ri) => (
                      <td key={ri} style={{ padding:10,textAlign:"center",verticalAlign:"top",borderLeft:"1px solid #f3f4f6" }}>
                        <span style={{ fontSize:11,fontWeight:600,color:"#374151" }}>{r.name}</span>
                        {r.description && <p style={{ fontSize:10,color:"#9ca3af",margin:"3px 0 0" }}>{r.description}</p>}
                      </td>
                    ))}
                    <td style={{ padding:10,textAlign:"center",fontWeight:900,fontSize:13,color:MAROON,borderLeft:"1px solid #f3f4f6" }}>{c.points}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:"2px solid #e5e7eb",background:"#f9fafb" }}>
                <td colSpan={99} style={{ padding:"8px 14px",textAlign:"right",fontSize:12,fontWeight:900,color:MAROON }}>Total: {rubric.pointsPossible} pts</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // ── Manager mode (full edit) ───────────────────────────────────────────────
  return (
    <div style={{ marginTop:4 }}>
      {rubric ? (
        <div style={{ border:"1px solid #e5e7eb",borderRadius:14,overflow:"hidden" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid #fce8e8",background:"#fdf2f2",flexWrap:"wrap",gap:8 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
              <p style={{ fontSize:12,fontWeight:900,color:MAROON,margin:0 }}>Rubric — {rubric.title}</p>
              {rubric.useForGrading && <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:999,background:"#f0fdf4",color:"#15803d",border:"1px solid #bbf7d0" }}>Used for grading</span>}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <span style={{ fontSize:12,fontWeight:900,color:MAROON }}>{rubric.pointsPossible} pts</span>
              <button onClick={openCreate} style={{ fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer",textDecoration:"underline" }}>Edit</button>
              <button onClick={handleDeleteRubric} disabled={deleting} style={{ fontSize:12,fontWeight:700,color:"#ef4444",background:"none",border:"none",cursor:"pointer",textDecoration:"underline" }}>{deleting?"Deleting…":"Delete"}</button>
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%",fontSize:12,borderCollapse:"collapse",minWidth:400 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #f3f4f6",background:"#f9fafb" }}>
                  <th style={{ textAlign:"left",padding:"8px 14px",fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",width:140 }}>Criteria</th>
                  {(rubric.criteria[0]?.ratings??[]).slice().sort((a,b)=>rubric.ratingOrder==="high_low"?b.points-a.points:a.points-b.points).map((r,i)=>(
                    <th key={i} style={{ textAlign:"center",padding:"8px 10px",fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af" }}>
                      {r.name}{rubric.ratingDisplay==="points"&&<span style={{ display:"block",fontWeight:900,fontSize:12,color:MAROON }}>{r.points} pts</span>}
                    </th>
                  ))}
                  <th style={{ textAlign:"center",padding:"8px 10px",fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af" }}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((c, ci) => {
                  const sorted = c.ratings.slice().sort((a,b)=>rubric.ratingOrder==="high_low"?b.points-a.points:a.points-b.points);
                  return (
                    <tr key={ci} style={{ background:ci%2===0?"#fff":"#fafafa" }}>
                      <td style={{ padding:"10px 14px",fontWeight:700,color:"#1f2937",fontSize:12,verticalAlign:"top" }}>
                        {c.name}
                        {c.description&&<p style={{ fontSize:10,color:"#9ca3af",fontWeight:400,margin:"3px 0 0" }}>{c.description}</p>}
                      </td>
                      {sorted.map((r, ri) => (
                        <td key={ri} style={{ padding:10,textAlign:"center",verticalAlign:"top",borderLeft:"1px solid #f3f4f6" }}>
                          <span style={{ fontSize:11,fontWeight:600,color:"#374151" }}>{r.name}</span>
                          {r.description&&<p style={{ fontSize:10,color:"#9ca3af",margin:"3px 0 0" }}>{r.description}</p>}
                        </td>
                      ))}
                      <td style={{ padding:10,textAlign:"center",fontWeight:900,fontSize:13,color:MAROON,borderLeft:"1px solid #f3f4f6" }}>{c.points}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:"2px solid #e5e7eb",background:"#f9fafb" }}>
                  <td colSpan={99} style={{ padding:"8px 14px",textAlign:"right",fontSize:12,fontWeight:900,color:MAROON }}>Total: {rubric.pointsPossible} pts</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
          <button onClick={openCreate} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",fontSize:12,fontWeight:900,color:MAROON,border:`2px solid ${MAROON}`,borderRadius:10,cursor:"pointer",background:"#fef2f2" }}>+ Create Rubric</button>
          <button onClick={openCreate} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",fontSize:12,fontWeight:600,color:"#374151",border:"1px solid #e5e7eb",borderRadius:10,cursor:"pointer",background:"#fff" }}>Find Rubric</button>
        </div>
      )}

      {/* Create / Edit rubric modal */}
      {showModal && (
        <div style={{ position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,.4)" }} onClick={()=>setShowModal(false)}>
          <div style={{ background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:640,maxHeight:"90dvh",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:FONT }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid #f3f4f6",flexShrink:0 }}>
              <h2 style={{ fontSize:15,fontWeight:900,color:"#111827",margin:0 }}>{rubric?"Edit Rubric":"Create Rubric"}</h2>
              <button onClick={()=>setShowModal(false)} style={{ background:"none",border:"none",cursor:"pointer",color:"#9ca3af" }}><X size={16}/></button>
            </div>
            <div style={{ flex:1,overflowY:"auto",padding:"16px 20px" }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:5 }}>Rubric Name *</label>
                  <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Rubric name"
                    style={{ width:"100%",height:38,border:"1px solid #e5e7eb",borderRadius:10,padding:"0 12px",fontSize:13,outline:"none",fontFamily:FONT,boxSizing:"border-box" }}/>
                </div>
                {([
                  {label:"Type",key:"type",opts:[["scale","Scale"],["written_feedback","Written Feedback"]]},
                  {label:"Rating Display",key:"ratingDisplay",opts:[["level","Level"],["points","Points"]]},
                  {label:"Rating Order",key:"ratingOrder",opts:[["high_low","High–Low"],["low_high","Low–High"]]},
                  {label:"Scoring",key:"scoring",opts:[["scored","Scored"],["unscored","Unscored"]]},
                ] as {label:string;key:keyof typeof form;opts:[string,string][]}[]).map(({label,key,opts})=>(
                  <div key={key}>
                    <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:5 }}>{label}</label>
                    <select value={form[key] as string} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                      style={{ width:"100%",height:36,border:"1px solid #e5e7eb",borderRadius:10,padding:"0 10px",fontSize:12,background:"#fff",outline:"none" }}>
                      {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:12,marginBottom:16 }}>
                {([
                  ["doNotPostToGradebook","Don't post to Gradebook"],
                  ["useForGrading","Use for assignment grading"],
                  ["hideScoreTotal","Hide score total"],
                ] as [keyof typeof form,string][]).map(([key,lbl])=>(
                  <label key={key} style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#374151",cursor:"pointer" }}>
                    <input type="checkbox" checked={form[key] as boolean} onChange={e=>setForm(p=>({...p,[key]:e.target.checked}))} style={{ accentColor:MAROON }}/> {lbl}
                  </label>
                ))}
              </div>
              <div>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10 }}>
                  <p style={{ fontSize:13,fontWeight:900,color:"#111827",margin:0 }}>Criteria</p>
                  <p style={{ fontSize:13,fontWeight:900,color:MAROON,margin:0 }}>{totalPts} pts possible</p>
                </div>
                {!criteria.length && <p style={{ fontSize:12,color:"#9ca3af",fontStyle:"italic" }}>No criteria yet.</p>}
                <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:10 }}>
                  {criteria.map((c, i) => (
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",border:"1px solid #e5e7eb",borderRadius:12,background:"#f9fafb" }}>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ fontSize:13,fontWeight:700,color:"#111827",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.name}</p>
                        <p style={{ fontSize:10,color:"#9ca3af",margin:"2px 0 0" }}>{c.ratings.length} ratings · {c.points} pts</p>
                      </div>
                      <button onClick={()=>setCriterionModal({open:true,index:i})} style={{ fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",whiteSpace:"nowrap" }}>Edit</button>
                      <button onClick={()=>setCriteria(p=>p.filter((_,idx)=>idx!==i))} style={{ background:"none",border:"none",cursor:"pointer",color:"#d1d5db" }}><Trash2 size={13}/></button>
                    </div>
                  ))}
                </div>
                <button onClick={()=>setCriterionModal({open:true,index:null})}
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",fontSize:12,fontWeight:900,color:MAROON,border:`2px solid ${MAROON}`,borderRadius:10,cursor:"pointer",background:"#fef2f2" }}>+ Draft Criterion</button>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",flexShrink:0 }}>
              <button onClick={()=>setShowModal(false)} style={{ height:38,padding:"0 16px",border:"1px solid #e5e7eb",borderRadius:12,fontSize:13,fontWeight:600,color:"#374151",cursor:"pointer",background:"#fff" }}>Cancel</button>
              <button onClick={handleSaveRubric} disabled={saving} style={{ height:38,padding:"0 20px",borderRadius:12,fontSize:13,fontWeight:900,color:"#fff",cursor:"pointer",background:MAROON,border:"none",opacity:saving ? .6 : 1 }}>
                {saving ? "Saving…" : rubric ? "Update Rubric" : "Create Rubric"}
              </button>
            </div>
          </div>
        </div>
      )}
      {criterionModal.open && (
        <CriterionModal
          initial={criterionModal.index !== null ? criteria[criterionModal.index] : undefined}
          onSave={handleSaveCriterion}
          onClose={()=>setCriterionModal({open:false,index:null})}
        />
      )}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────
interface CourseAssignmentDetailProps {
  assignment: AssignmentWithRole;
  courseId: string;
  sections: Section[];
  staff: Staff[];
  currentUserId?: string | null;
  onBack: () => void;
  onEditFull: (a: AssignmentWithRole) => void;
  setAssignments: React.Dispatch<React.SetStateAction<AssignmentWithRole[]>>;
  canDelete?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function CourseAssignmentDetail({
  assignment, courseId, sections: _sections, staff: _staff,
  currentUserId: _currentUserId, onBack, onEditFull, setAssignments,
  canDelete = false,
}: CourseAssignmentDetailProps) {
  const [current,         setCurrent]         = useState<AssignmentWithRole>(assignment);
  const [publishing,      setPublishing]      = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [showDotMenu,     setShowDotMenu]     = useState(false);
  const [refreshing,      setRefreshing]      = useState(false);
  const [justRefreshed,   setJustRefreshed]   = useState(false);
  const [activeTab,       setActiveTab]       = useState<ActiveTab>("overview");
  const [submissions,     setSubmissions]     = useState<Submission[]>([]);
  const [enrolledUsers,   setEnrolledUsers]   = useState<EnrolledUser[]>([]);
  const [gradingTarget,   setGradingTarget]   = useState<Submission | null>(null);
  const [previewTarget,   setPreviewTarget]   = useState<Submission | null>(null);
  const [search,          setSearch]          = useState("");
  const [filterStatus,    setFilterStatus]    = useState<FilterStatus>("all");
  const [sort,            setSort]            = useState<SortType>("newest");
  const [assignRows,      setAssignRows]      = useState<AssignRow[]>([]);
  const [savingAssign,    setSavingAssign]    = useState(false);
  const [dropSearch,      setDropSearch]      = useState<Record<number,string>>({});
  const [openDrop,        setOpenDrop]        = useState<number|null>(null);
  const [downloading,     setDownloading]     = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  void _sections; void _staff; void _currentUserId;

  useEffect(() => {
    if (!showDotMenu) return;
    const h = (e: MouseEvent) => {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node)) setShowDotMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotMenu]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      const [sRes, uRes] = await Promise.all([
        fetch(`/api/courses/${courseId}/assignments/${assignment.id}/submissions`, { signal }),
        fetch(`/api/courses/${courseId}/sections`, { signal }),
      ]);
      if (signal?.aborted) return;
      const [sData, uData] = await Promise.all([sRes.json(), uRes.json()]) as [
        { submissions?: Submission[] },
        { staff?: RawStaffUser[]; users?: RawStaffUser[]; members?: RawStaffUser[] },
      ];
      if (signal?.aborted) return;
      setSubmissions(sData.submissions ?? []);
      const raw: RawStaffUser[] = uData.staff ?? uData.users ?? uData.members ?? [];
      setEnrolledUsers(raw.map(u => ({ id:u.id, name:u.name??u.userName??u.email??u.id, courseRole:u.courseRole??"Staff" })));
    } catch { /* silent */ }
  }, [courseId, assignment.id]);

  useEffect(() => {
    const c = new AbortController();
    fetchData(c.signal).catch(() => {});
    return () => c.abort();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => { setRefreshing(false); setJustRefreshed(true); setTimeout(() => setJustRefreshed(false), 3000); });
  };

  const togglePublish = async () => {
    setPublishing(true);
    const newStatus = current.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({status:newStatus}),
    });
    const data = (await res.json()) as AssignmentPatchResponse;
    if (data.assignment) {
      setCurrent(p => ({...p, status:newStatus}));
      setAssignments(prev => prev.map(a => a.id===current.id ? {...a,status:newStatus} : a));
    }
    setPublishing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}`, {method:"DELETE"});
      if (res.ok) { setAssignments(prev => prev.filter(a => a.id !== current.id)); onBack(); }
      else { alert("Failed to delete."); setDeleting(false); setShowDeleteModal(false); }
    } catch { alert("Network error."); setDeleting(false); setShowDeleteModal(false); }
  };

  const handleSaveGrade = async (userId: string, points: number|null, feedback: string, status: string) => {
    const sub = submissions.find(s => s.userId === userId);
    if (!sub?.id) {
      setSubmissions(prev => prev.map(s => s.userId===userId ? {...s, points:points??undefined, grade:points!=null?String(points):null, feedback, status} : s));
      return;
    }
    const res = await fetch(`/api/courses/${courseId}/assignments/${current.id}/submissions`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({submissionId:sub.id, grade:points, feedback, status}),
    });
    if (res.ok) setSubmissions(prev => prev.map(s => s.userId===userId ? {...s, points:points??undefined, grade:points!=null?String(points):null, feedback, status} : s));
  };

  const handleDownloadAll = async () => {
    const downloadable = submissions.filter(s => (s.allFileUrls&&s.allFileUrls.length>0) || (s.fileUrl&&s.submittedAt));
    if (!downloadable.length) return;
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip   = new JSZip();
      for (const s of downloadable) {
        const files = s.allFileUrls&&s.allFileUrls.length>0
          ? s.allFileUrls
          : s.fileUrl ? [{label:s.fileName??"Submission",url:s.fileUrl}] : [];
        if (!files.length) continue;
        const folder   = (s.userName??s.userEmail).replace(/[^a-zA-Z0-9_\- ]/g,"_").trim()||"student";
        const usedNames = new Set<string>();
        for (const file of files) {
          if (!file?.url) continue;
          const base = (file.label||file.url.split("/").pop()||"file").replace(/[\\/]+/g,"_").split("?")[0].split("#")[0]||"file";
          let candidate = base; let idx = 1;
          while (usedNames.has(candidate)) {
            const ext  = candidate.includes(".")?candidate.slice(candidate.lastIndexOf(".")):"";
            const stem = candidate.includes(".")?candidate.slice(0,candidate.lastIndexOf(".")):candidate;
            candidate  = `${stem} (${idx})${ext}`; idx++;
          }
          usedNames.add(candidate);
          try { const r = await fetch(file.url); zip.file(`${folder}/${candidate}`, await r.blob()); } catch { /* skip */ }
        }
      }
      const blob = await zip.generateAsync({type:"blob"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(current.title??"assignment").replace(/[^a-zA-Z0-9_\- ]/g,"_")}_submissions.zip`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch { alert("Failed to download."); }
    setDownloading(false);
  };

  const openAssignPanel = () => {
    const existing = current.assignees ?? [];
    setAssignRows([{
      id: 1,
      assignees: existing.length > 0
        ? existing.map(id => { const f=enrolledUsers.find(u=>u.id===id); return {id,label:f?.name??id}; })
        : [{id:"everyone",label:"Everyone"}],
      dueDate:          isoToDate(current.dueDate),          dueTime:           isoToTime(current.dueDate),
      availableFrom:    isoToDate(current.availableFrom),    availableFromTime:  isoToTime(current.availableFrom),
      until:            isoToDate(current.availableUntil),   untilTime:          isoToTime(current.availableUntil),
    }]);
    setDropSearch({}); setOpenDrop(null); setShowAssignPanel(true);
  };

  const updateAssignRow = (id: number, field: keyof AssignRow, value: string) =>
    setAssignRows(p => p.map(r => r.id===id ? {...r,[field]:value} : r));

  const toggleAssignee = (rowId: number, user: {id:string;label:string}) =>
    setAssignRows(p => p.map(r => {
      if (r.id !== rowId) return r;
      const has  = r.assignees.find(a => a.id===user.id);
      const noEv = r.assignees.filter(a => a.id!=="everyone");
      const next = has ? noEv.filter(a => a.id!==user.id) : [...noEv,user];
      return {...r, assignees: next.length ? next : [{id:"everyone",label:"Everyone"}]};
    }));

  const selectEveryone  = (rowId: number) => setAssignRows(p => p.map(r => r.id===rowId ? {...r,assignees:[{id:"everyone",label:"Everyone"}]} : r));
  const addAssignRow    = () => setAssignRows(p => [...p, {id:Date.now(),assignees:[],dueDate:"",dueTime:"11:59 PM",availableFrom:"",availableFromTime:"12:00 AM",until:"",untilTime:"11:59 PM"}]);
  const removeAssignRow = (id: number) => setAssignRows(p => p.filter(r => r.id!==id));

  const saveAssignTo = async () => {
    setSavingAssign(true);
    const allEv = assignRows.every(r => r.assignees.length===0||r.assignees.some(a=>a.id==="everyone"));
    const ids   = allEv ? [] : assignRows.flatMap(r => r.assignees.filter(a=>a.id!=="everyone").map(a=>a.id));
    const row   = assignRows[0];
    const res   = await fetch(`/api/courses/${courseId}/assignments/${current.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({assignees:ids,dueDate:row.dueDate||null,dueTime:row.dueTime||null,availableFrom:row.availableFrom||null,availableFromTime:row.availableFromTime||null,availableUntil:row.until||null,untilTime:row.untilTime||null}),
    });
    const data = (await res.json()) as AssignmentPatchResponse;
    if (data.assignment) {
      setCurrent(p => ({...p,assignees:ids,dueDate:data.assignment?.dueDate??p.dueDate,availableFrom:data.assignment?.availableFrom??p.availableFrom,availableUntil:data.assignment?.availableUntil??p.availableUntil}));
      setAssignments(prev => prev.map(a => a.id===current.id ? {...a,assignees:ids,dueDate:data.assignment?.dueDate??a.dueDate,availableFrom:data.assignment?.availableFrom??a.availableFrom,availableUntil:data.assignment?.availableUntil??a.availableUntil} : a));
    }
    setSavingAssign(false); setShowAssignPanel(false);
  };

  const handleSpeedGrader = (staffId?: string) => {
    const base = `/courses/${courseId}/assignments/${current.id}/speedgrader`;
    openSpeedGrader(staffId ? `${base}?staffId=${staffId}` : base);
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const isPublished = current.status === "PUBLISHED";
  const isManager   = current._assignmentRole === "manager";
  const opts        = (current.onlineEntryOptions ?? []).map(normalizeOpt);
  const submittingLabel = opts.length > 0 ? opts.map(o => OPT_LABELS[o]??o).join(", ") : (current.submissionType ?? "—");
  const forLabel    = resolveAssigneesLabel(current.assignees ?? [], enrolledUsers);
  const availability = getAvailabilityStatus(current);
  const { submitted } = computeStats(submissions, current.dueDate ?? null);

  const filteredSubmissions = submissions
    .filter(s => {
      const q = search.trim().toLowerCase();
      if (q && !(s.userName??s.userEmail).toLowerCase().includes(q) && !s.userEmail.toLowerCase().includes(q)) return false;
      const late = s.status==="LATE"||s.isLate||isLateCheck(s.submittedAt,current.dueDate??null);
      if (filterStatus==="submitted") return !!s.submittedAt;
      if (filterStatus==="graded")    return (s.points!=null||s.grade!=null)&&s.status!=="EXCUSED";
      if (filterStatus==="missing")   return !s.submittedAt;
      if (filterStatus==="late")      return !!late;
      if (filterStatus==="excused")   return s.status==="EXCUSED";
      return true;
    })
    .sort((a, b) => {
      if (sort==="name")   return (a.userName??a.userEmail).localeCompare(b.userName??b.userEmail);
      if (sort==="grade")  return (b.points??-1)-(a.points??-1);
      if (sort==="oldest") { if (!a.submittedAt) return 1; if (!b.submittedAt) return -1; return new Date(a.submittedAt).getTime()-new Date(b.submittedAt).getTime(); }
      if (!a.submittedAt) return 1; if (!b.submittedAt) return -1;
      return new Date(b.submittedAt).getTime()-new Date(a.submittedAt).getTime();
    });

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",background:"#fff",fontFamily:FONT }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cad-assign-desc { font-size:13px; color:#374151; line-height:1.75; }
        .cad-assign-desc p { margin:0 0 8px; }
        .cad-assign-desc strong,.cad-assign-desc b { font-weight:700; color:#111827; }
        .cad-assign-desc ul,.cad-assign-desc ol { padding-left:20px; margin:0 0 6px; }
        .cad-assign-desc li { margin-bottom:3px; }
        .cad-assign-desc a { color:#7b1113; text-decoration:underline; }

        /* ── Overview layout ── */
        .cad-overview-layout  { display:flex; flex:1; overflow:hidden; }
        .cad-overview-main    { flex:1; overflow-y:auto; padding:20px 24px; min-width:0; }
        .cad-overview-sidebar {
          width:220px; flex-shrink:0; border-left:1px solid #e5e7eb;
          background:#fff; overflow-y:auto; display:flex; flex-direction:column;
        }

        /* Stats: 5-col desktop */
        .cad-stats-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }

        /* Details: 2-col desktop */
        .cad-details-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

        /* Submissions: 2-col desktop */
        .cad-subs-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }

        /* Action labels always visible desktop */
        .cad-action-label { display:inline !important; }

        /* Mobile Quick Actions — HIDDEN on desktop, shown tablet/mobile */
        .cad-mobile-quickactions { display:none; }

        /* ── Tablet (768–1023px) ── */
        @media (max-width:1023px) {
          .cad-overview-sidebar { display:none !important; }
          .cad-overview-main    { padding:16px; }
          .cad-subs-grid        { grid-template-columns:1fr; }
          .cad-mobile-quickactions { display:flex !important; }
        }

        /* ── Mobile (≤767px) ── */
        @media (max-width:767px) {
          .cad-overview-main   { padding:10px 8px; }
          .cad-details-grid    { grid-template-columns:1fr !important; gap:8px; }
          .cad-stats-grid      { grid-template-columns:repeat(3,1fr) !important; gap:6px; }
          .cad-stat-hide-mobile { display:none !important; }
          .cad-action-label    { display:none !important; }
          .cad-subs-grid       { grid-template-columns:1fr; gap:8px; }
          .cad-mobile-quickactions { display:flex !important; }

          /* Top bar: stacked */
          .cad-topbar {
            flex-direction:column !important; align-items:stretch !important;
            padding:0 8px !important; min-height:auto !important;
          }
          .cad-tabs-row button { flex:1; justify-content:center; padding:8px 6px !important; font-size:12px !important; }

          /* Action buttons: single connected bar */
          .cad-actions-wrap {
            width:100%; padding:8px 0 10px !important; gap:0 !important;
            border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; background:#fff;
          }
          .cad-actions-wrap > button,
          .cad-actions-wrap > div {
            flex:1; margin:0 !important; border-radius:0 !important; border:none !important;
            border-right:1px solid #e5e7eb !important; justify-content:center !important; height:38px !important;
          }
          .cad-actions-wrap > button:last-child,
          .cad-actions-wrap > div:last-child { border-right:none !important; }
          .cad-actions-wrap > div > button { width:100% !important; height:100% !important; border-radius:0 !important; }

          /* Filter pills: horizontal scroll */
          .cad-filter-pills { overflow-x:auto !important; flex-wrap:nowrap !important; -webkit-overflow-scrolling:touch; }
          .cad-filter-pills::-webkit-scrollbar { display:none; }

          /* Download bar: stacked */
          .cad-dl-bar { flex-direction:column !important; align-items:stretch !important; }
          .cad-dl-bar button { width:100%; justify-content:center; }
        }

        /* ── Small mobile (≤480px) ── */
        @media (max-width:480px) {
          .cad-actions-wrap { padding:4px 0 !important; }
        }
      `}</style>

      {/* ── Modals ── */}
      {showDeleteModal && <DeleteConfirmModal title={current.title} onConfirm={handleDelete} onCancel={()=>{setShowDeleteModal(false);setShowDotMenu(false);}} deleting={deleting}/>}
      {gradingTarget   && <GradeModal sub={gradingTarget} assignment={current} onClose={()=>setGradingTarget(null)} onSave={handleSaveGrade}/>}
      {previewTarget   && <FilePreviewModal sub={previewTarget} onClose={()=>setPreviewTarget(null)}/>}

      {/* ── Unpublished banner ── */}
      {!isPublished && (
        <div style={{ background:"#fffbeb",borderBottom:"1px solid #fde68a",padding:"8px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" style={{ flexShrink:0 }}><path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
          <p style={{ fontSize:12,color:"#92400e",fontWeight:500,margin:0 }}>This assignment is <strong>unpublished</strong>. Staff cannot see it until published.</p>
        </div>
      )}

      {/* ── Top action bar ── */}
      <div className="cad-topbar" style={{ display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #e5e7eb",padding:"0 8px 0 12px",background:"#fff",flexShrink:0,flexWrap:"wrap",gap:0,minHeight:48 }}>
        {/* Tabs */}
        <div className="cad-tabs-row" style={{ display:"flex",alignItems:"flex-end" }}>
          {(["overview","submissions"] as ActiveTab[]).map(tab=>(
            <button key={tab} onClick={()=>setActiveTab(tab)}
              style={{ padding:"10px 12px",fontSize:13,marginBottom:-1,marginRight:2,borderRadius:"6px 6px 0 0",cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",textTransform:"capitalize",transition:"all 0.15s",
                border:activeTab===tab?"1px solid #e5e7eb":"1px solid transparent",
                borderBottom:activeTab===tab?"1px solid #fff":"1px solid transparent",
                background:activeTab===tab?"#fff":"transparent",
                color:activeTab===tab?"#111827":"#6b7280",
                fontWeight:activeTab===tab?600:400 }}>
              {tab==="submissions"?"Submissions":"Overview"}
              {tab==="submissions"&&submitted.length>0&&(
                <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:"50%",fontSize:10,fontWeight:900,color:"#fff",background:MAROON }}>{submitted.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="cad-actions-wrap" style={{ display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",padding:"6px 0" }}>
          {isManager && (
            <button onClick={togglePublish} disabled={publishing}
              style={{ display:"flex",alignItems:"center",gap:4,padding:"6px 10px",fontSize:12,fontWeight:700,borderRadius:8,cursor:"pointer",opacity:publishing?.6:1,border:"1px solid",
                background:isPublished?"#f0fdf4":"#f9fafb",color:isPublished?"#15803d":"#6b7280",borderColor:isPublished?"#bbf7d0":"#e5e7eb" }}>
              {isPublished?<CheckCircle size={13} style={{color:"#15803d"}}/>:<Circle size={13}/>}
              <span className="cad-action-label">{isPublished?"Published":"Unpublished"}</span>
            </button>
          )}
          {isManager && (
            <button onClick={openAssignPanel}
              style={{ display:"flex",alignItems:"center",gap:4,padding:"6px 10px",fontSize:12,fontWeight:700,borderRadius:8,cursor:"pointer",border:"1px solid #e5e7eb",background:"#fff",color:"#374151" }}>
              <Users size={13}/><span className="cad-action-label">Assign</span>
            </button>
          )}
          {isManager && (
            <button onClick={()=>onEditFull(current)}
              style={{ display:"flex",alignItems:"center",gap:4,padding:"6px 10px",fontSize:12,fontWeight:700,borderRadius:8,cursor:"pointer",border:"1px solid #e5e7eb",background:"#fff",color:"#374151" }}>
              <Pencil size={13}/><span className="cad-action-label">Edit</span>
            </button>
          )}
          <button onClick={()=>handleSpeedGrader()}
            style={{ display:"flex",alignItems:"center",gap:4,padding:"6px 10px",fontSize:12,fontWeight:900,borderRadius:8,cursor:"pointer",border:"none",background:MAROON,color:"#fff",flexShrink:0 }}>
            <Zap size={13}/><span style={{ whiteSpace:"nowrap" }}>SpeedGrader™</span>
          </button>
          {isManager && (
            <div style={{ position:"relative" }} ref={dotMenuRef}>
              <button onClick={()=>setShowDotMenu(p=>!p)}
                style={{ width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",background:"#fff",color:"#6b7280" }}>
                <MoreVertical size={15}/>
              </button>
              {showDotMenu && (
                <div style={{ position:"absolute",right:0,top:"100%",marginTop:4,width:180,background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:100,overflow:"hidden",padding:"4px 0" }}>
                  {canDelete && (
                    <button onClick={()=>{setShowDotMenu(false);setShowDeleteModal(true);}}
                      style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 16px",fontSize:12,fontWeight:600,color:"#ef4444",cursor:"pointer",background:"none",border:"none",textAlign:"left" }}>
                      <Trash2 size={13}/> Delete Assignment
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {activeTab === "overview" && (
        <div className="cad-overview-layout">
          <div className="cad-overview-main">
            <div style={{ display:"flex",flexDirection:"column",gap:10,width:"100%" }}>

              {/* Hero */}
              <div style={{ background:`linear-gradient(135deg,${MAROON} 0%,#5a0d0f 100%)`,borderRadius:12,padding:"12px 14px",position:"relative",overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,position:"relative",flexWrap:"wrap" }}>
                  <div style={{ width:34,height:34,borderRadius:9,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <FileText size={16} color="#fff"/>
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <h1 style={{ fontSize:15,fontWeight:900,color:"#fff",margin:0,letterSpacing:"-0.01em",lineHeight:1.25,wordBreak:"break-word" }}>{current.title}</h1>
                    <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:3 }}>
                      <span style={{ fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20,background:"rgba(255,255,255,.15)",color:"rgba(255,255,255,.85)",letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap" }}>
                        {current.assignmentGroup||"Assignment"}
                      </span>
                      {current._publisherName && (
                        <div style={{ display:"flex",alignItems:"center",gap:5,flexWrap:"wrap" }}>
                          <div style={{ width:18,height:18,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"#fff",overflow:"hidden",flexShrink:0 }}>
                            {current._publisherImage
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={current._publisherImage} alt={current._publisherName} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                              : current._publisherName.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize:11,fontWeight:600,color:"rgba(255,255,255,.85)" }}>{current._publisherName}</span>
                          {current._publisherRole && <RoleBadge role={current._publisherRole}/>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,.12)",borderRadius:20,padding:"4px 9px",flexShrink:0 }}>
                    <div style={{ width:6,height:6,borderRadius:"50%",background:availability.statusColor }}/>
                    <span style={{ fontSize:10,fontWeight:800,color:"#fff",whiteSpace:"nowrap" }}>{availability.statusLabel}</span>
                  </div>
                </div>
              </div>

              {/* ── MOBILE QUICK ACTIONS (shown on tablet/mobile, hidden desktop) ─── */}
              <div
                className="cad-mobile-quickactions"
                style={{ flexWrap:"wrap", gap:8, background:"#fff", border:"1px solid #f0e4e4", borderRadius:12, padding:"10px 12px" }}
              >
                <button
                  onClick={()=>handleSpeedGrader()}
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 12px",fontSize:12,fontWeight:900,borderRadius:9,cursor:"pointer",border:"none",background:MAROON,color:"#fff",flexShrink:0 }}
                >
                  <Zap size={13}/> SpeedGrader™
                </button>
                {submitted.length > 0 && (
                  <button
                    onClick={()=>setActiveTab("submissions")}
                    style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 12px",fontSize:12,fontWeight:700,borderRadius:9,cursor:"pointer",border:`1px solid #f0c0c0`,background:"#fef2f2",color:MAROON,flexShrink:0 }}
                  >
                    <FileText size={13}/> View Submissions
                    <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:18,height:18,borderRadius:"50%",fontSize:10,fontWeight:900,color:"#fff",background:MAROON,flexShrink:0 }}>
                      {submitted.length}
                    </span>
                  </button>
                )}
                {isManager && (
                  <button
                    onClick={()=>onEditFull(current)}
                    style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 12px",fontSize:12,fontWeight:700,borderRadius:9,cursor:"pointer",border:"1px solid #e5e7eb",background:"#fff",color:"#374151",flexShrink:0 }}
                  >
                    <Pencil size={13}/> Edit Assignment
                  </button>
                )}
                <button
                  disabled
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 12px",fontSize:12,fontWeight:600,borderRadius:9,cursor:"not-allowed",border:"1px solid #e5e7eb",background:"#f9fafb",color:"#d1d5db",flexShrink:0,opacity:.5 }}
                >
                  <Upload size={13}/> Re-Upload
                </button>
              </div>

              {/* Description */}
              {current.description && (
                <div style={{ background:"#fff",border:"1px solid #f0e4e4",borderLeft:`3px solid ${MAROON}`,borderRadius:"0 10px 10px 0",padding:"10px 12px" }}>
                  <p style={{ fontSize:9,fontWeight:800,color:MAROON,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 5px" }}>Description</p>
                  <div className="cad-assign-desc" dangerouslySetInnerHTML={{ __html: current.description }}/>
                </div>
              )}

              {/* Stats */}
              {submissions.length > 0 && (()=>{
                const { submitted:s, graded:g, missing:m, late:l, avgScore:a } = computeStats(submissions, current.dueDate??null);
                return (
                  <div className="cad-stats-grid">
                    {[
                      {label:"Submitted",value:s.length,color:"#1d4ed8",bg:"#eff6ff",border:"#bfdbfe",cls:""},
                      {label:"Graded",   value:g.length,color:"#15803d",bg:"#f0fdf4",border:"#bbf7d0",cls:""},
                      {label:"Missing",  value:m.length,color:MAROON,   bg:"#fef2f2",border:"#f0c0c0",cls:""},
                      {label:"Late",     value:l.length,color:"#dc2626",bg:"#fef2f2",border:"#fecaca",cls:"cad-stat-hide-mobile"},
                      {label:"Avg",      value:a!=null?`${a}/${current.points}`:"—",color:"#6b7280",bg:"#f9fafb",border:"#e5e7eb",cls:"cad-stat-hide-mobile"},
                    ].map(stat=>(
                      <div key={stat.label} className={stat.cls} style={{ background:stat.bg,border:`1px solid ${stat.border}`,borderRadius:9,padding:"8px 4px",textAlign:"center" }}>
                        <p style={{ fontSize:"clamp(13px,2.5vw,18px)",fontWeight:900,color:stat.color,margin:0,lineHeight:1 }}>{stat.value}</p>
                        <p style={{ fontSize:"clamp(7.5px,1.2vw,10px)",fontWeight:800,color:stat.color,textTransform:"uppercase",letterSpacing:"0.05em",margin:"3px 0 0" }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Details + Schedule */}
              <div style={{ background:"#fff",border:"1px solid #f0e4e4",borderRadius:12,overflow:"hidden" }}>
                <div style={{ padding:"8px 12px",background:"linear-gradient(90deg,#fef2f2,#fff)",borderBottom:"1px solid #fce8e8" }}>
                  <p style={{ fontSize:9,fontWeight:800,color:MAROON,textTransform:"uppercase",letterSpacing:"0.08em",margin:0 }}>Details &amp; Schedule</p>
                </div>
                <div className="cad-details-grid" style={{ padding:"10px 12px",gap:"8px 14px" }}>
                  {([
                    ["Points",         `${current.points} pts`],
                    ["Due Date",       fmtDue(current.dueDate)||"No due date"],
                    ["Submission",     submittingLabel],
                    ["Assigned To",    forLabel],
                    ["Group",          current.assignmentGroup||"—"],
                    ["Available From", current.availableFrom?fmtDate(current.availableFrom):"—"],
                    ["Attempts",       (current as AssignmentWithRole & {allowedAttempts?:number|null}).allowedAttempts!=null?String((current as AssignmentWithRole & {allowedAttempts?:number|null}).allowedAttempts):"Unlimited"],
                    ["Until",          current.availableUntil?fmtDate(current.availableUntil):"—"],
                  ] as [string,string][]).map(([k,v])=>(
                    <div key={k}>
                      <p style={{ fontSize:8.5,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.06em",margin:"0 0 2px" }}>{k}</p>
                      <p style={{ fontSize:12,fontWeight:700,color:"#111827",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── RUBRIC — always shown (FIX: removed isManager gate) ─────────
                  - isManager=true  → full create/edit/delete UI
                  - isManager=false → read-only table view
                  overflow:"visible" ensures modals/dropdowns don't get clipped
              ──────────────────────────────────────────────────────────────────── */}
              <div style={{ background:"#fff",border:"1px solid #f0e4e4",borderRadius:12,overflow:"visible" }}>
                <div style={{ padding:"8px 12px",background:"linear-gradient(90deg,#fef2f2,#fff)",borderBottom:"1px solid #fce8e8",borderRadius:"12px 12px 0 0" }}>
                  <p style={{ fontSize:9,fontWeight:800,color:MAROON,textTransform:"uppercase",letterSpacing:"0.08em",margin:0 }}>Rubric</p>
                </div>
                <div style={{ padding:"10px 12px" }}>
                  <RubricSection courseId={courseId} assignmentId={current.id} isManager={isManager}/>
                </div>
              </div>

              {/* Submissions CTA */}
              {submitted.length > 0 && (
                <button onClick={()=>setActiveTab("submissions")}
                  style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderRadius:12,border:"1px solid #f0c0c0",background:"linear-gradient(90deg,#fef2f2,#fff)",cursor:"pointer",fontFamily:FONT,boxSizing:"border-box" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ width:32,height:32,borderRadius:9,background:MAROON,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <FileText size={15} color="#fff"/>
                    </div>
                    <div style={{ textAlign:"left" }}>
                      <p style={{ fontSize:13,fontWeight:900,color:MAROON,margin:0 }}>{submitted.length} Submission{submitted.length!==1?"s":""}</p>
                      <p style={{ fontSize:11,color:"#9ca3af",margin:"1px 0 0" }}>View, grade, and download</p>
                    </div>
                  </div>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2.5"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Right Sidebar (desktop only, always present) ── */}
          <div className="cad-overview-sidebar">
            <div style={{ padding:"12px 16px",borderBottom:"1px solid #f3f4f6",background:"#fdf2f2" }}>
              <p style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:MAROON,margin:0 }}>Related Items</p>
            </div>
            <div style={{ padding:"14px 16px",display:"flex",flexDirection:"column",gap:12 }}>
              <button onClick={()=>handleSpeedGrader()} style={{ display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0 }}><Zap size={13}/> SpeedGrader™</button>
              <button onClick={()=>setActiveTab("submissions")} style={{ display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0 }}><FileText size={13}/> View Submissions</button>
              {isManager && <button onClick={()=>onEditFull(current)} style={{ display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0 }}><Pencil size={13}/> Edit Assignment</button>}
              <button style={{ display:"flex",alignItems:"center",gap:7,fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"not-allowed",textAlign:"left",padding:0,opacity:.4 }} disabled><Upload size={13}/> Re-Upload</button>
            </div>
            {submissions.length > 0 && (()=>{
              const { submitted:s, graded:g, missing:m } = computeStats(submissions, current.dueDate??null);
              return (
                <div style={{ padding:"14px 16px",borderTop:"1px solid #f3f4f6" }}>
                  <p style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:"#9ca3af",margin:"0 0 10px" }}>Quick Stats</p>
                  {[
                    {label:"Submitted",value:s.length,color:"#1d4ed8"},
                    {label:"Graded",   value:g.length,color:"#15803d"},
                    {label:"Missing",  value:m.length,color:MAROON},
                  ].map(stat=>(
                    <div key={stat.label} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                      <span style={{ fontSize:12,color:"#6b7280" }}>{stat.label}</span>
                      <span style={{ fontSize:13,fontWeight:900,color:stat.color }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══ SUBMISSIONS TAB ══ */}
      {activeTab === "submissions" && (
        <div style={{ flex:1,overflowY:"auto",padding:16,background:"#f8f8f7" }}>

          {/* Action bar */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,marginBottom:12,flexWrap:"wrap" }}>
            {justRefreshed && (
              <span style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:8,background:"#f0fdf4",color:"#15803d",border:"1px solid #bbf7d0" }}>
                <Check size={11}/> Updated
              </span>
            )}
            <button onClick={handleRefresh} disabled={refreshing}
              style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",fontSize:12,fontWeight:600,border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",color:"#374151",background:"#fff",opacity:refreshing?.6:1 }}>
              <RefreshCw size={12} style={{ animation:refreshing?"spin 1s linear infinite":"none" }}/> Refresh
            </button>
            <button onClick={()=>handleSpeedGrader()}
              style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",fontSize:12,fontWeight:900,borderRadius:8,cursor:"pointer",border:"none",background:MAROON,color:"#fff" }}>
              <Zap size={12}/> SpeedGrader™
            </button>
          </div>

          {/* Stats bar */}
          {(()=>{
            const { submitted:s, graded:g, missing:m, late:l, avgScore:a } = computeStats(submissions, current.dueDate??null);
            return (
              <div className="cad-stats-grid" style={{ marginBottom:14 }}>
                {[
                  {label:"Submitted",value:s.length,color:"#1d4ed8",bg:"#eff6ff",border:"#bfdbfe",cls:""},
                  {label:"Graded",   value:g.length,color:"#15803d",bg:"#f0fdf4",border:"#bbf7d0",cls:""},
                  {label:"Missing",  value:m.length,color:MAROON,   bg:"#fef2f2",border:"#f0c0c0",cls:""},
                  {label:"Late",     value:l.length,color:"#dc2626",bg:"#fef2f2",border:"#fecaca",cls:"cad-stat-hide-mobile"},
                  {label:"Avg",      value:a!=null?`${a}/${current.points}`:"—",color:"#6b7280",bg:"#f9fafb",border:"#e5e7eb",cls:"cad-stat-hide-mobile"},
                ].map(stat=>(
                  <div key={stat.label} className={stat.cls} style={{ borderRadius:10,border:`1px solid ${stat.border}`,background:stat.bg,padding:"12px 4px",textAlign:"center" }}>
                    <p style={{ fontSize:"clamp(14px,2.5vw,22px)",fontWeight:900,color:stat.color,margin:0,lineHeight:1 }}>{stat.value}</p>
                    <p style={{ fontSize:"clamp(8px,1.2vw,11px)",fontWeight:800,color:stat.color,textTransform:"uppercase",letterSpacing:"0.08em",margin:"4px 0 0" }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Filter + search */}
          <div style={{ background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"12px 14px",marginBottom:12,display:"flex",flexDirection:"column",gap:10 }}>
            <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
              <div style={{ position:"relative",flex:1,minWidth:150 }}>
                <Search size={12} style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9ca3af" }}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff..."
                  style={{ width:"100%",height:36,paddingLeft:30,paddingRight:12,fontSize:13,border:"1px solid #e5e7eb",borderRadius:10,outline:"none",fontFamily:FONT,boxSizing:"border-box" }}/>
              </div>
              <select value={sort} onChange={e=>setSort(e.target.value as SortType)}
                style={{ height:36,border:"1px solid #e5e7eb",borderRadius:10,padding:"0 10px",fontSize:12,background:"#fff",outline:"none",fontFamily:FONT,cursor:"pointer",flexShrink:0 }}>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="name">Name</option>
                <option value="grade">Grade</option>
              </select>
            </div>
            <div className="cad-filter-pills" style={{ display:"flex",flexWrap:"wrap",gap:5,alignItems:"center" }}>
              {(["all","submitted","graded","missing","late","excused"] as FilterStatus[]).map(f=>(
                <button key={f} onClick={()=>setFilterStatus(f)}
                  style={{ padding:"4px 10px",fontSize:11,fontWeight:700,border:"1px solid",borderRadius:8,cursor:"pointer",textTransform:"capitalize",whiteSpace:"nowrap",
                    background:filterStatus===f?MAROON:"#fff",color:filterStatus===f?"#fff":"#6b7280",borderColor:filterStatus===f?MAROON:"#e5e7eb" }}>
                  {f}
                </button>
              ))}
              <span style={{ fontSize:11,color:"#9ca3af" }}>{filteredSubmissions.length} shown</span>
            </div>
          </div>

          {/* Download bar */}
          {submitted.length > 0 && (
            <div className="cad-dl-bar" style={{ background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 14px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:34,height:34,borderRadius:10,background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <PackageOpen size={14} style={{ color:MAROON }}/>
                </div>
                <p style={{ fontSize:13,fontWeight:700,color:"#111827",margin:0 }}>Download Submissions</p>
              </div>
              <button onClick={handleDownloadAll} disabled={downloading}
                style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",fontSize:12,fontWeight:700,border:`1px solid #f0c0c0`,borderRadius:8,cursor:"pointer",color:MAROON,background:"#fef2f2",whiteSpace:"nowrap",opacity:downloading?.6:1 }}>
                {downloading?"Preparing…":"Download All (.zip)"}
              </button>
            </div>
          )}

          {/* Submissions list */}
          {filteredSubmissions.length === 0 ? (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"48px 20px",gap:12 }}>
              <div style={{ width:56,height:56,borderRadius:"50%",background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <FileText size={24} style={{ color:MAROON }}/>
              </div>
              <p style={{ fontSize:13,fontWeight:700,color:"#374151",margin:0 }}>{search||filterStatus!=="all"?"No results found":"No submissions yet"}</p>
              <p style={{ fontSize:12,color:"#9ca3af",margin:0,textAlign:"center" }}>{search||filterStatus!=="all"?"Try adjusting your filters":"Submissions will appear here once staff submit"}</p>
              {(search||filterStatus!=="all") && (
                <button onClick={()=>{setSearch("");setFilterStatus("all");}} style={{ fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer",textDecoration:"underline" }}>Clear filters</button>
              )}
            </div>
          ) : (
            <div className="cad-subs-grid">
              {filteredSubmissions.map((sub, i) => {
                const score   = sub.points??(sub.grade!=null?parseFloat(sub.grade):null);
                const hasFile = !!(sub.fileUrl||sub.onlineUrl||sub.textEntry||(sub.allFileUrls&&sub.allFileUrls.length>0));
                const late    = sub.status==="LATE"||sub.isLate||isLateCheck(sub.submittedAt,current.dueDate??null);
                return (
                  <div key={`${sub.userId}-${i}`} style={{ background:"#fff",border:`1px solid ${late&&sub.submittedAt?"#fecaca":"#e5e7eb"}`,borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.04)",display:"flex",flexDirection:"column" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderBottom:"1px solid #f3f4f6" }}>
                      <Avatar name={sub.userName??sub.userEmail} size={34}/>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                          <span style={{ fontSize:13,fontWeight:700,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"calc(100% - 80px)" }}>{sub.userName??sub.userEmail}</span>
                          <StatusBadge sub={sub} dueDate={current.dueDate??null}/>
                        </div>
                        <p style={{ fontSize:11,color:"#9ca3af",margin:"2px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{sub.userEmail}</p>
                      </div>
                      {score!=null&&sub.status!=="EXCUSED" ? (
                        <div style={{ textAlign:"right",flexShrink:0 }}>
                          <span style={{ fontSize:"clamp(16px,2.5vw,20px)",fontWeight:900,color:MAROON }}>{score}</span>
                          <span style={{ fontSize:12,color:"#9ca3af",fontWeight:600 }}>/{current.points}</span>
                        </div>
                      ) : sub.status==="EXCUSED" ? (
                        <span style={{ fontSize:12,fontWeight:700,color:"#9ca3af",flexShrink:0 }}>Excused</span>
                      ) : sub.submittedAt ? (
                        <span style={{ fontSize:12,color:"#d1d5db",flexShrink:0 }}>—/{current.points}</span>
                      ) : null}
                    </div>
                    <div style={{ padding:"10px 14px",display:"flex",flexDirection:"column",gap:6,flex:1 }}>
                      {sub.submittedAt ? (<>
                        <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
                          <Clock size={10} style={{ color:"#9ca3af",flexShrink:0 }}/>
                          <span style={{ fontSize:11,color:"#6b7280" }}>{fmtDateTime(sub.submittedAt)}</span>
                          {late && <span style={{ fontSize:11,fontWeight:700,color:"#dc2626" }}>· Late</span>}
                        </div>
                        {sub.allFileUrls&&sub.allFileUrls.length>0
                          ? sub.allFileUrls.map((f,fi)=>(
                            <div key={fi} style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <FileText size={11} style={{ color:MAROON,flexShrink:0 }}/>
                              <button onClick={()=>setPreviewTarget({...sub,fileUrl:f.url,fileName:f.label,onlineUrl:null,textEntry:null,allFileUrls:sub.allFileUrls})}
                                style={{ fontSize:11,fontWeight:600,color:MAROON,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left",maxWidth:"calc(100% - 40px)" }}>
                                {f.label}
                              </button>
                              <a href={f.url} download={f.label} target="_blank" rel="noopener noreferrer" style={{ marginLeft:"auto",flexShrink:0,color:"#9ca3af" }}><Download size={11}/></a>
                            </div>
                          ))
                          : (sub.fileUrl&&sub.fileName) && (
                            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                              <FileText size={11} style={{ color:MAROON,flexShrink:0 }}/>
                              <button onClick={()=>setPreviewTarget(sub)}
                                style={{ fontSize:11,fontWeight:600,color:MAROON,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"left",maxWidth:"calc(100% - 40px)" }}>
                                {sub.fileName}
                              </button>
                              <a href={sub.fileUrl} download={sub.fileName} target="_blank" rel="noopener noreferrer" style={{ marginLeft:"auto",flexShrink:0,color:"#9ca3af" }}><Download size={11}/></a>
                            </div>
                          )
                        }
                        {sub.onlineUrl && (
                          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                            <ExternalLink size={11} style={{ flexShrink:0,color:"#9ca3af" }}/>
                            <a href={sub.onlineUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,fontWeight:600,color:MAROON,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{sub.onlineUrl}</a>
                          </div>
                        )}
                        {sub.feedback && (
                          <div style={{ borderRadius:8,padding:"7px 10px",fontSize:11,color:"#374151",lineHeight:1.6,background:"#fdf8f8",borderLeft:`3px solid ${MAROON}` }}>
                            <span style={{ fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:3,color:MAROON }}>Feedback</span>
                            {sub.feedback}
                          </div>
                        )}
                      </>) : (
                        <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#9ca3af",fontStyle:"italic" }}><AlertCircle size={11}/>No submission received</div>
                      )}
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:6,padding:"10px 14px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",flexWrap:"wrap",marginTop:"auto" }}>
                      {hasFile&&sub.submittedAt && (
                        <button onClick={()=>setPreviewTarget(sub)}
                          style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",cursor:"pointer",color:"#6b7280",background:"#fff" }}>
                          <Eye size={10}/> Preview
                        </button>
                      )}
                      <button onClick={()=>setGradingTarget(sub)}
                        style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,padding:"5px 10px",borderRadius:8,border:`1px solid #f0c0c0`,cursor:"pointer",color:MAROON,background:"#fef2f2",marginLeft:"auto" }}>
                        <Star size={10}/> {score!=null?"Edit Grade":"Grade"}
                      </button>
                      {sub.submittedAt && (
                        <button onClick={()=>handleSpeedGrader(sub.userId)}
                          style={{ display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,padding:"5px 10px",borderRadius:8,border:"1px solid #e5e7eb",cursor:"pointer",color:"#6b7280",background:"#fff" }}>
                          <Zap size={10}/> SpeedGrader
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {submitted.length > 0 && (
            <div style={{ marginTop:20,display:"flex",justifyContent:"center",paddingBottom:16 }}>
              <button onClick={()=>handleSpeedGrader()} style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer",textDecoration:"underline" }}>
                <Zap size={13}/> Open SpeedGrader™ for all submissions
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Assign To Panel ── */}
      {showAssignPanel && (<>
        <div style={{ position:"fixed",inset:0,zIndex:40,background:"rgba(0,0,0,.2)" }} onClick={()=>setShowAssignPanel(false)}/>
        <div style={{ position:"fixed",right:0,top:0,height:"100%",width:"min(100vw,380px)",background:"#fff",borderLeft:"1px solid #e5e7eb",boxShadow:"0 0 32px rgba(0,0,0,.15)",zIndex:50,display:"flex",flexDirection:"column",fontFamily:FONT }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:MAROON,flexShrink:0 }}>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(255,255,255,.7)",margin:0 }}>Assign To</p>
              <p style={{ fontSize:14,fontWeight:700,color:"#fff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{current.title}</p>
            </div>
            <button onClick={()=>setShowAssignPanel(false)} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)" }}><X size={16}/></button>
          </div>
          <div style={{ flex:1,overflowY:"auto",padding:"16px 18px" }}>
            {assignRows.map((row, idx) => (
              <div key={row.id} style={{ marginBottom:16 }}>
                {idx > 0 && (
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:10 }}>
                    <div style={{ flex:1,height:1,background:"#f3f4f6" }}/>
                    <button onClick={()=>removeAssignRow(row.id)} style={{ fontSize:11,fontWeight:700,color:"#ef4444",background:"none",border:"none",cursor:"pointer" }}>Remove</button>
                    <div style={{ flex:1,height:1,background:"#f3f4f6" }}/>
                  </div>
                )}
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:6 }}>Assign To</label>
                  <div style={{ position:"relative" }} onBlur={e=>{ if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenDrop(null); }}>
                    <div style={{ minHeight:36,border:`2px solid ${openDrop===row.id?MAROON:"#e5e7eb"}`,borderRadius:10,padding:"6px 8px",display:"flex",flexWrap:"wrap",gap:4,alignItems:"center",cursor:"text",background:"#fff" }}
                      onClick={()=>setOpenDrop(row.id)}>
                      {row.assignees.map(a=>(
                        <span key={a.id} style={{ display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:999,color:"#fff",background:MAROON }}>
                          {a.label}
                          <button type="button" tabIndex={-1} onClick={e=>{e.stopPropagation();if(a.id==="everyone")return;toggleAssignee(row.id,a);}} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)",fontWeight:900,lineHeight:1,fontSize:14 }}>×</button>
                        </span>
                      ))}
                      <input value={dropSearch[row.id]??""} onChange={e=>{setDropSearch(p=>({...p,[row.id]:e.target.value}));setOpenDrop(row.id);}}
                        onFocus={()=>setOpenDrop(row.id)} placeholder={row.assignees.length?"":"Search..."}
                        style={{ flex:1,minWidth:80,fontSize:12,outline:"none",background:"transparent",border:"none",fontFamily:FONT }}/>
                      <ChevronDown size={13} style={{ color:"#9ca3af",flexShrink:0 }}/>
                    </div>
                    {openDrop===row.id && (
                      <div style={{ position:"absolute",left:0,right:0,top:"100%",marginTop:4,background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.12)",zIndex:200,maxHeight:200,overflowY:"auto" }}>
                        {("everyone".includes((dropSearch[row.id]??"").toLowerCase())||!(dropSearch[row.id]??"")) && (
                          <button type="button" onMouseDown={e=>{e.preventDefault();selectEveryone(row.id);setDropSearch(p=>({...p,[row.id]:""}));}}
                            style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",fontSize:12,fontWeight:600,cursor:"pointer",background:"none",border:"none",textAlign:"left",color:row.assignees.some(a=>a.id==="everyone")?MAROON:"#374151" }}>
                            Everyone {row.assignees.some(a=>a.id==="everyone")&&<Check size={12} style={{ color:MAROON }}/>}
                          </button>
                        )}
                        {enrolledUsers.filter(u=>u.name.toLowerCase().includes((dropSearch[row.id]??"").toLowerCase())).map(u=>(
                          <button type="button" key={u.id} onMouseDown={e=>{e.preventDefault();toggleAssignee(row.id,{id:u.id,label:u.name});setDropSearch(p=>({...p,[row.id]:""}));}}
                            style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",fontSize:12,fontWeight:600,cursor:"pointer",background:"none",border:"none",textAlign:"left",color:row.assignees.some(a=>a.id===u.id)?MAROON:"#374151" }}>
                            <span>{u.name}{u.courseRole&&<span style={{ color:"#9ca3af",fontWeight:400 }}> ({u.courseRole})</span>}</span>
                            {row.assignees.some(a=>a.id===u.id)&&<Check size={12} style={{ color:MAROON }}/>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {([ ["Due Date","dueDate","dueTime"], ["Available From","availableFrom","availableFromTime"], ["Until","until","untilTime"] ] as const).map(([label,dateField,timeField])=>(
                  <div key={label} style={{ marginBottom:12 }}>
                    <label style={{ fontSize:10,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em",color:"#9ca3af",display:"block",marginBottom:5 }}>{label}</label>
                    <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                      <input type="date" value={row[dateField]} onChange={e=>updateAssignRow(row.id,dateField,e.target.value)}
                        style={{ flex:1,minWidth:110,height:34,border:"1px solid #e5e7eb",borderRadius:8,padding:"0 8px",fontSize:12,outline:"none" }}/>
                      <select value={row[timeField]} onChange={e=>updateAssignRow(row.id,timeField,e.target.value)}
                        style={{ height:34,border:"1px solid #e5e7eb",borderRadius:8,padding:"0 8px",fontSize:12,background:"#fff",outline:"none",minWidth:90 }}>
                        {ASSIGN_TIMES.map(t=><option key={t}>{t}</option>)}
                      </select>
                      <button onClick={()=>updateAssignRow(row.id,dateField,"")} style={{ fontSize:11,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer" }}>Clear</button>
                    </div>
                    {row[dateField]&&<p style={{ fontSize:10,color:"#9ca3af",margin:"3px 0 0" }}>{fmtLocalCourse(row[dateField],row[timeField])}</p>}
                  </div>
                ))}
              </div>
            ))}
            <button onClick={addAssignRow} style={{ display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:700,color:MAROON,background:"none",border:"none",cursor:"pointer" }}>+ Add Row</button>
          </div>
          <div style={{ display:"flex",gap:8,padding:"12px 18px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",flexShrink:0 }}>
            <button onClick={()=>setShowAssignPanel(false)} style={{ flex:1,height:40,border:"1px solid #e5e7eb",borderRadius:12,fontSize:14,fontWeight:600,color:"#374151",cursor:"pointer",background:"#fff" }}>Cancel</button>
            <button onClick={saveAssignTo} disabled={savingAssign} style={{ flex:1,height:40,borderRadius:12,fontSize:14,fontWeight:900,color:"#fff",cursor:"pointer",background:MAROON,border:"none",opacity:savingAssign?.6:1 }}>
              {savingAssign?"Saving...":"Save"}
            </button>
          </div>
        </div>
      </>)}
    </div>
  );
}