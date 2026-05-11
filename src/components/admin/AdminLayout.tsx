"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Users, FolderKanban,
  Inbox, Clock, CalendarDays, LogOut, BookOpen,
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

const PAGE_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users",     href: "/admin/users",     icon: Users            },
  { label: "Inbox",     href: "/admin/inbox",     icon: Inbox            },
  { label: "History",   href: "/admin/history",   icon: Clock            },
  { label: "Calendar",  href: "/admin/calendar",  icon: CalendarDays     },
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

  return (
    <div className="w-16 bg-[#7b1113] text-white h-full flex flex-col items-center py-0 shrink-0 z-200 relative">
      {/* Logo/Account */}
      <Link href="/admin/dashboard" onClick={handlePageNavClick}
        className="flex flex-col items-center justify-center w-full py-3 hover:bg-[#5a0d0f] transition-colors border-l-2 border-transparent">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/psu-logo.png" alt="PSU" className="w-full h-full object-cover"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        </div>
        <span className="text-[10px] mt-1 text-red-200">Account</span>
      </Link>

      {/* Nav items */}
      <div className="flex flex-col items-center w-full flex-1 overflow-y-auto">
        <button onClick={handleCoursesClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${coursesActive ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <BookOpen size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Offices</span>
        </button>

        <button onClick={onGroupsClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${groupsActive ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <FolderKanban size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Groups</span>
        </button>

        {PAGE_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} onClick={handlePageNavClick}
              className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${pageIsActive(item.href) ? ACTIVE_CLS : INACTIVE_CLS}`}>
              <Icon size={18} />
              <span className="text-[10px] mt-1 text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Logout */}
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

  // Show only most important items on mobile bottom nav
  const mobileItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Inbox",     href: "/admin/inbox",     icon: Inbox            },
    { label: "Calendar",  href: "/admin/calendar",  icon: CalendarDays     },
  ];

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
        background: MAROON,
        display: "flex", alignItems: "stretch",
        borderTop: "1px solid #5a0d0f",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Courses */}
      <button
        onClick={handleCoursesClick}
        style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "8px 4px", background: "none", border: "none",
          cursor: "pointer",
          borderTop: coursesActive ? "2px solid #facc15" : "2px solid transparent",
        }}
      >
        <BookOpen size={20} color={coursesActive ? "#fff" : "rgba(255,255,255,0.65)"} />
        <span style={{ fontSize: 9, marginTop: 3, color: coursesActive ? "#fff" : "rgba(255,255,255,0.65)", fontFamily: FONT, fontWeight: 600 }}>
          Courses
        </span>
      </button>

      {/* Groups */}
      <button
        onClick={onGroupsClick}
        style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "8px 4px", background: "none", border: "none",
          cursor: "pointer",
          borderTop: groupsActive ? "2px solid #facc15" : "2px solid transparent",
        }}
      >
        <FolderKanban size={20} color={groupsActive ? "#fff" : "rgba(255,255,255,0.65)"} />
        <span style={{ fontSize: 9, marginTop: 3, color: groupsActive ? "#fff" : "rgba(255,255,255,0.65)", fontFamily: FONT, fontWeight: 600 }}>
          Groups
        </span>
      </button>

      {/* Other page items */}
      {mobileItems.map(item => {
        const Icon  = item.icon;
        const active = pageIsActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={handlePageNavClick}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "8px 4px", textDecoration: "none",
              borderTop: active ? "2px solid #facc15" : "2px solid transparent",
            }}
          >
            <Icon size={20} color={active ? "#fff" : "rgba(255,255,255,0.65)"} />
            <span style={{ fontSize: 9, marginTop: 3, color: active ? "#fff" : "rgba(255,255,255,0.65)", fontFamily: FONT, fontWeight: 600 }}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "8px 4px", background: "none", border: "none",
          cursor: "pointer", borderTop: "2px solid transparent",
        }}
      >
        <LogOut size={20} color="rgba(255,255,255,0.65)" />
        <span style={{ fontSize: 9, marginTop: 3, color: "rgba(255,255,255,0.65)", fontFamily: FONT, fontWeight: 600 }}>
          Logout
        </span>
      </button>
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

  // Detect mobile
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

      {/* Desktop sidebar — hidden on mobile */}
      {!isMobile && (
        <AdminSidebar
          groupsPanelOpen={groupsPanelOpen}
          onGroupsClick={() => setGroupsPanelOpen(prev => !prev)}
        />
      )}

      <AdminCoursesPanel onNewCourse={triggerNewCourse} />

      {groupsPanelOpen && (
        <AdminGroupsPanel
          onClose={() => setGroupsPanelOpen(false)}
          onNavigate={handleGroupsNavigate}
        />
      )}

      {/* Main content — add bottom padding on mobile for bottom nav */}
      <div className="flex-1 flex overflow-hidden">
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: isMobile ? 64 : 0 }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
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
      <AdminInner>{children}</AdminInner>
    </AdminCoursesProvider>
  );
}