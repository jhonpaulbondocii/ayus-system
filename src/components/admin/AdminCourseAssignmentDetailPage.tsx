"use client";

// src/components/admin/AdminCourseAssignmentDetailPage.tsx

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Zap, CheckCircle, Circle, Pencil, Download, Upload,
  Users, ChevronDown, RefreshCw, Check, X, Trash2, MoreVertical,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

interface Assignment {
  id: string; title: string; description: string | null;
  points: number; status: "PUBLISHED" | "UNPUBLISHED";
  submissionType: string; onlineEntryOptions: string[];
  allowedAttempts: number | null; submissionAttempts: string;
  dueDate: string | null; availableFrom: string | null; availableUntil: string | null;
  assignmentGroup: string;
  assignees: string[];
}

interface Creator {
  id: string;
  name: string;
  email: string;
  courseRole: string | null;
  createdAt: string;
}

interface EnrolledUser { id: string; name: string; email?: string; courseRole?: string; }
interface AssignRow {
  id: number;
  assignees: { id: string; label: string }[];
  dueDate: string; dueTime: string;
  availableFrom: string; availableFromTime: string;
  until: string; untilTime: string;
}

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

function fmtLocalCourse(date: string, time: string) {
  if (!date) return null;
  const t = time || "11:59 PM";
  const d = new Date(`${date} ${t}`);
  if (isNaN(d.getTime())) return null;
  return `Local: ${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}
function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function normalizeOpt(opt: string): string {
  const o = opt.toLowerCase().replace(/\s+/g, "_");
  if (o.includes("text")) return "online_text_entry";
  if (o.includes("file")) return "file_upload";
  if (o.includes("url") || o.includes("website")) return "online_url";
  if (o.includes("media")) return "media_recording";
  if (o.includes("annotation")) return "student_annotation";
  return o;
}
const OPT_LABELS: Record<string, string> = {
  online_text_entry: "Text Entry",
  file_upload: "File Upload",
  online_url: "Website URL",
  media_recording: "Media Recording",
  student_annotation: "Student Annotation",
};

function resolveAssigneesLabel(assignees: string[], users: EnrolledUser[]): string {
  if (!assignees || assignees.length === 0) return "Everyone";
  const names = assignees.map(id => users.find(u => u.id === id)?.name ?? id);
  if (names.length === 1) return names[0];
  return `${names.length} staff`;
}

// ── Availability status helper ────────────────────────────────────────────────
function getAvailabilityStatus(assignment: Assignment): {
  canSubmit: boolean;
  statusLabel: string;
  statusColor: string;
} {
  const now = new Date();
  const isPublished = assignment.status === "PUBLISHED";

  if (!isPublished) {
    return { canSubmit: false, statusLabel: "Not Published", statusColor: "#9ca3af" };
  }

  const availableFrom = assignment.availableFrom ? new Date(assignment.availableFrom) : null;
  const availableUntil = assignment.availableUntil ? new Date(assignment.availableUntil) : null;

  if (availableFrom && now < availableFrom) {
    return {
      canSubmit: false,
      statusLabel: `Available from ${fmtDate(assignment.availableFrom)}`,
      statusColor: "#f59e0b",
    };
  }

  if (availableUntil && now > availableUntil) {
    return { canSubmit: false, statusLabel: "Closed", statusColor: "#ef4444" };
  }

  return { canSubmit: true, statusLabel: "Open for submissions", statusColor: "#22c55e" };
}

// ── Role badge ────────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string | null }) {
  if (!role) return null;
  const normalized = role.toUpperCase();
  const styles: Record<string, React.CSSProperties> = {
    ADMIN: { background: "#fef2f2", color: MAROON, border: "1px solid #fecaca" },
    HEAD: { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
    STAFF: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
  };
  const style = styles[normalized] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
  return (
    <span style={{
      ...style,
      fontSize: 9, fontWeight: 800, letterSpacing: "0.12em",
      padding: "1px 6px", borderRadius: 4, textTransform: "uppercase",
    }}>
      {normalized}
    </span>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({
  title, onConfirm, onCancel, deleting,
}: {
  title: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[380px] border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100" style={{ background: "#fef2f2" }}>
          <div className="flex items-center gap-2">
            <Trash2 size={15} style={{ color: MAROON }} />
            <span className="text-sm font-black" style={{ color: MAROON }}>Delete Assignment</span>
          </div>
        </div>
        <div className="px-5 py-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            Are you sure you want to delete <span className="font-bold">&ldquo;{title}&rdquo;</span>?
            This action cannot be undone and all associated submissions will be permanently removed.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="h-9 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-9 px-4 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60"
            style={{ background: MAROON }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCourseAssignmentDetailPage({
  courseId, assignmentId,
}: { courseId: string; assignmentId: string }) {
  const router = useRouter();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [submissions, setSubmissions] = useState<{ fileUrl: string | null; fileName?: string | null; userName: string | null; userEmail: string; userId: string; submittedAt: string | null }[]>([]);
  const [downloading, setDownloading] = useState(false);

  // 3-dot menu
  const [showDotMenu, setShowDotMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dotMenuRef = useRef<HTMLDivElement>(null);

  // Assign To panel
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  const [assignRows, setAssignRows] = useState<AssignRow[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);
  const [dropSearch, setDropSearch] = useState<Record<number, string>>({});
  const [openDrop, setOpenDrop] = useState<number | null>(null);

  // Mobile sidebar toggle
  const [showSidebar, setShowSidebar] = useState(false);

  // Close dot menu on outside click
  useEffect(() => {
    if (!showDotMenu) return;
    const h = (e: MouseEvent) => {
      if (dotMenuRef.current && !dotMenuRef.current.contains(e.target as Node))
        setShowDotMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showDotMenu]);

  useEffect(() => {
    fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`)
      .then(r => r.json()).then(d => {
        setAssignment(d.assignment ?? null);
        setCreator(d.creator ?? null);
        setLoading(false);
      }).catch(() => setLoading(false));

    fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}/submissions`)
      .then(r => r.json()).then(d => { setSubmissions(d.submissions ?? []); }).catch(() => { });

    fetch(`/api/admin/courses/${courseId}/sections`)
      .then(r => r.json()).then(d => {
        const rawStaff = d.staff ?? d.users ?? d.members ?? [];
        const staff: EnrolledUser[] = rawStaff.map((u: { id: string; name?: string; userName?: string; email?: string; courseRole?: string }) => ({
          id: u.id, name: u.name ?? u.userName ?? u.email ?? u.id, courseRole: u.courseRole ?? "Staff",
        }));
        setEnrolledUsers(staff);
      }).catch(() => { });
  }, [courseId, assignmentId]);

  const togglePublish = async () => {
    if (!assignment) return;
    setPublishing(true);
    const newStatus = assignment.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.assignment) setAssignment(prev => prev ? { ...prev, status: newStatus } : null);
    setPublishing(false);
  };

  // ── Delete assignment ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!assignment) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push(`/admin/courses/${courseId}/assignments`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert((data as { error?: string })?.error ?? "Failed to delete assignment.");
        setDeleting(false);
        setShowDeleteModal(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // ── Download submissions ──────────────────────────────────────────────────
  const downloadSubmissions = async () => {
    if (!assignment) return;
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const byStudent: Record<string, typeof submissions> = {};
      for (const sub of submissions) {
        if (!sub.submittedAt || !sub.fileUrl) continue;
        const key = sub.userId;
        if (!byStudent[key]) byStudent[key] = [];
        byStudent[key].push(sub);
      }

      for (const [userId, subs] of Object.entries(byStudent)) {
        const studentName = (subs[0].userName ?? subs[0].userEmail)
          .replace(/[^a-z0-9\s]/gi, "")
          .trim()
          .replace(/\s+/g, "_");

        const studentFolder = zip.folder(`${studentName}_${userId.slice(-6)}`);
        if (!studentFolder) continue;

        for (let i = 0; i < subs.length; i++) {
          const sub = subs[i];
          if (!sub.fileUrl) continue;

          const url = sub.fileUrl.startsWith("/") || sub.fileUrl.startsWith("http")
            ? sub.fileUrl
            : `/uploads/submissions/${sub.fileUrl}`;

          try {
            const res = await fetch(url);
            const blob = await res.blob();

            let fileName = sub.fileName?.trim() || "";
            if (!fileName) {
              const urlPart = url.split("/").pop()?.split("?")[0] ?? "";
              const ext = urlPart.includes(".") ? urlPart.split(".").pop() : "bin";
              fileName = `submission_${i + 1}.${ext}`;
            }

            studentFolder.file(fileName, blob);
          } catch {
            // skip failed fetches silently
          }
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${assignment.title.replace(/[^a-z0-9]/gi, "_")}_submissions.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Failed to generate zip. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const openAssignPanel = () => {
    if (!assignment) return;
    const hasAssignees = assignment.assignees && assignment.assignees.length > 0;
    setAssignRows([{
      id: 1,
      assignees: hasAssignees
        ? assignment.assignees.map(id => {
          const found = enrolledUsers.find(u => u.id === id);
          return { id, label: found?.name ?? id };
        })
        : [{ id: "everyone", label: "Everyone" }],
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split("T")[0] : "",
      dueTime: assignment.dueDate ? new Date(assignment.dueDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ") : "11:59 PM",
      availableFrom: assignment.availableFrom ? new Date(assignment.availableFrom).toISOString().split("T")[0] : "",
      availableFromTime: assignment.availableFrom ? new Date(assignment.availableFrom).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ") : "12:00 AM",
      until: assignment.availableUntil ? new Date(assignment.availableUntil).toISOString().split("T")[0] : "",
      untilTime: assignment.availableUntil ? new Date(assignment.availableUntil).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/, " ") : "11:59 PM",
    }]);
    setDropSearch({}); setOpenDrop(null); setShowAssignPanel(true);
  };

  const updateAssignRow = (id: number, field: keyof AssignRow, value: string) =>
    setAssignRows(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const toggleAssignee = (rowId: number, user: { id: string; label: string }) =>
    setAssignRows(p => p.map(r => {
      if (r.id !== rowId) return r;
      const has = r.assignees.find(a => a.id === user.id);
      // When selecting a specific user, remove "everyone"
      const withoutEveryone = r.assignees.filter(a => a.id !== "everyone");
      const next = has
        ? withoutEveryone.filter(a => a.id !== user.id)
        : [...withoutEveryone, user];
      return { ...r, assignees: next.length ? next : [{ id: "everyone", label: "Everyone" }] };
    }));

  const selectEveryone = (rowId: number) =>
    setAssignRows(p => p.map(r => r.id === rowId ? { ...r, assignees: [{ id: "everyone", label: "Everyone" }] } : r));

  const addAssignRow = () => setAssignRows(p => [...p, {
    id: Date.now(), assignees: [],
    dueDate: "", dueTime: "11:59 PM",
    availableFrom: "", availableFromTime: "12:00 AM",
    until: "", untilTime: "11:59 PM",
  }]);

  const removeAssignRow = (id: number) => setAssignRows(p => p.filter(r => r.id !== id));

  const saveAssignTo = async () => {
    if (!assignment) return;
    setSavingAssign(true);
    const allEveryone = assignRows.every(r => r.assignees.length === 0 || r.assignees.some(a => a.id === "everyone"));
    const resolvedIds = allEveryone ? [] : assignRows.flatMap(r => r.assignees.filter(a => a.id !== "everyone").map(a => a.id));
    const row = assignRows[0];
    const res = await fetch(`/api/admin/courses/${courseId}/assignments/${assignmentId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignees: resolvedIds,
        dueDate: row.dueDate || null,
        dueTime: row.dueTime || null,
        availableFrom: row.availableFrom || null,
        availableFromTime: row.availableFromTime || null,
        availableUntil: row.until || null,
        untilTime: row.untilTime || null,
      }),
    });
    const data = await res.json();
    if (data.assignment) {
      setAssignment(prev => prev ? {
        ...prev,
        assignees: resolvedIds,
        dueDate: data.assignment.dueDate ?? prev.dueDate,
        availableFrom: data.assignment.availableFrom ?? prev.availableFrom,
        availableUntil: data.assignment.availableUntil ?? prev.availableUntil,
      } : null);
    }
    setSavingAssign(false);
    setShowAssignPanel(false);
  };

  const openSpeedGrader = (studentId?: string) => {
    const url = studentId
      ? `/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader?student_id=${studentId}`
      : `/admin/courses/${courseId}/assignments/${assignmentId}/speedgrader`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3 text-gray-400" style={{ fontFamily: FONT }}>
      <RefreshCw size={16} className="animate-spin" /> Loading...
    </div>
  );
  if (!assignment) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ fontFamily: FONT }}>
      <p className="text-sm text-gray-500">Assignment not found.</p>
      <button onClick={() => router.back()} className="text-sm font-bold hover:underline" style={{ color: MAROON }}>← Go back</button>
    </div>
  );

  const isPublished = assignment.status === "PUBLISHED";
  const opts = (assignment.onlineEntryOptions ?? []).map(normalizeOpt);
  const submittingLabel = opts.length > 0 ? opts.map(o => OPT_LABELS[o] ?? o).join(", ") : assignment.submissionType.toLowerCase();
  const forLabel = resolveAssigneesLabel(assignment.assignees ?? [], enrolledUsers);
  const hasDownloadable = submissions.filter(s => s.fileUrl && s.submittedAt).length > 0;
  const availability = getAvailabilityStatus(assignment);

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* Delete confirm modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          title={assignment.title}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteModal(false); setShowDotMenu(false); }}
          deleting={deleting}
        />
      )}

      {/* ── Top action bar ── */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1.5">
          {/* Availability badge - visible to admin */}
          <span
            className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${availability.statusColor}18`, color: availability.statusColor, border: `1px solid ${availability.statusColor}40` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: availability.statusColor }} />
            {availability.statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          <button
            onClick={togglePublish}
            disabled={publishing}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-60"
            style={isPublished
              ? { background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0" }
              : { background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}
          >
            {isPublished ? <CheckCircle size={13} style={{ color: "#15803d" }} /> : <Circle size={13} />}
            <span className="hidden sm:inline">{isPublished ? "Published" : "Unpublished"}</span>
          </button>

          <button
            onClick={openAssignPanel}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all"
          >
            <Users size={12} />
            <span className="hidden sm:inline">Assign To</span>
          </button>

          <button
            onClick={() => router.push(`/admin/courses/${courseId}/assignments/${assignmentId}/edit`)}
            className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800 transition-all"
          >
            <Pencil size={12} />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setShowSidebar(v => !v)}
            className="sm:hidden flex items-center gap-1 text-xs font-bold px-2 py-1.5 border border-gray-200 rounded-lg text-gray-600"
          >
            <Zap size={12} />
          </button>

          {/* 3-dot menu */}
          <div className="relative" ref={dotMenuRef}>
            <button
              onClick={() => setShowDotMenu(p => !p)}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-all"
            >
              <MoreVertical size={15} />
            </button>
            {showDotMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 shadow-xl rounded-xl z-[100] overflow-hidden py-1">
                <button
                  onClick={() => { setShowDotMenu(false); setShowDeleteModal(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <Trash2 size={13} />
                  Delete Assignment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Availability banner for unpublished */}
      {!isPublished && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b">
            <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
          <p className="text-xs text-amber-800 font-medium">
            This assignment is <strong>unpublished</strong>. Students cannot see it until you publish it.
          </p>
        </div>
      )}

      {/* Available-from notice */}
      {isPublished && assignment.availableFrom && new Date() < new Date(assignment.availableFrom) && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#3b82f6">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <p className="text-xs text-blue-800 font-medium">
            Published but students can view only — submissions open {fmtDate(assignment.availableFrom)}.
          </p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── Main content ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">{assignment.title}</h1>

          {/* Creator info */}
          {creator && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                style={{ background: MAROON }}
              >
                {creator.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-800">{creator.name}</span>
                {creator.courseRole && <RoleBadge role={creator.courseRole} />}
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-400">Posted {fmtDateTime(creator.createdAt)}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <style>{`
              .assignment-desc { font-size: 13px; color: #374151; line-height: 1.7; }
              .assignment-desc p { margin: 0 0 8px; }
              .assignment-desc strong, .assignment-desc b { font-weight: 700; color: #111827; }
              .assignment-desc ul, .assignment-desc ol { padding-left: 20px; margin: 0 0 8px; }
              .assignment-desc li { margin-bottom: 4px; }
              .assignment-desc a { color: #7b1113; text-decoration: underline; }
            `}</style>
            <div
              className="assignment-desc"
              dangerouslySetInnerHTML={{ __html: assignment.description ?? "<em style='color:#9ca3af'>No description provided.</em>" }}
            />
          </div>

          {/* Details */}
          <div className="bg-white border-b border-gray-100 mb-5 overflow-hidden">
            <div className="px-1 py-1 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              <p className="text-[10px] font-black uppercase tracking-widest px-3 py-1" style={{ color: MAROON }}>Details</p>
            </div>
            <div className="px-4 sm:px-5 py-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Points</p>
                <p className="text-sm font-bold text-gray-800">{assignment.points}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Submission Type</p>
                <p className="text-sm font-bold text-gray-800">{submittingLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
                <span
                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${availability.statusColor}18`, color: availability.statusColor }}
                >
                  {availability.statusLabel}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Can Submit</p>
                <p className="text-sm font-bold" style={{ color: availability.canSubmit ? "#22c55e" : "#ef4444" }}>
                  {availability.canSubmit ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white border-b border-gray-100 mb-5 overflow-hidden">
            <div className="px-1 py-1 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              <p className="text-[10px] font-black uppercase tracking-widest px-3 py-1" style={{ color: MAROON }}>Schedule</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Due", "For", "Available From", "Until"].map(h => (
                      <th key={h} className="text-left px-3 sm:px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 sm:px-5 py-3 text-sm font-semibold text-gray-700">{fmtDue(assignment.dueDate)}</td>
                    <td className="px-3 sm:px-5 py-3">
                      {forLabel === "Everyone" ? (
                        <span className="text-sm font-semibold text-gray-700">Everyone</span>
                      ) : (
                        <span
                          className="text-sm font-bold cursor-default hover:underline"
                          style={{ color: MAROON }}
                          title={assignment.assignees.map(id => enrolledUsers.find(u => u.id === id)?.name ?? id).join(", ")}
                        >
                          {forLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-5 py-3 text-sm text-gray-600">{fmtDate(assignment.availableFrom)}</td>
                    <td className="px-3 sm:px-5 py-3 text-sm text-gray-600">{fmtDate(assignment.availableUntil)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar (desktop) ── */}
        <div className="hidden sm:flex w-56 border-l border-gray-200 bg-white shrink-0 flex-col overflow-y-auto">
          <div className="px-4 py-4 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Related Items</p>
          </div>
          <div className="px-4 py-4 space-y-3">
            <button
              onClick={() => openSpeedGrader()}
              className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left transition-colors"
              style={{ color: MAROON }}
            >
              <Zap size={13} /> SpeedGrader™
            </button>
            <button
              onClick={downloadSubmissions}
              disabled={downloading || !hasDownloadable}
              className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left disabled:opacity-40 transition-colors"
              style={{ color: MAROON }}
            >
              <Download size={13} />
              {downloading ? "Preparing..." : "Download Submissions"}
            </button>
            <button
              className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left transition-colors"
              style={{ color: MAROON }}
            >
              <Upload size={13} /> Re-Upload Submissions
            </button>
          </div>
          {submissions.length > 0 && (
            <div className="px-4 pt-0 pb-4">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                {submissions.filter(s => s.fileUrl && s.submittedAt).length} file{submissions.filter(s => s.fileUrl && s.submittedAt).length !== 1 ? "s" : ""} from{" "}
                {new Set(submissions.filter(s => s.fileUrl && s.submittedAt).map(s => s.userId)).size} student{new Set(submissions.filter(s => s.fileUrl && s.submittedAt).map(s => s.userId)).size !== 1 ? "s" : ""} ready to download.
              </p>
            </div>
          )}
        </div>

        {/* ── Mobile Sidebar Overlay ── */}
        {showSidebar && (
          <>
            <div className="fixed inset-0 z-40 bg-black/20 sm:hidden" onClick={() => setShowSidebar(false)} />
            <div className="fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col sm:hidden">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Related Items</p>
                <button onClick={() => setShowSidebar(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <button onClick={() => { openSpeedGrader(); setShowSidebar(false); }} className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}>
                  <Zap size={13} /> SpeedGrader™
                </button>
                <button onClick={() => { downloadSubmissions(); setShowSidebar(false); }} disabled={downloading || !hasDownloadable} className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left disabled:opacity-40" style={{ color: MAROON }}>
                  <Download size={13} />
                  {downloading ? "Preparing..." : "Download Submissions"}
                </button>
                <button className="w-full flex items-center gap-2 text-xs font-bold hover:underline text-left" style={{ color: MAROON }}>
                  <Upload size={13} /> Re-Upload Submissions
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Assign To Side Panel ── */}
      {showAssignPanel && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowAssignPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[340px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col" style={{ fontFamily: FONT }}>

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: MAROON }}>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Assign To</p>
                <p className="text-sm font-bold text-white truncate mt-0.5">{assignment?.title}</p>
              </div>
              <button onClick={() => setShowAssignPanel(false)} className="text-white/60 hover:text-white transition-colors ml-2">
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-[10px] font-semibold text-gray-500">Assignment · {assignment?.points} pts</p>
            </div>

            <div className="mx-4 mt-4 mb-1 flex gap-2.5 rounded-xl px-3 py-2.5 border" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
              <svg className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed font-medium">Select who should be assigned and set due dates.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
              {assignRows.map((row, idx) => (
                <div key={row.id} className="space-y-4">
                  {idx > 0 && (
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <button onClick={() => removeAssignRow(row.id)} className="mx-3 text-xs font-bold text-red-400 hover:text-red-600">Remove</button>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Assign To</label>
                    <div className="relative" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpenDrop(null); }}>
                      <div
                        className="min-h-[36px] border-2 rounded-xl px-2 py-1.5 flex flex-wrap gap-1 items-center cursor-text bg-white"
                        style={{ borderColor: openDrop === row.id ? MAROON : "#e5e7eb" }}
                        onClick={() => setOpenDrop(row.id)}
                      >
                        {row.assignees.map(a => (
                          <span key={a.id} className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: MAROON }}>
                            {a.label}
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={e => {
                                e.stopPropagation();
                                if (a.id === "everyone") return;
                                toggleAssignee(row.id, a);
                              }}
                              className="opacity-70 hover:opacity-100 leading-none font-black"
                            >×</button>
                          </span>
                        ))}
                        <input
                          value={dropSearch[row.id] ?? ""}
                          onChange={e => { setDropSearch(p => ({ ...p, [row.id]: e.target.value })); setOpenDrop(row.id); }}
                          onFocus={() => setOpenDrop(row.id)}
                          placeholder={row.assignees.length ? "" : "Search..."}
                          className="flex-1 min-w-[80px] text-xs outline-none bg-transparent py-0.5 text-gray-700 placeholder:text-gray-400"
                        />
                        <ChevronDown size={13} className="text-gray-400 shrink-0" />
                      </div>
                      {openDrop === row.id && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 shadow-xl rounded-xl z-[200] max-h-48 overflow-y-auto">
                          {("everyone".includes((dropSearch[row.id] ?? "").toLowerCase()) || !(dropSearch[row.id] ?? "")) && (
                            <button
                              type="button"
                              tabIndex={0}
                              onMouseDown={e => { e.preventDefault(); selectEveryone(row.id); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                              className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                              style={row.assignees.some(a => a.id === "everyone") ? { color: MAROON } : { color: "#374151" }}
                            >
                              Everyone
                              {row.assignees.some(a => a.id === "everyone") && <Check size={12} style={{ color: MAROON }} />}
                            </button>
                          )}
                          {enrolledUsers
                            .filter(u => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase()))
                            .map(u => (
                              <button
                                type="button"
                                key={u.id}
                                tabIndex={0}
                                onMouseDown={e => { e.preventDefault(); toggleAssignee(row.id, { id: u.id, label: u.name }); setDropSearch(p => ({ ...p, [row.id]: "" })); }}
                                className="w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center justify-between hover:bg-red-50 transition-colors"
                                style={row.assignees.some(a => a.id === u.id) ? { color: MAROON } : { color: "#374151" }}
                              >
                                <span>
                                  {u.name}
                                  {u.courseRole && <span className="ml-1 text-gray-400 font-normal">({u.courseRole})</span>}
                                </span>
                                {row.assignees.some(a => a.id === u.id) && <Check size={12} style={{ color: MAROON }} />}
                              </button>
                            ))}
                          {enrolledUsers.filter(u => u.name.toLowerCase().includes((dropSearch[row.id] ?? "").toLowerCase())).length === 0 &&
                            !("everyone".includes((dropSearch[row.id] ?? "").toLowerCase())) && (
                              <div className="px-3 py-3 text-xs text-gray-400 text-center">No results</div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>

                  {([
                    ["Due Date", "dueDate", "dueTime"],
                    ["Available From", "availableFrom", "availableFromTime"],
                    ["Until", "until", "untilTime"],
                  ] as const).map(([label, dateField, timeField]) => (
                    <div key={label}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">{label}</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="date"
                          value={row[dateField]}
                          onChange={e => updateAssignRow(row.id, dateField, e.target.value)}
                          className="flex-1 h-8 border border-gray-200 rounded-lg px-2 text-xs outline-none focus:border-gray-400 bg-white"
                        />
                        <div className="flex items-center gap-1">
                          <select
                            value={row[timeField]}
                            onChange={e => updateAssignRow(row.id, timeField, e.target.value)}
                            className="h-8 border border-gray-200 rounded-lg px-1.5 text-xs bg-white outline-none focus:border-gray-400 w-full sm:w-28"
                          >
                            {ASSIGN_TIMES.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <button
                            onClick={() => updateAssignRow(row.id, dateField, "")}
                            className="text-[10px] font-bold hover:underline shrink-0 transition-colors"
                            style={{ color: MAROON }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      {row[dateField] && <p className="text-[10px] text-gray-400 mt-1">{fmtLocalCourse(row[dateField], row[timeField])}</p>}
                    </div>
                  ))}
                </div>
              ))}

              <button
                onClick={addAssignRow}
                className="flex items-center gap-1.5 text-xs font-bold hover:underline transition-colors"
                style={{ color: MAROON }}
              >
                <span className="text-base leading-none">+</span> Add Row
              </button>
            </div>

            <div className="flex gap-2 px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowAssignPanel(false)}
                className="flex-1 h-9 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveAssignTo}
                disabled={savingAssign}
                className="flex-1 h-9 rounded-xl text-sm font-black text-white disabled:opacity-60 transition-all"
                style={{ background: MAROON }}
              >
                {savingAssign ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}