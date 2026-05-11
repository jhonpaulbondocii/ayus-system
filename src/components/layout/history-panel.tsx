"use client";

import { useState, createContext, useContext, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────
export interface HistoryItem {
  id:          string;
  title:       string;
  subtitle:    string;
  href:        string;
  type:        string;
  time:        number;
  courseColor?: string | null;
}

export interface HistoryMetaEvent {
  title:        string;
  subtitle?:    string;
  type?:        string;
  courseColor?: string | null;
}

// ── Context ────────────────────────────────────────────────────────────────
interface HistoryContextType {
  isOpen:     boolean;
  isActive:   boolean;
  open:       () => void;
  close:      () => void;
  closePanel: () => void;
}

const HistoryContext = createContext<HistoryContextType>({
  isOpen: false, isActive: false,
  open: () => {}, close: () => {}, closePanel: () => {},
});

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [isActive, setIsActive] = useState(false);

  const open       = () => { setIsOpen(true);  setIsActive(true);  };
  const close      = () => { setIsOpen(false); setIsActive(false); };
  const closePanel = () => { setIsOpen(false); };

  return (
    <HistoryContext.Provider value={{ isOpen, isActive, open, close, closePanel }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() { return useContext(HistoryContext); }

// ── Public helper — call from any page to push richer metadata ─────────────
export function pushHistoryMeta(meta: HistoryMetaEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("history:meta", { detail: meta }));
}

// ── Storage helpers ────────────────────────────────────────────────────────
const STORAGE_KEY = "canvas_history";
const MAX_ITEMS   = 30;

export function loadHistory(): HistoryItem[] {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

export function saveHistory(items: HistoryItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

// ── Route → default metadata ───────────────────────────────────────────────
function routeToLabel(p: string): { title: string; subtitle: string; type: string } {
  if (p === "/" || p === "/dashboard") return { title: "Dashboard",      subtitle: "Home",        type: "dashboard" };
  if (p.startsWith("/calendar"))       return { title: "Calendar",       subtitle: "Schedule",    type: "calendar"  };
  if (p.startsWith("/inbox"))          return { title: "Inbox",          subtitle: "Messages",    type: "inbox"     };
  if (p.startsWith("/history"))        return { title: "Recent History", subtitle: "Activity",    type: "page"      };
  if (p.startsWith("/grades"))         return { title: "Grades",         subtitle: "All Courses", type: "grades"    };
  if (p.startsWith("/files"))          return { title: "Files",          subtitle: "My Files",    type: "file"      };
  if (p.startsWith("/profile"))        return { title: "Profile",        subtitle: "Account",     type: "page"      };
  if (p.startsWith("/settings"))       return { title: "Settings",       subtitle: "Account",     type: "settings"  };
  if (p.startsWith("/notifications"))  return { title: "Notifications",  subtitle: "Account",     type: "page"      };

  if (p.startsWith("/groups")) {
    const parts = p.split("/").filter(Boolean);
    if (parts.length >= 2) return { title: "Group",  subtitle: "Groups",    type: "group" };
    return                        { title: "Groups", subtitle: "My Groups", type: "group" };
  }

  if (p.startsWith("/courses")) {
    const parts = p.split("/").filter(Boolean);
    if (parts.length >= 3) {
      const sectionMap: Record<string, { title: string; type: string }> = {
        assignments:   { title: "Assignments",    type: "assignment"   },
        quizzes:       { title: "Quizzes",         type: "quiz"         },
        announcements: { title: "Announcements",   type: "announcement" },
        discussions:   { title: "Discussions",     type: "discussion"   },
        people:        { title: "People",          type: "people"       },
        grades:        { title: "Grades",          type: "grades"       },
        modules:       { title: "Modules",         type: "module"       },
        files:         { title: "Files",           type: "file"         },
        pages:         { title: "Pages",           type: "page"         },
        forms:         { title: "Forms",           type: "form"         },
        settings:      { title: "Course Settings", type: "settings"     },
      };
      const mapped = sectionMap[parts[2]];
      if (mapped) return { title: mapped.title, subtitle: "Course", type: mapped.type };
      return { title: "Course Page", subtitle: "Course", type: "course" };
    }
    if (parts.length === 2) return { title: "Course",  subtitle: "Courses",     type: "course" };
    return                        { title: "Courses", subtitle: "All Courses", type: "course" };
  }

  return { title: p, subtitle: "", type: "page" };
}

// ── Time ago ───────────────────────────────────────────────────────────────
export function timeAgo(ts: number): string {
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Tracker — mounted in MainLayout ───────────────────────────────────────
export function HistoryTracker() {
  const pathname = usePathname();

  const recordEntry = useCallback((href: string, overrideMeta?: HistoryMetaEvent) => {
    const base = routeToLabel(href);
    const item: HistoryItem = {
      id:          `${href}-${Date.now()}`,
      title:       overrideMeta?.title       ?? base.title,
      subtitle:    overrideMeta?.subtitle    ?? base.subtitle,
      type:        overrideMeta?.type        ?? base.type,
      courseColor: overrideMeta?.courseColor ?? null,
      href,
      time: Date.now(),
    };
    const existing = loadHistory().filter(h => h.href !== href);
    saveHistory([item, ...existing].slice(0, MAX_ITEMS));
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;
    if (pathname === "/login" || pathname === "/Login" || pathname === "/register") return;

    const handleMeta = (e: Event) => {
      const meta = (e as CustomEvent<HistoryMetaEvent>).detail;
      recordEntry(pathname, meta);
    };

    window.addEventListener("history:meta", handleMeta);
    recordEntry(pathname);

    return () => {
      window.removeEventListener("history:meta", handleMeta);
    };
  }, [pathname, recordEntry]);

  return null;
}

// ── Icons ──────────────────────────────────────────────────────────────────
function ItemIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5 shrink-0 mt-0.5";
  if (type === "dashboard") return (
    <svg className={cls} style={{ color: "#374151" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
  if (type === "inbox") return (
    <svg className={cls} style={{ color: "#7B1113" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  );
  if (type === "calendar") return (
    <svg className={cls} style={{ color: "#15803D" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
    </svg>
  );
  if (type === "course") return (
    <svg className={cls} style={{ color: "#7B1113" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
    </svg>
  );
  if (type === "assignment") return (
    <svg className={cls} style={{ color: "#0369A1" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
    </svg>
  );
  if (type === "quiz") return (
    <svg className={cls} style={{ color: "#6D28D9" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  );
  if (type === "announcement") return (
    <svg className={cls} style={{ color: "#B45309" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
    </svg>
  );
  if (type === "discussion") return (
    <svg className={cls} style={{ color: "#0891B2" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
    </svg>
  );
  if (type === "people") return (
    <svg className={cls} style={{ color: "#BE185D" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  );
  if (type === "grades") return (
    <svg className={cls} style={{ color: "#15803D" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
    </svg>
  );
  if (type === "group") return (
    <svg className={cls} style={{ color: "#1D4ED8" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
    </svg>
  );
  if (type === "form") return (
    <svg className={cls} style={{ color: "#0E7490" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/>
    </svg>
  );
  if (type === "settings") return (
    <svg className={cls} style={{ color: "#6B7280" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
  return (
    <svg className={cls} style={{ color: "#6B7280" }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────
export default function HistoryPanel() {
  const { isOpen, isActive, close, closePanel } = useHistory();
  const [items, setItems]       = useState<HistoryItem[]>([]);
  const [tick,  setTick]        = useState(0);
  const [, startTransition]     = useTransition();

  // FIX: wrap all setState calls in startTransition to avoid sync setState in effect
  useEffect(() => {
    if (!isActive) return;
    const loaded = loadHistory();
    startTransition(() => setItems(loaded));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, tick]);

  // Refresh time labels every minute
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  // Real-time update kapag may bagong na-track
  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        const loaded = loadHistory();
        startTransition(() => setItems(loaded));
      }, 100);
    };
    window.addEventListener("history:meta", handler);
    return () => window.removeEventListener("history:meta", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    saveHistory(updated);
    startTransition(() => setItems(updated));
  };

  const clearHistory = () => {
    saveHistory([]);
    startTransition(() => setItems([]));
  };

  if (!isActive) return null;

  return (
    <>
      {isOpen && (
        // FIX: z-110 (canonical Tailwind class, not z-[110])
        <div className="fixed top-0 bottom-0 left-16 w-64 bg-white border-r border-gray-200 shadow-xl z-110 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "#7B1113" }}>
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="text-sm font-semibold text-gray-800">Recent History</h1>
            </div>
            <button onClick={close}
              className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xs">
              ✕
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 px-5">
                <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round"/>
                </svg>
                <p className="text-xs text-gray-400 text-center">
                  No history yet. Pages you visit will appear here.
                </p>
              </div>
            ) : (
              items.map(item => (
                <div key={item.id}
                  className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0">
                  <div className="mt-0.5 relative shrink-0">
                    <ItemIcon type={item.type} />
                    {item.courseColor && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white"
                        style={{ background: item.courseColor }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={item.href} onClick={closePanel}
                      className="text-xs font-medium leading-snug truncate block hover:underline"
                      style={{ color: "#0770a2" }}>
                      {item.title}
                    </Link>
                    {item.subtitle && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.subtitle}</p>
                    )}
                    <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(item.time)}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    title="Remove"
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 shrink-0 flex items-center justify-between">
              <span className="text-[11px] text-gray-300">
                {items.length} page{items.length !== 1 ? "s" : ""}
              </span>
              <button onClick={clearHistory}
                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}