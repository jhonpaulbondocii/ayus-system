"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Clock, Search, X, Trash2, RefreshCw } from "lucide-react";
import { loadHistory, saveHistory, timeAgo, type HistoryItem } from "@/components/layout/history-panel";

// ─── Design tokens ────────────────────────────────────────────────────────────
const MAROON = "#7B1113";
const FONT   = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  dashboard:    { label: "Dashboard",    color: "#374151", bg: "#F9FAFB" },
  course:       { label: "Course",       color: "#7B1113", bg: "#FEF5F5" },
  assignment:   { label: "Assignment",   color: "#0369A1", bg: "#EFF8FF" },
  quiz:         { label: "Quiz",         color: "#6D28D9", bg: "#F5F3FF" },
  announcement: { label: "Announcement", color: "#B45309", bg: "#FFFBEB" },
  discussion:   { label: "Discussion",   color: "#0891B2", bg: "#ECFEFF" },
  people:       { label: "People",       color: "#BE185D", bg: "#FDF2F8" },
  calendar:     { label: "Calendar",     color: "#15803D", bg: "#F0FDF4" },
  inbox:        { label: "Inbox",        color: "#7B1113", bg: "#FEF5F5" },
  grades:       { label: "Grades",       color: "#15803D", bg: "#F0FDF4" },
  settings:     { label: "Settings",     color: "#6B7280", bg: "#F9FAFB" },
  module:       { label: "Module",       color: "#7C3AED", bg: "#F5F3FF" },
  file:         { label: "File",         color: "#92400E", bg: "#FFFBEB" },
  page:         { label: "Page",         color: "#374151", bg: "#F9FAFB" },
  group:        { label: "Group",        color: "#1D4ED8", bg: "#EFF6FF" },
  form:         { label: "Form",         color: "#0E7490", bg: "#ECFEFF" },
};

function getTypeCfg(type: string) {
  return TYPE_CFG[type] ?? { label: "Page", color: "#374151", bg: "#F9FAFB" };
}

