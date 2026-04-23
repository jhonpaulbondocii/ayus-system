"use client";

import { useState, createContext, useContext, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

// ── Types ──────────────────────────────────────────────────────────────────
interface HistoryItem {
  id:       string;
  title:    string;
  subtitle: string;
  href:     string;
  type:     string;
  time:     number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function routeToLabel(p: string): { title: string; subtitle: string; type: string } {
  if (p.startsWith("/dashboard"))     return { title: "Dashboard",     subtitle: "Home",      type: "page"     };
  if (p.startsWith("/calendar"))      return { title: "Calendar",      subtitle: "Schedule",  type: "calendar" };
  if (p.startsWith("/inbox"))         return { title: "Inbox",         subtitle: "Messages",  type: "inbox"    };
  if (p.startsWith("/groups"))        return { title: "Groups",        subtitle: "My Groups", type: "group"    };
  if (p.startsWith("/courses"))       return { title: "Courses",       subtitle: "Courses",   type: "course"   };
  if (p.startsWith("/files"))         return { title: "Files",         subtitle: "My Files",  type: "file"     };
  if (p.startsWith("/profile"))       return { title: "Profile",       subtitle: "Account",   type: "page"     };
  if (p.startsWith("/settings"))      return { title: "Settings",      subtitle: "Account",   type: "page"     };
  if (p.startsWith("/notifications")) return { title: "Notifications", subtitle: "Account",   type: "page"     };
  return { title: p, subtitle: "", type: "page" };
}

function timeAgo(ts: number): string {
  const diff  = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const STORAGE_KEY = "canvas_history";
const MAX_ITEMS   = 20;

function loadHistory(): HistoryItem[] {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}

function saveHistory(items: HistoryItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

// ── Tracker ────────────────────────────────────────────────────────────────
export function HistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;
    if (pathname === "/Login" || pathname === "/register") return;

    const { title, subtitle, type } = routeToLabel(pathname);
    const item: HistoryItem = {
      id:    `${pathname}-${Date.now()}`,
      title, subtitle,
      href:  pathname,
      type,
      time:  Date.now(),
    };

    const existing = loadHistory().filter(h => h.href !== pathname);
    saveHistory([item, ...existing].slice(0, MAX_ITEMS));
  }, [pathname]);

  return null;
}

// ── Icons ──────────────────────────────────────────────────────────────────
function ItemIcon({ type }: { type: string }) {
  if (type === "inbox") return (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
    </svg>
  );
  if (type === "calendar") return (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
    </svg>
  );
  if (type === "group" || type === "course") return (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>
  );
  return (
    <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round"/>
    </svg>
  );
}

// ── Panel ──────────────────────────────────────────────────────────────────
export default function HistoryPanel() {
  const { isOpen, isActive, close, closePanel } = useHistory();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [tick,  setTick]  = useState(0);

  // FIX: use a ref to trigger refresh without calling setState directly in effect
  const shouldRefresh = isActive;

  useEffect(() => {
    if (!shouldRefresh) return;
    const loaded = loadHistory();
    setItems(loaded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRefresh, tick]);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const clearHistory = () => { saveHistory([]); setItems([]); };

  if (!isActive) return null;

  return (
    <>
      {isOpen && (
        // FIX: left-16 instead of left-[64px], z-110 instead of z-[110]
        <div className="fixed top-0 bottom-0 left-16 w-64 bg-white border-r border-gray-200 shadow-xl z-110 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
            <h1 className="text-base font-semibold text-gray-800">Recent History</h1>
            <button onClick={close}
              className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-400 hover:bg-gray-100 text-xs">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-3">
            {items.length === 0 ? (
              <p className="text-xs text-gray-400 px-5 py-4">No history yet.</p>
            ) : (
              items.map(item => (
                <Link key={item.id} href={item.href} onClick={closePanel}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors group">
                  <ItemIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#0770a2] group-hover:underline font-medium leading-snug truncate">
                      {item.title}
                    </p>
                    {item.subtitle && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{item.subtitle}</p>
                    )}
                    <p className="text-[11px] text-gray-300 mt-0.5">{timeAgo(item.time)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-3 shrink-0">
              <button onClick={clearHistory}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Clear history
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}