"use client";

// src/components/layout/course/CourseAssignmentSubmitterDetail.tsx

import { useState, useRef } from "react";
import {
  CheckCircle,
  Circle,
  Upload,
  X,
  FileText,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { MAROON, FONT, fmtDue, fmtDate } from "./helpers";
import type { Assignment } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface CourseAssignmentSubmitterDetailProps {
  assignment: AssignmentWithRole;
  courseId: string;
  currentUserId?: string | null;
  onBack: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

const OPT_LABELS: Record<string, string> = {
  online_text_entry: "Text Entry",
  file_upload: "File Upload",
  online_url: "Website URL",
  media_recording: "Media Recording",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeOpt(opt: string): string {
  const o = opt.toLowerCase().replace(/\s+/g, "_");
  if (o.includes("text")) return "online_text_entry";
  if (o.includes("file")) return "file_upload";
  if (o.includes("url") || o.includes("website")) return "online_url";
  if (o.includes("media")) return "media_recording";
  return o;
}

function normalizeFileTypeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const allowed = new Set(ALLOWED_FILE_TYPES.map((t) => t.value));
  return (values as unknown[])
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.replace(/^\./, "").trim().toLowerCase())
    .filter((v) => allowed.has(v));
}

function formatAllowedFileTypes(types: string[]): string {
  return types.map((t) => t.toUpperCase()).join(", ");
}

function validateFileTypes(
  files: File[],
  allowedFileTypes: string[]
): { valid: boolean; errors: string[] } {
  if (!allowedFileTypes || allowedFileTypes.length === 0)
    return { valid: true, errors: [] };
  const errors: string[] = [];
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedFileTypes.map((t) => t.toLowerCase()).includes(ext))
      errors.push(
        `"${file.name}" not allowed. Accepted: ${allowedFileTypes
          .map((t) => t.toUpperCase())
          .join(", ")}.`
      );
  }
  return { valid: errors.length === 0, errors };
}

function getAssignmentFileUploadEntries(
  assignment: AssignmentWithRole
): SubmissionEntryExtended[] {
  const directEntries = (
    (assignment as AssignmentWithSubmissionEntries).submissionEntries ?? []
  )
    .filter((e) => e.type === "File Upload")
    .map((e) => ({
      ...e,
      allowedFileTypes: normalizeFileTypeList(e.allowedFileTypes),
      maxFiles:
        typeof e.maxFiles === "number" && e.maxFiles > 0 ? e.maxFiles : 1,
    }));
  if (directEntries.length > 0) return directEntries;
  return [
    {
      id: 1,
      label: "File Upload",
      required: true,
      type: "File Upload",
      allowedFileTypes: [],
      maxFiles: 1,
    },
  ];
}

function buildSubmittingLabel(assignment: AssignmentWithRole): string {
  const fileEntries = getAssignmentFileUploadEntries(assignment);
  if (assignment.submissionType === "Online" && fileEntries.length > 0) {
    const labels = fileEntries.map((entry) => {
      const types = normalizeFileTypeList(entry.allowedFileTypes);
      return types.length > 0
        ? `File Upload (${formatAllowedFileTypes(types)})`
        : "File Upload";
    });
    return [...new Set(labels)].join(", ");
  }
  const opts = (assignment.onlineEntryOptions ?? []).map(normalizeOpt);
  if (opts.length > 0) return opts.map((o) => OPT_LABELS[o] ?? o).join(", ");
  return assignment.submissionType ?? "File Upload";
}

function parseSubmittedEntries(
  fileUrl: string | null | undefined
): ParsedSubmittedEntry[] | null {
  if (!fileUrl) return null;
  try {
    const parsed = JSON.parse(fileUrl) as {
      version?: number;
      entries?: ParsedSubmittedEntry[];
    };
    if (parsed.version === 2 && Array.isArray(parsed.entries))
      return parsed.entries;
  } catch {
    /* legacy single file */
  }
  return null;
}

