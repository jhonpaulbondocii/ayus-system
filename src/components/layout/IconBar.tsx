"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Calendar,
  Inbox, ChevronLeft,
} from "lucide-react";
import AccountMenu from "./AccountMenu";
import { useGroups } from "./groups-panel";
import { useCourses } from "./courses-panel";
import { useHistory } from "./history-panel";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar",  href: "/calendar",  icon: Calendar         },
  { label: "Inbox",     href: "/inbox",     icon: Inbox            },
];

const ACTIVE_CLS   = "bg-[#5a0d0f] text-white border-l-2 border-yellow-400";
const INACTIVE_CLS = "text-red-200 hover:bg-[#5a0d0f] hover:text-white";

export default function IconBar() {
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

  const handlePageNavClick = () => {
    if (coursesActive) closeCourses();
    if (groupsActive)  closeGroups();
    if (historyActive) closeHistory();
  };

  return (
    <div className="w-16 bg-[#7b1113] text-white min-h-screen flex flex-col items-center py-2 shrink-0 relative z-200">

      {/* Canvas logo — clickable, goes to dashboard */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <Link href="/dashboard" onClick={handlePageNavClick}>
        <img src="/canvas-logo.png" alt="Canvas Logo" width={40} height={40}
          style={{ objectFit: "contain", background: "transparent", mixBlendMode: "luminosity", marginBottom: "4px" }}
        />
      </Link>

      <div className="flex flex-col items-center mb-1">
        <AccountMenu />
        <span className="text-[10px] text-red-200 mt-1">Account</span>
      </div>

      <div className="flex flex-col items-center w-full mt-1">

        {/* Courses */}
        <button onClick={handleCoursesClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors
            ${coursesActive ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-[10px] mt-1 text-center leading-tight">Offices</span>
        </button>

        {/* Groups */}
        <button onClick={handleGroupsClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors
            ${groupsActive ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] mt-1 text-center leading-tight">Groups</span>
        </button>

        {/* Regular nav links */}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} onClick={handlePageNavClick}
              className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors
                ${pageIsActive(item.href) ? ACTIVE_CLS : INACTIVE_CLS}`}>
              <Icon size={18} />
              <span className="text-[10px] mt-1 text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* History — panel toggle */}
        <button onClick={handleHistoryClick}
          className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors
            ${historyActive ? ACTIVE_CLS : INACTIVE_CLS}`}>
          <svg className="w-4.25 h-4.25" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] mt-1 text-center leading-tight">History</span>
        </button>

      </div>

      {/* Bottom */}
      <div className="mt-auto flex flex-col items-center w-full">
        <button className={`flex flex-col items-center justify-center w-full py-2.5 px-1 transition-colors ${INACTIVE_CLS}`}>
          <ChevronLeft size={18} />
        </button>
      </div>
    </div>
  );
}