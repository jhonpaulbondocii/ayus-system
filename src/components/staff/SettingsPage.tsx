"use client";

// src/components/staff/SettingsPage.tsx

import { useMemo, useState } from "react";
import AccountSidebar from "@/components/layout/AccountSidebar";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

type FeatureKey =
  | "autoClosedCaptions" | "autodetectFieldSeparators" | "courseSetupTutorial"
  | "disableAlertNotificationTimeouts" | "disableCollaborationAnimations" | "disableKeyboardShortcuts"
  | "highContrastUI" | "includeByteOrderMark" | "microsoftImmersiveReader"
  | "openToDoInNewTab" | "underlineLinks" | "useDyslexiaFriendlyFont" | "useSemicolonsToSeparateFields";

type Feature = { key: FeatureKey; label: string };

const FEATURES: Feature[] = [
  { key: "autoClosedCaptions",               label: "Auto Show Closed Captions" },
  { key: "autodetectFieldSeparators",        label: "Autodetect field separators in compatible spreadsheet exports" },
  { key: "courseSetupTutorial",              label: "Course Set-up Tutorial" },
  { key: "disableAlertNotificationTimeouts", label: "Disable Alert Notification Timeouts" },
  { key: "disableCollaborationAnimations",   label: "Disable Collaboration Animations" },
  { key: "disableKeyboardShortcuts",         label: "Disable Keyboard Shortcuts" },
  { key: "highContrastUI",                   label: "High Contrast UI" },
  { key: "includeByteOrderMark",             label: "Include Byte-Order Mark in compatible spreadsheet exports" },
  { key: "microsoftImmersiveReader",         label: "Microsoft Immersive Reader" },
  { key: "openToDoInNewTab",                 label: "Open to-do items in a new tab" },
  { key: "underlineLinks",                   label: "Underline Links" },
  { key: "useDyslexiaFriendlyFont",          label: "Use a dyslexia friendly font" },
  { key: "useSemicolonsToSeparateFields",    label: "Use semicolons to separate fields in compatible spreadsheet exports" },
];

type FeatureState = Record<FeatureKey, boolean>;

const DEFAULT_FEATURES: FeatureState = {
  autoClosedCaptions: false, autodetectFieldSeparators: false, courseSetupTutorial: false,
  disableAlertNotificationTimeouts: false, disableCollaborationAnimations: false, disableKeyboardShortcuts: false,
  highContrastUI: false, includeByteOrderMark: false, microsoftImmersiveReader: false,
  openToDoInNewTab: true, underlineLinks: false, useDyslexiaFriendlyFont: false, useSemicolonsToSeparateFields: false,
};

const STORAGE_KEY = "canvas_settings_features";

function loadFeatures(): FeatureState {
  if (typeof window === "undefined") return DEFAULT_FEATURES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_FEATURES, ...(JSON.parse(raw) as Partial<FeatureState>) } : DEFAULT_FEATURES;
  } catch { return DEFAULT_FEATURES; }
}

