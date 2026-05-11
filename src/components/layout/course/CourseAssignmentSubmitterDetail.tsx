"use client";

// src/components/layout/course/CourseAssignmentSubmitterDetail.tsx

import { useState, useRef } from "react";
import { CheckCircle, Circle, Upload, X, FileText, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { MAROON, FONT, fmtDue, fmtDate } from "./helpers";
import type { Assignment } from "./types";

type AssignmentWithRole = Assignment & {
  _assignmentRole?: "manager" | "submitter";
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherRole?: string | null;
  _publisherId?: string | null;
  _isAssignedToYou?: boolean;
  _isExplicitlyAssignedToYou?: boolean;
  isAssignedToYou?: boolean;
  isCreator?: boolean;
};

interface SubmissionEntryExtended {
  id: number;
  label: string;
  required: boolean;
  type: string;
  allowedFileTypes?: string[];
  maxFiles?: number;
}

type AssignmentWithSubmissionEntries = AssignmentWithRole & {
  submissionEntries?: SubmissionEntryExtended[];
};

const ALLOWED_FILE_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "doc", label: "DOC" },
  { value: "txt", label: "TXT" },
  { value: "xlsx", label: "XLSX" },
  { value: "csv", label: "CSV" },
  { value: "pptx", label: "PPTX" },
  { value: "jpg", label: "JPG" },
  { value: "png", label: "PNG" },
  { value: "zip", label: "ZIP" },
];

function normalizeOpt(opt: string): string {
  const o = opt.toLowerCase().replace(/\s+/g, "_");
  if (o.includes("text")) return "online_text_entry";
  if (o.includes("file")) return "file_upload";
  if (o.includes("url") || o.includes("website")) return "online_url";
  if (o.includes("media")) return "media_recording";
  return o;
}

const OPT_LABELS: Record<string, string> = {
  online_text_entry: "Text Entry",
  file_upload: "File Upload",
  online_url: "Website URL",
  media_recording: "Media Recording",
};

function normalizeFileTypeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(ALLOWED_FILE_TYPES.map(t => t.value));
  return (values as unknown[])
    .filter((v): v is string => typeof v === "string")
    .map(v => v.replace(/^\./, "").trim().toLowerCase())
    .filter(v => allowed.has(v));
}

function formatAllowedFileTypes(types: string[]): string {
  return types.map(t => t.toUpperCase()).join(", ");
}

function validateFileTypes(files: File[], allowedFileTypes: string[]): { valid: boolean; errors: string[] } {
  if (!allowedFileTypes || allowedFileTypes.length === 0) return { valid: true, errors: [] };
  const errors: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedFileTypes.map(t => t.toLowerCase()).includes(ext))
      errors.push(`"${file.name}" not allowed. Accepted: ${allowedFileTypes.map(t => t.toUpperCase()).join(", ")}.`);
  }
  return { valid: errors.length === 0, errors };
}

function getAssignmentFileUploadEntries(assignment: AssignmentWithRole): SubmissionEntryExtended[] {
  const directEntries = ((assignment as AssignmentWithSubmissionEntries).submissionEntries ?? [])
    .filter(e => e.type === "File Upload")
    .map(e => ({
      ...e,
      allowedFileTypes: normalizeFileTypeList(e.allowedFileTypes),
      maxFiles: typeof e.maxFiles === "number" && e.maxFiles > 0 ? e.maxFiles : 1,
    }));
  if (directEntries.length > 0) return directEntries;
  return [{ id: 1, label: "File Upload", required: true, type: "File Upload", allowedFileTypes: [], maxFiles: 1 }];
}

function buildSubmittingLabel(assignment: AssignmentWithRole): string {
  const fileEntries = getAssignmentFileUploadEntries(assignment);
  if (assignment.submissionType === "Online" && fileEntries.length > 0) {
    const labels = fileEntries.map(entry => {
      const types = normalizeFileTypeList(entry.allowedFileTypes);
      return types.length > 0 ? `File Upload (${formatAllowedFileTypes(types)})` : "File Upload";
    });
    return [...new Set(labels)].join(", ");
  }
  const opts = (assignment.onlineEntryOptions ?? []).map(normalizeOpt);
  if (opts.length > 0) return opts.map(o => OPT_LABELS[o] ?? o).join(", ");
  return assignment.submissionType ?? "File Upload";
}

