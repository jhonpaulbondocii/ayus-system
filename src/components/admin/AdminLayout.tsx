"use client";

import { HistoryProvider, AdminHistoryPanel, useHistory, HistoryTracker } from "@/components/admin/AdminHistoryPage";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, FolderKanban,
  Inbox, Clock, CalendarDays, LogOut, BookOpen,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import AdminCoursesPanel, { AdminCoursesProvider, useAdminCourses } from "./AdminCoursesPanel";
import AdminGroupsPanel from "./AdminGroupsPanel";

const ACTIVE_CLS   = "bg-[#5a0d0f] text-white border-l-2 border-yellow-400";
const INACTIVE_CLS = "text-red-200 hover:bg-[#5a0d0f] hover:text-white border-l-2 border-transparent";
const MAROON       = "#7b1113";
const FONT         = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

const PRESET_COLORS = [
  "#e91e8c","#d41e00","#e66000","#f5a623",
  "#6d9b00","#2d7a2d","#00695c","#0770a2",
  "#1565c0","#4527a0","#6a0dad","#7b1113",
  "#37474f","#546e7a","#78909c","#5d4037",
];

/* ── Create Course Modal ─────────────────────────────────────────────────────── */
function CreateCourseModal({
  onClose,
  onCreated,
}: {
  onClose:   () => void;
  onCreated: (courseId: string) => void;
}) {
  const [name,     setName]     = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const color = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
    const code  = name.trim().toUpperCase().replace(/\s+/g, "-");
    const res   = await fetch("/api/admin/courses", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), code, color, status: "UNPUBLISHED" }),
    });
    const data = await res.json();
    setCreating(false);
    if (data?.course?.id) onCreated(data.course.id);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)",
      fontFamily: FONT, padding: "0 16px",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        border: "1px solid #f0e4e4",
        width: "100%", maxWidth: 440, overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px 16px", borderBottom: "1px solid #f0e4e4" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>Create Office</h2>
          <button onClick={onClose}
            style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb", borderRadius: 8, background: "none", cursor: "pointer", fontSize: 14, color: "#6b7280" }}>
            ✕
          </button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Office Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="Enter office name..."
            style={{
              width: "100%", border: "1px solid #e5e7eb", borderRadius: 8,
              padding: "9px 12px", fontSize: 13, outline: "none",
              boxSizing: "border-box", fontFamily: FONT, transition: "border-color .15s",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(123,17,19,.08)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 22px 18px", background: "#fdf8f8", borderTop: "1px solid #f0e4e4" }}>
          <button onClick={onClose}
            style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            style={{
              padding: "8px 20px", fontSize: 12, fontWeight: 700, color: "#fff",
              background: creating || !name.trim() ? "#d1d5db" : MAROON,
              border: "none", borderRadius: 8, fontFamily: FONT,
              cursor: creating || !name.trim() ? "default" : "pointer",
            }}
            onMouseEnter={e => { if (!creating && name.trim()) e.currentTarget.style.opacity = "0.88"; }}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Desktop Sidebar ─────────────────────────────────────────────────────────── */
function AdminSidebar({
  groupsPanelOpen,
  onGroupsClick,
}: {
  groupsPanelOpen: boolean;
  onGroupsClick:   () => void;
}) {
  const pathname = usePathname();
  const {
    isActive: coursesActive,
    isOpen:   coursesOpen,
    view:     coursesView,
    open:     openCourses,
    openPanel,
    close:    closeCourses,
    closePanel,
  } = useAdminCourses();

  const { isOpen: historyIsOpen, open: openHistory, closePanel: closeHistoryPanel } = useHistory();

  const pageIsActive = (href: string) => {
    if (coursesActive)   return false;
    if (groupsPanelOpen) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const groupsActive = groupsPanelOpen || (!coursesActive && pathname.startsWith("/admin/groups"));

  const handleCoursesClick = () => {
    if (!coursesActive) {
      openCourses();
    } else if (coursesView === "allCourses") {
      if (coursesOpen) closePanel(); else openPanel();
    } else {
      if (coursesOpen) closeCourses(); else openCourses();
    }
  };

  const handlePageNavClick = () => { if (coursesActive) closeCourses(); };

  const handleHistoryClick = () => {
    handlePageNavClick();
    if (historyIsOpen) closeHistoryPanel(); else openHistory();
  };

  return (
    <div className="w-16 bg-[#7b1113] text-white h-full flex flex-col items-center py-0 shrink-0 z-200 relative">

      {/* 1. Logo / Account */}
      <Link href="/admin/dashboard" onClick={handlePageNavClick}
        className="flex flex-col items-center justify-center w-full py-3 hover:bg-[#5a0d0f] transition-colors border-l-2 border-transparent">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/psu-logo.png" alt="PSU" className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        </div>
        <span className="text-[10px] mt-1 text-red-200">Account</span>
      </Link>

      <div className="flex flex-col items-center w-full flex-1 overflow-y-auto">

        {/* 2. Dashboard */}
        <Link href="/admin/dashboard" onClick={handlePageNavClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${pageIsActive("/admin/dashboard") ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <LayoutDashboard size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Dashboard</span>
        </Link>

        {/* 3. Offices */}
        <button onClick={handleCoursesClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${coursesActive ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <BookOpen size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Offices</span>
        </button>

        {/* 4. Groups */}
        <button onClick={onGroupsClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${groupsActive ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <FolderKanban size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Groups</span>
        </button>

        {/* 5. Users */}
        <Link href="/admin/users" onClick={handlePageNavClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${pageIsActive("/admin/users") ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <Users size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Users</span>
        </Link>

        {/* 6. Inbox */}
        <Link href="/admin/inbox" onClick={handlePageNavClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${pageIsActive("/admin/inbox") ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <Inbox size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Inbox</span>
        </Link>

        {/* 7. Calendar */}
        <Link href="/admin/calendar" onClick={handlePageNavClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${pageIsActive("/admin/calendar") ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <CalendarDays size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Calendar</span>
        </Link>

        {/* 8. History */}
        <button onClick={handleHistoryClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${historyIsOpen ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <Clock size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">History</span>
        </button>

      </div>

      {/* 9. Logout */}
      <div className="mt-auto mb-2 w-full">
        <button onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${INACTIVE_CLS}`}>
          <LogOut size={18} />
          <span className="text-[10px] mt-1">Logout</span>
        </button>
      </div>

    </div>
  );
}

/* ── Mobile Bottom Nav ───────────────────────────────────────────────────────── */
function MobileBottomNav({
  groupsPanelOpen,
  onGroupsClick,
}: {
  groupsPanelOpen: boolean;
  onGroupsClick:   () => void;
}) {
  const pathname   = usePathname();
  const scrollRef  = useRef<HTMLDivElement>(null);
  const [showFadeRight, setShowFadeRight] = useState(true);
  const [showFadeLeft,  setShowFadeLeft]  = useState(false);
  const [scrollPage,    setScrollPage]    = useState(0);

  const {
    isActive: coursesActive,
    isOpen:   coursesOpen,
    view:     coursesView,
    open:     openCourses,
    openPanel,
    close:    closeCourses,
    closePanel,
  } = useAdminCourses();

  const { isOpen: historyIsOpen, open: openHistory, closePanel: closeHistoryPanel } = useHistory();

  const pageIsActive = (href: string) => {
    if (coursesActive || groupsPanelOpen) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const groupsActive = groupsPanelOpen || (!coursesActive && pathname.startsWith("/admin/groups"));

  const handleCoursesClick = () => {
    if (!coursesActive) openCourses();
    else if (coursesView === "allCourses") { if (coursesOpen) closePanel(); else openPanel(); }
    else { if (coursesOpen) closeCourses(); else openCourses(); }
  };

  const handlePageNavClick = () => { if (coursesActive) closeCourses(); };

  const handleHistoryClick = () => {
    handlePageNavClick();
    if (historyIsOpen) closeHistoryPanel(); else openHistory();
  };

  const updateFades = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 4;
    const atEnd   = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setShowFadeLeft(!atStart);
    setShowFadeRight(!atEnd);
    // compute current page (each "page" = clientWidth worth of scroll)
    const page = Math.round(el.scrollLeft / el.clientWidth);
    setScrollPage(page);
  };

  useEffect(() => { updateFades(); }, []);

  // total pages = ceil(9 items * 72px / clientWidth) — approximated as 2 for dot display
  const TOTAL_PAGES = 2;

  const NAV_ITEM_STYLE = (active: boolean): React.CSSProperties => ({
    flex: "0 0 72px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 4px 10px",
    cursor: "pointer",
    textDecoration: "none",
    background: "none",
    border: "none",
    borderTop: active ? "2.5px solid #facc15" : "2.5px solid transparent",
    backgroundColor: active ? "#5a0d0f" : "transparent",
    transition: "background-color 0.15s",
    fontFamily: FONT,
  });

  const LABEL_STYLE = (active: boolean): React.CSSProperties => ({
    fontSize: 10,
    marginTop: 4,
    fontFamily: FONT,
    fontWeight: 600,
    whiteSpace: "nowrap",
    color: active ? "#fff" : "rgba(255,255,255,0.6)",
  });

  const iconColor = (active: boolean) => active ? "#fff" : "rgba(255,255,255,0.6)";

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
      background: MAROON,
      borderTop: "1px solid #5a0d0f",
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>

      {/* Scrollable strip with fades */}
      <div style={{ position: "relative", overflow: "hidden" }}>

        {/* Left fade */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 44, zIndex: 10,
          background: "linear-gradient(to right, rgba(123,17,19,0.96) 40%, transparent)",
          display: "flex", alignItems: "center", paddingLeft: 8,
          opacity: showFadeLeft ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 0.2s",
        }}>
          <ChevronLeft size={14} color="rgba(255,255,255,0.85)" />
        </div>

        {/* Right fade */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 48, zIndex: 10,
          background: "linear-gradient(to left, rgba(123,17,19,0.96) 50%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8,
          opacity: showFadeRight ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 0.2s",
        }}>
          <ChevronRight size={14} color="rgba(255,255,255,0.85)" />
        </div>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          onScroll={updateFades}
          style={{
            display: "flex",
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          } as React.CSSProperties}
        >

          {/* 1. Account */}
          <Link href="/admin/dashboard" onClick={handlePageNavClick} style={NAV_ITEM_STYLE(false)}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)", overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/psu-logo.png" alt="PSU"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <span style={LABEL_STYLE(false)}>Account</span>
          </Link>

          {/* 2. Dashboard */}
          <Link href="/admin/dashboard" onClick={handlePageNavClick} style={NAV_ITEM_STYLE(pageIsActive("/admin/dashboard"))}>
            <LayoutDashboard size={20} color={iconColor(pageIsActive("/admin/dashboard"))} />
            <span style={LABEL_STYLE(pageIsActive("/admin/dashboard"))}>Dashboard</span>
          </Link>

          {/* 3. Offices */}
          <button onClick={handleCoursesClick} style={NAV_ITEM_STYLE(coursesActive)}>
            <BookOpen size={20} color={iconColor(coursesActive)} />
            <span style={LABEL_STYLE(coursesActive)}>Offices</span>
          </button>

          {/* 4. Groups */}
          <button onClick={onGroupsClick} style={NAV_ITEM_STYLE(groupsActive)}>
            <FolderKanban size={20} color={iconColor(groupsActive)} />
            <span style={LABEL_STYLE(groupsActive)}>Groups</span>
          </button>

          {/* 5. Users */}
          <Link href="/admin/users" onClick={handlePageNavClick} style={NAV_ITEM_STYLE(pageIsActive("/admin/users"))}>
            <Users size={20} color={iconColor(pageIsActive("/admin/users"))} />
            <span style={LABEL_STYLE(pageIsActive("/admin/users"))}>Users</span>
          </Link>

          {/* 6. Inbox */}
          <Link href="/admin/inbox" onClick={handlePageNavClick} style={NAV_ITEM_STYLE(pageIsActive("/admin/inbox"))}>
            <Inbox size={20} color={iconColor(pageIsActive("/admin/inbox"))} />
            <span style={LABEL_STYLE(pageIsActive("/admin/inbox"))}>Inbox</span>
          </Link>

          {/* 7. Calendar */}
          <Link href="/admin/calendar" onClick={handlePageNavClick} style={NAV_ITEM_STYLE(pageIsActive("/admin/calendar"))}>
            <CalendarDays size={20} color={iconColor(pageIsActive("/admin/calendar"))} />
            <span style={LABEL_STYLE(pageIsActive("/admin/calendar"))}>Calendar</span>
          </Link>

          {/* 8. History */}
          <button onClick={handleHistoryClick} style={NAV_ITEM_STYLE(historyIsOpen)}>
            <Clock size={20} color={iconColor(historyIsOpen)} />
            <span style={LABEL_STYLE(historyIsOpen)}>History</span>
          </button>

          {/* 9. Logout */}
          <button onClick={() => signOut({ callbackUrl: "/admin/login" })} style={NAV_ITEM_STYLE(false)}>
            <LogOut size={20} color={iconColor(false)} />
            <span style={LABEL_STYLE(false)}>Logout</span>
          </button>

        </div>
      </div>

      {/* Dot indicators */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: 5, paddingTop: 3, paddingBottom: 4,
      }}>
        {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
          <div
            key={i}
            style={{
              height: 4,
              width: i === scrollPage ? 14 : 5,
              borderRadius: 3,
              background: i === scrollPage ? "#facc15" : "rgba(255,255,255,0.25)",
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>

    </div>
  );
}

/* ── Inner layout ────────────────────────────────────────────────────────────── */
function AdminInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [groupsPanelOpen, setGroupsPanelOpen] = useState(false);
  const [showModal,       setShowModal]       = useState(false);
  const [isMobile,        setIsMobile]        = useState(false);

  const { close: closeCourses } = useAdminCourses();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const triggerNewCourse = () => setShowModal(true);

  useEffect(() => {
    const handler = () => setShowModal(true);
    window.addEventListener("admin:openCreateCourse", handler);
    return () => window.removeEventListener("admin:openCreateCourse", handler);
  }, []);

  const handleCreated = (courseId: string) => {
    setShowModal(false);
    closeCourses();
    router.push(`/admin/courses/${courseId}/settings`);
  };

  const handleGroupsNavigate = (url: string) => {
    closeCourses();
    setGroupsPanelOpen(false);
    router.push(url);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {!isMobile && (
        <AdminSidebar
          groupsPanelOpen={groupsPanelOpen}
          onGroupsClick={() => setGroupsPanelOpen(prev => !prev)}
        />
      )}

      <HistoryTracker isAdmin={true} />
      <AdminCoursesPanel onNewCourse={triggerNewCourse} />
      <AdminHistoryPanel />

      {groupsPanelOpen && (
        <AdminGroupsPanel
          onClose={() => setGroupsPanelOpen(false)}
          onNavigate={handleGroupsNavigate}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: isMobile ? 72 : 0 }}
        >
          {children}
        </main>
      </div>

      {isMobile && (
        <MobileBottomNav
          groupsPanelOpen={groupsPanelOpen}
          onGroupsClick={() => setGroupsPanelOpen(prev => !prev)}
        />
      )}

      {showModal && (
        <CreateCourseModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

/* ── Root export ─────────────────────────────────────────────────────────────── */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname      = usePathname();
  const isLoginPage   = pathname === "/admin/login";
  const isSpeedGrader = pathname.includes("/speedgrader");

  if (isLoginPage || isSpeedGrader) return <>{children}</>;

  return (
    <AdminCoursesProvider>
      <HistoryProvider>
        <AdminInner>{children}</AdminInner>
      </HistoryProvider>
    </AdminCoursesProvider>
  );
}