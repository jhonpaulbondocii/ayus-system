"use client";

// src/components/admin/AttendancePage.tsx

import { useState, useRef, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
type AttendanceStatus =
  | "present" | "absent" | "late" | "excused"
  | "sports" | "religious" | "prearranged" | "university" | "participation"
  | null;

interface Student {
  id:      string;
  name:    string;
  course:  string;
  image?:  string | null;
  initials: string;
  color:   string;
}

interface Group {
  id:        string;
  name:      string;
  memberIds: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDateHeader(d: Date) {
  const days   = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return { day: days[d.getDay()], month: months[d.getMonth()], date: d.getDate() };
}

function formatDateDetail(d: Date) {
  const days   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dd = String(d.getDate()).padStart(2, "0");
  return `${days[d.getDay()]} ${months[d.getMonth()]} ${dd}`;
}

const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function stringToColor(str: string): string {
  const colors = ["#e74c3c","#e67e22","#f1c40f","#2ecc71","#1abc9c","#3498db","#9b59b6","#e91e63","#00bcd4","#ff5722"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getFirstName(name: string): string {
  return name.split(",")[0].trim();
}

// ── Status Icon ────────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: AttendanceStatus }) {
  if (status === "present" || status === "participation") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#5cb85c]">
        <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none">
          <polyline points="1.5,6 4.5,9.5 10.5,2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  if (status === "absent" || status === "sports" || status === "religious" || status === "prearranged" || status === "university") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#d9534f]">
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
          <line x1="2" y1="2" x2="10" y2="10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="10" y1="2" x2="2" y2="10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }
  if (status === "late") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#f0ad4e]">
        <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none">
          <polyline points="1.5,6 4.5,9.5 10.5,2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  if (status === "excused") {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-[#999]">
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
          <line x1="2" y1="2" x2="10" y2="10" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
          <line x1="10" y1="2" x2="2" y2="10" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
    );
  }
  // null
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-[#bbb]">
      <span className="w-1.5 h-1.5 rounded-full border border-[#bbb] block" />
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ student, size = 10 }: { student: Student; size?: number }) {
  const [imgError, setImgError] = useState(false);
  if (student.image && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={student.image} alt={student.name} onError={() => setImgError(true)}
        className={`w-${size} h-${size} rounded-full object-cover shrink-0`} />
    );
  }
  return (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}
      style={{ backgroundColor: student.color }}>
      {student.initials}
    </div>
  );
}