interface ParsedSubmittedEntry {
  entryId: string;
  label: string;
  type: string;
  fileUrl?: string | null;
  fileName?: string | null;
  textEntry?: string | null;
  websiteUrl?: string | null;
  required: boolean;
}

function parseSubmittedEntries(fileUrl: string | null | undefined): ParsedSubmittedEntry[] | null {
  if (!fileUrl) return null;
  try {
    const parsed = JSON.parse(fileUrl) as { version?: number; entries?: ParsedSubmittedEntry[] };
    if (parsed.version === 2 && Array.isArray(parsed.entries)) return parsed.entries;
  } catch { /* legacy single file */ }
  return null;
}

function PublisherBar({ name, image, role, publisherId, currentUserId }: {
  name?: string | null; image?: string | null; role?: string | null;
  publisherId?: string | null; currentUserId?: string | null;
}) {
  if (!name) return null;
  if (publisherId && currentUserId && publisherId === currentUserId) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 shrink-0" style={{ background: "#fafafa" }}>
      <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-100 flex items-center justify-center">
        {image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={image} alt={name} className="w-full h-full object-cover" />
          : <span className="text-[10px] font-bold text-gray-500">{name.charAt(0).toUpperCase()}</span>}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0 flex-wrap">
        <span className="font-semibold text-gray-800 truncate">{name}</span>
        {role && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
            style={{ background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}>{role}</span>
        )}
        <span className="text-gray-400 shrink-0">· Published this assignment</span>
      </div>
    </div>
  );
}