export default function SettingsPage() {
  const [features, setFeatures] = useState<FeatureState>(() => loadFeatures());
  const [filter,   setFilter]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? FEATURES.filter(f => f.label.toLowerCase().includes(q)) : FEATURES;
  }, [filter]);

  const toggle = (key: FeatureKey) => {
    setFeatures(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = MAROON;
    e.currentTarget.style.boxShadow = `0 0 0 2px ${MAROON}18`;
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#e5e7eb";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className="flex h-full" style={{ fontFamily: FONT }}>
      <AccountSidebar />

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Breadcrumb */}
        <p className="text-[11px] text-gray-400 mb-4 font-medium">
          Account <span className="mx-1">›</span> Settings
        </p>

        <h1 className="text-base font-black text-gray-900 mb-1">Settings</h1>
        <p className="text-xs text-gray-400 mb-6">Manage integrations and feature options.</p>

        {/* ── Web Services ── */}
        <section className="mb-7">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>Web Services</p>
          <p className="text-xs text-gray-500 mb-3">Canvas can make your life a lot easier by integrating with the web tools you already use.</p>

          <div className="rounded-xl overflow-hidden border mb-3" style={{ borderColor: "#f0e4e4" }}>
            <div className="px-5 py-3 border-b" style={{ background: "#fdf8f8", borderColor: "#f0e4e4" }}>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" style={{ accentColor: MAROON }} />
                Let fellow course/group members see which services I&apos;ve linked to my profile
              </label>
            </div>
            <div className="px-5 py-4 bg-white">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: MAROON }}>Registered Services</p>
              <p className="text-xs text-gray-400">No Registered Services</p>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#f0e4e4" }}>
            <div className="px-5 py-3 border-b" style={{ background: "#fdf8f8", borderColor: "#f0e4e4" }}>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Other Services</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Click any service below to register:</p>
            </div>
            <div className="px-5 py-4 bg-white">
              <button className="inline-flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; }}>
                <span className="w-4 h-4 rounded bg-yellow-400 inline-block shrink-0" />
                Google Drive
              </button>
            </div>
          </div>
        </section>

        {/* ── Approved Integrations ── */}
        <section className="mb-7">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>Approved Integrations</p>
          <p className="text-xs text-gray-500 mb-3">Third party applications authorized to access the Canvas site on your behalf.</p>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#f0e4e4" }}>
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ background: "#fdf8f8", borderColor: "#f0e4e4" }}>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Apps</span>
              <button className="text-xs px-3 py-1.5 rounded-lg text-white font-black transition-all"
                style={{ background: MAROON }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                + New Access Token
              </button>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: "#f9f0f0" }}>
                    {["App", "Status", "Purpose", "Dates", "Details", "Remove"].map(h => (
                      <th key={h} className="px-5 py-2 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[{ app: "Analytics LTI App", purpose: "Analytics" }, { app: "Rollcall", purpose: "Attendance" }].map(row => (
                    <tr key={row.app} className="border-b last:border-0 hover:bg-gray-50/60 transition-colors" style={{ borderColor: "#f9f0f0" }}>
                      <td className="px-5 py-3 text-xs text-gray-800 font-medium">{row.app}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">Active</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{row.purpose}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">Last used: —</td>
                      <td className="px-5 py-3"><button className="text-xs font-semibold hover:underline" style={{ color: MAROON }}>details</button></td>
                      <td className="px-5 py-3"><button className="text-xs font-semibold hover:underline text-red-400 hover:text-red-600">remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Feature Options ── */}
        <section>
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Feature Options</p>
              <p className="text-xs text-gray-400 mt-1">Enable or disable specific features.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Search features..."
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 placeholder:text-gray-400 w-44 outline-none transition-all"
                onFocus={inputFocus}
                onBlur={inputBlur}
              />
              {filter && (
                <button onClick={() => setFilter("")}
                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-colors">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#f0e4e4" }}>
            <div className="grid grid-cols-[1fr_110px_70px] px-5 py-2.5 border-b" style={{ background: "#fdf8f8", borderColor: "#f0e4e4" }}>
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>Feature</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-center" style={{ color: MAROON }}>Status</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-right" style={{ color: MAROON }}>Toggle</span>
            </div>

            <div className="bg-white divide-y" style={{ borderColor: "#f9f0f0" }}>
              {filtered.map(f => {
                const on = features[f.key];
                return (
                  <div key={f.key} className="grid grid-cols-[1fr_110px_70px] px-5 py-3 items-center hover:bg-gray-50/60 transition-colors" style={{ borderColor: "#f9f0f0" }}>
                    <span className="text-xs text-gray-700">{f.label}</span>
                    <span className={`text-[11px] font-semibold text-center ${on ? "text-green-600" : "text-gray-400"}`}>
                      {on ? "Enabled" : "Disabled"}
                    </span>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggle(f.key)}
                        className="w-9 h-5 rounded-full transition-all relative shrink-0"
                        style={{ background: on ? MAROON : "#e5e7eb" }}
                      >
                        <span
                          className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                          style={{ transform: on ? "translateX(16px)" : "translateX(0)" }}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-5 py-10 text-center text-xs text-gray-400">No matching features.</div>
              )}
            </div>

            <div className="px-5 py-4 border-t flex justify-end" style={{ background: "#fdf8f8", borderColor: "#f0e4e4" }}>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-1.5 rounded-lg text-white text-xs font-black transition-all disabled:opacity-60"
                style={{ background: MAROON }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Settings"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}