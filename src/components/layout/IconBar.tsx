"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Calendar,
  Inbox, Clock, BookOpen, Users,
} from "lucide-react";
import AccountMenu from "./AccountMenu";
import { useGroups } from "./groups-panel";
import { useCourses } from "./courses-panel";
import { useHistory } from "./history-panel";

const ACTIVE_CLS   = "bg-[#5a0d0f] text-white border-l-2 border-yellow-400";
const INACTIVE_CLS = "text-red-200 hover:bg-[#5a0d0f] hover:text-white border-l-2 border-transparent";
const MAROON       = "#7b1113";
const FONT         = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

/* ── Mobile primitives ───────────────────────────────────────────────────────── */

function MobileNavBtn({
  label, icon: Icon, active, onClick,
}: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "6px 4px",
        background: "none", border: "none", cursor: "pointer",
        borderTop: active ? "2px solid #facc15" : "2px solid transparent",
        minWidth: 44,
      }}
    >
      <Icon size={20} color={active ? "#fff" : "rgba(255,255,255,0.65)"} />
      <span style={{
        fontSize: 9, marginTop: 3, fontFamily: FONT, fontWeight: 600,
        color: active ? "#fff" : "rgba(255,255,255,0.65)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        maxWidth: "100%",
      }}>
        {label}
      </span>
    </button>
  );
}

function MobileNavLink({
  label, icon: Icon, href, active, onClick,
}: {
  label: string;
  icon: React.ElementType;
  href: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "6px 4px", textDecoration: "none",
        borderTop: active ? "2px solid #facc15" : "2px solid transparent",
        minWidth: 44,
      }}
    >
      <Icon size={20} color={active ? "#fff" : "rgba(255,255,255,0.65)"} />
      <span style={{
        fontSize: 9, marginTop: 3, fontFamily: FONT, fontWeight: 600,
        color: active ? "#fff" : "rgba(255,255,255,0.65)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        maxWidth: "100%",
      }}>
        {label}
      </span>
    </Link>
  );
}

/* ── Shared hook logic ───────────────────────────────────────────────────────── */

function useNavLogic() {
  const pathname = usePathname();

  const {
    isOpen: groupsOpen, isActive: groupsActive,
    open: openGroups, close: closeGroups, closePanel: closeGroupsPanel,
  } = useGroups();

  const {
    isOpen: coursesOpen, isActive: coursesActive,
    open: openCourses, close: closeCourses, closePanel: closeCoursesPanel,
  } = useCourses();

  const {
    isOpen: historyOpen, isActive: historyActive,
    open: openHistory, close: closeHistory, closePanel: closeHistoryPanel,
  } = useHistory();

  const pageIsActive = (href: string) => {
    if (coursesActive || groupsActive || historyActive) return false;
    return pathname === href;
  };

  const handlePageNavClick = () => {
    if (coursesActive) closeCourses();
    if (groupsActive)  closeGroups();
    if (historyActive) closeHistory();
  };

  const handleCoursesClick = () => {
    if (!coursesActive) {
      if (groupsOpen)  closeGroupsPanel();
      if (historyOpen) closeHistoryPanel();
      openCourses();
    } else if (coursesOpen) {
      closeCourses();
    } else {
      if (groupsOpen)  closeGroupsPanel();
      if (historyOpen) closeHistoryPanel();
      openCourses();
    }
  };

  const handleGroupsClick = () => {
    if (!groupsActive) {
      if (coursesOpen) closeCoursesPanel();
      if (historyOpen) closeHistoryPanel();
      openGroups();
    } else if (groupsOpen) {
      closeGroups();
    } else {
      if (coursesOpen) closeCoursesPanel();
      if (historyOpen) closeHistoryPanel();
      openGroups();
    }
  };

  const handleHistoryClick = () => {
    if (!historyActive) {
      if (coursesOpen) closeCoursesPanel();
      if (groupsOpen)  closeGroupsPanel();
      openHistory();
    } else if (historyOpen) {
      closeHistory();
    } else {
      if (coursesOpen) closeCoursesPanel();
      if (groupsOpen)  closeGroupsPanel();
      openHistory();
    }
  };

  return {
    coursesActive, groupsActive, historyActive,
    pageIsActive, handlePageNavClick,
    handleCoursesClick, handleGroupsClick, handleHistoryClick,
  };
}

/* ── Desktop Sidebar ─────────────────────────────────────────────────────────── */

