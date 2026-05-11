"use client";

import { useState } from "react";
import { Star, Menu, Search, Printer, ChevronLeft, ChevronRight, Settings, Plus } from "lucide-react";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CourseRow {
  id: string;
  title: string;
  code: string;
  nickname: string;
  term: string;
  enrolledAs: string;
  published: boolean;
  favorited: boolean;
}

interface GroupRow {
  id: string;
  name: string;
  course: string;
  term: string;
}

interface Assignment {
  id: string;
  title: string;
  status: "Closed" | "Open";
  due: string;
  submitted: string;
  points: string;
  graded: string;
}

interface Person {
  id: string;
  name: string;
  pronouns?: string;
  section: string;
  role: string;
  avatar?: string;
  pending?: boolean;
}

type SidebarItem = "Home" | "Assignments" | "Discussions" | "Grades" | "People" | "Syllabus";

// ══════════════════════════════════════════════════════════════════════════════
// STATIC DATA
// ══════════════════════════════════════════════════════════════════════════════

export const ALL_COURSES: CourseRow[] = [
  { id: "1", title: "Computing Studies", code: "IT-CS-2026", nickname: "", term: "2nd Sem 2025-2026", enrolledAs: "Student", published: true, favorited: true },
];

const MY_GROUPS: GroupRow[] = [
  { id: "1", name: "Syllabus & Lesson Plan Consolidation", course: "Computing Studies", term: "2nd Sem 2025-2026" },
];

const COURSE_ASSIGNMENTS: Record<string, Assignment[]> = {
  "1": [
    { id: "a1", title: "Lab 1. Introduction to Computing", status: "Closed", due: "Feb 10 by 11:59pm", submitted: "Feb 10 at 9:30pm", points: "90 / 100", graded: "Graded" },
    { id: "a2", title: "Lab 2. Data Representation",       status: "Open",   due: "Mar 1 by 11:59pm",  submitted: "",                  points: "/ 100",    graded: "Not Yet Graded" },
  ],
};

// ── Members per group ─────────────────────────────────────────────────────────
const GROUP_MEMBERS: Person[] = [
  { id: "m1", name: "Vital, Vicky P.",       section: "Syllabus & Lesson Plan Consolidation", role: "Head"    },
  { id: "m2", name: "Hipolito, John",        section: "Syllabus & Lesson Plan Consolidation", role: "Faculty" },
  { id: "m3", name: "Yambao, Jaymark",       section: "Syllabus & Lesson Plan Consolidation", role: "Faculty" },
  { id: "m4", name: "Guadalupe, Ariel",      section: "Syllabus & Lesson Plan Consolidation", role: "Faculty" },
  { id: "m5", name: "Dela Cruz, Kit Alfred", section: "Syllabus & Lesson Plan Consolidation", role: "Faculty" },
  { id: "m6", name: "Miranda, John Paul",    section: "Syllabus & Lesson Plan Consolidation", role: "Faculty" },
  { id: "m7", name: "Quizon, Nhica",         section: "Syllabus & Lesson Plan Consolidation", role: "Faculty" },
];


const COURSE_PEOPLE: Record<string, Person[]> = {
  "1": GROUP_MEMBERS,
};

interface CourseGroup { id: string; name: string; category: string; members: Person[]; }

