  "use client";

  import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
  import Image from "next/image";
  import ReactDOM from "react-dom";
  import { useRouter } from "next/navigation";

  const MAROON = "#7b1113";
  const MAROON_LIGHT = "#fdf2f2";
  const MAROON_MID = "#f0e4e4";

  // ── Types ──────────────────────────────────────────────────────────────────────
  interface OfficeDetails {
    name: string;
    code: string;
  }

  const TABS = ["Office Details"] as const;
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

    @media (max-width: 767px) {
      input, textarea, select { font-size: 16px !important; }
    }

    .osp-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
    }

    /* ── Tabs ── */
    .osp-tabs {
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      padding: 0 24px;
      flex-shrink: 0;
      background: #fff;
      overflow-x: auto;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
    }
    .osp-tabs::-webkit-scrollbar { display: none; }

    .osp-tab-btn {
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
    .osp-tab-btn.active {
      border-bottom-color: ${MAROON};
      color: ${MAROON};
    }
    .osp-tab-btn:not(.active) { color: #6b7280; }
    .osp-tab-btn:not(.active):hover { color: #374151; }

    /* ── Layout: sidebar + content ── */
    .osp-body {
      flex: 1;
      display: flex;
      overflow: hidden;
      min-height: 0;
    }

    /* ── Scrollable content ── */
    .osp-scroll {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      min-width: 0;
    }
    .osp-scroll::-webkit-scrollbar { width: 4px; }
    .osp-scroll::-webkit-scrollbar-track { background: transparent; }
    .osp-scroll::-webkit-scrollbar-thumb { background: ${MAROON_MID}; border-radius: 2px; }

    /* ── Content area ── */
    .osp-content {
      padding: 28px 28px 40px;
      width: 100%;
    }

    /* ── Layout: image card left (fixed width), info card takes the rest ── */
    .osp-grid {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 16px;
      align-items: start;
    }
    .osp-grid-full {
      grid-column: 1 / -1;
    }

    /* ── Make image card compact — don't stretch ── */
    .osp-image-card {
      align-self: start;
    }

    /* ── Card section ── */
    .osp-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }
    .osp-card-header {
      padding: 13px 16px;
      background: #fafafa;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .osp-card-body {
      padding: 16px;
    }

    /* ── Form fields ── */
    .osp-field { margin-bottom: 14px; }
    .osp-field:last-child { margin-bottom: 0; }

    .osp-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      margin-bottom: 6px;
    }
    .osp-label .req { color: ${MAROON}; margin-left: 2px; }

    .osp-input {
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
    .osp-input:focus {
      border-color: ${MAROON};
      box-shadow: 0 0 0 3px rgba(123,17,19,0.08);
      background: #fff;
    }

    /* ── Image picker ── */
    .osp-image-trigger {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
    }
    .osp-image-thumb {
      width: 100%;
      height: 120px;
      border-radius: 8px;
      border: 2px dashed #d1d5db;
      overflow: hidden;
      background: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .osp-image-thumb:hover { border-color: ${MAROON}; }
    .osp-image-thumb img { width: 100%; height: 100%; object-fit: cover; }
    .osp-image-actions {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .osp-image-change-btn {
      height: 30px;
      padding: 0 12px;
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
    }
    .osp-image-change-btn:hover {
      border-color: ${MAROON};
      color: ${MAROON};
    }
    .osp-image-hint {
      font-size: 11px;
      color: #9ca3af;
      font-family: 'DM Mono', monospace;
    }

    /* ── Footer ── */
    .osp-footer {
      padding: 14px 16px;
      background: #fafafa;
      border-top: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      flex-wrap: wrap;
    }
    .osp-footer-messages {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .osp-save-btn {
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
      transition: opacity 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .osp-save-btn:hover:not(:disabled) { opacity: 0.88; }
    .osp-save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .osp-success-msg {
      font-size: 12px;
      font-weight: 600;
      color: #16a34a;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .osp-error-msg {
      font-size: 12px;
      font-weight: 600;
      color: ${MAROON};
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* ── Delete row at bottom ── */
    .osp-delete-row {
      margin-top: 4px;
      padding: 14px 16px;
      background: #fff;
      border: 1px solid #fecaca;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .osp-delete-info p {
      margin: 0;
    }
    .osp-delete-btn {
      height: 34px;
      padding: 0 14px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-weight: 700;
      border-radius: 7px;
      border: 1.5px solid #fecaca;
      color: #dc2626;
      background: #fff5f5;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .osp-delete-btn:hover {
      background: #fee2e2;
    }

    /* ── TABLET (< 900px): equal columns ── */
    @media (max-width: 899px) and (min-width: 768px) {
      .osp-grid { grid-template-columns: 1fr 1fr; }
    }

    /* ── MOBILE (< 768px): single column ── */
    @media (max-width: 767px) {
      .osp-tabs { padding: 0 14px; }
      .osp-tab-btn { height: 40px; font-size: 12px; margin-right: 14px; }
      .osp-content { padding: 14px 14px 32px; }
      .osp-grid { grid-template-columns: 1fr; gap: 12px; }
      .osp-grid-full { grid-column: 1; }
      .osp-card-header { padding: 11px 14px; }
      .osp-card-body { padding: 14px; }
      .osp-footer {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
        padding: 12px 14px;
      }
      .osp-footer-messages { width: 100%; }
      .osp-save-btn {
        width: 100%;
        height: 42px;
        font-size: 14px;
        border-radius: 8px;
      }
      .osp-image-thumb { width: 68px; height: 52px; }
      .osp-delete-row { padding: 12px 14px; }
    }

    /* ── Modal ── */
    .osp-modal-overlay {
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
      .osp-modal-overlay {
        align-items: center;
        padding: 24px;
      }
    }
    .osp-modal {
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
      .osp-modal { border-radius: 12px; }
    }
    .osp-modal-handle {
      display: flex;
      justify-content: center;
      padding: 10px 0 4px;
    }
    @media (min-width: 560px) {
      .osp-modal-handle { display: none; }
    }
    .osp-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
    }
    .osp-modal-title {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }
    .osp-modal-close {
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
    .osp-modal-close:hover { border-color: ${MAROON}; color: ${MAROON}; }
    .osp-modal-body {
      padding: 18px;
      overflow-y: auto;
      flex: 1;
      -webkit-overflow-scrolling: touch;
    }
    .osp-dropzone {
      border: 2px dashed #d1d5db;
      border-radius: 10px;
      transition: all 0.15s;
      min-height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .osp-dropzone.drag-over {
      border-color: ${MAROON};
      background: ${MAROON_LIGHT};
    }
    .osp-dropzone-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px;
      text-align: center;
      width: 100%;
    }
    .osp-modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 18px;
      flex-wrap: wrap;
    }
    @media (max-width: 559px) {
      .osp-modal-footer { flex-direction: column; }
      .osp-modal-footer button { width: 100%; height: 44px; font-size: 14px; border-radius: 10px; }
      .osp-modal-body { padding: 14px; }
    }
    .osp-btn-secondary {
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
    .osp-btn-secondary:hover { border-color: #9ca3af; }
    .osp-btn-secondary:disabled { opacity: 0.45; cursor: not-allowed; }
    .osp-btn-primary {
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
    .osp-btn-primary:hover:not(:disabled) { opacity: 0.88; }
    .osp-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      .osp-footer { padding-bottom: calc(14px + env(safe-area-inset-bottom)); }
      .osp-modal-body { padding-bottom: calc(18px + env(safe-area-inset-bottom)); }
      .osp-delete-row { margin-bottom: env(safe-area-inset-bottom); }
    }
  `;

  // ── Shared small components ────────────────────────────────────────────────────
  function SectionIcon({ children }: { children: React.ReactNode }) {
    return (
      <div style={{
        width: 24, height: 24, borderRadius: 6,
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
    const [activeTab, setActiveTab] = useState<Tab>("Office Details");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [officeImageUrl, setOfficeImageUrl] = useState(initialImage);
    const [showImageModal, setShowImageModal] = useState(false);

    const [details, setDetails] = useState<OfficeDetails>({
      name: initialName,
      code: initialCode,
    });

    const update = useCallback((k: keyof OfficeDetails, v: string) =>
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

    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="osp-root">

          {/* ── Tabs ── */}
          <div className="osp-tabs">
            {TABS.map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`osp-tab-btn${activeTab === tab ? " active" : ""}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── Body ── */}
          <div className="osp-body">
            <div className="osp-scroll">
              <div className="osp-content">
                {activeTab === "Office Details" && (
                  <OfficeDetailsTab
                    details={details}
                    update={update}
                    onSave={handleSave}
                    saving={saving}
                    saveSuccess={saveSuccess}
                    saveError={saveError}
                    officeImageUrl={officeImageUrl}
                    onChooseImage={() => setShowImageModal(true)}
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
                setOfficeImageUrl(url);
                setShowImageModal(false);
                router.refresh();
              }}
            />
          )}
        </div>
      </>
    );
  }

  // ── Office Details Tab ─────────────────────────────────────────────────────────
  function OfficeDetailsTab({
    details, update, onSave, saving, saveSuccess, saveError,
    officeImageUrl, onChooseImage, courseId,
  }: {
    details: OfficeDetails;
    update: (k: keyof OfficeDetails, v: string) => void;
    onSave: () => void;
    saving: boolean;
    saveSuccess: boolean;
    saveError: string | null;
    officeImageUrl: string;
    onChooseImage: () => void;
    courseId: string;
  }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Two-column grid ── */}
        <div className="osp-grid">

          {/* ── Office Image Card ── */}
          <div className="osp-card osp-image-card">
            <div className="osp-card-header">
              <SectionIcon>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </SectionIcon>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.02em" }}>
                Office Image
              </span>
            </div>
            <div className="osp-card-body">
              <div className="osp-image-trigger">
                <button
                  type="button"
                  onClick={onChooseImage}
                  className="osp-image-thumb"
                  aria-label="Choose office image"
                >
                  {officeImageUrl ? (
                    <Image
                      src={officeImageUrl}
                      alt="Office"
                      width={200}
                      height={150}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                </button>
                <div className="osp-image-actions">
                  <button type="button" onClick={onChooseImage} className="osp-image-change-btn">
                    {officeImageUrl ? "Change image" : "Upload image"}
                  </button>
                  <span className="osp-image-hint">PNG, JPG, WebP · Max 5 MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Office Info Card ── */}
          <div className="osp-card">
            <div className="osp-card-header">
              <SectionIcon>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </SectionIcon>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", letterSpacing: "0.02em" }}>
                Office Information
              </span>
            </div>

            <div className="osp-card-body">
              <div className="osp-field">
                <label className="osp-label">
                  Office Name <span className="req">*</span>
                </label>
                <input
                  className="osp-input"
                  value={details.name}
                  onChange={e => update("name", e.target.value)}
                  placeholder="e.g. Registrar's Office"
                />
              </div>
              <div className="osp-field">
                <label className="osp-label">Office Code</label>
                <input
                  className="osp-input"
                  value={details.code}
                  onChange={e => update("code", e.target.value)}
                  placeholder="e.g. REG001"
                  style={{ fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em" }}
                />
              </div>
            </div>

            {/* Footer inside card */}
            <div className="osp-footer">
              <div className="osp-footer-messages">
                {saveSuccess && (
                  <span className="osp-success-msg">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Saved successfully
                  </span>
                )}
                {saveError && (
                  <span className="osp-error-msg">
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
                className="osp-save-btn"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

        </div>

        {/* ── Delete Office row — no "Danger Zone" label ── */}
        <div className="osp-delete-row">
          <div className="osp-delete-info">
            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 2 }}>
              Delete this office
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>
              Permanently removes the office and all its data. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            className="osp-delete-btn"
          >
            Delete Office
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
        const res = await fetch(`/api/admin/courses/${courseId}/image`, { method: "POST", body: form });
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
        className="osp-modal-overlay"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="osp-modal">
          <div className="osp-modal-handle">
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db" }} />
          </div>

          <div className="osp-modal-header">
            <span className="osp-modal-title">Choose Office Image</span>
            <button type="button" className="osp-modal-close" onClick={onClose}>×</button>
          </div>

          <div className="osp-modal-body">
            <div
              className={`osp-dropzone${dragOver ? " drag-over" : ""}`}
              onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
              onDrop={handleDrop}
            >
              <div className="osp-dropzone-inner">
                {!previewUrl ? (
                  <>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10,
                      background: MAROON_LIGHT,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 4,
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MAROON} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                      className="osp-btn-primary"
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

            <div className="osp-modal-footer">
              <button type="button" onClick={onClose} disabled={saving} className="osp-btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={uploadAndSave} disabled={saving || !file} className="osp-btn-primary">
                {saving ? "Uploading…" : "Save Image"}
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }