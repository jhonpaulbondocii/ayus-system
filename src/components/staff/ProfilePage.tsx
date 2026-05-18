"use client";

// src/app/profile/page.tsx

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import ReactDOM from "react-dom";

const MAROON      = "#7b1113";
const FONT        = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const BORDER_SOFT = "#f0e4e4";

const INPUT_CLS = "border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-full outline-none bg-white text-gray-900 transition-all";
const INPUT_FOCUS = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = MAROON;
  e.currentTarget.style.boxShadow = `0 0 0 2px ${MAROON}18`;
};
const INPUT_BLUR = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = "#e5e7eb";
  e.currentTarget.style.boxShadow = "none";
};

const accountLinks = [
  { label: "Profile", href: "/profile" },
];

// ─── Nav layout detection ─────────────────────────────────────────────────────
const BOTTOM_NAV_BREAKPOINT = 768;
type NavLayout = "bottom-nav" | "side-nav";

function useNavLayout(): NavLayout {
  const [layout, setLayout] = useState<NavLayout>("side-nav");
  useEffect(() => {
    const check = () =>
      setLayout(window.innerWidth < BOTTOM_NAV_BREAKPOINT ? "bottom-nav" : "side-nav");
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return layout;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  id:            string;
  name:          string;
  email:         string;
  role:          string;
  department:    string | null;
  position:      string | null;
  pronouns:      string | null;
  bio:           string | null;
  contactNumber: string | null;
  image:         string | null;
}

// ─── PersonIcon ───────────────────────────────────────────────────────────────
function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [user,    setUser]    = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [, startTransition]   = useTransition();

  const [name,          setName]          = useState("");
  const [pronouns,      setPronouns]      = useState("");
  const [bio,           setBio]           = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [photoOpen,   setPhotoOpen]   = useState(false);
  const [photoFile,   setPhotoFile]   = useState<File | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);

  const navLayout   = useNavLayout();
  const isBottomNav = navLayout === "bottom-nav";

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => {
        startTransition(() => {
          setUser(d.user);
          setName(d.user?.name                 ?? "");
          setPronouns(d.user?.pronouns          ?? "");
          setBio(d.user?.bio                    ?? "");
          setContactNumber(d.user?.contactNumber ?? "");
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, [startTransition]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch("/api/profile", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, pronouns, bio, contactNumber }),
      });
      const data = await res.json();
      startTransition(() => {
        setUser(prev => prev ? { ...prev, ...data.user } : data.user);
        setEditing(false);
        setSaving(false);
      });
    } catch {
      setSaving(false);
    }
  };

  const avatarUrl = user?.image ?? null;

  const onOpenPhoto = () => { setPhotoFile(null); setPhotoOpen(true); };
  const onSavePhoto = async () => {
    if (!photoFile) { alert("Please choose an image."); return; }
    setPhotoSaving(true);
    try {
      const form = new FormData();
      form.append("file", photoFile);
      const res  = await fetch("/api/profile/photo", { method: "PATCH", body: form, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      startTransition(() => {
        setUser(prev => prev ? { ...prev, image: data.imageUrl as string } : prev);
        setPhotoOpen(false);
        setPhotoFile(null);
        setPhotoSaving(false);
      });
    } catch (e) {
      setPhotoSaving(false);
      alert(e instanceof Error ? e.message : "Upload failed");
    }
  };

  if (loading) return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#fff", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading profile...</p>
    </div>
  );

  // ── Layout: mobile stacks vertically, desktop has a sidebar ──────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#fff", fontFamily: FONT, flexDirection: isBottomNav ? "column" : "row" }}>

      {/* ── Sidebar (desktop only) ── */}
      {!isBottomNav && (
        <div style={{ width: 176, borderRight: `1px solid ${BORDER_SOFT}`, paddingTop: 16, paddingLeft: 12, paddingRight: 12, flexShrink: 0 }}>
          {accountLinks.map(l => {
            const isActive = l.href === "/profile";
            return (
              <Link key={l.label} href={l.href}
                style={{
                  display: "block", fontSize: 12, padding: "6px 8px",
                  marginBottom: 2, fontWeight: 600, textDecoration: "none",
                  borderRadius: 0,
                  ...(isActive
                    ? { color: MAROON, background: "#fef2f2", borderLeft: `3px solid ${MAROON}`, paddingLeft: 9 }
                    : { color: "#374151" }),
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = MAROON; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#374151"; }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{
        flex: 1,
        padding:  isBottomNav ? "16px 16px 32px" : "24px 32px",
        maxWidth: isBottomNav ? "100%" : 640,
      }}>

        {/* Breadcrumb — desktop only */}
        {!isBottomNav && (
          <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16, fontWeight: 500 }}>
            {name} <span style={{ margin: "0 4px" }}>›</span> Profile
          </p>
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontSize: 15, fontWeight: 900, color: "#111827", margin: 0 }}>My Profile</h1>
          <button
            type="button"
            onClick={() => setEditing(!editing)}
            style={{
              fontSize: 12, padding: "6px 12px",
              border: "1px solid #e5e7eb", borderRadius: 8,
              fontWeight: 600, color: "#4b5563",
              background: "#fff", cursor: "pointer",
              fontFamily: FONT, transition: "all 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#4b5563"; }}
          >
            {editing ? "Cancel" : "✏ Edit Profile"}
          </button>
        </div>

        {/* ── Avatar + fields ── */}
        {/* On mobile: avatar centred on top, fields below. On desktop: side by side. */}
        <div style={{
          display:       "flex",
          flexDirection: isBottomNav ? "column" : "row",
          gap:           isBottomNav ? 20 : 24,
          alignItems:    isBottomNav ? "center" : "flex-start",
        }}>

          {/* Avatar */}
          <div style={{ flexShrink: 0, textAlign: "center" }}>
            <div style={{ width: isBottomNav ? 88 : 80, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: isBottomNav ? 72 : 64, height: isBottomNav ? 72 : 64,
                borderRadius: "50%", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `3px solid ${BORDER_SOFT}`, background: BORDER_SOFT,
              }}>
                {avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
                  : <div style={{ color: MAROON }}><PersonIcon className={isBottomNav ? "w-11 h-11" : "w-9 h-9"}/></div>
                }
              </div>
              <button
                type="button"
                onClick={onOpenPhoto}
                style={{
                  marginTop: 8, fontSize: 11, fontWeight: 600,
                  color: MAROON, background: "none", border: "none",
                  cursor: "pointer", fontFamily: FONT,
                }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
              >
                Edit Picture
              </button>
            </div>
          </div>

          {/* Fields */}
          <div style={{ flex: 1, width: "100%" }}>

            {/* Name & pronouns */}
            {editing ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: isBottomNav ? "1fr" : "1fr 1fr",
                gap: 12, marginBottom: 16,
              }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4, color: MAROON }}>
                    Full Name
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className={INPUT_CLS} onFocus={INPUT_FOCUS} onBlur={INPUT_BLUR}/>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 4, color: MAROON }}>
                    Pronouns
                  </label>
                  <input value={pronouns} onChange={e => setPronouns(e.target.value)}
                    className={INPUT_CLS} onFocus={INPUT_FOCUS} onBlur={INPUT_BLUR}/>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: isBottomNav ? 16 : 14, fontWeight: 900, color: "#111827", marginBottom: 16 }}>
                {name}
                {pronouns && <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 12, marginLeft: 8, fontStyle: "italic" }}>({pronouns})</span>}
              </p>
            )}

            {/* Info table */}
            <div style={{ borderRadius: 12, padding: 12, background: "#fdf8f8", marginBottom: 16 }}>
              {[
                { label: "Email",    value: user?.email },
                { label: "Role",     value: user?.role?.toLowerCase() },
                { label: "Position", value: user?.position || "—" },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", width: 96, flexShrink: 0, color: MAROON }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 12, color: "#374151", textTransform: "capitalize" }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {/* Contact number */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", width: 96, flexShrink: 0, color: MAROON }}>
                  Contact No.
                </span>
                {editing
                  ? <input value={contactNumber} onChange={e => setContactNumber(e.target.value)}
                      className={INPUT_CLS} style={{ flex: 1 }}
                      onFocus={INPUT_FOCUS} onBlur={INPUT_BLUR}
                      placeholder="e.g. 09XX-XXX-XXXX"/>
                  : <span style={{ fontSize: 12, color: "#374151" }}>{contactNumber || "—"}</span>
                }
              </div>
            </div>

            {/* Bio */}
            <div style={{ marginBottom: editing ? 16 : 0 }}>
              <p style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, color: MAROON }}>
                Biography
              </p>
              {editing
                ? <textarea value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    className={`${INPUT_CLS} resize-none`}
                    style={{ height: isBottomNav ? 96 : 80 }}
                    onFocus={INPUT_FOCUS} onBlur={INPUT_BLUR}/>
                : <p style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
                    {bio || "No biography added yet."}
                  </p>
              }
            </div>

            {editing && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: isBottomNav ? "10px 20px" : "6px 16px",
                  color: "#fff", fontSize: 12, fontWeight: 900,
                  borderRadius: 8, border: "none",
                  background: MAROON, cursor: "pointer",
                  fontFamily: FONT, transition: "opacity 0.12s",
                  opacity: saving ? 0.6 : 1,
                  width: isBottomNav ? "100%" : "auto",
                }}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={e => { if (!saving) e.currentTarget.style.opacity = "1"; }}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Photo modal ── */}
      <SelectProfilePictureModal
        open={photoOpen} onClose={() => setPhotoOpen(false)}
        file={photoFile} setFile={setPhotoFile}
        onSave={onSavePhoto} saving={photoSaving}
        isBottomNav={isBottomNav}
      />
    </div>
  );
}