function DesktopSidebar() {
  const {
    coursesActive, groupsActive, historyActive,
    pageIsActive, handlePageNavClick,
    handleCoursesClick, handleGroupsClick, handleHistoryClick,
  } = useNavLogic();

  return (
    <div className="w-16 bg-[#7b1113] text-white h-full flex flex-col items-center py-0 shrink-0 z-[200] relative">

      {/* Account */}
      <div className="flex flex-col items-center w-full py-3 border-l-2 border-transparent">
        <AccountMenu />
        <span className="text-[10px] text-red-200 mt-1">Account</span>
      </div>

      <div className="flex flex-col items-center w-full flex-1 overflow-y-auto">

        {/* Offices */}
        <button
          onClick={handleCoursesClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${coursesActive ? ACTIVE_CLS : INACTIVE_CLS}`}
        >
          <BookOpen size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Offices</span>
        </button>

        {/* Groups */}
        <button
          onClick={handleGroupsClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${groupsActive ? ACTIVE_CLS : INACTIVE_CLS}`}
        >
          <Users size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Groups</span>
        </button>

        {/* Dashboard */}
        <Link
          href="/dashboard"
          onClick={handlePageNavClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${pageIsActive("/dashboard") ? ACTIVE_CLS : INACTIVE_CLS}`}
        >
          <LayoutDashboard size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Dashboard</span>
        </Link>

        {/* Calendar */}
        <Link
          href="/calendar"
          onClick={handlePageNavClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${pageIsActive("/calendar") ? ACTIVE_CLS : INACTIVE_CLS}`}
        >
          <Calendar size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Calendar</span>
        </Link>

        {/* Inbox */}
        <Link
          href="/inbox"
          onClick={handlePageNavClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${pageIsActive("/inbox") ? ACTIVE_CLS : INACTIVE_CLS}`}
        >
          <Inbox size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">Inbox</span>
        </Link>

        {/* History */}
        <button
          onClick={handleHistoryClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${historyActive ? ACTIVE_CLS : INACTIVE_CLS}`}
        >
          <Clock size={18} />
          <span className="text-[10px] mt-1 text-center leading-tight">History</span>
        </button>

      </div>
    </div>
  );
}

/* ── Mobile Bottom Nav ───────────────────────────────────────────────────────── */

function MobileBottomNav() {
  const {
    coursesActive, groupsActive, historyActive,
    pageIsActive, handlePageNavClick,
    handleCoursesClick, handleGroupsClick, handleHistoryClick,
  } = useNavLogic();

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
        background: MAROON,
        display: "flex", alignItems: "stretch",
        borderTop: "1px solid #5a0d0f",
        paddingBottom: "env(safe-area-inset-bottom)",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Account — uses the real AccountMenu, same as desktop */}
      <div
        style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "6px 4px",
          borderTop: "2px solid transparent", minWidth: 44,
        }}
      >
        <AccountMenu />
        <span style={{
          fontSize: 9, marginTop: 3, fontFamily: FONT, fontWeight: 600,
          color: "rgba(255,255,255,0.65)",
        }}>
          Account
        </span>
      </div>

      {/* Offices */}
      <MobileNavBtn
        label="Offices"
        icon={BookOpen}
        active={coursesActive}
        onClick={handleCoursesClick}
      />

      {/* Groups */}
      <MobileNavBtn
        label="Groups"
        icon={Users}
        active={groupsActive}
        onClick={handleGroupsClick}
      />

      {/* Dashboard */}
      <MobileNavLink
        label="Dashboard"
        icon={LayoutDashboard}
        href="/dashboard"
        active={pageIsActive("/dashboard")}
        onClick={handlePageNavClick}
      />

      {/* Calendar */}
      <MobileNavLink
        label="Calendar"
        icon={Calendar}
        href="/calendar"
        active={pageIsActive("/calendar")}
        onClick={handlePageNavClick}
      />

      {/* Inbox */}
      <MobileNavLink
        label="Inbox"
        icon={Inbox}
        href="/inbox"
        active={pageIsActive("/inbox")}
        onClick={handlePageNavClick}
      />

      {/* History */}
      <MobileNavBtn
        label="History"
        icon={Clock}
        active={historyActive}
        onClick={handleHistoryClick}
      />
    </div>
  );
}

/* ── Root export ─────────────────────────────────────────────────────────────── */

export default function IconBar() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (isMobile) return <MobileBottomNav />;
  return <DesktopSidebar />;
}