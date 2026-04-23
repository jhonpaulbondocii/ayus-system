"use client";

import { useState } from "react";

type GroupTab = "members" | "assignments" | "activity";

interface Member {
  id: number;
  name: string;
  position: string;
  isYou: boolean;
  initials: string;
}

interface GroupAssignment {
  id: number;
  title: string;
  deadline: string;
  submitted: boolean;
  grade: number | null;
}

interface ActivityItem {
  id: number;
  actor: string;
  action: string;
  time: string;
}

interface Group {
  id: string;
  name: string;
  head: string;
  headLabel: string;
  members: Member[];
  assignments: GroupAssignment[];
  activity: ActivityItem[];
}

const myGroups: Group[] = [
  {
    id: "it",
    name: "IT Department",
    head: "Juan Dela Cruz",
    headLabel: "Head",
    members: [
      { id: 1, name: "John Hipolito",   position: "Instructor I",   isYou: true,  initials: "JH" },
      { id: 2, name: "Maria Santos",    position: "Instructor II",  isYou: false, initials: "MS" },
      { id: 3, name: "Jose Reyes",      position: "Instructor I",   isYou: false, initials: "JR" },
      { id: 4, name: "Ana Cruz",        position: "Professor I",    isYou: false, initials: "AC" },
      { id: 5, name: "Ramon Dela Cruz", position: "Instructor III", isYou: false, initials: "RD" },
    ],
    assignments: [
      { id: 1, title: "Faculty Development Plan 2026", deadline: "2026-03-05", submitted: false, grade: null },
      { id: 2, title: "Training Attendance Sheet",     deadline: "2026-02-10", submitted: true,  grade: 88   },
      { id: 3, title: "Group Research Proposal",       deadline: "2026-04-01", submitted: false, grade: null },
    ],
    activity: [
      { id: 1, actor: "Maria Santos", action: "submitted Faculty Development Plan", time: "2 hours ago" },
      { id: 2, actor: "Admin",        action: "posted a new assignment",            time: "1 day ago"   },
      { id: 3, actor: "Jose Reyes",   action: "submitted Training Attendance Sheet",time: "3 days ago"  },
    ],
  },
  {
    id: "rc",
    name: "Research Committee",
    head: "Maria Santos",
    headLabel: "Lead",
    members: [
      { id: 1, name: "John Hipolito", position: "Instructor I",  isYou: true,  initials: "JH" },
      { id: 6, name: "Liza Gomez",    position: "Professor II",  isYou: false, initials: "LG" },
      { id: 7, name: "Ben Torres",    position: "Instructor II", isYou: false, initials: "BT" },
      { id: 8, name: "Clair Matias",  position: "Instructor I",  isYou: false, initials: "CM" },
    ],
    assignments: [
      { id: 4, title: "Industry Partner Report Q1", deadline: "2026-02-28", submitted: false, grade: null },
      { id: 5, title: "MOU Draft Submission",       deadline: "2026-03-15", submitted: true,  grade: 92   },
    ],
    activity: [
      { id: 5, actor: "Liza Gomez",      action: "submitted MOU Draft", time: "Yesterday"  },
      { id: 6, actor: "Department Head", action: "assigned a new task",  time: "4 days ago" },
    ],
  },
];

// ── Group Detail ──────────────────────────────────────────────────────────────

function GroupDetail({ group, onBack }: { group: Group; onBack: () => void }) {
  const [tab, setTab] = useState<GroupTab>("members");
  const now = new Date().getTime();

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-4"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Groups
      </button>

      <p className="text-sm font-semibold text-gray-800 mb-0.5">{group.name}</p>
      <p className="text-xs text-gray-400 mb-4">
        {group.headLabel}: {group.head} · {group.members.length} members
      </p>

      <div className="flex border-b border-gray-200 mb-4 gap-4">
        {(["members", "assignments", "activity"] as GroupTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 text-xs capitalize border-b-2 -mb-px transition-colors
              ${tab === t
                ? "border-blue-600 text-blue-600 font-medium"
                : "border-transparent text-gray-400 hover:text-gray-600"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <div className="space-y-1">
          {group.members.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 py-1.5">
              <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                {m.initials}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 leading-tight">
                  {m.name}
                  {m.isYou && <span className="ml-1 font-normal text-gray-400">(You)</span>}
                </p>
                <p className="text-[11px] text-gray-400">{m.position}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "assignments" && (
        <div className="space-y-1.5">
          {group.assignments.map((a) => {
            const diff = Math.ceil((new Date(a.deadline).getTime() - now) / 86400000);
            const overdue = !a.submitted && diff < 0;
            return (
              <div key={a.id} className="flex items-center gap-3 py-2 px-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className={`w-1 h-7 rounded-full shrink-0 ${a.submitted ? "bg-emerald-400" : overdue ? "bg-red-400" : "bg-amber-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{a.title}</p>
                  <p className={`text-[11px] mt-0.5 ${overdue ? "text-red-400" : "text-gray-400"}`}>
                    {a.submitted ? `Submitted · ${a.deadline}` : overdue ? `${Math.abs(diff)}d overdue` : `Due in ${diff}d`}
                  </p>
                </div>
                {a.grade != null ? (
                  <span className="text-xs font-bold text-emerald-600 shrink-0">{a.grade}/100</span>
                ) : (
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full shrink-0
                    ${a.submitted ? "bg-emerald-50 text-emerald-600" : overdue ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
                    {a.submitted ? "Submitted" : overdue ? "Overdue" : "Pending"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "activity" && (
        <div className="divide-y divide-gray-100">
          {group.activity.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5 py-2.5">
              <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {a.actor[0]}
              </div>
              <div>
                <p className="text-xs text-gray-700">
                  <span className="font-medium">{a.actor}</span>{" "}
                  <span className="text-gray-500">{a.action}</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Panel UI ──────────────────────────────────────────────────────────────────

function PanelUI({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Group | null>(null);

  return (
    <div className="fixed top-0 left-20 h-full w-72 bg-white border-r border-gray-200 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
        <h1 className="text-base font-semibold text-gray-800">Groups</h1>
        <button
          onClick={() => { setSelected(null); onClose(); }}
          className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {/* All Groups */}
      {!selected && (
        <div className="px-5 py-3 border-b border-gray-100 shrink-0">
          <span className="text-sm text-blue-600 font-medium">All Groups</span>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {selected ? (
          <GroupDetail group={selected} onBack={() => setSelected(null)} />
        ) : (
          <div className="divide-y divide-gray-100">
            {myGroups.map((g) => {
              const active = g.assignments.filter((a) => !a.submitted).length;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelected(g)}
                  className="w-full text-left py-3 hover:opacity-75 transition-opacity"
                >
                  <p className="text-sm text-blue-600 font-medium">{g.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {g.headLabel}: {g.head}
                    {active > 0 && <span className="ml-2 text-amber-500">{active} pending</span>}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Export — self-contained with its own open/close state ────────────────
// Drop this anywhere in MainLayout. It manages its own state internally.
// The groups/page.tsx should just be an empty page or redirected — 
// the panel is NOT a page, it lives in the layout.

export default function GroupsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* This button replaces your Groups nav item in the sidebar */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-[10px]">Groups</span>
      </button>

      {/* Floating panel — sits above everything */}
      {open && <PanelUI onClose={() => setOpen(false)} />}
    </>
  );
}