// ── Mini Calendar ──────────────────────────────────────────────────────────────
function CalendarPicker({ date, onSelect, onClose }: { date: Date; onSelect: (d: Date) => void; onClose: () => void }) {
  const [viewYear,  setViewYear]  = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today       = new Date();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const prevM = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextM = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  return (
    <div ref={ref} className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-xl z-50 w-60 p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevM} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-xs">◀</button>
        <span className="text-xs font-semibold text-gray-700">{MONTHS_LONG[viewMonth]} {viewYear}</span>
        <button onClick={nextM} className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-xs">▶</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday    = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const isSelected = day === date.getDate() && viewMonth === date.getMonth() && viewYear === date.getFullYear();
          return (
            <button key={i} onClick={() => { onSelect(new Date(viewYear, viewMonth, day)); onClose(); }}
              className={`text-[11px] w-7 h-7 rounded mx-auto flex items-center justify-center transition-colors
                ${isSelected ? "bg-blue-600 text-white font-bold" : isToday ? "bg-yellow-100 text-yellow-700 font-bold" : "text-gray-700 hover:bg-gray-100"}`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── MORE Dropdown ──────────────────────────────────────────────────────────────
function MoreDropdown({ onSetStatus, onClose }: { onSetStatus: (s: AttendanceStatus) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const options: { status: AttendanceStatus; label: string }[] = [
    { status: "present",       label: "Present"                    },
    { status: "absent",        label: "Absent"                     },
    { status: "late",          label: "Late"                       },
    { status: "excused",       label: "Excused"                    },
    { status: "prearranged",   label: "Absent - Prearranged"       },
    { status: "religious",     label: "Absent - Religious Holiday" },
    { status: "sports",        label: "Absent - Sports"            },
    { status: "university",    label: "University Excused Absence" },
    { status: "participation", label: "Participation"              },
  ];

  return (
    <div ref={ref} className="absolute right-0 top-full mt-0.5 bg-white border border-gray-300 rounded shadow-lg z-50 w-52 py-1">
      {options.map(o => (
        <button key={o.status as string} onClick={() => { onSetStatus(o.status); onClose(); }}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-[#f5f5f5]">
          {o.label}
        </button>
      ))}
      <div className="border-t border-gray-200 mt-1 pt-1">
        <button onClick={() => { onSetStatus(null); onClose(); }}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-[#f5f5f5]">
          Clear status
        </button>
      </div>
    </div>
  );
}

// ── Roll Call Settings Modal ───────────────────────────────────────────────────
function RollCallSettingsModal({ onClose }: { onClose: () => void }) {
  const [noCount, setNoCount] = useState(false);
  const [latePct, setLatePct] = useState(80);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/40 z-300 flex items-center justify-center">
      <div ref={ref} className="bg-white rounded shadow-xl w-96 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#f5f5f5] border-b border-gray-300">
          <span className="text-sm font-semibold text-gray-700">Roll Call settings</span>
          <button onClick={onClose} className="w-5 h-5 flex items-center justify-center border border-gray-400 rounded text-gray-500 hover:bg-gray-200 text-xs">✕</button>
        </div>
        <div className="px-5 py-5 space-y-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={noCount} onChange={e => setNoCount(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-gray-700">Do not count attendance toward final grade</span>
          </label>
          <div>
            <p className="text-sm text-gray-700 mb-3">A lateness counts as what percent of a presence?</p>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={latePct} onChange={e => setLatePct(Number(e.target.value))} className="flex-1 accent-yellow-500" />
              <span className="text-base font-bold text-yellow-500 w-12 text-right">{latePct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Group Dropdown ─────────────────────────────────────────────────────────────
function GroupDropdown({ courseName, groups, value, onChange }: {
  courseName: string; groups: Group[]; value: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const label = value === "all" ? courseName : groups.find(g => g.id === value)?.name ?? courseName;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 border border-gray-300 rounded px-3 py-1 text-sm text-gray-700 bg-white hover:bg-[#f5f5f5] min-w-35 h-8">
        <span className="flex-1 text-left truncate font-medium">{label}</span>
        <svg className="w-3 h-3 text-gray-500 shrink-0" fill="currentColor" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z"/></svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-300 rounded shadow-lg z-50 w-56 py-1 max-h-64 overflow-y-auto">
          <button onClick={() => { onChange("all"); setOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm transition-colors
              ${value === "all" ? "bg-[#1b7cbc] text-white font-semibold" : "text-gray-700 hover:bg-[#f5f5f5]"}`}>
            {courseName}
          </button>
          {groups.length > 0 && (
            <>
              <div className="border-t border-gray-200 my-1" />
              <p className="px-4 py-1 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Groups</p>
              {groups.map(g => (
                <button key={g.id} onClick={() => { onChange(g.id); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors
                    ${value === g.id ? "bg-[#1b7cbc] text-white font-semibold" : "text-gray-700 hover:bg-[#f5f5f5]"}`}>
                  {g.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Student Detail Panel ───────────────────────────────────────────────────────
function StudentDetail({ student, status, allStatuses, onSetStatus, date }: {
  student:     Student;
  status:      AttendanceStatus;
  allStatuses: Record<string, Record<string, AttendanceStatus>>;
  onSetStatus: (s: AttendanceStatus) => void;
  date:        Date;
}) {
  const dateKey = date.toDateString();

  // Per-student stats across all dates
  const own         = Object.values(allStatuses[student.id] ?? {});
  const presentDays = own.filter(s => s === "present" || s === "participation").length;
  const lateDays    = own.filter(s => s === "late").length;
  const absentDays  = own.filter(s => s === "absent" || s === "sports" || s === "religious" || s === "prearranged" || s === "university").length;
  const totalDays   = own.length;
  const pct = totalDays > 0 ? Math.round(((presentDays + lateDays * 0.8) / totalDays) * 100) : 100;

  // Today's stats across all students
  const dayStats = Object.values(allStatuses).reduce(
    (acc, d) => {
      const s = d[dateKey] ?? null;
      if (s === "present" || s === "participation") acc.present++;
      else if (s === "late") acc.late++;
      else if (s !== null) acc.absent++;
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );

  // Status text — matches Canvas exactly
  const statusText = (() => {
    if (!status)                  return "is unmarked";
    if (status === "present")     return "is present";
    if (status === "absent")      return "is absent";
    if (status === "late")        return "is late";
    if (status === "excused")     return "is excused";
    if (status === "participation") return "is participating";
    if (status === "prearranged") return "is absent (prearranged)";
    if (status === "religious")   return "is absent (religious holiday)";
    if (status === "sports")      return "is absent (sports)";
    if (status === "university")  return "is university excused";
    return "is unmarked";
  })();

  // 4 quick buttons matching Canvas exactly
  const quickBtns: { key: AttendanceStatus; icon: React.ReactNode; activeBg: string }[] = [
    {
      key: "present",
      activeBg: "bg-[#5cb85c] border-[#5cb85c] text-white",
      icon: <svg viewBox="0 0 14 14" className="w-4 h-4" fill="none"><polyline points="1.5,7 5,11 12.5,2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      key: "absent",
      activeBg: "bg-[#d9534f] border-[#d9534f] text-white",
      icon: <svg viewBox="0 0 14 14" className="w-4 h-4" fill="none"><line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>,
    },
    {
      key: "late",
      activeBg: "bg-[#f0ad4e] border-[#f0ad4e] text-white",
      icon: <svg viewBox="0 0 14 14" className="w-4 h-4" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.8"/><polyline points="1.5,7 5,11 12.5,2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    },
    {
      key: "excused",
      activeBg: "bg-[#333] border-[#333] text-white",
      icon: <svg viewBox="0 0 14 14" className="w-4 h-4" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.8"/><line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    },
  ];

  // Badge row
  const badgeBtns: { key: NonNullable<AttendanceStatus>; label: string }[] = [
    { key: "prearranged",   label: "ABSENT - PREARRANGED"       },
    { key: "religious",     label: "ABSENT - RELIGIOUS HOLIDAY" },
    { key: "sports",        label: "ABSENT - SPORTS"            },
    { key: "participation", label: "PARTICIPATION"              },
    { key: "present",       label: "PRESENT"                    },
    { key: "university",    label: "UNIVERSITY EXCUSED ABSENCE" },
  ];

  return (
    <div className="flex-1 px-8 py-6 overflow-y-auto">
      <h2 className="text-xl font-normal text-gray-800 mb-5">{student.name}</h2>
      <div className="flex gap-10">
        {/* Left: today stats + attendance % */}
        <div className="text-sm text-gray-700 space-y-0.5 min-w-[120px]">
          <p>Present: <span className="font-semibold">{dayStats.present}</span></p>
          <p>Late: <span className="font-semibold">{dayStats.late}</span></p>
          <p>Absent: <span className="font-semibold">{dayStats.absent}</span></p>
          <div className="pt-3 space-y-0.5">
            <p className="text-[#1b7cbc] text-xs cursor-pointer hover:underline">+ Add badge</p>
            <p className="text-[#1b7cbc] text-xs cursor-pointer hover:underline">✓ Manage badges</p>
          </div>
          <p className="pt-3">Attendance: <span className="font-semibold">{pct}%</span></p>
        </div>

        {/* Right: date + 4 quick buttons */}
        <div>
          <p className="text-sm text-gray-600 font-medium mb-2">{formatDateDetail(date)}</p>
          {/* 4 equal-width joined buttons */}
          <div className="flex border border-gray-300 rounded overflow-hidden" style={{ width: 320 }}>
            {quickBtns.map(btn => {
              const isActive = status === btn.key;
              return (
                <button key={btn.key as string}
                  onClick={() => onSetStatus(isActive ? null : btn.key)}
                  className={`flex-1 flex items-center justify-center py-2.5 border-r last:border-r-0 border-gray-300 transition-colors
                    ${isActive ? btn.activeBg : "bg-white text-gray-400 hover:bg-[#f5f5f5]"}`}>
                  {btn.icon}
                </button>
              );
            })}
          </div>
          {/* Status text */}
          <p className="text-xs text-gray-500 mt-1.5">
            {getFirstName(student.name)}, {statusText}
          </p>
        </div>
      </div>

      {/* Badge buttons */}
      <div className="flex flex-wrap gap-2 mt-6">
        {badgeBtns.map(b => {
          const isActive = status === b.key;
          return (
            <button key={b.key} onClick={() => onSetStatus(isActive ? null : b.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs border rounded transition-colors
                ${isActive ? "bg-[#333] text-white border-[#333]" : "bg-white text-gray-600 border-gray-300 hover:bg-[#f5f5f5]"}`}>
              {/* Shield icon */}
              <svg viewBox="0 0 10 12" className="w-2.5 h-3 shrink-0" fill="currentColor">
                <path d="M5 0L0 2v5c0 2.76 2.24 5 5 5s5-2.24 5-5V2L5 0z"/>
              </svg>
              {b.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AttendancePage({ courseId, courseName }: { courseId: string; courseName?: string }) {
  const [date,          setDate]          = useState(new Date());
  const [selected,      setSelected]      = useState<Student | null>(null);
  const [statuses,      setStatuses]      = useState<Record<string, Record<string, AttendanceStatus>>>({});
  const [showSettings,  setShowSettings]  = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [showCalendar,  setShowCalendar]  = useState(false);
  const [moreOpen,      setMoreOpen]      = useState<string | null>(null);
  const [allStudents,   setAllStudents]   = useState<Student[]>([]);
  const [groups,        setGroups]        = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [loading,       setLoading]       = useState(true);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pr, gr] = await Promise.all([
          fetch(`/api/admin/courses/${courseId}/people`),
          fetch(`/api/admin/courses/${courseId}/groups`),
        ]);
        const [pd, gd] = await Promise.all([pr.json(), gr.json()]);
        if (cancelled) return;
        setAllStudents((pd.people ?? []).map((p: { id: string; name: string; image?: string | null }) => ({
          id: p.id, name: p.name, course: courseName ?? "",
          image: p.image ?? null, initials: getInitials(p.name), color: stringToColor(p.id),
        })));
        setGroups(gd.groups ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [courseId, courseName]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const students = selectedGroup === "all"
    ? allStudents
    : allStudents.filter(s => groups.find(g => g.id === selectedGroup)?.memberIds.includes(s.id));

  const dateKey   = date.toDateString();
  const getStatus = (id: string): AttendanceStatus => statuses[id]?.[dateKey] ?? null;
  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setStatuses(prev => ({ ...prev, [studentId]: { ...(prev[studentId] ?? {}), [dateKey]: status } }));
  };
  const markAllPresent = () => {
    const u = { ...statuses };
    students.forEach(s => { u[s.id] = { ...(u[s.id] ?? {}), [dateKey]: "present" }; });
    setStatuses(u);
  };
  const unmarkAll = () => {
    const u = { ...statuses };
    students.forEach(s => { if (u[s.id]) { const c = { ...u[s.id] }; delete c[dateKey]; u[s.id] = c; } });
    setStatuses(u);
  };
  const prevDay = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); };
  const nextDay = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); };
  const { day, month, date: dateNum } = formatDateHeader(date);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden"
      style={{ fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* ── Dark header ── */}
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ background: "#3d3d3d" }}>
        <div className="flex items-center gap-2">
          {/* Megaphone / roll call icon */}
          <svg className="w-5 h-5 text-[#ccc]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8.5V6a1 1 0 00-1.447-.894L4 11H2a2 2 0 00-2 2v2a2 2 0 002 2h.305l1.882 4.706A1 1 0 005.118 22H7a1 1 0 00.949-1.316L6.303 17H8l9.553 3.894A1 1 0 0019 20v-2.5a3 3 0 000-6V8.5zm-2 8.636L8.677 14H4v-2h4.677L16 9.364v7.772z"/>
          </svg>
          <span className="text-sm font-semibold text-white tracking-wide">Roll Call</span>
        </div>
        <div className="flex items-center gap-0.5">
          {/* LIST tab (active) */}
          <button className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white rounded"
            style={{ background: "#555" }}>
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <rect x="0" y="1" width="4" height="3" rx="0.5"/><rect x="6" y="1" width="10" height="3" rx="0.5"/>
              <rect x="0" y="6.5" width="4" height="3" rx="0.5"/><rect x="6" y="6.5" width="10" height="3" rx="0.5"/>
              <rect x="0" y="12" width="4" height="3" rx="0.5"/><rect x="6" y="12" width="10" height="3" rx="0.5"/>
            </svg>
            LIST
          </button>
          {/* CLASS tab */}
          <button className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#aaa] hover:text-white">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <rect x="0" y="0" width="7" height="7" rx="1"/><rect x="9" y="0" width="7" height="7" rx="1"/>
              <rect x="0" y="9" width="7" height="7" rx="1"/><rect x="9" y="9" width="7" height="7" rx="1"/>
            </svg>
            CLASS
          </button>
          {/* Settings */}
          <div ref={settingsRef} className="relative ml-1">
            <button onClick={() => setSettingsOpen(o => !o)}
              className="flex items-center gap-0.5 px-2 py-1 border border-[#666] rounded text-[#aaa] hover:text-white text-xs">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 6"><path d="M0 0l4 6 4-6z"/></svg>
            </button>
            {settingsOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 w-44">
                <button onClick={() => { setShowSettings(true); setSettingsOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f5f5f5]">
                  Roll Call Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <GroupDropdown
          courseName={courseName ?? "Course"}
          groups={groups}
          value={selectedGroup}
          onChange={v => { setSelectedGroup(v); setSelected(null); }}
        />
        <div className="flex items-center gap-0.5">
          <button onClick={prevDay} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-xs font-bold">◀</button>
          <span className="text-sm text-gray-600 px-1">
            {day} <strong className="text-gray-800">{month} {dateNum}</strong>
          </span>
          <button onClick={nextDay} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded text-xs font-bold">▶</button>
          <div className="relative">
            <button onClick={() => setShowCalendar(o => !o)}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded ml-0.5">
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            {showCalendar && (
              <CalendarPicker date={date} onSelect={d => { setDate(d); setShowCalendar(false); }} onClose={() => setShowCalendar(false)} />
            )}
          </div>
        </div>
      </div>

      {/* ── Mark All / Unmark All ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 shrink-0 bg-white">
        <button onClick={markAllPresent}
          className="flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-[#f5f5f5] font-medium h-7">
          <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 text-[#5cb85c]" fill="none">
            <polyline points="1.5,7 5,11 12.5,2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          MARK ALL PRESENT
        </button>
        <button onClick={unmarkAll}
          className="flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded text-xs text-gray-600 hover:bg-[#f5f5f5] font-medium h-7">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 14 14">
            <path d="M2 7a5 5 0 105-5H4" strokeLinecap="round"/>
            <polyline points="1,4 4,4 4,7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          UNMARK ALL
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Student list */}
        <div className="w-[380px] shrink-0 overflow-y-auto border-r border-gray-200">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : students.length === 0 ? (
            <div className="py-16 text-center px-6">
              <p className="text-sm text-gray-400">{selectedGroup === "all" ? "No students enrolled" : "No students in this group"}</p>
            </div>
          ) : (
            students.map(student => {
              const status     = getStatus(student.id);
              const isSelected = selected?.id === student.id;
              return (
                <div key={student.id} onClick={() => setSelected(student)}
                  className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-colors
                    ${isSelected ? "bg-[#e8f4fb]" : "hover:bg-[#f9f9f9]"}`}>
                  <Avatar student={student} size={9} />
                  <StatusIcon status={status} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isSelected ? "text-[#1b7cbc] font-semibold" : "text-gray-700"}`}>
                      {student.name}
                    </p>
                    <p className="text-xs text-gray-400 italic truncate">{student.course}</p>
                  </div>
                  <div className="relative shrink-0">
                    <button onClick={e => { e.stopPropagation(); setMoreOpen(moreOpen === student.id ? null : student.id); }}
                      className="text-[11px] text-gray-500 border border-gray-300 rounded px-1.5 py-0.5 hover:bg-[#f5f5f5] bg-white">
                      MORE ▾
                    </button>
                    {moreOpen === student.id && (
                      <MoreDropdown onSetStatus={s => { setStatus(student.id, s); setMoreOpen(null); }} onClose={() => setMoreOpen(null)} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        {selected && students.find(s => s.id === selected.id) ? (
          <StudentDetail
            student={selected}
            status={getStatus(selected.id)}
            allStatuses={statuses}
            onSetStatus={s => setStatus(selected.id, s)}
            date={date}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            {!loading && students.length > 0 ? "Select a student to view details" : ""}
          </div>
        )}
      </div>

      {showSettings && <RollCallSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}