// src/components/layout/course/CourseSettingsTab.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MAROON, FONT } from "./helpers";
import type { Course } from "./types";

// ── Head Image Modal ───────────────────────────────────────────────────────────
function HeadImageModal({
  courseId,
  onClose,
  onUploaded,
}: {
  courseId: string;
  onClose: () => void;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const acceptFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please select an image file."); return; }
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
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/40 flex items-center justify-center p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6">
          <p className="text-sm font-semibold text-gray-800">Choose Course Image</p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          <div
            className="border-2 border-dashed rounded-md transition-colors"
            style={{
              borderColor: dragOver ? MAROON : "#d1d5db",
              background: dragOver ? "#fdf2f2" : "#f9fafb",
              minHeight: 220,
            }}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); acceptFile(e.dataTransfer.files?.[0]); }}
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
                    className="h-8 px-4 text-xs font-medium text-white rounded-sm hover:opacity-90"
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
                    className="max-h-48 rounded border border-gray-200 object-contain shadow-sm"
                  />
                  <p className="text-xs text-gray-500 font-medium">{file?.name}</p>
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
                onChange={(e) => acceptFile(e.target.files?.[0])}
              />
            </div>
          </div>
          {error && (
            <p className="mt-3 text-xs font-medium" style={{ color: MAROON }}>
              ⚠ {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-8 px-4 text-xs rounded-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={uploadAndSave}
              disabled={saving || !file}
              className="h-8 px-5 text-xs font-semibold text-white rounded-sm hover:opacity-90 disabled:opacity-40"
              style={{ background: MAROON }}
            >
              {saving ? "Uploading..." : "Save Image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
interface Props {
  courseId: string;
  course: Course;
  onCourseUpdate: (updated: Partial<Course>) => void;
}

export default function CourseSettingsTab({ courseId, course, onCourseUpdate }: Props) {
  const router = useRouter();
  const [name, setName] = useState(course.name);
  const [code, setCode] = useState(course.code);
  const [published, setPublished] = useState(course.status?.toUpperCase() === "PUBLISHED");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [courseImageUrl, setCourseImageUrl] = useState(course.image ?? "");
  const [showImageModal, setShowImageModal] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, status: published ? "PUBLISHED" : "UNPUBLISHED" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d?.error ?? `Error ${res.status}`);
        return;
      }
      setSaveSuccess(true);
      onCourseUpdate({ name, code, status: published ? "PUBLISHED" : "UNPUBLISHED" });
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    const newPublished = !published;
    setPublished(newPublished);
    try {
      await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newPublished ? "PUBLISHED" : "UNPUBLISHED" }),
      });
      onCourseUpdate({ status: newPublished ? "PUBLISHED" : "UNPUBLISHED" });
      router.refresh();
    } catch {
      setPublished(!newPublished);
    }
  };

  return (
    <div className="px-8 py-6 max-w-2xl" style={{ fontFamily: FONT }}>
      <h2 className="text-base font-semibold text-gray-800 mb-6">Course Settings</h2>

      {/* Status */}
      <div className="mb-5 pb-5 border-b border-gray-200">
        <label className="block text-xs font-medium text-gray-600 mb-1">Course Status</label>
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
            onClick={handlePublishToggle}
            className="ml-1 px-3 py-1 text-xs rounded-sm border transition-colors hover:bg-gray-50"
            style={{ borderColor: MAROON, color: MAROON }}
          >
            {published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Course Image */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-600 mb-1">Course Image</label>
        <button
          type="button"
          onClick={() => setShowImageModal(true)}
          className="mt-1 w-40 h-24 border-2 border-dashed border-gray-300 rounded overflow-hidden flex items-center justify-center hover:border-[#7b1113] transition-colors group bg-gray-50"
        >
          {courseImageUrl ? (
            <Image src={courseImageUrl} alt="Course" width={500} height={500} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
                className="text-gray-400 group-hover:text-[#7b1113]"
              >
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
            onClick={() => setShowImageModal(true)}
            className="mt-1 text-xs hover:underline"
            style={{ color: MAROON }}
          >
            Change image
          </button>
        )}
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Name <span style={{ color: MAROON }}>*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Course name"
          className="w-full h-9 border border-gray-300 rounded-sm px-3 text-sm outline-none transition-colors focus:border-[#7b1113]"
        />
      </div>

      {/* Code */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">Course Code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. CS101"
          className="w-full h-9 border border-gray-300 rounded-sm px-3 text-sm outline-none transition-colors focus:border-[#7b1113]"
        />
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
        {saveError && (
          <span className="text-xs font-medium" style={{ color: MAROON }}>
            ⚠ {saveError}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-8 px-5 text-white text-xs font-semibold rounded-sm disabled:opacity-50 hover:opacity-90"
          style={{ background: MAROON }}
        >
          {saving ? "Saving..." : "Update Course Details"}
        </button>
      </div>

      {showImageModal && (
        <HeadImageModal
          courseId={courseId}
          onClose={() => setShowImageModal(false)}
          onUploaded={(url) => {
            setCourseImageUrl(url);
            onCourseUpdate({ image: url });
            setShowImageModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}