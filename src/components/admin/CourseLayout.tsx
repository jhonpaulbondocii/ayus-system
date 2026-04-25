"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";

interface Props {
  courseId:    string;
  courseName?: string;
  activeItem:  string;
  subItem?:    string;
  children:    React.ReactNode;
}

interface Repository {
  id: string;
  name: string;
  assignment: { title: string; status: string };
  _count: { files: number };
}

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// Files removed from nav
const NAV_ITEMS = [
  { label: "Home",          href: (id: string) => `/admin/courses/${id}/home`          },
  { label: "Announcements", href: (id: string) => `/admin/courses/${id}/announcements` },
  { label: "Assignments",   href: (id: string) => `/admin/courses/${id}/assignments`   },
  { label: "Repositories",  href: (id: string) => `/admin/courses/${id}/repositories`  },
  { label: "Grades",        href: (id: string) => `/admin/courses/${id}/grades`        },
  { label: "People",        href: (id: string) => `/admin/courses/${id}/people`        },
  { label: "Quizzes",       href: (id: string) => `/admin/courses/${id}/quizzes`       },
  { label: "Settings",      href: (id: string) => `/admin/courses/${id}/settings`      },
];

export default function CourseLayout({
  courseId, courseName: propName, activeItem, subItem, children,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [fetchedName,  setFetchedName]  = useState("");
  const [repoOpen,     setRepoOpen]     = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repoLoading,  setRepoLoading]  = useState(false);
  const [repoFetched,  setRepoFetched]  = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile nav on outside click
  useEffect(() => {
    if (!mobileNavOpen) return;
    const handler = (e: MouseEvent) => {
      if (mobileDrawerRef.current && !mobileDrawerRef.current.contains(e.target as Node)) {
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileNavOpen]);

  // Fetch course name
  useEffect(() => {
    if (propName || !courseId) return;
    fetch(`/api/admin/courses/${courseId}`)
      .then(r => r.json())
      .then(d => { if (d.course?.name) setFetchedName(d.course.name); })
      .catch(() => {});
  }, [courseId, propName]);

  // Auto-open repos if on a repo page
  useEffect(() => {
    if (pathname?.includes("/repositories")) {
      setRepoOpen(true);
      if (!repoFetched) {
        fetch(`/api/admin/courses/${courseId}/repositories`)
          .then(r => r.json())
          .then(d => { setRepositories(d.repositories ?? []); setRepoFetched(true); })
          .catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleRepoToggle = () => {
    const next = !repoOpen;
    setRepoOpen(next);
    if (next && !repoFetched) {
      setRepoLoading(true);
      fetch(`/api/admin/courses/${courseId}/repositories`)
        .then(r => r.json())
        .then(d => { setRepositories(d.repositories ?? []); setRepoLoading(false); setRepoFetched(true); })
        .catch(() => setRepoLoading(false));
    }
  };

  const courseName   = propName || fetchedName || "";
  const activeRepoId = pathname?.match(/\/repositories\/([^/]+)/)?.[1];
  const isRepoSection = activeItem === "Repositories";

  const navigate = (href: string) => {
    router.push(href);
    setMobileNavOpen(false);
  };

  /* ── Nav item renderer (shared between desktop sidebar & mobile drawer) ── */
  const renderNavItems = () => NAV_ITEMS.map(item => {
    const isActive = item.label === activeItem;

    // Repositories — expandable
    if (item.label === "Repositories") {
      return (
        <div key="Repositories">
          <div className={`flex items-center rounded transition-colors
            ${isRepoSection && !activeRepoId
              ? "bg-[#fdf8f8] border-l-[3px] border-[#7b1113] rounded-none"
              : isRepoSection
              ? "border-l-[3px] border-[#f0e4e4] rounded-none"
              : ""}`}>
            <button type="button"
              onClick={() => navigate(item.href(courseId))}
              className={`flex-1 text-left text-sm px-3 py-2 flex items-center gap-1.5 transition-colors
                ${isRepoSection
                  ? "text-gray-900 font-semibold"
                  : "text-[#7b1113] hover:bg-[#fdf8f8] rounded"}`}>
              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
              </svg>
              Repositories
            </button>
            <button type="button" onClick={handleRepoToggle}
              className="pr-2.5 py-2 text-gray-400 hover:text-[#7b1113] transition-colors shrink-0">
              {repoOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
            </button>
          </div>

          {repoOpen && (
            <div className="ml-3 mt-0.5 border-l-2 border-[#f0e4e4] pl-2 pb-1 space-y-0.5">
              {repoLoading ? (
                <p className="px-2 py-1.5 text-[11px] text-gray-400 animate-pulse">Loading...</p>
              ) : repositories.length === 0 ? (
                <p className="px-2 py-1.5 text-[11px] text-gray-400 italic">No repositories yet</p>
              ) : repositories.map(repo => {
                const active = activeRepoId === repo.id;
                return (
                  <button key={repo.id} type="button"
                    onClick={() => navigate(`/admin/courses/${courseId}/repositories/${repo.id}`)}
                    className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-1.5 transition-colors group
                      ${active
                        ? "bg-[#fef2f2] text-[#7b1113] font-bold"
                        : "text-gray-600 hover:bg-[#fdf8f8] hover:text-[#7b1113]"}`}>
                    <svg className={`w-3 h-3 shrink-0 transition-colors
                      ${active ? "text-[#7b1113]" : "text-gray-300 group-hover:text-[#7b1113]"}`}
                      viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                    </svg>
                    <span className="truncate flex-1">{repo.name}</span>
                    {repo._count.files > 0 && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0
                        ${active
                          ? "bg-[#fef2f2] text-[#7b1113]"
                          : "bg-gray-100 text-gray-400 group-hover:bg-[#fef2f2] group-hover:text-[#7b1113]"}`}>
                        {repo._count.files}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // Regular nav item
    return (
      <button key={item.label} type="button"
        onClick={() => navigate(item.href(courseId))}
        className={`w-full text-left text-sm px-3 py-2 rounded transition-colors
          ${isActive
            ? "text-gray-900 font-semibold bg-[#fdf8f8] border-l-[3px] border-[#7b1113] rounded-none"
            : "text-[#7b1113] hover:bg-[#fdf8f8]"}`}>
        {item.label}
      </button>
    );
  });

  /* ── Mobile horizontal tab bar ──────────────────────────────────────────── */
  const MobileTabBar = () => (
    <div style={{
      display: "flex", alignItems: "center",
      borderBottom: "1px solid #e5e7eb",
      background: "#fff", flexShrink: 0,
      overflow: "hidden",
    }}>
      {/* Hamburger to open full drawer */}
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        style={{
          padding: "10px 14px", background: "none", border: "none",
          borderRight: "1px solid #f0e4e4", cursor: "pointer", flexShrink: 0,
          color: MAROON, display: "flex", alignItems: "center",
        }}
      >
        <Menu size={18} />
      </button>

      {/* Scrollable tabs */}
      <div style={{
        display: "flex", alignItems: "center", overflowX: "auto", flex: 1,
        scrollbarWidth: "none", msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        <style>{`.mobile-tabs::-webkit-scrollbar { display: none; }`}</style>
        <div className="mobile-tabs" style={{ display: "flex", alignItems: "center", gap: 0, minWidth: "max-content", padding: "0 4px" }}>
          {NAV_ITEMS.map(item => {
            const isActive = item.label === activeItem;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.href(courseId))}
                style={{
                  padding: "10px 14px", background: "none", border: "none",
                  borderBottom: isActive ? `2px solid ${MAROON}` : "2px solid transparent",
                  cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? MAROON : "#6b7280",
                  transition: "all .15s",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  /* ── Mobile drawer (slide-in from left) ─────────────────────────────────── */
  const MobileDrawer = () => (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.3)", backdropFilter: "blur(1px)",
        }}
        onClick={() => setMobileNavOpen(false)}
      />
      {/* Drawer */}
      <div
        ref={mobileDrawerRef}
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 401,
          width: 240, background: "#fff",
          boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
          display: "flex", flexDirection: "column",
          fontFamily: FONT,
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderBottom: "1px solid #f0e4e4",
          background: MAROON,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {courseName || "Course Menu"}
          </span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.8)", display: "flex", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {renderNavItems()}
          </nav>
        </div>
      </div>
    </>
  );

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full bg-white overflow-hidden">

      {/* ── Desktop sidebar ── */}
      {!isMobile && sidebarOpen && (
        <div className="w-52 border-r border-gray-200 shrink-0 py-3 overflow-y-auto">
          <nav className="space-y-0.5 px-2">
            {renderNavItems()}
          </nav>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Breadcrumb (desktop) / Tab bar (mobile) ── */}
        {isMobile ? (
          <MobileTabBar />
        ) : (
          <div className="h-11 border-b border-gray-200 flex items-center px-5 shrink-0 gap-2">
            <button type="button" onClick={() => setSidebarOpen(o => !o)}
              className="text-gray-500 hover:text-gray-700 mr-1 text-base leading-none">
              ☰
            </button>
            <button type="button"
              onClick={() => router.push(`/admin/courses/${courseId}/home`)}
              className="text-sm font-semibold text-[#7b1113] hover:underline transition-colors">
              {courseName || "..."}
            </button>
            <span className="text-gray-300 text-sm">›</span>
            <button type="button"
              onClick={() => router.push(NAV_ITEMS.find(i => i.label === activeItem)?.href(courseId) ?? `/admin/courses/${courseId}/home`)}
              className={`text-sm transition-colors hover:underline ${subItem ? "text-[#7b1113] font-semibold" : "text-gray-500"}`}>
              {activeItem}
            </button>
            {subItem && (
              <>
                <span className="text-gray-300 text-sm">›</span>
                <span className="text-sm text-gray-700">{subItem}</span>
              </>
            )}
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {isMobile && mobileNavOpen && <MobileDrawer />}
    </div>
  );
}