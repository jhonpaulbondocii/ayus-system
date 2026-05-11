"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import ReactDOM from "react-dom";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

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

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  );
}

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

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => {
        startTransition(() => {
          setUser(d.user);
          setName(d.user?.name               ?? "");
          setPronouns(d.user?.pronouns        ?? "");
          setBio(d.user?.bio                  ?? "");
          setContactNumber(d.user?.contactNumber ?? "");
          setLoading(false);
        });
      })
      .catch(() => startTransition(() => setLoading(false)));
  }, [startTransition]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pronouns, bio, contactNumber }),
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
    <div className="flex min-h-screen bg-white items-center justify-center" style={{ fontFamily: FONT }}>
      <p className="text-xs text-gray-400">Loading profile...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white" style={{ fontFamily: FONT }}>

      {/* ── Sidebar ── */}
      <div className="w-44 border-r pt-4 px-3 shrink-0" style={{ borderColor: "#f0e4e4" }}>
        {accountLinks.map(l => {
          const isActive = l.href === "/profile";
          return (
            <Link key={l.label} href={l.href}
              className="block text-xs py-1.5 px-2 rounded-lg mb-0.5 font-semibold transition-colors"
              style={isActive
                ? { color: MAROON, background: "#fef2f2", borderLeft: `3px solid ${MAROON}`, borderRadius: 0, paddingLeft: 9 }
                : { color: "#374151" }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = MAROON; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#374151"; }}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      {/* ── Main ── */}
      <div className="flex-1 px-8 py-6 max-w-2xl">

        {/* Breadcrumb */}
        <p className="text-[11px] text-gray-400 mb-4 font-medium">
          {name} <span className="mx-1">›</span> Profile
        </p>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-base font-black text-gray-900">My Profile</h1>
          <button type="button" onClick={() => setEditing(!editing)}
            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg font-semibold text-gray-600 transition-all"
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#4b5563"; }}>
            {editing ? "Cancel" : "✏ Edit Profile"}
          </button>
        </div>

        <div className="flex gap-6">

          {/* Avatar */}
          <div className="shrink-0 text-center">
            <div className="w-20 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                style={{ border: `3px solid #f0e4e4`, background: "#f0e4e4" }}>
                {avatarUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover"/>
                  : <div style={{ color: MAROON }}><PersonIcon className="w-9 h-9"/></div>
                }
              </div>
              <button type="button" onClick={onOpenPhoto}
                className="mt-2 text-[11px] font-semibold hover:underline transition-colors"
                style={{ color: MAROON }}>
                Edit Picture
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4">

            {/* Name & pronouns */}
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: MAROON }}>Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className={INPUT_CLS} onFocus={INPUT_FOCUS} onBlur={INPUT_BLUR}/>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: MAROON }}>Pronouns</label>
                  <input value={pronouns} onChange={e => setPronouns(e.target.value)}
                    className={INPUT_CLS} onFocus={INPUT_FOCUS} onBlur={INPUT_BLUR}/>
                </div>
              </div>
            ) : (
              <p className="text-sm font-black text-gray-900">
                {name}
                {pronouns && <span className="text-gray-400 font-normal text-xs ml-2 italic">({pronouns})</span>}
              </p>
            )}

            {/* Info table */}
            <div className="rounded-xl p-3 space-y-2" style={{ background: "#fdf8f8" }}>
              {[
                { label: "Email",    value: user?.email },
                { label: "Role",     value: user?.role?.toLowerCase() },
                { label: "Position", value: user?.position || "—" },
              ].map(row => (
                <div key={row.label} className="flex gap-3 items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest w-24 shrink-0" style={{ color: MAROON }}>{row.label}</span>
                  <span className="text-xs text-gray-700 capitalize">{row.value}</span>
                </div>
              ))}

              <div className="flex gap-3 items-center">
                <span className="text-[10px] font-black uppercase tracking-widest w-24 shrink-0" style={{ color: MAROON }}>Contact No.</span>
                {editing
                  ? <input value={contactNumber} onChange={e => setContactNumber(e.target.value)}
                      className={INPUT_CLS} style={{ flex: 1 }} onFocus={INPUT_FOCUS} onBlur={INPUT_BLUR}
                      placeholder="e.g. 09XX-XXX-XXXX"/>
                  : <span className="text-xs text-gray-700">{contactNumber || "—"}</span>}
              </div>
            </div>

            {/* Bio */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: MAROON }}>Biography</p>
              {editing
                ? <textarea value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Write something about yourself..."
                    className={`${INPUT_CLS} h-20 resize-none`}
                    onFocus={INPUT_FOCUS} onBlur={INPUT_BLUR}/>
                : <p className="text-xs text-gray-400 italic">{bio || "No biography added yet."}</p>}
            </div>

            {editing && (
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-4 py-1.5 text-white text-xs font-black rounded-lg transition-all disabled:opacity-60"
                style={{ background: MAROON, fontFamily: FONT }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                {saving ? "Saving..." : "Save Profile"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <SelectProfilePictureModal
        open={photoOpen} onClose={() => setPhotoOpen(false)}
        file={photoFile} setFile={setPhotoFile}
        onSave={onSavePhoto} saving={photoSaving}/>
    </div>
  );
}

// ── Photo modal ────────────────────────────────────────────────────────────────
function SelectProfilePictureModal({ open, onClose, file, setFile, onSave, saving }: {
  open: boolean; onClose: () => void;
  file: File | null; setFile: (f: File | null) => void;
  onSave: () => void; saving: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const preview  = useObjectUrl(file);

  if (!open || typeof window === "undefined") return null;

  const accept = (f?: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { alert("Please select an image file."); return; }
    setFile(f);
  };

  const modal = (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/30 p-6"
      style={{ fontFamily: FONT }}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ border: "1px solid #f0e4e4" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f0e4e4" }}>
          <p className="text-sm font-black text-gray-900">Select Profile Picture</p>
          <button type="button" onClick={onClose}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 text-xs transition-all"
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#9ca3af"; }}
            aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div className="p-6">
          <label className="text-[10px] font-black uppercase tracking-widest block mb-2" style={{ color: MAROON }}>
            Picture Options
          </label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-white text-gray-800 outline-none mb-5"
            style={{ fontFamily: FONT }} defaultValue="upload">
            <option value="upload">Upload a Picture</option>
          </select>

          {/* Preview area */}
          <div className="border border-gray-100 rounded-xl bg-gray-50 h-56 flex items-center justify-center">
            <div className="text-center">
              <div className="w-36 h-28 mx-auto mb-3 flex items-center justify-center">
                {preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow"/>
                  : <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
                      style={{ background: "#f0e4e4", color: MAROON }}>?</div>}
              </div>
              <button type="button" onClick={() => inputRef.current?.click()}
                className="text-xs font-bold hover:underline transition-colors"
                style={{ color: MAROON }}>
                choose a picture
              </button>
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={e => accept(e.target.files?.[0])}/>
              {file && (
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Selected: <span className="text-gray-600 font-medium">{file.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: "#f0e4e4", background: "#fdf8f8" }}>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-4 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 bg-white transition-all disabled:opacity-60"
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#4b5563"; }}>
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={saving}
            className="px-4 py-1.5 text-white text-xs font-black rounded-lg transition-all disabled:opacity-60"
            style={{ background: MAROON, fontFamily: FONT }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => { return () => { if (url) URL.revokeObjectURL(url); }; }, [url]);
  return url;
}