// ─── Photo modal ───────────────────────────────────────────────────────────────
function SelectProfilePictureModal({ open, onClose, file, setFile, onSave, saving, isBottomNav }: {
  open:        boolean;
  onClose:     () => void;
  file:        File | null;
  setFile:     (f: File | null) => void;
  onSave:      () => void;
  saving:      boolean;
  isBottomNav: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const preview  = useObjectUrl(file);

  if (!open || typeof window === "undefined") return null;

  const accept = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { alert("Please select an image file."); return; }
    setFile(f);
  };

  // On mobile: bottom sheet modal. On desktop: centered modal.
  const overlayStyle: React.CSSProperties = {
    position:       "fixed",
    inset:          0,
    zIndex:         9999,
    display:        "flex",
    alignItems:     isBottomNav ? "flex-end" : "center",
    justifyContent: "center",
    background:     "rgba(0,0,0,0.3)",
    padding:        isBottomNav ? 0 : 24,
    fontFamily:     FONT,
  };

  const dialogStyle: React.CSSProperties = isBottomNav
    ? {
        width:        "100%",
        background:   "#fff",
        borderRadius: "16px 16px 0 0",
        border:       `1px solid ${BORDER_SOFT}`,
        overflow:     "hidden",
        maxHeight:    "90vh",
        display:      "flex",
        flexDirection: "column",
      }
    : {
        width:      "100%",
        maxWidth:   512,
        background: "#fff",
        borderRadius: 16,
        border:     `1px solid ${BORDER_SOFT}`,
        boxShadow:  "0 8px 40px rgba(0,0,0,0.12)",
        overflow:   "hidden",
        display:    "flex",
        flexDirection: "column",
      };

  const modal = (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={dialogStyle}>

        {/* Drag handle — mobile only */}
        {isBottomNav && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 9999, background: "#e5e7eb" }} />
          </div>
        )}

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", borderBottom: `1px solid ${BORDER_SOFT}`, flexShrink: 0,
        }}>
          <p style={{ fontSize: 14, fontWeight: 900, color: "#111827", margin: 0 }}>
            Select Profile Picture
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid #e5e7eb", borderRadius: 8,
              background: "none", cursor: "pointer", color: "#9ca3af",
              fontSize: 14, fontWeight: 700, transition: "all 0.12s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#9ca3af"; }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 20px 16px", flex: 1, overflowY: "auto" }}>
          <label style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 8, color: MAROON }}>
            Picture Options
          </label>
          <select
            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12, background: "#fff", color: "#374151", outline: "none", fontFamily: FONT, marginBottom: 20 }}
            defaultValue="upload"
          >
            <option value="upload">Upload a Picture</option>
          </select>

          {/* Preview area */}
          <div style={{
            border: "1px solid #f3f4f6", borderRadius: 12, background: "#f9fafb",
            height: isBottomNav ? 200 : 224,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 144, height: 112, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={preview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}/>
                  : <div style={{ width: 80, height: 80, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, background: BORDER_SOFT, color: MAROON }}>?</div>
                }
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{ fontSize: 12, fontWeight: 700, color: MAROON, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
              >
                choose a picture
              </button>
              <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => accept(e.target.files?.[0])}/>
              {file && (
                <p style={{ marginTop: 6, fontSize: 11, color: "#9ca3af" }}>
                  Selected: <span style={{ color: "#374151", fontWeight: 600 }}>{file.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
          padding: isBottomNav ? "12px 20px 28px" : "12px 20px 16px",
          borderTop: `1px solid ${BORDER_SOFT}`, background: "#fdf8f8", flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "7px 16px", border: "1px solid #e5e7eb", borderRadius: 8,
              fontSize: 12, fontWeight: 600, color: "#4b5563", background: "#fff",
              cursor: "pointer", fontFamily: FONT, transition: "all 0.12s",
              opacity: saving ? 0.6 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#4b5563"; }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              padding: "7px 16px", border: "none", borderRadius: 8,
              fontSize: 12, fontWeight: 900, color: "#fff", background: MAROON,
              cursor: "pointer", fontFamily: FONT, transition: "opacity 0.12s",
              opacity: saving ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.opacity = "1"; }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => { return () => { if (url) URL.revokeObjectURL(url); }; }, [url]);
  return url;
}