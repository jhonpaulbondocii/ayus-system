"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu, X, ChevronLeft } from "lucide-react";

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

const NAV_ITEMS = [
  { label: "Home",          href: (id: string) => `/admin/courses/${id}/home`          },
  { label: "Announcements", href: (id: string) => `/admin/courses/${id}/announcements` },
  { label: "Assignments",   href: (id: string) => `/admin/courses/${id}/assignments`   },
  { label: "Repositories",  href: (id: string) => `/admin/courses/${id}/repositories`  },
  { label: "Grades",        href: (id: string) => `/admin/courses/${id}/grades`        },
  { label: "People",        href: (id: string) => `/admin/courses/${id}/people`        },
  { label: "Forms",         href: (id: string) => `/admin/courses/${id}/forms`         },
  { label: "Settings",      href: (id: string) => `/admin/courses/${id}/settings`      },
];

export default function CourseLayout({
  courseId, courseName: propName, activeItem, subItem, children,
}: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const [sidebarOpen,   setSidebarOpen]   = useState(true);
  const [fetchedName,   setFetchedName]   = useState("");
  const [repoOpen,      setRepoOpen]      = useState(false);
  const [repositories,  setRepositories]  = useState<Repository[]>([]);
  const [repoLoading,   setRepoLoading]   = useState(false);
  const [repoFetched,   setRepoFetched]   = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef   = useRef<HTMLDivElement>(null);

  /* ── Responsive breakpoint ── */
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (window.innerWidth < 1024 && window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── Close drawer on outside click ── */
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

  /* ── Scroll active tab into view ── */
  useEffect(() => {
    if (!isMobile || !tabsScrollRef.current) return;
    const active = tabsScrollRef.current.querySelector("[data-active='true']") as HTMLElement | null;
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [isMobile, activeItem]);

  /* ── Fetch course name ── */
  useEffect(() => {
    if (propName || !courseId) return;
    fetch(`/api/admin/courses/${courseId}`)
      .then(r => r.json())
      .then(d => { if (d.course?.name) setFetchedName(d.course.name); })
      .catch(() => {});
  }, [courseId, propName]);

  /* ── Auto-open repos when on repo page ── */
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

  const courseName    = propName || fetchedName || "";
  const activeRepoId  = pathname?.match(/\/repositories\/([^/]+)/)?.[1];
  const isRepoSection = activeItem === "Repositories";

  const navigate = (href: string) => {
    router.push(href);
    setMobileNavOpen(false);
  };

  // Derive the section-level href for the active nav item (used in breadcrumb back tap)
  const activeNavHref = NAV_ITEMS.find(i => i.label === activeItem)?.href(courseId)
    ?? `/admin/courses/${courseId}/home`;

  /* ─────────────────────────────────────────────────────────────────────────
     NAV ITEMS (shared between sidebar and mobile drawer)
  ───────────────────────────────────────────────────────────────────────── */
  const renderNavItems = () => NAV_ITEMS.map(item => {
    const isActive = item.label === activeItem;

    if (item.label === "Repositories") {
      return (
        <div key="Repositories">
          <div
            className={[
              "flex items-center rounded transition-colors",
              isRepoSection && !activeRepoId
                ? "bg-[#fdf8f8] border-l-[3px] border-[#7b1113] rounded-none"
                : isRepoSection
                ? "border-l-[3px] border-[#f0e4e4] rounded-none"
                : "",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => navigate(item.href(courseId))}
              className={[
                "flex-1 text-left text-sm px-3 py-2.5 flex items-center gap-1.5 transition-colors min-h-[40px]",
                isRepoSection
                  ? "text-gray-900 font-semibold"
                  : "text-[#7b1113] hover:bg-[#fdf8f8] rounded",
              ].join(" ")}
            >
              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
              </svg>
              Repositories
            </button>
            <button
              type="button"
              onClick={handleRepoToggle}
              className="pr-2.5 py-2.5 text-gray-400 hover:text-[#7b1113] transition-colors shrink-0 min-w-[32px] flex items-center justify-center"
            >
              {repoOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
            </button>
          </div>

          {repoOpen && (
            <div className="ml-3 mt-0.5 border-l-2 border-[#f0e4e4] pl-2 pb-1 space-y-0.5">
              {repoLoading ? (
                <p className="px-2 py-2 text-[11px] text-gray-400 animate-pulse">Loading…</p>
              ) : repositories.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-gray-400 italic">No repositories yet</p>
              ) : repositories.map(repo => {
                const active = activeRepoId === repo.id;
                return (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => navigate(`/admin/courses/${courseId}/repositories/${repo.id}`)}
                    className={[
                      "w-full text-left px-2 py-2 rounded text-[11px] flex items-center gap-1.5 transition-colors group min-h-[36px]",
                      active
                        ? "bg-[#fef2f2] text-[#7b1113] font-bold"
                        : "text-gray-600 hover:bg-[#fdf8f8] hover:text-[#7b1113]",
                    ].join(" ")}
                  >
                    <svg
                      className={["w-3 h-3 shrink-0 transition-colors", active ? "text-[#7b1113]" : "text-gray-300 group-hover:text-[#7b1113]"].join(" ")}
                      viewBox="0 0 24 24" fill="currentColor"
                    >
                      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                    </svg>
                    <span className="truncate flex-1">{repo.name}</span>
                    {repo._count.files > 0 && (
                      <span className={[
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                        active
                          ? "bg-[#fef2f2] text-[#7b1113]"
                          : "bg-gray-100 text-gray-400 group-hover:bg-[#fef2f2] group-hover:text-[#7b1113]",
                      ].join(" ")}>
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

    return (
      <button
        key={item.label}
        type="button"
        onClick={() => navigate(item.href(courseId))}
        className={[
          "w-full text-left text-sm px-3 py-2.5 rounded transition-colors min-h-[40px] flex items-center",
          isActive
            ? "text-gray-900 font-semibold bg-[#fdf8f8] border-l-[3px] border-[#7b1113] rounded-none"
            : "text-[#7b1113] hover:bg-[#fdf8f8]",
        ].join(" ")}
      >
        {item.label}
      </button>
    );
  });

  /* ─────────────────────────────────────────────────────────────────────────
     MOBILE: top nav bar (breadcrumb + tabs)
  ───────────────────────────────────────────────────────────────────────── */
  const MobileTopNav = () => (
    <div style={{ borderBottom: "1px solid #e5e7eb", background: "#fff", flexShrink: 0 }}>

      {/* ── Breadcrumb row ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "0 4px 0 0",
        minHeight: 40,
        borderBottom: "1px solid #f3f4f6",
      }}>
        {/* Hamburger */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          style={{
            width: 44,
            minWidth: 44,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: MAROON,
            flexShrink: 0,
          }}
          aria-label="Open navigation"
        >
          <Menu size={17} />
        </button>

        {/* Course name — tappable, navigates to course home */}
        <button
          type="button"
          onClick={() => router.push(`/admin/courses/${courseId}/home`)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 600,
            color: MAROON,
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 1,
            padding: "0 2px",
          }}
        >
          {courseName || "Course"}
        </button>

        {/* Chevron separator */}
        <ChevronRight size={13} style={{ color: "#d1d5db", flexShrink: 0, margin: "0 1px" }} />

        {/* Active section — if there's a subItem, this is tappable and goes back to section */}
        {subItem ? (
          <>
            <button
              type="button"
              onClick={() => router.push(activeNavHref)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: 600,
                color: MAROON,
                maxWidth: 100,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 1,
                padding: "0 2px",
              }}
            >
              {activeItem}
            </button>
            <ChevronRight size={13} style={{ color: "#d1d5db", flexShrink: 0, margin: "0 1px" }} />
            <span style={{
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 400,
              color: "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 1,
              flex: 1,
              padding: "0 2px",
            }}>
              {subItem}
            </span>
          </>
        ) : (
          <span style={{
            fontFamily: FONT,
            fontSize: 12,
            fontWeight: 400,
            color: "#6b7280",
            flexShrink: 1,
            flex: 1,
            padding: "0 2px",
          }}>
            {activeItem}
          </span>
        )}

        {/* Back button — only shows when there's a subItem (i.e. we're deep in a section) */}
        {subItem && (
          <button
            type="button"
            onClick={() => router.push(activeNavHref)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 3,
              height: 30,
              padding: "0 10px 0 6px",
              marginLeft: "auto",
              flexShrink: 0,
              background: "#fef2f2",
              border: `1px solid #fecaca`,
              borderRadius: 20,
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 700,
              color: MAROON,
              whiteSpace: "nowrap",
            }}
            aria-label={`Back to ${activeItem}`}
          >
            <ChevronLeft size={12} />
            {activeItem}
          </button>
        )}
      </div>

      {/* ── Scrollable tab bar ── */}
      <div
        ref={tabsScrollRef}
        style={{
          display: "flex",
          alignItems: "stretch",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          minHeight: 42,
        }}
        className="hide-scrollbar"
      >
        <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
        {NAV_ITEMS.map(item => {
          const isActive = item.label === activeItem;
          return (
            <button
              key={item.label}
              type="button"
              data-active={isActive}
              onClick={() => navigate(item.href(courseId))}
              style={{
                padding: "0 14px",
                background: "none",
                border: "none",
                borderBottom: isActive ? `3px solid ${MAROON}` : "3px solid transparent",
                cursor: "pointer",
                fontFamily: FONT,
                whiteSpace: "nowrap",
                fontSize: 12,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? MAROON : "#6b7280",
                transition: "all .15s",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────────
     MOBILE: slide-in drawer
  ───────────────────────────────────────────────────────────────────────── */
  const MobileDrawer = () => (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
        onClick={() => setMobileNavOpen(false)}
      />
      <div
        ref={mobileDrawerRef}
        style={{
          position: "fixed",
          top: 0, left: 0, bottom: 0,
          zIndex: 401,
          width: "min(280px, 80vw)",
          background: "#fff",
          boxShadow: "4px 0 32px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          fontFamily: FONT,
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid #f0e4e4",
          background: MAROON,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: "#fff",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1, marginRight: 8,
          }}>
            {courseName || "Course Menu"}
          </span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.85)", display: "flex",
              padding: 4, flexShrink: 0, borderRadius: 6,
            }}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {renderNavItems()}
          </nav>
        </div>
      </div>
    </>
  );

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-full bg-white overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Desktop sidebar ── */}
      {!isMobile && sidebarOpen && (
        <div
          className="shrink-0 border-r border-gray-200 py-3 overflow-y-auto"
          style={{ width: 200, minWidth: 200 }}
        >
          <nav className="space-y-0.5 px-2">
            {renderNavItems()}
          </nav>
        </div>
      )}

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile: breadcrumb + tab bar; Desktop: breadcrumb bar */}
        {isMobile ? (
          <MobileTopNav />
        ) : (
          <div
            className="border-b border-gray-200 flex items-center px-4 shrink-0 gap-2"
            style={{ height: 44, minHeight: 44 }}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(o => !o)}
              className="text-gray-500 hover:text-gray-700 mr-1 flex items-center justify-center"
              style={{ fontSize: 18, lineHeight: 1, width: 28, height: 28 }}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              ☰
            </button>
            <button
              type="button"
              onClick={() => router.push(`/admin/courses/${courseId}/home`)}
              className="text-sm font-semibold text-[#7b1113] hover:underline transition-colors truncate max-w-[200px]"
            >
              {courseName || "…"}
            </button>
            <span className="text-gray-300 text-sm shrink-0">›</span>
            <button
              type="button"
              onClick={() => router.push(activeNavHref)}
              className={[
                "text-sm transition-colors hover:underline shrink-0",
                subItem ? "text-[#7b1113] font-semibold" : "text-gray-500",
              ].join(" ")}
            >
              {activeItem}
            </button>
            {subItem && (
              <>
                <span className="text-gray-300 text-sm shrink-0">›</span>
                <span className="text-sm text-gray-500 truncate">{subItem}</span>
              </>
            )}
          </div>
        )}

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>

      {/* Mobile drawer */}
      {isMobile && mobileNavOpen && <MobileDrawer />}
    </div>
  );
}