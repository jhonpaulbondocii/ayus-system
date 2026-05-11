"use client";

import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
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

// ── Responsive CSS ─────────────────────────────────────────────────────────────
const RESPONSIVE_CSS = `
  .csp-root { display: flex; height: 100%; overflow: hidden; }
  .csp-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .csp-tabs { border-bottom: 1px solid #e5e7eb; display: flex; padding: 0 20px; flex-shrink: 0; background: #fff; overflow-x: auto; scrollbar-width: none; }
  .csp-tabs::-webkit-scrollbar { display: none; }
  .csp-content { flex: 1; overflow-y: auto; padding: 32px; }
  .csp-inner { max-width: 672px; }
  .csp-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding-top: 20px; border-top: 1px solid #e5e7eb; flex-wrap: wrap; }
  .csp-status-row { display: flex; align-items: center; gap: 12px; margin-top: 8px; flex-wrap: wrap; }

  @media (max-width: 640px) {
    .csp-content { padding: 16px; }
    .csp-tabs { padding: 0 12px; }
    .csp-inner { max-width: 100%; }
    .csp-footer { justify-content: stretch; flex-direction: column; align-items: stretch; gap: 8px; }
    .csp-footer > button { width: 100%; justify-content: center; }
    .csp-footer-msgs { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; width: 100%; }
    .csp-status-row { gap: 8px; }
    .csp-image-btn { width: 100% !important; height: 120px !important; }
    .csp-section-title { font-size: 14px !important; }
  }

  @media (max-width: 400px) {
    .csp-content { padding: 12px; }
  }
`;

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
    <>
      <style>{RESPONSIVE_CSS}</style>
      <div className="csp-root">
        <div className="csp-main">
          {/* ── Tabs ── */}
          <div className="csp-tabs">
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
          <div className="csp-content">
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
              router.refresh();
            }}
          />
        )}
      </div>
    </>
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
    <div className="csp-inner">
      <h2
        className="font-semibold text-gray-800 mb-6 csp-section-title"
        style={{ fontSize: 15 }}
      >
        Course Details
      </h2>

      {/* Status */}
      <div className="mb-5 pb-5 border-b border-gray-200">
        <FieldLabel>Course Status</FieldLabel>
        <div className="csp-status-row">
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
            className="px-3 py-1 text-xs rounded-sm border transition-colors hover:bg-gray-50"
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
          className="csp-image-btn mt-1 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center hover:border-[#7b1113] transition-colors group bg-gray-50"
          style={{ width: 160, height: 96 }}
        >
          {courseImageUrl ? (
            <Image src={courseImageUrl} alt="Course" width={500} height={500} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg
                width="20" height="20" fill="none" stroke="currentColor"
                strokeWidth={1.5} viewBox="0 0 24 24"
                className="text-gray-400 group-hover:text-[#7b1113]"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-[10px] text-gray-400 group-hover:text-[#7b1113]">
                Choose Image
              </span>
            </div>
          )}
        </button>
        {courseImageUrl && (
          <button
            type="button"
            onClick={onChooseImage}
            className="mt-1 text-xs hover:underline block"
            style={{ color: MAROON }}
          >
            Change image
          </button>
        )}
      </div>

      {/* Name */}
      <div className="mb-4">
        <FieldLabel required>Name</FieldLabel>
        <TextInput
          value={details.name}
          onChange={v => update("name", v)}
          placeholder="Course name"
        />
      </div>

      {/* Course Code */}
      <div className="mb-4">
        <FieldLabel>Course Code</FieldLabel>
        <TextInput
          value={details.code}
          onChange={v => update("code", v)}
          placeholder="e.g. CS101"
        />
      </div>

      {/* Footer */}
      <div className="csp-footer">
        <div className="csp-footer-msgs">
          {saveSuccess && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved successfully
            </span>
          )}
          {saveError && (
            <span className="text-xs font-medium" style={{ color: MAROON }}>
              ⚠ {saveError}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="h-9 px-5 text-white text-xs font-semibold rounded-sm transition-opacity disabled:opacity-50 hover:opacity-90 whitespace-nowrap"
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
      className="fixed inset-0 z-9999 bg-black/40 flex items-end sm:items-center justify-center sm:p-6 p-0"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full bg-white shadow-2xl overflow-hidden"
        style={{
          maxWidth: 560,
          borderRadius: "12px 12px 0 0",
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div
          className="h-14 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6"
          style={{ borderRadius: "12px 12px 0 0" }}
        >
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
        <div className="p-4 sm:p-6" style={{ maxHeight: "80vh", overflowY: "auto" }}>
          <div
            className="border-2 border-dashed rounded-md transition-colors"
            style={{
              borderColor: dragOver ? MAROON : "#d1d5db",
              background: dragOver ? "#fdf2f2" : "#f9fafb",
              minHeight: 180,
            }}
            onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 text-center">
              {!previewUrl ? (
                <>
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "#fdf2f2" }}
                  >
                    <svg
                      width="24" height="24" fill="none"
                      stroke={MAROON} strokeWidth={1.8} viewBox="0 0 24 24"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Drag &amp; drop an image here
                  </p>
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
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    width={200}
                    height={200}
                    className="max-h-40 sm:max-h-48 rounded border border-gray-200 object-contain shadow-sm w-full"
                    style={{ objectFit: "contain" }}
                  />
                  <p className="text-xs text-gray-500 font-medium truncate max-w-full px-2">
                    {file?.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                  </p>
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 text-xs rounded-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadAndSave}
              disabled={saving || !file}
              className="h-9 px-5 text-xs font-semibold text-white rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity order-1 sm:order-2"
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