"use client";

import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import { useRouter } from "next/navigation";

const MAROON = "#7b1113";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CourseDetails {
  name: string;
  code: string;
}

const TABS = ["Course Details"] as const;
type Tab = (typeof TABS)[number];

interface PageProps {
  courseId: string;
  initialName: string;
  initialCode: string;
  initialStatus: string;
  initialImage: string;
}

// ── useObjectUrl ───────────────────────────────────────────────────────────────
function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => {
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [url]);
  return url;
}

// ── Small shared UI ────────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {children}
      {required && <span className="ml-0.5" style={{ color: MAROON }}>*</span>}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, className,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-9 border border-gray-300 rounded-sm px-3 text-sm outline-none transition-colors focus:border-[#7b1113] focus:ring-1 focus:ring-[#7b1113]/20 ${className ?? ""}`}
    />
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function CourseSettingsPage({
  courseId,
  initialName,
  initialCode,
  initialStatus,
  initialImage,
}: PageProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Course Details");
  const [published, setPublished] = useState(initialStatus === "PUBLISHED");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [courseImageUrl, setCourseImageUrl] = useState(initialImage);
  const [showImageModal, setShowImageModal] = useState(false);

  const [details, setDetails] = useState<CourseDetails>({
    name: initialName,
    code: initialCode,
  });

  const update = useCallback((k: keyof CourseDetails, v: string) =>
    setDetails(d => ({ ...d, [k]: v })), []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: details.name,
          code: details.code,
          status: published ? "PUBLISHED" : "UNPUBLISHED",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data?.error ?? `Error ${res.status}`);
        return;
      }
      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    const newStatus = !published;
    setPublished(newStatus);
    try {
      await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus ? "PUBLISHED" : "UNPUBLISHED" }),
      });
      router.refresh();
    } catch {
      setPublished(!newStatus);
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Tabs ── */}
        <div className="border-b border-gray-200 flex px-5 shrink-0 bg-white">
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="text-xs py-3 px-4 border-b-2 transition-colors font-medium whitespace-nowrap"
              style={{
                borderBottomColor: activeTab === tab ? MAROON : "transparent",
                color: activeTab === tab ? MAROON : "#6b7280",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === "Course Details" && (
            <CourseDetailsTab
              details={details}
              update={update}
              onSave={handleSave}
              saving={saving}
              saveSuccess={saveSuccess}
              saveError={saveError}
              courseImageUrl={courseImageUrl}
              onChooseImage={() => setShowImageModal(true)}
              published={published}
              onPublishToggle={handlePublishToggle}
            />
          )}
        </div>
      </div>

      {showImageModal && (
        <ChooseImageModal
          open={showImageModal}
          courseId={courseId}
          onClose={() => setShowImageModal(false)}
          onUploaded={url => {
            setCourseImageUrl(url);
            setShowImageModal(false);
            router.refresh(); // ← triggers dashboard re-fetch so image shows up
          }}
        />
      )}
    </div>
  );
}