const COURSE_GROUPS: Record<string, CourseGroup[]> = {
  "1": [
    { id: "g1", name: "Syllabus & Lesson Plan Consolidation", category: "IT-CS-2026", members: GROUP_MEMBERS },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// MINI CALENDAR (for Syllabus)
// ══════════════════════════════════════════════════════════════════════════════

function MiniCalendar() {
  const today = new Date(2026, 1, 23); // Feb 23 2026
  const [current, setCurrent] = useState(new Date(2026, 1, 1));

  const year  = current.getFullYear();
  const month = current.getMonth();
  const monthName = current.toLocaleString("default", { month: "long" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number | null) =>
    d !== null && d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="w-48 text-xs select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-semibold text-gray-700">{monthName} {year}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="text-gray-400 hover:text-gray-600">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0 text-center">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-gray-400 py-0.5">{d}</div>
        ))}
        {cells.map((d, i) => (
          <div
            key={i}
            className={`py-0.5 rounded-full w-6 h-6 mx-auto flex items-center justify-center
              ${isToday(d) ? "bg-red-400 text-white font-bold" : d ? "text-gray-700 hover:bg-gray-100 cursor-pointer" : ""}`}
          >
            {d ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INNER: GroupRow — collapsible group card for the Groups tab
// ══════════════════════════════════════════════════════════════════════════════

function GroupRow({ group, isFirst }: { group: CourseGroup; isFirst: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(prev => !prev)}
      >
        {/* Expand arrow */}
        <span className={`text-gray-400 text-xs transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>

        {/* Group name + category */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">{group.name}</span>
          <span className="text-sm text-gray-400">{group.category}</span>
          {isFirst && (
            <button
              onClick={e => e.stopPropagation()}
              className="text-xs text-[#0770a2] hover:underline ml-1"
            >
              Visit
            </button>
          )}
        </div>

        {/* Member count */}
        <span className="text-sm text-gray-500 shrink-0">
          {group.members.length} member{group.members.length !== 1 ? "s" : ""}
        </span>

        {/* Lock icon (all except first) */}
        {!isFirst && (
          <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="11" width="14" height="10" rx="2"/>
            <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Expanded members */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {group.members.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-6 py-2.5 hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <button className="text-sm text-[#0770a2] hover:underline">{p.name}</button>
                {p.pronouns && <span className="text-xs text-gray-400">({p.pronouns})</span>}
                {p.pending && <span className="px-2 py-0.5 bg-[#0a7040] text-white text-xs rounded">pending</span>}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{p.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INNER: CoursePage (embedded, not exported)
// ══════════════════════════════════════════════════════════════════════════════

function CoursePage({ course, onBack }: { course: CourseRow; onBack: () => void }) {
  const [activeItem, setActiveItem] = useState<SidebarItem>("Home");
  const [viewMode, setViewMode]     = useState<"date" | "type">("date");
  const [search, setSearch]         = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [peopleTab, setPeopleTab]       = useState<"everyone" | "groups">("everyone");
  const [arrangeBy, setArrangeBy]       = useState("Due Date");

  const sidebarItems: SidebarItem[] = ["Home", "Assignments", "Discussions", "Grades", "People", "Syllabus"];
  const assignments    = COURSE_ASSIGNMENTS[course.id] ?? [];
  const filtered       = assignments.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
  const people         = COURSE_PEOPLE[course.id] ?? [];
  const filteredPeople = people.filter(p => p.name.toLowerCase().includes(peopleSearch.toLowerCase()));
  const courseGroups   = COURSE_GROUPS[course.id] ?? [];

  return (
    <div className="fixed top-0 left-80px right-0 bottom-0 bg-white z-60 flex flex-col overflow-hidden">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
        <button className="text-gray-400 hover:text-gray-600"><Menu className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="text-[#0770a2] hover:underline">{course.title}</button>
          <span className="text-gray-400">›</span>
          <span className="text-gray-700">{activeItem}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <nav className="w-44 border-r border-gray-200 py-4 shrink-0 bg-white overflow-y-auto">
          {sidebarItems.map(item => (
            <button
              key={item}
              onClick={() => setActiveItem(item)}
              className={`w-full text-left py-1.5 text-sm transition-colors ${
                activeItem === item
                  ? "font-bold text-gray-900 border-l-4 border-[#0a7040] pl-4 bg-gray-50"
                  : "text-[#0770a2] hover:bg-gray-50 px-5"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto">

          {/* ── HOME ── */}
          {activeItem === "Home" && (
            <div className="flex gap-0 h-full">
              {/* Main */}
              <div className="flex-1 px-8 py-6 text-sm text-gray-500 italic">
                No modules have been defined for this course.
              </div>
              {/* Right panel */}
              <div className="w-64 border-l border-gray-200 px-5 py-5 shrink-0 space-y-4">
                {[
                  { icon: "📊", label: "View Course Stream" },
                  { icon: "📅", label: "View Course Calendar" },
                  { icon: "🔔", label: "View Course Notifications" },
                ].map(btn => (
                  <button key={btn.label} className="w-full flex items-center gap-2 px-3 py-2 border border-gray-200 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-1">To Do</p>
                  <p className="text-xs text-gray-400">Nothing for now</p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Course Groups</p>
                  <button className="block text-xs text-[#0770a2] hover:underline">Act 1 1</button>
                  <button className="block text-xs text-[#0770a2] hover:underline mt-0.5">Act 2 G 6</button>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Recent Feedback</p>
                  <p className="text-xs text-gray-400">Nothing for now</p>
                </div>
              </div>
            </div>
          )}

          {/* ── ASSIGNMENTS ── */}
          {activeItem === "Assignments" && (
            <div>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" placeholder="Search..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-56 focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {(["date", "type"] as const).map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                        viewMode === mode ? "bg-[#0a7040] text-white" : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      SHOW BY {mode.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 px-6 py-2 bg-gray-100 border-b border-gray-200">
                  <span className="text-gray-500 text-sm">▼</span>
                  <span className="text-sm font-medium text-gray-700">Past Assignments</span>
                </div>
                {filtered.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-gray-400">No assignments found.</p>
                ) : filtered.map(a => (
                  <div key={a.id} className="flex items-start px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors gap-3">
                    <div className="w-1 self-stretch bg-[#0a7040] rounded-full shrink-0 -ml-3 mr-1" />
                    <svg className="w-5 h-5 text-[#0a7040] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
                    </svg>
                    <div>
                      <button className="text-sm font-semibold text-[#0770a2] hover:underline text-left">{a.title}</button>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5 text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{a.status}</span><span>|</span>
                        <span><span className="font-medium text-gray-700">Due</span> {a.due}</span><span>|</span>
                        <span>{a.points}</span><span>|</span><span>{a.graded}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DISCUSSIONS ── */}
          {activeItem === "Discussions" && (
            <div>
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
                <select className="border border-gray-300 rounded text-sm px-3 py-1.5 text-gray-600 bg-white focus:outline-none">
                  <option>All</option><option>Unread</option><option>Subscribed</option>
                </select>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by title or author..."
                    className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-full focus:outline-none focus:border-gray-400"
                  />
                </div>
                <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#0a7040] text-white text-sm rounded hover:bg-[#085c35] transition-colors">
                  <Plus className="w-4 h-4" /> Add Discussion
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
                  <Settings className="w-4 h-4" /> Settings
                </button>
              </div>

              {/* Discussions section */}
              <div className="mx-6 mt-4 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    <span className="text-gray-400">▼</span> Discussions
                  </div>
                  <span className="text-xs italic text-gray-400">Ordered by Recent Activity</span>
                </div>
                <div className="border border-dashed border-gray-300 rounded-md py-12 flex flex-col items-center gap-3">
                  <svg viewBox="0 0 120 80" className="w-32 h-20" fill="none">
                    <rect x="5" y="5" width="50" height="35" rx="6" stroke="#ccc" strokeWidth="1.5" strokeDasharray="4 3"/>
                    <circle cx="10" cy="17" r="3" fill="#ccc"/><circle cx="20" cy="17" r="3" fill="#ccc"/><circle cx="30" cy="17" r="3" fill="#ccc"/>
                    <circle cx="45" cy="55" r="14" fill="#f4a261"/><circle cx="70" cy="50" r="14" fill="#84a98c"/>
                    <rect x="55" y="10" width="50" height="30" rx="6" stroke="#ccc" strokeWidth="1.5" strokeDasharray="4 3"/>
                    <circle cx="62" cy="22" r="3" fill="#ccc"/><circle cx="72" cy="22" r="3" fill="#ccc"/><circle cx="82" cy="22" r="3" fill="#ccc"/>
                  </svg>
                  <p className="text-sm font-semibold text-gray-700">There are no discussions to show in this section</p>
                  <button className="text-sm text-[#0770a2] hover:underline">Click here to add a discussion</button>
                </div>
              </div>

              {/* Closed for Comments section */}
              <div className="mx-6 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    <span className="text-gray-400">▼</span> Closed for Comments
                  </div>
                  <span className="text-xs italic text-gray-400">Ordered by Recent Activity</span>
                </div>
                <div className="border border-dashed border-gray-300 rounded-md py-12 flex flex-col items-center gap-3">
                  <svg viewBox="0 0 120 80" className="w-32 h-20" fill="none">
                    <rect x="5" y="15" width="50" height="38" rx="3" fill="none" stroke="#ccc" strokeWidth="1.5"/>
                    <rect x="12" y="22" width="30" height="3" rx="1" fill="#ccc"/><rect x="12" y="29" width="24" height="3" rx="1" fill="#ccc"/>
                    <rect x="8" y="10" width="10" height="12" rx="2" stroke="#e07070" strokeWidth="1.5"/>
                    <circle cx="38" cy="58" r="13" fill="#f4a8a8"/>
                    <rect x="60" y="15" width="50" height="38" rx="3" fill="none" stroke="#ccc" strokeWidth="1.5"/>
                    <rect x="67" y="22" width="30" height="3" rx="1" fill="#ccc"/><rect x="67" y="29" width="24" height="3" rx="1" fill="#ccc"/>
                    <rect x="63" y="10" width="10" height="12" rx="2" stroke="#e07070" strokeWidth="1.5"/>
                    <circle cx="80" cy="58" r="13" fill="#a8c4f4"/>
                  </svg>
                  <p className="text-sm font-semibold text-gray-700">You currently have no discussions with closed comments</p>
                </div>
              </div>
            </div>
          )}

          {/* ── GRADES ── */}
          {activeItem === "Grades" && (
            <div className="flex gap-0 h-full">
              {/* Main */}
              <div className="flex-1 px-8 py-6">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-normal text-gray-800">Grades for Bondoc, Jhon Paul C</h2>
                  <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50">
                    <Printer className="w-4 h-4" /> Print Grades
                  </button>
                </div>

                {/* Arrange by */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-gray-700">Arrange By</span>
                  <select value={arrangeBy} onChange={e => setArrangeBy(e.target.value)}
                    className="border border-gray-300 rounded text-sm px-3 py-1.5 bg-white focus:outline-none w-40">
                    <option>Due Date</option><option>Title</option><option>Assignment Group</option>
                  </select>
                  <button className="px-4 py-1.5 bg-gray-200 text-sm text-gray-700 rounded hover:bg-gray-300 transition-colors">Apply</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button className="px-4 py-2 text-sm border-b-2 border-gray-800 font-medium text-gray-800">Assignments</button>
                  <button className="px-4 py-2 text-sm text-[#0770a2] hover:bg-gray-50">Learning Mastery</button>
                </div>

                {/* Grade table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left pb-2 font-medium text-gray-700">Name</th>
                      <th className="text-left pb-2 font-medium text-gray-700">Due</th>
                      <th className="text-left pb-2 font-medium text-gray-700">Submitted</th>
                      <th className="text-left pb-2 font-medium text-gray-700">Status</th>
                      <th className="text-left pb-2 font-medium text-gray-700">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3">
                          <button className="text-[#0770a2] hover:underline text-sm">{a.title}</button>
                          <div className="text-xs text-gray-400 mt-0.5">Assignments</div>
                        </td>
                        <td className="py-3 text-sm text-gray-600">{a.due}</td>
                        <td className="py-3 text-sm text-gray-600">{a.submitted}</td>
                        <td className="py-3 text-sm text-gray-600"></td>
                        <td className="py-3 text-sm text-gray-700">
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round"/>
                            </svg>
                            {a.points}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Subtotal row */}
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td className="py-2 pl-2 text-sm font-semibold text-gray-700">Assignments</td>
                      <td colSpan={3}></td>
                      <td className="py-2 text-sm text-gray-600">N/A &nbsp;&nbsp; 0.00 / 0.00</td>
                    </tr>
                    {/* Total row */}
                    <tr className="border-t-2 border-gray-300">
                      <td className="py-3 text-base font-semibold text-gray-800">Total</td>
                      <td colSpan={3}></td>
                      <td className="py-3 text-sm text-gray-600">N/A &nbsp;&nbsp; 0.00 / 0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Right panel */}
              <div className="w-56 border-l border-gray-200 px-4 py-5 shrink-0 text-sm space-y-4">
                <div>
                  <p className="text-gray-600">Total: <span className="font-semibold">N/A</span></p>
                  <button className="mt-2 w-full px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-600 hover:bg-gray-50">
                    Show All Details
                  </button>
                </div>
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-700 space-y-2">
                  <p className="font-semibold">Course assignments are not weighted.</p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-0.5 accent-[#0a7040]" />
                    <span>Calculate based only on graded assignments</span>
                  </label>
                  <p className="text-gray-500 leading-relaxed">
                    You can view your grades based on What-If scores so that you know how grades will be affected by upcoming or resubmitted assignments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── PEOPLE ── */}
          {activeItem === "People" && (
            <div className="relative">
              {/* Three-dot menu top right */}
              <div className="absolute top-3 right-4">
                <button className="text-gray-400 hover:text-gray-600 p-1">⋮</button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 px-6 pt-4">
                {(["everyone", "groups"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPeopleTab(tab)}
                    className={`px-4 py-2 text-sm capitalize transition-colors ${
                      peopleTab === tab
                        ? "border-b-2 border-gray-800 font-medium text-gray-800"
                        : "text-[#0770a2] hover:bg-gray-50"
                    }`}
                  >
                    {tab === "everyone" ? "Everyone" : "Groups"}
                  </button>
                ))}
              </div>

              {/* ── Everyone tab ── */}
              {peopleTab === "everyone" && (
                <>
                  <div className="flex items-center gap-3 px-6 py-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" placeholder="Search people"
                        value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)}
                        className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-48 focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <select className="border border-gray-300 rounded text-sm px-3 py-1.5 bg-white text-gray-600 focus:outline-none">
                      <option>All Roles</option><option>Faculty</option>
                    </select>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left pb-2 px-6 font-medium text-gray-600 w-14"></th>
                        <th className="text-left pb-2 font-medium text-gray-600">Name</th>
                        <th className="text-left pb-2 font-medium text-gray-600">Section</th>
                        <th className="text-left pb-2 font-medium text-gray-600">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPeople.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-6">
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                              </svg>
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button className="text-[#0770a2] hover:underline">{p.name}</button>
                              {p.pronouns && <span className="text-gray-400 text-xs">({p.pronouns})</span>}
                              {p.pending && <span className="px-2 py-0.5 bg-[#0a7040] text-white text-xs rounded">pending</span>}
                            </div>
                          </td>
                          <td className="py-3 text-gray-600">{p.section}</td>
                          <td className="py-3 text-gray-600">{p.role}</td>
                        </tr>
                      ))}
                      {filteredPeople.length === 0 && (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-400">No people found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {/* ── Groups tab ── */}
              {peopleTab === "groups" && (
                <div>
                  {/* Search + Add Group */}
                  <div className="flex items-center justify-between px-6 py-4">
                    <div className="relative w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" placeholder="Search Groups or People"
                        className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-full focus:outline-none focus:border-gray-400"
                      />
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a7040] text-white text-sm rounded hover:bg-[#085c35] transition-colors">
                      <Plus className="w-4 h-4" /> Group
                    </button>
                  </div>

                  {/* Group rows */}
                  <div className="px-6 space-y-3">
                    {courseGroups.length === 0 ? (
                      <p className="text-sm text-gray-400 py-6 text-center">No groups for this course.</p>
                    ) : courseGroups.map((g, idx) => (
                      <GroupRow key={g.id} group={g} isFirst={idx === 0} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SYLLABUS ── */}
          {activeItem === "Syllabus" && (
            <div className="flex gap-0 h-full">
              {/* Main */}
              <div className="flex-1 px-8 py-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-normal text-gray-800">Course Syllabus</h2>
                  <button className="text-sm text-[#0770a2] hover:underline">Jump to Today</button>
                </div>

                <h3 className="text-xl font-normal text-gray-800 mb-3">Course Summary:</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left pb-2 font-medium text-gray-700 w-48">Date</th>
                      <th className="text-left pb-2 font-medium text-gray-700">Details</th>
                      <th className="text-right pb-2 font-medium text-gray-700">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id} className="border-b border-gray-100 bg-gray-50 hover:bg-gray-100">
                        <td className="py-3 text-gray-700 font-medium">Wed Feb 11, 2026</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="4" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round"/>
                            </svg>
                            <button className="text-[#0770a2] hover:underline">{a.title}</button>
                          </div>
                        </td>
                        <td className="py-3 text-right text-gray-600">due by 1:29pm</td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr><td colSpan={3} className="py-6 text-center text-gray-400 text-sm">No items in syllabus.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Right panel — mini calendar */}
              <div className="w-56 border-l border-gray-200 px-4 py-5 shrink-0 space-y-4">
                <MiniCalendar />
                <div className="pt-3 border-t border-gray-100 text-xs text-gray-700">
                  <p className="font-semibold">Course assignments are not weighted.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT: AllCoursesPage — Now with proper group navigation
// ══════════════════════════════════════════════════════════════════════════════

interface AllCoursesPageProps {
  onBack: () => void;
  onGroupOpen?: (groupName: string, courseName: string) => void;
  initialCourse?: CourseRow;
}

export default function AllCoursesPage({ onBack, onGroupOpen, initialCourse }: AllCoursesPageProps) {
  const [courses, setCourses]         = useState<CourseRow[]>(ALL_COURSES);
  const [selectedCourse, setSelected] = useState<CourseRow | null>(initialCourse ?? null);

  const toggleFavorite = (id: string) => {
    setCourses(prev => prev.map(c => c.id === id ? { ...c, favorited: !c.favorited } : c));
  };

  const handleGroupClick = (group: GroupRow) => {
    if (onGroupOpen) {
      onGroupOpen(group.name, group.course);
    }
  };

  if (selectedCourse) {
    return <CoursePage course={selectedCourse} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="fixed top-0 left-80px right-0 bottom-0 bg-white z-50 flex flex-col overflow-hidden">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 shrink-0">
        <button onClick={onBack} className="text-blue-600 hover:underline text-sm">Courses</button>
        <span className="text-gray-400 text-sm">›</span>
        <span className="text-sm text-gray-700">All Courses</span>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <h1 className="text-2xl font-normal text-gray-800 mb-4">All Courses</h1>
        <div className="mb-6">
          <button className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Browse More Courses
          </button>
        </div>

        <table className="w-full text-sm mb-10">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 text-xs font-medium text-gray-600 w-8">Favorite ↕</th>
              <th className="text-left pb-2 text-xs font-medium text-gray-600 pl-4">Course ↕</th>
              <th className="text-left pb-2 text-xs font-medium text-gray-600">Nickname ↕</th>
              <th className="text-left pb-2 text-xs font-medium text-gray-600">Term ↕</th>
              <th className="text-left pb-2 text-xs font-medium text-gray-600">Enrolled as ↕</th>
              <th className="text-left pb-2 text-xs font-medium text-gray-600">Published ↑</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {courses.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3">
                  <button onClick={() => toggleFavorite(c.id)}
                    className={`transition-colors ${c.favorited ? "text-yellow-400" : "text-gray-300 hover:text-gray-400"}`}>
                    <Star className="w-4 h-4" fill={c.favorited ? "currentColor" : "none"} />
                  </button>
                </td>
                <td className="py-3 pl-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                    <button onClick={() => setSelected(c)} className="text-blue-600 hover:underline text-sm text-left">
                      {c.title}
                    </button>
                  </div>
                </td>
                <td className="py-3 text-gray-400 text-sm">{c.nickname || "—"}</td>
                <td className="py-3 text-gray-600 text-sm">{c.term}</td>
                <td className="py-3 text-gray-600 text-sm">{c.enrolledAs}</td>
                <td className="py-3 text-gray-600 text-sm">{c.published ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-2xl font-normal text-gray-800 mb-4">My Groups</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 text-xs font-medium text-gray-600 w-1/3">Group</th>
              <th className="text-left pb-2 text-xs font-medium text-gray-600 w-1/3">Course</th>
              <th className="text-left pb-2 text-xs font-medium text-gray-600 w-1/3">Term</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {MY_GROUPS.map(g => (
              <tr key={g.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                <td className="py-3">
                  <button 
                    onClick={() => handleGroupClick(g)}
                    className="text-blue-600 hover:underline text-sm">
                    {g.name}
                  </button>
                </td>
                <td className="py-3 text-gray-600 text-sm">{g.course}</td>
                <td className="py-3 text-gray-600 text-sm">{g.term || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}