function resolveFileUrl(url: string): string {
  return url.startsWith("/") || url.startsWith("http")
    ? url
    : `/uploads/submissions/${url}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PublisherBar({
  name,
  image,
  role,
  publisherId,
  currentUserId,
}: {
  name?: string | null;
  image?: string | null;
  role?: string | null;
  publisherId?: string | null;
  currentUserId?: string | null;
}) {
  if (!name) return null;
  if (publisherId && currentUserId && publisherId === currentUserId)
    return null;
  return (
    <div
      className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-gray-100 shrink-0"
      style={{ background: "#fafafa" }}
    >
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 border border-gray-200 bg-gray-100 flex items-center justify-center">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] font-bold text-gray-500">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-gray-600 min-w-0 flex-wrap">
        <span className="font-semibold text-gray-800 truncate">{name}</span>
        {role && (
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0"
            style={{
              background: "#fef2f2",
              color: MAROON,
              border: "1px solid #f0c0c0",
            }}
          >
            {role}
          </span>
        )}
        <span className="text-gray-400 shrink-0">· Published this</span>
      </div>
    </div>
  );
}

// Collapsible Details sidebar — renders as accordion on mobile, sidebar on lg+
function DetailsSidebar({
  assignment,
  mobileCollapsible = false,
}: {
  assignment: AssignmentWithRole;
  mobileCollapsible?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const submittingLabel = buildSubmittingLabel(assignment);
  const attemptCount = Array.isArray(assignment.submissions)
    ? assignment.submissions.length
    : 0;

  const items: [string, string][] = [
    ["Points", String(assignment.points)],
    ["Submitting", submittingLabel],
    ["Attempts", String(attemptCount)],
  ];
  if (fmtDue(assignment.dueDate)) items.push(["Due", fmtDue(assignment.dueDate)!]);
  if (assignment.availableFrom)
    items.push(["Available", fmtDate(assignment.availableFrom)]);
  if (assignment.availableUntil)
    items.push(["Until", fmtDate(assignment.availableUntil)]);

  const content = (
    <div className="divide-y divide-gray-100">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between px-3 py-2.5 gap-2"
        >
          <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400 shrink-0">
            {label}
          </span>
          <span className="text-xs font-semibold text-gray-800 text-right truncate max-w-[55%]">
            {value}
          </span>
        </div>
      ))}
    </div>
  );

  if (mobileCollapsible) {
    return (
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setOpen((p) => !p)}
          className="w-full flex items-center justify-between px-3 py-2.5 border-b border-gray-100"
          style={{ background: "#fdf2f2" }}
          aria-expanded={open}
        >
          <p
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: MAROON }}
          >
            Assignment Details
          </p>
          {open ? (
            <ChevronUp size={14} style={{ color: MAROON }} />
          ) : (
            <ChevronDown size={14} style={{ color: MAROON }} />
          )}
        </button>
        {open && content}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div
        className="px-3 py-2.5 border-b border-gray-100"
        style={{ background: "#fdf2f2" }}
      >
        <p
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: MAROON }}
        >
          Details
        </p>
      </div>
      {content}
    </div>
  );
}

function SubmittedView({
  assignment,
  onResubmit,
  canResubmit,
}: {
  assignment: AssignmentWithRole;
  onResubmit: () => void;
  canResubmit: boolean;
}) {
  const sub = assignment.submissions?.[0];
  if (!sub?.submittedAt) return null;

  const submittedEntries = parseSubmittedEntries(sub.fileUrl);
  const isUnlimited = assignment.allowedAttempts == null;
  const attemptCount = Array.isArray(assignment.submissions)
    ? assignment.submissions.length
    : 1;
  const attemptsLeft = isUnlimited
    ? null
    : (assignment.allowedAttempts ?? 1) - attemptCount;
  const hasAttemptsLeft =
    isUnlimited || (attemptsLeft != null && attemptsLeft > 0);

  return (
    <div className="space-y-3">
      {submittedEntries ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div
            className="px-3 py-2 border-b border-gray-100"
            style={{ background: "#f9fafb" }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Your Submitted Files
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {submittedEntries.map((entry, i) => (
              <div
                key={entry.entryId}
                className="flex items-center gap-2.5 px-3 py-3"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "#fef2f2" }}
                >
                  <FileText size={14} style={{ color: MAROON }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                    {entry.label || `Submission ${i + 1}`}
                  </p>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {entry.fileName ||
                      entry.fileUrl?.split("/").pop() ||
                      "File"}
                  </p>
                </div>
                {entry.fileUrl && (
                  <a
                    href={resolveFileUrl(entry.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 h-8 px-3 text-[11px] font-bold border rounded-lg hover:bg-gray-50 shrink-0 touch-manipulation"
                    style={{ color: MAROON, borderColor: "#f0c0c0" }}
                  >
                    <ExternalLink size={11} />
                    <span>View</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        sub.fileUrl && (
          <div className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-gray-200 bg-white">
            <FileText size={13} style={{ color: MAROON }} />
            <span className="text-xs font-semibold text-gray-700 flex-1 truncate">
              {sub.fileUrl.split("/").pop()}
            </span>
            <a
              href={resolveFileUrl(sub.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 h-8 px-3 text-[11px] font-bold border rounded-lg hover:bg-gray-50 shrink-0 touch-manipulation"
              style={{ color: MAROON, borderColor: "#f0c0c0" }}
            >
              <ExternalLink size={11} />
              <span>View</span>
            </a>
          </div>
        )
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-400">
          {isUnlimited
            ? `Attempt ${attemptCount} · Unlimited attempts`
            : `Attempt ${attemptCount} of ${assignment.allowedAttempts} · ${attemptsLeft} remaining`}
        </p>
        {canResubmit && hasAttemptsLeft ? (
          <button
            onClick={onResubmit}
            className="flex items-center gap-1.5 h-10 px-4 text-xs font-bold text-white rounded-xl hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation"
            style={{ background: MAROON }}
          >
            <RefreshCw size={13} />
            {isUnlimited ? "Submit Again" : "Resubmit"}
          </button>
        ) : (
          !hasAttemptsLeft && (
            <span className="text-xs font-semibold text-gray-400 px-3 py-1.5 rounded-xl border border-gray-200">
              No attempts remaining
            </span>
          )
        )}
      </div>
    </div>
  );
}

function FileEntryUpload({
  entry,
  index,
  totalEntries,
  selectedFiles,
  fileErrors,
  onFiles,
  onRemove,
  inputRef,
}: {
  entry: SubmissionEntryExtended;
  index: number;
  totalEntries: number;
  selectedFiles: File[];
  fileErrors: string[];
  onFiles: (files: File[]) => void;
  onRemove: (idx: number) => void;
  inputRef: (el: HTMLInputElement | null) => void;
}) {
  const entryKey = String(entry.id);
  const types = normalizeFileTypeList(entry.allowedFileTypes);
  const hasRestrictions = types.length > 0;
  const maxFiles = entry.maxFiles ?? 1;
  const entryLabel = hasRestrictions
    ? `${formatAllowedFileTypes(types)} File Upload`
    : entry.label?.trim() || "File Upload";
  const acceptAttr = hasRestrictions
    ? types.map((t) => `.${t}`).join(",")
    : undefined;
  const hasError = fileErrors.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Entry header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 flex-wrap gap-y-1"
        style={{ background: "#fffafa", borderBottom: "1px solid #f3e1e1" }}
      >
        <p className="text-xs font-black text-gray-900 flex-1 min-w-0 truncate">
          {totalEntries > 1 ? `${index + 1}. ` : ""}
          {entryLabel}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasRestrictions && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
              style={{
                background: "#fef2f2",
                color: MAROON,
                border: "1px solid #f0c0c0",
              }}
            >
              {formatAllowedFileTypes(types)}
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
            style={
              entry.required
                ? { background: MAROON, color: "#fff" }
                : { background: "#e5e7eb", color: "#6b7280" }
            }
          >
            {entry.required ? "Required" : "Optional"}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div className="p-3 space-y-2">
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload file"
          className="relative border-2 border-dashed rounded-xl px-4 py-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors select-none"
          style={{
            borderColor: hasError ? "#ef4444" : "#d1d5db",
            background: hasError ? "#fef2f2" : "#fafafa",
            minHeight: 90,
          }}
          onClick={() => {
            const input = document.getElementById(
              `file-input-${entryKey}`
            ) as HTMLInputElement | null;
            input?.click();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const input = document.getElementById(
                `file-input-${entryKey}`
              ) as HTMLInputElement | null;
              input?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(Array.from(e.dataTransfer.files));
          }}
        >
          <input
            id={`file-input-${entryKey}`}
            ref={inputRef}
            type="file"
            accept={acceptAttr}
            multiple={maxFiles > 1}
            className="sr-only"
            onChange={(e) => onFiles(Array.from(e.target.files ?? []))}
          />
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: hasError ? "#fee2e2" : "#fef2f2" }}
          >
            <Upload
              size={16}
              style={{ color: hasError ? "#ef4444" : MAROON }}
            />
          </div>
          <div className="text-center space-y-0.5">
            <p className="text-xs font-semibold text-gray-700">
              Tap to choose a file
            </p>
            <p className="text-[11px] text-gray-400">
              {hasRestrictions
                ? `Accepted: ${types.map((t) => `.${t.toUpperCase()}`).join(", ")}`
                : "Any file format"}
              {` · Max ${maxFiles} file${maxFiles !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Errors */}
        {hasError && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}
          >
            <AlertCircle
              size={13}
              className="text-red-500 shrink-0 mt-0.5"
            />
            <div className="space-y-0.5">
              {fileErrors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 font-medium">
                  {err}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Selected files — scrollable list capped at ~3 items */}
        {selectedFiles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Selected Files ({selectedFiles.length})
            </p>
            {/* FIX: max-h + overflow-y-auto so list scrolls instead of pushing buttons off screen */}
            <div className="space-y-1.5 max-h-40 overflow-y-auto overscroll-contain pr-0.5">
              {selectedFiles.map((f, i) => (
                <div
                  key={`${entryKey}-${f.name}-${i}`}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText
                      size={12}
                      style={{ color: MAROON, flexShrink: 0 }}
                    />
                    <span className="text-xs text-gray-700 truncate font-medium">
                      {f.name}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {(f.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(i);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 touch-manipulation shrink-0"
                    aria-label="Remove file"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitterFileUploadSection({
  assignment,
  courseId,
  onCancel,
  onSubmitted,
}: {
  assignment: AssignmentWithRole;
  courseId: string;
  onCancel: () => void;
  onSubmitted: () => void;
}) {
  const fileEntries = getAssignmentFileUploadEntries(assignment);
  const [selectedFilesByEntry, setSelectedFilesByEntry] = useState<
    Record<string, File[]>
  >({});
  const [fileErrorsByEntry, setFileErrorsByEntry] = useState<
    Record<string, string[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFilesForEntry = (
    entry: SubmissionEntryExtended,
    files: File[]
  ) => {
    const entryKey = String(entry.id);
    const allowedTypes = normalizeFileTypeList(entry.allowedFileTypes);
    const maxFiles = entry.maxFiles ?? 1;
    if (files.length === 0) return;
    if (files.length > maxFiles) {
      setFileErrorsByEntry((prev) => ({
        ...prev,
        [entryKey]: [
          `Max ${maxFiles} file${maxFiles !== 1 ? "s" : ""} allowed.`,
        ],
      }));
      setSelectedFilesByEntry((prev) => ({ ...prev, [entryKey]: [] }));
      const ref = inputRefs.current[entryKey];
      if (ref) ref.value = "";
      return;
    }
    const { valid, errors } = validateFileTypes(files, allowedTypes);
    if (!valid) {
      setFileErrorsByEntry((prev) => ({ ...prev, [entryKey]: errors }));
      setSelectedFilesByEntry((prev) => ({ ...prev, [entryKey]: [] }));
      const ref = inputRefs.current[entryKey];
      if (ref) ref.value = "";
      return;
    }
    setFileErrorsByEntry((prev) => ({ ...prev, [entryKey]: [] }));
    setSelectedFilesByEntry((prev) => ({ ...prev, [entryKey]: files }));
  };

  const removeFile = (entryKey: string, idx: number) =>
    setSelectedFilesByEntry((prev) => ({
      ...prev,
      [entryKey]: (prev[entryKey] ?? []).filter((_, i) => i !== idx),
    }));

  const handleSubmit = async () => {
    setSubmitError(null);
    for (const entry of fileEntries) {
      const entryKey = String(entry.id);
      const files = selectedFilesByEntry[entryKey] ?? [];
      if (entry.required && files.length === 0) {
        setSubmitError(
          `Please upload a file for: "${entry.label?.trim() || "File Upload"}"`
        );
        return;
      }
    }
    setSubmitting(true);
    try {
      const uploadedEntries: {
        entryId: string;
        label: string;
        type: string;
        fileUrl?: string;
        fileName?: string;
        required: boolean;
      }[] = [];

      for (const entry of fileEntries) {
        const entryKey = String(entry.id);
        const files = selectedFilesByEntry[entryKey] ?? [];
        if (files.length === 0) {
          uploadedEntries.push({
            entryId: entryKey,
            label: entry.label?.trim() || "File Upload",
            type: entry.type,
            required: entry.required,
          });
          continue;
        }
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          const uploadRes = await fetch(`/api/upload`, {
            method: "POST",
            body: formData,
          });
          if (!uploadRes.ok) {
            const d = await uploadRes.json().catch(() => ({}));
            throw new Error(
              (d as { error?: string })?.error ?? "File upload failed."
            );
          }
          const uploadData = (await uploadRes.json()) as {
            url?: string;
            fileUrl?: string;
          };
          uploadedEntries.push({
            entryId: entryKey,
            label: entry.label?.trim() || "File Upload",
            type: entry.type,
            fileUrl: uploadData.url ?? uploadData.fileUrl ?? "",
            fileName: file.name,
            required: entry.required,
          });
        }
      }

      const res = await fetch(
        `/api/courses/${courseId}/assignments/${assignment.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: uploadedEntries }),
        }
      );
      if (res.ok) {
        onSubmitted();
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitError(
          (data as { error?: string })?.error ?? `Server error: ${res.status}`
        );
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // FIX: flex column layout so action buttons are always visible at the bottom
    <div className="flex flex-col gap-3">
      {/* Scrollable file entries area */}
      <div className="space-y-3">
        {fileEntries.map((entry, index) => {
          const entryKey = String(entry.id);
          return (
            <FileEntryUpload
              key={entryKey}
              entry={entry}
              index={index}
              totalEntries={fileEntries.length}
              selectedFiles={selectedFilesByEntry[entryKey] ?? []}
              fileErrors={fileErrorsByEntry[entryKey] ?? []}
              onFiles={(files) => handleFilesForEntry(entry, files)}
              onRemove={(idx) => removeFile(entryKey, idx)}
              inputRef={(el) => {
                inputRefs.current[entryKey] = el;
              }}
            />
          );
        })}
      </div>

      {submitError && (
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: "#fef2f2", border: "1px solid #fca5a5" }}
        >
          <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 font-medium">{submitError}</p>
        </div>
      )}

      {/*
        FIX: Action buttons — sticky on mobile so they're always visible above
        the bottom nav bar. Uses safe-area-inset for notch/home indicator support.
        On sm+ screens: normal inline row layout.
      */}
      <div
        className="
          sticky bottom-0 left-0 right-0
          bg-white border-t border-gray-100
          px-3 py-3
          flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2
          sm:static sm:border-none sm:bg-transparent sm:px-0 sm:py-0 sm:pt-1
          z-10
        "
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="w-full sm:w-auto h-11 sm:h-9 px-4 text-sm sm:text-xs font-semibold text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 touch-manipulation"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full sm:w-auto h-11 sm:h-9 px-5 text-sm sm:text-xs font-bold text-white rounded-xl hover:opacity-90 active:opacity-80 disabled:opacity-60 transition-opacity touch-manipulation"
          style={{ background: MAROON }}
        >
          {submitting ? "Submitting…" : "Submit Assignment"}
        </button>
      </div>
    </div>
  );
}

function SubmissionRequirementsBox({
  assignment,
  onStart,
}: {
  assignment: AssignmentWithRole;
  onStart: () => void;
}) {
  const entries = getAssignmentFileUploadEntries(assignment);
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "#f0dada" }}
    >
      <div
        className="px-3 py-2.5"
        style={{ background: "#fffafa", borderBottom: "1px solid #f0dada" }}
      >
        <p
          className="text-[11px] font-black uppercase tracking-widest"
          style={{ color: MAROON }}
        >
          Submission Requirements
        </p>
      </div>
      <div className="px-3 py-2.5 space-y-2">
        {entries.map((entry, index) => {
          const types = normalizeFileTypeList(entry.allowedFileTypes);
          const hasRestrictions = types.length > 0;
          return (
            <div
              key={String(entry.id)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 flex-wrap gap-y-1"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText size={12} className="text-gray-400 shrink-0" />
                <span className="text-xs font-bold text-gray-800">
                  {entries.length > 1 ? `Submission ${index + 1}` : "Submission"}
                </span>
                <span className="text-[11px] text-gray-400">—</span>
                <span
                  className="text-xs font-semibold truncate"
                  style={
                    hasRestrictions ? { color: MAROON } : { color: "#6b7280" }
                  }
                >
                  {hasRestrictions
                    ? `${formatAllowedFileTypes(types)} File Upload`
                    : "File Upload"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {hasRestrictions && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
                    style={{
                      background: "#fef2f2",
                      color: MAROON,
                      border: "1px solid #f0c0c0",
                    }}
                  >
                    {formatAllowedFileTypes(types)}
                  </span>
                )}
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase"
                  style={
                    entry.required
                      ? { background: MAROON, color: "#fff" }
                      : { background: "#e5e7eb", color: "#6b7280" }
                  }
                >
                  {entry.required ? "Required" : "Optional"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="px-3 py-3 border-t"
        style={{ borderColor: "#f0dada" }}
      >
        <button
          onClick={onStart}
          className="w-full h-12 sm:h-10 text-sm sm:text-xs font-bold text-white rounded-xl hover:opacity-90 active:opacity-80 transition-opacity touch-manipulation"
          style={{ background: MAROON }}
        >
          Start Assignment
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseAssignmentSubmitterDetail({
  assignment,
  courseId,
  currentUserId,
  onBack,
}: CourseAssignmentSubmitterDetailProps) {
  const now = new Date();
  const isNotYetAvailable = !!(
    assignment.availableFrom && now < new Date(assignment.availableFrom)
  );
  const isClosed = !!(
    assignment.availableUntil && now > new Date(assignment.availableUntil)
  );
  const sub = assignment.submissions?.[0];
  const isSubmitted = !!sub?.submittedAt;
  const isUnlimitedAttempts = assignment.allowedAttempts == null;
  const attemptCount = Array.isArray(assignment.submissions)
    ? assignment.submissions.length
    : 0;
  const attemptsLeft = isUnlimitedAttempts
    ? Infinity
    : (assignment.allowedAttempts ?? 1) - attemptCount;
  const canResubmit = !isClosed && !isNotYetAvailable && attemptsLeft > 0;
  const canStart =
    !isNotYetAvailable &&
    !isClosed &&
    !isSubmitted &&
    assignment.submissionType === "Online";

  const [mode, setMode] = useState<"view" | "submit">("view");
  const handleSubmitted = () => {
    setMode("view");
    onBack();
  };

  return (
    /*
      FIX: The root container uses `min-h-0` and `overflow-y-auto` so the entire
      page is scrollable. On mobile, `pb-safe` (via inline style) adds space at
      the bottom for the device's home indicator / navigation bar.
      The sticky action bar inside SubmitterFileUploadSection handles the rest.
    */
    <div
      className="flex flex-col bg-white overflow-y-auto"
      style={{
        fontFamily: FONT,
        // Extra bottom padding so content isn't hidden behind native nav bar
        paddingBottom: mode === "submit"
          ? "0px" // sticky bar inside handles its own safe area
          : "env(safe-area-inset-bottom, 16px)",
      }}
    >
      {/* ── Top availability banner ── */}
      {(isNotYetAvailable || isClosed) && (
        <div className="flex items-center justify-center sm:justify-end px-3 sm:px-4 py-2.5 border-b border-gray-200 shrink-0 gap-2 bg-white">
          {isNotYetAvailable && (
            <span
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg"
              style={{
                background: "#fffbeb",
                color: "#92400e",
                border: "1px solid #fde68a",
              }}
            >
              <Clock size={12} />
              Not Yet Open
            </span>
          )}
          {isClosed && (
            <span
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-bold rounded-lg"
              style={{
                background: "#f3f4f6",
                color: "#6b7280",
                border: "1px solid #d1d5db",
              }}
            >
              <Lock size={12} />
              Closed
            </span>
          )}
        </div>
      )}

      {/* ── Publisher bar ── */}
      <PublisherBar
        name={assignment._publisherName}
        image={assignment._publisherImage}
        role={assignment._publisherRole}
        publisherId={assignment._publisherId}
        currentUserId={currentUserId}
      />

      {/* ── Body ── */}
      <div className="px-3 sm:px-4 lg:px-6 py-4 space-y-4">

        {/* Title row */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: "#fef2f2" }}
          >
            <FileText size={17} style={{ color: MAROON }} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-black text-gray-900 leading-tight break-words">
              {assignment.title}
            </h1>
            {assignment.assignmentGroup && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium mt-1 inline-block"
                style={{ background: MAROON }}
              >
                {assignment.assignmentGroup}
              </span>
            )}
          </div>
        </div>

        {/* Mobile-only details accordion */}
        <div className="lg:hidden">
          <DetailsSidebar assignment={assignment} mobileCollapsible />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* ── Main content column ── */}
          <div className="flex-1 min-w-0 w-full space-y-4">

            {/* Status banner */}
            {isSubmitted && mode === "view" ? (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold flex-wrap"
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  color: "#15803d",
                }}
              >
                <CheckCircle size={15} className="shrink-0" />
                <span>Submitted {fmtDate(sub!.submittedAt!)}</span>
                {sub!.grade != null && (
                  <span
                    className="ml-auto font-black"
                    style={{ color: MAROON }}
                  >
                    {sub!.grade}/{assignment.points} pts
                  </span>
                )}
              </div>
            ) : isNotYetAvailable ? (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  color: "#92400e",
                }}
              >
                <Clock size={15} className="shrink-0" />
                Opens {fmtDate(assignment.availableFrom)}
              </div>
            ) : isClosed ? (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  color: "#6b7280",
                }}
              >
                <Lock size={15} className="shrink-0" />
                Closed {fmtDate(assignment.availableUntil)}
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  background: "#fef2f2",
                  border: `1px solid #f0c0c0`,
                  color: MAROON,
                }}
              >
                <Circle size={15} className="shrink-0" />
                Not yet submitted
              </div>
            )}

            {/* Description */}
            {assignment.description ? (
              <>
                <style>{`
                  .submitter-desc{font-size:13px;color:#374151;line-height:1.75;word-break:break-word;}
                  .submitter-desc p{margin:0 0 8px;}
                  .submitter-desc strong,.submitter-desc b{font-weight:700;color:#111827;}
                  .submitter-desc ul,.submitter-desc ol{padding-left:20px;margin:0 0 8px;}
                  .submitter-desc li{margin-bottom:4px;}
                  .submitter-desc a{color:#7b1113;text-decoration:underline;word-break:break-all;}
                  .submitter-desc h1,.submitter-desc h2,.submitter-desc h3{font-weight:700;margin:12px 0 5px;color:#111827;}
                  .submitter-desc h1{font-size:1.25em;}
                  .submitter-desc h2{font-size:1.1em;}
                  .submitter-desc h3{font-size:1.0em;}
                  .submitter-desc blockquote{border-left:3px solid #f0c0c0;padding-left:10px;color:#555;margin:6px 0;}
                  .submitter-desc pre{background:#f4f4f4;padding:8px;border-radius:8px;font-family:monospace;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-word;}
                  .submitter-desc img{max-width:100%;border-radius:8px;height:auto;}
                  .submitter-desc table{border-collapse:collapse;width:100%;margin:6px 0;display:block;overflow-x:auto;}
                  .submitter-desc td,.submitter-desc th{border:1px solid #dee2e6;padding:6px 10px;white-space:nowrap;}
                  .submitter-desc th{background:#f7f9fb;font-weight:600;}
                `}</style>
                <div
                  className="submitter-desc"
                  dangerouslySetInnerHTML={{ __html: assignment.description }}
                />
              </>
            ) : (
              <p className="text-xs italic text-gray-400">
                No description provided.
              </p>
            )}

            {/* Submitted view */}
            {mode === "view" && isSubmitted && (
              <div className="border-t border-gray-100 pt-4">
                <SubmittedView
                  assignment={assignment}
                  onResubmit={() => setMode("submit")}
                  canResubmit={canResubmit}
                />
              </div>
            )}

            {/* Submit form */}
            {mode === "submit" && (
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: MAROON }}
                  >
                    <Upload size={14} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    Submit Your Work
                  </p>
                </div>
                <SubmitterFileUploadSection
                  assignment={assignment}
                  courseId={courseId}
                  onCancel={() => setMode("view")}
                  onSubmitted={handleSubmitted}
                />
              </div>
            )}

            {/* Start Assignment CTA */}
            {mode === "view" && canStart && (
              <div className="border-t border-gray-100 pt-4">
                <SubmissionRequirementsBox
                  assignment={assignment}
                  onStart={() => setMode("submit")}
                />
              </div>
            )}
          </div>

          {/* ── Desktop sidebar ── */}
          <div className="hidden lg:block w-52 shrink-0">
            <DetailsSidebar assignment={assignment} />
          </div>
        </div>
      </div>
    </div>
  );
}