// ── Course Details Tab ─────────────────────────────────────────────────────────
function CourseDetailsTab({
  details, update, onSave, saving, saveSuccess, saveError,
  courseImageUrl, onChooseImage, published, onPublishToggle,
}: {
  details: CourseDetails;
  update: (k: keyof CourseDetails, v: string) => void;
  onSave: () => void;
  saving: boolean;
  saveSuccess: boolean;
  saveError: string | null;
  courseImageUrl: string;
  onChooseImage: () => void;
  published: boolean;
  onPublishToggle: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-base font-semibold text-gray-800 mb-6">Course Details</h2>

      {/* Status */}
      <div className="mb-5 pb-5 border-b border-gray-200">
        <FieldLabel>Course Status</FieldLabel>
        <div className="flex items-center gap-3 mt-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: published ? "#16a34a" : "#9ca3af" }}
          />
          <span className="text-sm text-gray-700 font-medium">
            {published ? "Published" : "Unpublished"}
          </span>
          <button
            type="button"
            onClick={onPublishToggle}
            className="ml-1 px-3 py-1 text-xs rounded-sm border transition-colors hover:bg-gray-50"
            style={{ borderColor: MAROON, color: MAROON }}
          >
            {published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="mb-5">
        <FieldLabel>Course Image</FieldLabel>
        <button
          type="button"
          onClick={onChooseImage}
          className="mt-1 w-40 h-24 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center hover:border-[#7b1113] transition-colors group bg-gray-50"
        >
          {courseImageUrl ? (
            <img src={courseImageUrl} alt="Course" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" className="text-gray-400 group-hover:text-[#7b1113]">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-[10px] text-gray-400 group-hover:text-[#7b1113]">Choose Image</span>
            </div>
          )}
        </button>
        {courseImageUrl && (
          <button
            type="button"
            onClick={onChooseImage}
            className="mt-1 text-xs hover:underline"
            style={{ color: MAROON }}
          >
            Change image
          </button>
        )}
      </div>

      {/* Name */}
      <div className="mb-4">
        <FieldLabel required>Name</FieldLabel>
        <TextInput value={details.name} onChange={v => update("name", v)} placeholder="Course name" />
      </div>

      {/* Course Code */}
      <div className="mb-4">
        <FieldLabel>Course Code</FieldLabel>
        <TextInput value={details.code} onChange={v => update("code", v)} placeholder="e.g. CS101" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-200">
        {saveSuccess && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved successfully
          </span>
        )}
        {saveError && <span className="text-xs font-medium" style={{ color: MAROON }}>⚠ {saveError}</span>}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-8 px-5 text-white text-xs font-semibold rounded-sm transition-opacity disabled:opacity-50 hover:opacity-90"
          style={{ background: MAROON }}
        >
          {saving ? "Saving..." : "Update Course Details"}
        </button>
      </div>
    </div>
  );
}

// ── Choose Image Modal ─────────────────────────────────────────────────────────
function ChooseImageModal({
  open, onClose, onUploaded, courseId,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (url: string) => void;
  courseId: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const previewUrl = useObjectUrl(file);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open || typeof window === "undefined") return null;

  const acceptFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, GIF, WebP).");
      return;
    }
    setError(null);
    setFile(f);
  };

  const uploadAndSave = async () => {
    if (!file) { setError("Please choose an image first."); return; }
    setSaving(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/courses/${courseId}/image`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onUploaded(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-6"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
          <p className="text-sm font-semibold text-gray-800">Choose Course Image</p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-lg transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div
            className="border-2 border-dashed rounded-md transition-colors"
            style={{
              borderColor: dragOver ? MAROON : "#d1d5db",
              background: dragOver ? "#fdf2f2" : "#f9fafb",
              minHeight: 220,
            }}
            onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center p-8 text-center">
              {!previewUrl ? (
                <>
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "#fdf2f2" }}
                  >
                    <svg width="24" height="24" fill="none" stroke={MAROON} strokeWidth={1.8} viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Drag & drop an image here</p>
                  <p className="text-xs text-gray-400 mb-4">Supports PNG, JPG, GIF, WebP</p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="h-8 px-4 text-xs font-medium text-white rounded-sm hover:opacity-90 transition-opacity"
                    style={{ background: MAROON }}
                  >
                    Browse files
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 rounded border border-gray-200 object-contain shadow-sm"
                  />
                  <p className="text-xs text-gray-500 font-medium">{file?.name}</p>
                  <p className="text-xs text-gray-400">{file ? `${(file.size / 1024).toFixed(1)} KB` : ""}</p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="text-xs hover:underline font-medium"
                    style={{ color: MAROON }}
                  >
                    Choose a different image
                  </button>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => acceptFile(e.target.files?.[0])}
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-xs font-medium flex items-center gap-1" style={{ color: MAROON }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-8 px-4 text-xs rounded-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadAndSave}
              disabled={saving || !file}
              className="h-8 px-5 text-xs font-semibold text-white rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
              style={{ background: MAROON }}
            >
              {saving ? "Uploading..." : "Save Image"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}