function SubmittedView({ assignment, onResubmit, canResubmit }: {
  assignment: AssignmentWithRole; onResubmit: () => void; canResubmit: boolean;
}) {
  const sub = assignment.submissions?.[0];
  if (!sub?.submittedAt) return null;
  const submittedEntries = parseSubmittedEntries(sub.fileUrl);
  const isUnlimited = assignment.allowedAttempts == null;
  const attemptCount = Array.isArray(assignment.submissions) ? assignment.submissions.length : 1;
  const attemptsLeft = isUnlimited ? null : (assignment.allowedAttempts ?? 1) - attemptCount;
  const hasAttemptsLeft = isUnlimited || (attemptsLeft != null && attemptsLeft > 0);

  return (
    <div className="space-y-3">
      {submittedEntries ? (
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100" style={{ background: "#f9fafb" }}>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your Submitted Files</p>
          </div>
          <div className="divide-y divide-gray-100">
            {submittedEntries.map((entry, i) => (
              <div key={entry.entryId} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                  <FileText size={13} style={{ color: MAROON }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{entry.label || `Submission ${i + 1}`}</p>
                  <p className="text-xs font-semibold text-gray-800 truncate">{entry.fileName || entry.fileUrl?.split("/").pop() || "File"}</p>
                </div>
                {entry.fileUrl && (
                  <a href={entry.fileUrl.startsWith("/") || entry.fileUrl.startsWith("http") ? entry.fileUrl : `/uploads/submissions/${entry.fileUrl}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold border rounded-lg hover:bg-gray-50 shrink-0"
                    style={{ color: MAROON, borderColor: "#f0c0c0" }}>
                    <ExternalLink size={11} /> View
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : sub.fileUrl && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-gray-200 bg-white">
          <FileText size={13} style={{ color: MAROON }} />
          <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{sub.fileUrl.split("/").pop()}</span>
          <a href={sub.fileUrl.startsWith("/") || sub.fileUrl.startsWith("http") ? sub.fileUrl : `/uploads/submissions/${sub.fileUrl}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold border rounded-lg hover:bg-gray-50 shrink-0"
            style={{ color: MAROON, borderColor: "#f0c0c0" }}>
            <ExternalLink size={11} /> View
          </a>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-400">
          {isUnlimited
            ? `Attempt ${attemptCount} · Unlimited attempts`
            : `Attempt ${attemptCount} of ${assignment.allowedAttempts} · ${attemptsLeft} remaining`}
        </p>
        {canResubmit && hasAttemptsLeft ? (
          <button onClick={onResubmit}
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ background: MAROON }}>
            <RefreshCw size={12} />
            {isUnlimited ? "Submit Again" : "Resubmit"}
          </button>
        ) : !hasAttemptsLeft && (
          <span className="text-xs font-semibold text-gray-400 px-2.5 py-1 rounded-lg border border-gray-200">No attempts remaining</span>
        )}
      </div>
    </div>
  );
}

function SubmitterFileUploadSection({ assignment, courseId, onCancel, onSubmitted }: {
  assignment: AssignmentWithRole; courseId: string;
  onCancel: () => void; onSubmitted: () => void;
}) {
  const fileEntries = getAssignmentFileUploadEntries(assignment);
  const [selectedFilesByEntry, setSelectedFilesByEntry] = useState<Record<string, File[]>>({});
  const [fileErrorsByEntry, setFileErrorsByEntry] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFilesForEntry = (entry: SubmissionEntryExtended, files: File[]) => {
    const entryKey = String(entry.id);
    const allowedTypes = normalizeFileTypeList(entry.allowedFileTypes);
    const maxFiles = entry.maxFiles ?? 1;
    if (files.length === 0) return;
    if (files.length > maxFiles) {
      setFileErrorsByEntry(prev => ({ ...prev, [entryKey]: [`Max ${maxFiles} file${maxFiles !== 1 ? "s" : ""} allowed.`] }));
      setSelectedFilesByEntry(prev => ({ ...prev, [entryKey]: [] }));
      const ref = inputRefs.current[entryKey]; if (ref) ref.value = "";
      return;
    }
    const { valid, errors } = validateFileTypes(files, allowedTypes);
    if (!valid) {
      setFileErrorsByEntry(prev => ({ ...prev, [entryKey]: errors }));
      setSelectedFilesByEntry(prev => ({ ...prev, [entryKey]: [] }));
      const ref = inputRefs.current[entryKey]; if (ref) ref.value = "";
      return;
    }
    setFileErrorsByEntry(prev => ({ ...prev, [entryKey]: [] }));
    setSelectedFilesByEntry(prev => ({ ...prev, [entryKey]: files }));
  };

  const removeFile = (entryKey: string, idx: number) =>
    setSelectedFilesByEntry(prev => ({ ...prev, [entryKey]: (prev[entryKey] ?? []).filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    setSubmitError(null);
    for (const entry of fileEntries) {
      const entryKey = String(entry.id);
      const files = selectedFilesByEntry[entryKey] ?? [];
      if (entry.required && files.length === 0) {
        setSubmitError(`Please upload a file for: "${entry.label?.trim() || "File Upload"}"`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const uploadedEntries: { entryId: string; label: string; type: string; fileUrl?: string; fileName?: string; required: boolean }[] = [];
      for (const entry of fileEntries) {
        const entryKey = String(entry.id);
        const files = selectedFilesByEntry[entryKey] ?? [];
        if (files.length === 0) {
          uploadedEntries.push({ entryId: entryKey, label: entry.label?.trim() || "File Upload", type: entry.type, required: entry.required });
          continue;
        }
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadRes = await fetch(`/api/upload`, { method: "POST", body: formData });
          if (!uploadRes.ok) {
            const d = await uploadRes.json().catch(() => ({}));
            throw new Error((d as { error?: string })?.error ?? "File upload failed.");
          }
          const uploadData = await uploadRes.json() as { url?: string; fileUrl?: string };
          uploadedEntries.push({
            entryId: entryKey, label: entry.label?.trim() || "File Upload", type: entry.type,
            fileUrl: uploadData.url ?? uploadData.fileUrl ?? "", fileName: file.name, required: entry.required,
          });
        }
      }
      const res = await fetch(`/api/courses/${courseId}/assignments/${assignment.id}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: uploadedEntries }),
      });
      if (res.ok) { onSubmitted(); }
      else {
        const data = await res.json().catch(() => ({}));
        setSubmitError((data as { error?: string })?.error ?? `Server error: ${res.status}`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-3">
      {fileEntries.map((entry, index) => {
        const entryKey = String(entry.id);
        const types = normalizeFileTypeList(entry.allowedFileTypes);
        const hasRestrictions = types.length > 0;
        const maxFiles = entry.maxFiles ?? 1;
        const entryLabel = hasRestrictions ? `${formatAllowedFileTypes(types)} File Upload` : (entry.label?.trim() || "File Upload");
        const selectedFiles = selectedFilesByEntry[entryKey] ?? [];
        const fileErrors = fileErrorsByEntry[entryKey] ?? [];
        const acceptAttr = hasRestrictions ? types.map(t => `.${t}`).join(",") : undefined;

        return (
          <div key={entryKey} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#fffafa", borderBottom: "1px solid #f3e1e1" }}>
              <p className="text-xs font-black text-gray-900 flex-1">
                {fileEntries.length > 1 ? `${index + 1}. ` : ""}{entryLabel}
              </p>
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase shrink-0"
                style={entry.required ? { background: MAROON, color: "#fff" } : { background: "#e5e7eb", color: "#6b7280" }}>
                {entry.required ? "Required" : "Optional"}
              </span>
              {hasRestrictions && (
                <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase shrink-0"
                  style={{ background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}>
                  {formatAllowedFileTypes(types)}
                </span>
              )}
            </div>
            <div className="p-3 space-y-2">
              <div
                className="relative border-2 border-dashed rounded-lg px-4 py-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors"
                style={{ borderColor: fileErrors.length > 0 ? "#ef4444" : "#d1d5db", background: fileErrors.length > 0 ? "#fef2f2" : "#fafafa" }}
                onClick={() => inputRefs.current[entryKey]?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFilesForEntry(entry, Array.from(e.dataTransfer.files)); }}>
                <input ref={el => { inputRefs.current[entryKey] = el; }} type="file" accept={acceptAttr}
                  multiple={maxFiles > 1} className="sr-only"
                  onChange={e => handleFilesForEntry(entry, Array.from(e.target.files ?? []))} />
                <Upload size={20} style={{ color: fileErrors.length > 0 ? "#ef4444" : MAROON }} />
                <p className="text-xs font-semibold text-gray-700 text-center">
                  Drag a file here, or <span style={{ color: MAROON }}>choose a file to upload</span>
                </p>
                <p className="text-[11px] text-gray-400 text-center">
                  {hasRestrictions ? `Accepted: ${types.map(t => `.${t.toUpperCase()}`).join(", ")}` : "Any file format"}
                  {` · Max ${maxFiles} file${maxFiles !== 1 ? "s" : ""}`}
                </p>
              </div>

              {fileErrors.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}>
                  <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {fileErrors.map((err, i) => <p key={i} className="text-xs text-red-600 font-medium">{err}</p>)}
                  </div>
                </div>
              )}

              {selectedFiles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Selected Files</p>
                  {selectedFiles.map((f, i) => (
                    <div key={`${entryKey}-${f.name}-${i}`}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-gray-200 bg-white">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={12} style={{ color: MAROON, flexShrink: 0 }} />
                        <span className="text-xs text-gray-700 truncate font-medium">{f.name}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); removeFile(entryKey, i); }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {submitError && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}>
          <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 font-medium">{submitError}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={submitting}
          className="h-8 px-4 text-xs font-semibold text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          Cancel
        </button>
        <button type="button" onClick={handleSubmit} disabled={submitting}
          className="h-8 px-5 text-xs font-bold text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity"
          style={{ background: MAROON }}>
          {submitting ? "Submitting..." : "Submit Assignment"}
        </button>
      </div>
    </div>
  );
}

function DetailsSidebar({ assignment }: { assignment: AssignmentWithRole }) {
  const submittingLabel = buildSubmittingLabel(assignment);
  const attemptCount = Array.isArray(assignment.submissions) ? assignment.submissions.length : 0;
  const items: [string, string][] = [
    ["Points", String(assignment.points)],
    ["Submitting", submittingLabel],
    ["Attempts", String(attemptCount)],
  ];
  if (fmtDue(assignment.dueDate)) items.push(["Due", fmtDue(assignment.dueDate)!]);
  if (assignment.availableFrom) items.push(["Available", fmtDate(assignment.availableFrom)]);
  if (assignment.availableUntil) items.push(["Until", fmtDate(assignment.availableUntil)]);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Details</p>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
            <span className="text-xs font-semibold text-gray-800 text-right max-w-[60%] truncate">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CourseAssignmentSubmitterDetailProps {
  assignment: AssignmentWithRole;
  courseId: string;
  currentUserId?: string | null;
  onBack: () => void;
}

export default function CourseAssignmentSubmitterDetail({
  assignment, courseId, currentUserId,
}: CourseAssignmentSubmitterDetailProps) {
  const now = new Date();
  const isNotYetAvailable = !!(assignment.availableFrom && now < new Date(assignment.availableFrom));
  const isClosed = !!(assignment.availableUntil && now > new Date(assignment.availableUntil));
  const sub = assignment.submissions?.[0];
  const isSubmitted = !!sub?.submittedAt;
  const isUnlimitedAttempts = assignment.allowedAttempts == null;
  const attemptCount = Array.isArray(assignment.submissions) ? assignment.submissions.length : 0;
  const attemptsLeft = isUnlimitedAttempts ? Infinity : (assignment.allowedAttempts ?? 1) - attemptCount;
  const canResubmit = !isClosed && !isNotYetAvailable && attemptsLeft > 0;
  const canStart = !isNotYetAvailable && !isClosed && !isSubmitted && assignment.submissionType === "Online";
  const [mode, setMode] = useState<"view" | "submit">("view");
  const handleSubmitted = () => window.location.reload();

  // Only show top bar if there are status-only indicators (not yet open / closed)
  const hasTopBarContent = isNotYetAvailable || isClosed;

  return (
    <div className="flex flex-col bg-white" style={{ fontFamily: FONT }}>

      {/* ── Top bar — only shown for Not Yet Open / Closed states ── */}
      {hasTopBarContent && (
        <div className="flex items-center justify-end px-4 py-2.5 border-b border-gray-200 shrink-0 flex-wrap gap-2 bg-white">
          <div className="flex items-center gap-2">
            {isNotYetAvailable && (
              <span className="h-8 px-3 text-xs font-bold rounded-lg flex items-center"
                style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                Not Yet Open
              </span>
            )}
            {isClosed && (
              <span className="h-8 px-3 text-xs font-bold rounded-lg flex items-center"
                style={{ background: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db" }}>
                Closed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Publisher bar */}
      <PublisherBar
        name={assignment._publisherName} image={assignment._publisherImage}
        role={assignment._publisherRole} publisherId={assignment._publisherId}
        currentUserId={currentUserId}
      />

      {/* Body */}
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-start gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
            <FileText size={16} style={{ color: MAROON }} />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-tight">{assignment.title}</h1>
            {assignment.assignmentGroup && (
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium mt-0.5 inline-block"
                style={{ background: MAROON }}>
                {assignment.assignmentGroup}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 space-y-4">
            {/* Status banner */}
            {isSubmitted && mode === "view" ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d" }}>
                <CheckCircle size={15} className="shrink-0" />
                <span>Submitted {fmtDate(sub!.submittedAt!)}</span>
                {sub!.grade != null && (
                  <span className="ml-auto font-black" style={{ color: MAROON }}>{sub!.grade}/{assignment.points} pts</span>
                )}
              </div>
            ) : isNotYetAvailable ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Opens {fmtDate(assignment.availableFrom)}
              </div>
            ) : isClosed ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#6b7280" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Closed {fmtDate(assignment.availableUntil)}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "#fef2f2", border: `1px solid #f0c0c0`, color: MAROON }}>
                <Circle size={15} className="shrink-0" /> Not yet submitted
              </div>
            )}

            {/* Description */}
            {assignment.description ? (
              <>
                <style>{`
                  .submitter-desc{font-size:13px;color:#374151;line-height:1.7;}
                  .submitter-desc p{margin:0 0 8px;}
                  .submitter-desc strong,.submitter-desc b{font-weight:700;color:#111827;}
                  .submitter-desc ul,.submitter-desc ol{padding-left:20px;margin:0 0 8px;}
                  .submitter-desc li{margin-bottom:4px;}
                  .submitter-desc a{color:#7b1113;text-decoration:underline;}
                  .submitter-desc h1,.submitter-desc h2,.submitter-desc h3{font-weight:700;margin:12px 0 5px;color:#111827;}
                  .submitter-desc h1{font-size:1.35em;}.submitter-desc h2{font-size:1.15em;}.submitter-desc h3{font-size:1.05em;}
                  .submitter-desc blockquote{border-left:3px solid #f0c0c0;padding-left:10px;color:#555;margin:6px 0;}
                  .submitter-desc pre{background:#f4f4f4;padding:8px;border-radius:4px;font-family:monospace;font-size:12px;overflow-x:auto;}
                  .submitter-desc img{max-width:100%;border-radius:5px;}
                  .submitter-desc table{border-collapse:collapse;width:100%;margin:6px 0;}
                  .submitter-desc td,.submitter-desc th{border:1px solid #dee2e6;padding:5px 8px;}
                  .submitter-desc th{background:#f7f9fb;font-weight:600;}
                `}</style>
                <div className="submitter-desc" dangerouslySetInnerHTML={{ __html: assignment.description }} />
              </>
            ) : (
              <p className="text-xs italic text-gray-400">No description provided.</p>
            )}

            {/* Submitted view */}
            {mode === "view" && isSubmitted && (
              <div className="border-t border-gray-100 pt-4">
                <SubmittedView assignment={assignment} onResubmit={() => setMode("submit")} canResubmit={canResubmit} />
              </div>
            )}

            {/* Submit form */}
            {mode === "submit" && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: MAROON }}>
                    <Upload size={13} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Submit Your Work</p>
                </div>
                <SubmitterFileUploadSection
                  assignment={assignment} courseId={courseId}
                  onCancel={() => setMode("view")} onSubmitted={handleSubmitted}
                />
              </div>
            )}

            {/* Start Assignment button — shown in body when not yet submitted and can start */}
            {mode === "view" && canStart && (
              <div className="border-t border-gray-100 pt-4">
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#f0dada" }}>
                  <div className="px-3 py-2" style={{ background: "#fffafa", borderBottom: "1px solid #f0dada" }}>
                    <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Submission Requirements</p>
                  </div>
                  <div className="px-3 py-2.5 space-y-1.5">
                    {getAssignmentFileUploadEntries(assignment).map((entry, index) => {
                      const types = normalizeFileTypeList(entry.allowedFileTypes);
                      const hasRestrictions = types.length > 0;
                      return (
                        <div key={String(entry.id)}
                          className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2.5 py-1.5">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <FileText size={12} className="text-gray-400 shrink-0" />
                            <span className="text-xs font-bold text-gray-800">Submission {index + 1}</span>
                            <span className="text-[11px] text-gray-400">—</span>
                            <span className="text-xs font-semibold"
                              style={hasRestrictions ? { color: MAROON } : { color: "#6b7280" }}>
                              {hasRestrictions ? `${formatAllowedFileTypes(types)} File Upload` : "File Upload"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasRestrictions && (
                              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase"
                                style={{ background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0" }}>
                                {formatAllowedFileTypes(types)}
                              </span>
                            )}
                            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase"
                              style={entry.required ? { background: MAROON, color: "#fff" } : { background: "#e5e7eb", color: "#6b7280" }}>
                              {entry.required ? "Required" : "Optional"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-3 py-2.5 border-t" style={{ borderColor: "#f0dada" }}>
                    <button
                      onClick={() => setMode("submit")}
                      className="w-full h-9 text-xs font-bold text-white rounded-lg hover:opacity-90 transition-opacity"
                      style={{ background: MAROON }}>
                      Start Assignment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-52 shrink-0">
            <DetailsSidebar assignment={assignment} />
          </div>
        </div>
      </div>
    </div>
  );
}