"use client";

import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import ReactDOM from "react-dom";
import { useRouter } from "next/navigation";

const MAROON = "#7b1113";
const MAROON_LIGHT = "#fdf2f2";
const MAROON_MID = "#f0e4e4";

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

// ── Global responsive CSS ──────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  /* Prevent iOS zoom on input focus */
  @media (max-width: 767px) {
    input, textarea, select { font-size: 16px !important; }
  }

  .csp-root {
    display: flex;
    height: 100%;
    overflow: hidden;
    font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
    background: #fff;
  }

  /* ── Tabs ── */
  .csp-tabs {
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    padding: 0 24px;
    flex-shrink: 0;
    background: #fff;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .csp-tabs::-webkit-scrollbar { display: none; }

  .csp-tab-btn {
    padding: 0 4px;
    margin-right: 20px;
    height: 44px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .csp-tab-btn.active {
    border-bottom-color: ${MAROON};
    color: ${MAROON};
  }
  .csp-tab-btn:not(.active) {
    color: #6b7280;
  }
  .csp-tab-btn:not(.active):hover {
    color: #374151;
  }

  /* ── Scrollable content ── */
  .csp-scroll {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .csp-scroll::-webkit-scrollbar { width: 4px; }
  .csp-scroll::-webkit-scrollbar-track { background: transparent; }
  .csp-scroll::-webkit-scrollbar-thumb { background: ${MAROON_MID}; border-radius: 2px; }

  /* ── Content area ── */
  .csp-content {
    padding: 32px 24px;
    max-width: 640px;
    width: 100%;
    margin: 0 auto;
  }

  /* ── Card section ── */
  .csp-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .csp-card-header {
    padding: 14px 18px;
    background: #fafafa;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .csp-card-body {
    padding: 18px;
  }

  /* ── Form fields ── */
  .csp-field { margin-bottom: 16px; }
  .csp-field:last-child { margin-bottom: 0; }

  .csp-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-bottom: 6px;
  }
  .csp-label .req { color: ${MAROON}; margin-left: 2px; }

  .csp-input {
    width: 100%;
    height: 40px;
    border: 1px solid #d1d5db;
    border-radius: 7px;
    padding: 0 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #111827;
    background: #fafafa;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .csp-input:focus {
    border-color: ${MAROON};
    box-shadow: 0 0 0 3px rgba(123,17,19,0.08);
    background: #fff;
  }

  /* ── Status row ── */
  .csp-status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .csp-status-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .csp-status-text {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }
  .csp-publish-btn {
    height: 30px;
    padding: 0 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    border: 1.5px solid ${MAROON};
    color: ${MAROON};
    background: none;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .csp-publish-btn:hover {
    background: ${MAROON_LIGHT};
  }
  .csp-publish-btn.publishing {
    background: ${MAROON};
    color: #fff;
  }

  /* ── Image picker ── */
  .csp-image-trigger {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .csp-image-thumb {
    width: 88px;
    height: 66px;
    border-radius: 8px;
    border: 2px dashed #d1d5db;
    overflow: hidden;
    flex-shrink: 0;
    background: #f9fafb;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .csp-image-thumb:hover { border-color: ${MAROON}; }
  .csp-image-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .csp-image-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .csp-image-change-btn {
    height: 32px;
    padding: 0 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px;
    font-weight: 600;
    border-radius: 6px;
    border: 1.5px solid #d1d5db;
    color: #374151;
    background: none;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    align-self: flex-start;
  }
  .csp-image-change-btn:hover {
    border-color: ${MAROON};
    color: ${MAROON};
  }
  .csp-image-hint {
    font-size: 11px;
    color: #9ca3af;
    font-family: 'DM Mono', monospace;
  }

  /* ── Footer ── */
  .csp-footer {
    padding: 16px 18px;
    background: #fafafa;
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }
  .csp-footer-messages {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .csp-save-btn {
    height: 38px;
    padding: 0 20px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    border-radius: 8px;
    border: none;
    color: #fff;
    background: ${MAROON};
    cursor: pointer;
    transition: opacity 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .csp-save-btn:hover:not(:disabled) { opacity: 0.88; }
  .csp-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .csp-success-msg {
    font-size: 12px;
    font-weight: 600;
    color: #16a34a;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .csp-error-msg {
    font-size: 12px;
    font-weight: 600;
    color: ${MAROON};
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* ── Danger zone card ── */
  .csp-danger-card {
    background: #fff;
    border: 1px solid #fecaca;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .csp-danger-header {
    padding: 14px 18px;
    background: #fff5f5;
    border-bottom: 1px solid #fecaca;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── MOBILE (< 640px) ── */
  @media (max-width: 639px) {
    .csp-tabs { padding: 0 12px; }
    .csp-tab-btn { height: 40px; font-size: 12px; margin-right: 14px; }
    .csp-content { padding: 16px 12px; }
    .csp-card-header { padding: 12px 14px; }
    .csp-card-body { padding: 14px; }
    .csp-footer {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      padding: 14px;
    }
    .csp-footer-messages { width: 100%; }
    .csp-save-btn {
      width: 100%;
      height: 44px;
      font-size: 14px;
      border-radius: 10px;
    }
    .csp-image-trigger { gap: 12px; }
    .csp-image-thumb { width: 72px; height: 56px; }
    .csp-image-change-btn { height: 36px; font-size: 13px; }
    .csp-status-row { gap: 10px; }
    .csp-publish-btn { height: 34px; padding: 0 14px; font-size: 13px; }
  }

  /* ── Modal ── */
  .csp-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0,0,0,0.42);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
  }
  @media (min-width: 560px) {
    .csp-modal-overlay {
      align-items: center;
      padding: 24px;
    }
  }
  .csp-modal {
    width: 100%;
    max-width: 520px;
    background: #fff;
    box-shadow: 0 24px 60px rgba(0,0,0,0.2);
    border-radius: 16px 16px 0 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 92vh;
  }
  @media (min-width: 560px) {
    .csp-modal { border-radius: 12px; }
  }
  .csp-modal-handle {
    display: flex;
    justify-content: center;
    padding: 10px 0 4px;
  }
  @media (min-width: 560px) {
    .csp-modal-handle { display: none; }
  }
  .csp-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }
  .csp-modal-title {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
  }
  .csp-modal-close {
    width: 30px;
    height: 30px;
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    background: none;
    cursor: pointer;
    font-size: 18px;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.12s;
  }
  .csp-modal-close:hover { border-color: ${MAROON}; color: ${MAROON}; }
  .csp-modal-body {
    padding: 18px;
    overflow-y: auto;
    flex: 1;
    -webkit-overflow-scrolling: touch;
  }
  .csp-dropzone {
    border: 2px dashed #d1d5db;
    border-radius: 10px;
    transition: all 0.15s;
    min-height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .csp-dropzone.drag-over {
    border-color: ${MAROON};
    background: ${MAROON_LIGHT};
  }
  .csp-dropzone-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 24px;
    text-align: center;
  }
  .csp-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 18px;
    flex-wrap: wrap;
  }
  @media (max-width: 559px) {
    .csp-modal-footer { flex-direction: column; }
    .csp-modal-footer button { width: 100%; height: 44px; font-size: 14px; border-radius: 10px; }
    .csp-modal-body { padding: 14px; }
  }
  .csp-btn-secondary {
    height: 36px;
    padding: 0 16px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    border-radius: 7px;
    border: 1px solid #d1d5db;
    color: #374151;
    background: #fff;
    cursor: pointer;
    transition: all 0.12s;
    white-space: nowrap;
  }
  .csp-btn-secondary:hover { border-color: #9ca3af; }
  .csp-btn-secondary:disabled { opacity: 0.45; cursor: not-allowed; }
  .csp-btn-primary {
    height: 36px;
    padding: 0 20px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 700;
    border-radius: 7px;
    border: none;
    color: #fff;
    background: ${MAROON};
    cursor: pointer;
    transition: opacity 0.12s;
    white-space: nowrap;
  }
  .csp-btn-primary:hover:not(:disabled) { opacity: 0.88; }
  .csp-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Safe area for notched phones */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .csp-footer { padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
    .csp-modal-body { padding-bottom: calc(18px + env(safe-area-inset-bottom)); }
  }
`;

// ── Shared small components ────────────────────────────────────────────────────
function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 6,
      background: MAROON_LIGHT,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {children}
    </div>
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
  const [publishLoading, setPublishLoading] = useState(false);
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
    setPublishLoading(true);
    try {
      await fetch(`/api/admin/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus ? "PUBLISHED" : "UNPUBLISHED" }),
      });
      router.refresh();
    } catch {
      setPublished(!newStatus);
    } finally {
      setPublishLoading(false);
    }
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="csp-root">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* ── Tabs ── */}
          <div className="csp-tabs">
            {TABS.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`csp-tab-btn${activeTab === tab ? " active" : ""}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Scrollable content ── */}
          <div className="csp-scroll">
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
                  publishLoading={publishLoading}
                  onPublishToggle={handlePublishToggle}
                  courseId={courseId}
                />
              )}
            </div>
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
  courseImageUrl, onChooseImage, published, publishLoading, onPublishToggle, courseId,
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
  publishLoading: boolean;
  onPublishToggle: () => void;
  courseId: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Status Card ── */}
      <div className="csp-card">
        <div className="csp-card-header">
          <SectionIcon>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </SectionIcon>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.02em" }}>
            Visibility
          </span>
        </div>
        <div className="csp-card-body">
          <div className="csp-status-row">
            <div className="csp-status-dot" style={{ background: published ? "#16a34a" : "#9ca3af" }} />
            <span className="csp-status-text">{published ? "Published" : "Unpublished"}</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {published ? "Students can see this course" : "Hidden from students"}
            </span>
            <button
              type="button"
              onClick={onPublishToggle}
              disabled={publishLoading}
              className={`csp-publish-btn${publishLoading ? " publishing" : ""}`}
              style={{ marginLeft: "auto" }}
            >
              {publishLoading ? "Saving…" : published ? "Unpublish" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Course Image Card ── */}
      <div className="csp-card">
        <div className="csp-card-header">
          <SectionIcon>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </SectionIcon>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.02em" }}>
            Course Image
          </span>
        </div>
        <div className="csp-card-body">
          <div className="csp-image-trigger">
            <button
              type="button"
              onClick={onChooseImage}
              className="csp-image-thumb"
              aria-label="Choose course image"
            >
              {courseImageUrl ? (
                <Image src={courseImageUrl} alt="Course" width={200} height={150} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </button>
            <div className="csp-image-actions">
              <button type="button" onClick={onChooseImage} className="csp-image-change-btn">
                {courseImageUrl ? "Change image" : "Upload image"}
              </button>
              <span className="csp-image-hint">PNG, JPG, WebP · Max 5 MB</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Course Info Card ── */}
      <div className="csp-card">
        <div className="csp-card-header">
          <SectionIcon>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </SectionIcon>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.02em" }}>
            Course Information
          </span>
        </div>

        <div className="csp-card-body">
          <div className="csp-field">
            <label className="csp-label">
              Course Name <span className="req">*</span>
            </label>
            <input
              className="csp-input"
              value={details.name}
              onChange={e => update("name", e.target.value)}
              placeholder="e.g. Introduction to Computer Science"
            />
          </div>
          <div className="csp-field">
            <label className="csp-label">Course Code</label>
            <input
              className="csp-input"
              value={details.code}
              onChange={e => update("code", e.target.value)}
              placeholder="e.g. CS101"
              style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em" }}
            />
          </div>
        </div>

        {/* Footer inside card */}
        <div className="csp-footer">
          <div className="csp-footer-messages">
            {saveSuccess && (
              <span className="csp-success-msg">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved successfully
              </span>
            )}
            {saveError && (
              <span className="csp-error-msg">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {saveError}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !details.name.trim()}
            className="csp-save-btn"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="csp-danger-card">
        <div className="csp-danger-header">
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: "#fef2f2",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", letterSpacing: "0.02em" }}>
            Danger Zone
          </span>
        </div>
        <div className="csp-card-body">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 2px" }}>
                Delete this course
              </p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                Permanently remove the course and all its data. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              style={{
                height: 34, padding: "0 14px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 700,
                borderRadius: 7,
                border: "1.5px solid #fecaca",
                color: "#dc2626",
                background: "#fff5f5",
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5"; }}
            >
              Delete Course
            </button>
          </div>
        </div>
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
      className="csp-modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="csp-modal">
        {/* Mobile drag handle */}
        <div className="csp-modal-handle">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db" }} />
        </div>

        {/* Header */}
        <div className="csp-modal-header">
          <span className="csp-modal-title">Choose Course Image</span>
          <button type="button" className="csp-modal-close" onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div className="csp-modal-body">
          <div
            className={`csp-dropzone${dragOver ? " drag-over" : ""}`}
            onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
            onDrop={handleDrop}
          >
            <div className="csp-dropzone-inner">
              {!previewUrl ? (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: MAROON_LIGHT,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 4,
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>
                    Drag & drop an image here
                  </p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 14px" }}>
                    PNG, JPG, GIF, WebP supported
                  </p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="csp-btn-primary"
                    style={{ height: 36 }}
                  >
                    Browse files
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    width={300}
                    height={200}
                    style={{ maxHeight: 160, width: "auto", maxWidth: "100%", borderRadius: 8, border: "1px solid #e5e7eb", objectFit: "contain" }}
                  />
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", padding: "0 12px" }}>
                    {file?.name}
                  </p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, fontFamily: "'DM Mono', monospace" }}>
                    {file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    style={{ fontSize: 12, fontWeight: 600, color: MAROON, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    Choose a different image
                  </button>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => acceptFile(e.target.files?.[0])}
              />
            </div>
          </div>

          {error && (
            <p style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: MAROON, display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </p>
          )}

          <div className="csp-modal-footer">
            <button type="button" onClick={onClose} disabled={saving} className="csp-btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={uploadAndSave} disabled={saving || !file} className="csp-btn-primary">
              {saving ? "Uploading…" : "Save Image"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}