// ─── Group by day ─────────────────────────────────────────────────────────────
function groupByDay(entries: HistoryItem[]): { label: string; items: HistoryItem[] }[] {
  const groups: Record<string, HistoryItem[]> = {};
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yest  = today - 86400000;

  for (const e of entries) {
    const d   = new Date(e.time);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    let label: string;
    if (day === today)     label = "Today";
    else if (day === yest) label = "Yesterday";
    else                   label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(e);
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

// ─── History Row ──────────────────────────────────────────────────────────────
function HistoryRow({ entry, onRemove }: { entry: HistoryItem; onRemove: (id: string) => void }) {
  const [hov, setHov] = useState(false);
  const cfg = getTypeCfg(entry.type);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          12,
        padding:      "9px 20px",
        background:   hov ? "#FEF5F5" : "transparent",
        transition:   "background 0.1s",
        borderBottom: "1px solid #F5F5F5",
        position:     "relative",
      }}
    >
      {/* Type badge icon */}
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: cfg.bg,
        border: `1.5px solid ${cfg.color}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {entry.courseColor && (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: entry.courseColor }} />
        )}
        {!entry.courseColor && (
          <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            {cfg.label.slice(0, 2)}
          </span>
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link href={entry.href} style={{
          fontSize: 13, fontWeight: 500,
          color: hov ? MAROON : "#1C1C1C",
          textDecoration: "none",
          display: "block",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          lineHeight: 1.4, transition: "color 0.1s",
        }}>
          {entry.title}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
          {entry.subtitle && (
            <span style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entry.subtitle}
            </span>
          )}
          {entry.subtitle && (
            <span style={{ fontSize: 11, color: "#CCC", flexShrink: 0 }}>·</span>
          )}
          <span style={{ fontSize: 11, color: "#BBB", flexShrink: 0 }}>{timeAgo(entry.time)}</span>
        </div>
      </div>

      {/* Type label + remove */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {hov && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
            background: cfg.bg, color: cfg.color,
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            {cfg.label}
          </span>
        )}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(entry.id); }}
          title="Remove from history"
          style={{
            width: 22, height: 22, borderRadius: 6, border: "none",
            background: hov ? "#F5E6E6" : "transparent",
            color: hov ? MAROON : "transparent",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.12s", flexShrink: 0,
          }}
        >
          <X size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── Kind Filter Chips ────────────────────────────────────────────────────────
function KindFilterBar({
  entries,
  activeType,
  onTypeChange,
}: {
  entries: HistoryItem[];
  activeType: string | null;
  onTypeChange: (t: string | null) => void;
}) {
  const typeCounts: Record<string, number> = {};
  for (const e of entries) {
    typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
  }

  const presentTypes = Object.entries(typeCounts)
    .filter(([, count]) => count > 0)
    .map(([type]) => type);

  if (presentTypes.length <= 1) return <div style={{ height: 8 }} />;

  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
      <button
        onClick={() => onTypeChange(null)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 11, fontWeight: 600,
          padding: "4px 10px", borderRadius: 20,
          border: `1px solid ${!activeType ? MAROON : "#E5E7EB"}`,
          background: !activeType ? "#FEF5F5" : "#fff",
          color: !activeType ? MAROON : "#888",
          cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.1s",
        }}
      >
        All
      </button>
      {presentTypes.map(type => {
        const cfg    = getTypeCfg(type);
        const active = activeType === type;
        return (
          <button key={type}
            onClick={() => onTypeChange(active ? null : type)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11, fontWeight: 600,
              padding: "4px 10px", borderRadius: 20,
              border: `1px solid ${active ? cfg.color : "#E5E7EB"}`,
              background: active ? cfg.bg : "#fff",
              color: active ? cfg.color : "#888",
              cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.1s",
            }}
          >
            {cfg.label}
            <span style={{
              fontSize: 10, fontWeight: 800,
              background: active ? cfg.color + "20" : "#F3F4F6",
              color: active ? cfg.color : "#9CA3AF",
              borderRadius: 20, padding: "0 4px", minWidth: 16, textAlign: "center",
            }}>
              {typeCounts[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  // ✅ Fix: lazy initializer runs once on mount, avoids setState-in-effect lint error
  const [entries, setEntries] = useState<HistoryItem[]>(() => {
    if (typeof window === "undefined") return [];
    return loadHistory();
  });
  const [search,     setSearch]     = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);

  // ✅ "use client" guarantees this only runs in the browser — no SSR,
  //    so window is always defined and we never need a loading state at all.
  const loading = false;

  // Listen for new entries tracked in real-time
  useEffect(() => {
    const handler = () => {
      setTimeout(() => setEntries(loadHistory()), 150);
    };
    window.addEventListener("history:meta", handler);
    return () => window.removeEventListener("history:meta", handler);
  }, []);

  const removeEntry = useCallback((id: string) => {
    const updated = entries.filter(e => e.id !== id);
    saveHistory(updated);
    setEntries(updated);
  }, [entries]);

  const clearAll = useCallback(() => {
    if (confirm("Clear all history? This cannot be undone.")) {
      saveHistory([]);
      setEntries([]);
    }
  }, []);

  // Filter by search + type
  const filtered = entries.filter(e => {
    const matchesType   = !activeType || e.type === activeType;
    const matchesSearch = !search.trim() ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      (e.subtitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
      getTypeCfg(e.type).label.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  const groups = groupByDay(filtered);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
        .hist-scroll::-webkit-scrollbar { width: 3px; }
        .hist-scroll::-webkit-scrollbar-thumb { background: #E8CECE; border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .hist-entry { animation: fadeUp 0.18s ease both; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F9F7F6", fontFamily: FONT }}>

        {/* ── Page header ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "20px 32px 0" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: MAROON, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={16} color="#fff" />
                </div>
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1C1C1C", margin: 0, lineHeight: 1 }}>Recent History</h1>
                  <p style={{ fontSize: 11, color: "#AAA", margin: 0, marginTop: 2 }}>
                    Pages you&apos;ve visited recently · {entries.length} item{entries.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {entries.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, color: "#888",
                    border: "1px solid #E5E7EB", borderRadius: 8, padding: "6px 12px",
                    background: "#fff", cursor: "pointer", transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.color = "#888"; }}
                >
                  <Trash2 size={12} /> Clear All
                </button>
              )}
            </div>

            {/* Search */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#F5F5F4", border: "1px solid #E8E8E8", borderRadius: 10,
                padding: "0 12px", height: 38, marginBottom: 16, transition: "all 0.14s",
              }}
              onFocusCapture={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = MAROON; }}
              onBlurCapture={e => { e.currentTarget.style.background = "#F5F5F4"; e.currentTarget.style.borderColor = "#E8E8E8"; }}
            >
              <Search size={14} style={{ color: "#AAA", flexShrink: 0 }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search history…"
                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, fontFamily: FONT, color: "#1C1C1C" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#AAA", display: "flex", padding: 0 }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Type filter chips */}
            <KindFilterBar entries={entries} activeType={activeType} onTypeChange={setActiveType} />
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 32px 48px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
              <RefreshCw size={20} style={{ color: "#CCC", animation: "spin 1s linear infinite" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 12, animation: "fadeUp 0.25s ease" }}>
              <Clock size={40} style={{ color: "#DDD" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#888", margin: 0 }}>
                {search || activeType ? "No results found" : "No history yet"}
              </p>
              <p style={{ fontSize: 12, color: "#BBB", margin: 0 }}>
                {search || activeType ? "Try clearing your filters" : "Pages you visit will appear here"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {groups.map(({ label, items }) => (
                <div key={label}>
                  {/* Day header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, padding: "0 4px" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                      {label}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "#EBEBEB" }} />
                    <span style={{ fontSize: 10, color: "#BBB", whiteSpace: "nowrap" }}>
                      {items.length} page{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Entries card */}
                  <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #EBEBEB", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    {items.map((entry, idx) => (
                      <div key={entry.id} className="hist-entry" style={{ animationDelay: `${idx * 0.03}s` }}>
                        <HistoryRow entry={entry} onRemove={removeEntry} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <p style={{ fontSize: 11, color: "#CCC", textAlign: "center", margin: 0 }}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                {(search || activeType) && " · filtered"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}