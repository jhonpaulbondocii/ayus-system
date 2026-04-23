"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";

const DAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAYS_MINI  = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const HOURS      = ["12am","1am","2am","3am","4am","5am","6am","7am","8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm","10pm","11pm"];

// ── Types ──────────────────────────────────────────────────────────────────
interface CalendarEvent {
  id:       string;
  title:    string;
  date:     string; // ISO string
  type:     "assignment" | "groupset";
  color:    string;
  sourceId: string; // courseId or groupSetId
  sourceName: string;
  detail?:         string | null;
  availableUntil?: string | null;
}

interface UndatedEvent {
  id:         string;
  title:      string;
  color:      string;
  sourceName: string;
  sourceId:   string;
  detail?:    string | null;
}

interface Course {
  id: string; name: string; code: string; color: string;
  status: "PUBLISHED" | "UNPUBLISHED"; term: string | null;
}

interface GroupSet {
  id: string; name: string; courseId: string;
  course: { name: string };
  groups: { id: string; name: string; _count?: { members: number } }[];
}

interface Assignment {
  id:          string;
  title:       string;
  description: string | null;
  dueDate:     string | null;
  status:         "PUBLISHED" | "UNPUBLISHED";
  availableUntil: string | null;
  course:         { id: string; name: string; code: string; color: string } | null;
  group:          { id: string; name: string; groupSetId: string | null } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }
function getWeekStart(d: Date) {
  const w = new Date(d); w.setDate(w.getDate() - w.getDay()); return w;
}

// ── Mini Calendar ──────────────────────────────────────────────────────────
function MiniCalendar({ year, month, today, selected, onPrev, onNext, onSelect, events }: {
  year: number; month: number; today: Date; selected: Date;
  onPrev: () => void; onNext: () => void;
  onSelect: (d: Date) => void; events: CalendarEvent[];
}) {
  const first = getFirstDay(year, month);
  const days  = getDaysInMonth(year, month);
  const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const hasEvent = (day: number|null) => {
    if (!day) return false;
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return events.some(e => e.date.startsWith(ds));
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onPrev} className="text-gray-400 hover:text-gray-700 px-1 text-lg leading-none">‹</button>
        <span className="text-xs font-semibold text-gray-700">{MONTHS[month]} {year}</span>
        <button onClick={onNext} className="text-gray-400 hover:text-gray-700 px-1 text-lg leading-none">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_MINI.map((d,i) => <div key={i} className="text-center text-[10px] text-gray-400 font-medium">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day,i) => {
          const isToday = day !== null && sameDay(new Date(year,month,day), today);
          const isSel   = day !== null && sameDay(new Date(year,month,day), selected);
          return (
            <div key={i} className="flex flex-col items-center py-0.5">
              <button onClick={() => day && onSelect(new Date(year,month,day))}
                className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-full transition-colors
                  ${!day ? "invisible" : "hover:bg-gray-100 cursor-pointer"}
                  ${isToday ? "border border-blue-500 text-blue-600 font-bold" : "text-gray-600"}
                  ${isSel && !isToday ? "bg-blue-500 text-white" : ""}`}>
                {day || ""}
              </button>
              {hasEvent(day) && <div className="w-1 h-1 rounded-full bg-[#7b1113] mt-0.5"/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month View ─────────────────────────────────────────────────────────────
function MonthView({ year, month, today, events, hiddenSources, onSelectEvent }: {
  year: number; month: number; today: Date;
  events: CalendarEvent[]; hiddenSources: Set<string>;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const first = getFirstDay(year, month);
  const days  = getDaysInMonth(year, month);
  const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const forDay = (day: number|null) => {
    if (!day) return [];
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return events.filter(e => e.date.startsWith(ds) && !hiddenSources.has(e.sourceId));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-200 shrink-0">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 tracking-wide">{d}</div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full">
          {cells.map((day,idx) => {
            const isToday = day !== null && sameDay(new Date(year,month,day), today);
            const items   = forDay(day);
            return (
              <div key={idx}
                className={`border-b border-r border-gray-100 min-h-24 p-1
                  ${!day ? "bg-gray-50/40" : "bg-white hover:bg-gray-50/30"}
                  ${isToday ? "bg-blue-50/20" : ""}`}>
                {day && (
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1
                    ${isToday ? "bg-blue-500 text-white" : "text-gray-600"}`}>
                    {day}
                  </span>
                )}
                <div className="space-y-0.5">
                  {items.slice(0, 3).map(ev => (
                    <button key={ev.id} onClick={() => onSelectEvent(ev)}
                      className={`w-full text-left text-[11px] rounded px-1.5 py-0.5 truncate leading-tight hover:opacity-80 transition-opacity border
                        ${ev.availableUntil && new Date(ev.availableUntil) < new Date() ? "line-through opacity-60" : ""}`}
                      style={{ backgroundColor: ev.color + "22", borderColor: ev.color + "66", color: ev.color }}>
                      {new Date(ev.date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} {ev.title}
                    </button>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[10px] text-gray-400 px-1">{items.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Week View ──────────────────────────────────────────────────────────────
function WeekView({ weekStart, today, events, hiddenSources }: {
  weekStart: Date; today: Date;
  events: CalendarEvent[]; hiddenSources: Set<string>;
}) {
  const days = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });
  const forDay = (d: Date) =>
    events.filter(e => e.date.startsWith(fmtDate(d)) && !hiddenSources.has(e.sourceId));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-8 border-b border-gray-200 shrink-0">
        <div className="py-2 text-center text-[10px] text-gray-400">GMT+8</div>
        {days.map((d,i) => (
          <div key={i} className={`py-2 text-center border-l border-gray-100 ${sameDay(d,today) ? "border-t-2 border-t-blue-500" : ""}`}>
            <div className="text-[10px] font-semibold text-gray-400 uppercase">{DAYS_SHORT[d.getDay()]}</div>
            <div className={`text-lg font-bold mx-auto w-9 h-9 flex items-center justify-center rounded-full mt-0.5
              ${sameDay(d,today) ? "bg-blue-500 text-white" : "text-gray-700"}`}>
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-50" style={{minHeight:"48px"}}>
            <div className="text-[10px] text-gray-300 text-right pr-2 pt-1 shrink-0">{hour}</div>
            {days.map((d,i) => {
              const items = forDay(d).filter(ev => {
                const h = new Date(ev.date).getHours();
                const label = h===0?"12am":h<12?`${h}am`:h===12?"12pm":`${h-12}pm`;
                return label === hour;
              });
              return (
                <div key={i} className="border-l border-gray-50">
                  {items.map(ev => (
                    <div key={ev.id}
                      className="mx-0.5 mt-0.5 px-1.5 py-1 text-[11px] rounded border truncate cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: ev.color + "22", borderColor: ev.color + "66", color: ev.color }}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Agenda View ────────────────────────────────────────────────────────────
function AgendaView({ startDate, events, hiddenSources, onSelectEvent }: {
  startDate: Date; events: CalendarEvent[]; hiddenSources: Set<string>;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const ds = fmtDate(startDate);
  const upcoming = [...events]
    .filter(e => e.date >= ds && !hiddenSources.has(e.sourceId))
    .sort((a,b) => a.date.localeCompare(b.date));

  if (upcoming.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-400">No upcoming events.</p>
      </div>
    );
  }

  const grouped: Record<string, CalendarEvent[]> = {};
  for (const ev of upcoming) {
    const key = ev.date.slice(0,10);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  }

  return (
    <div className="flex-1 overflow-y-auto px-6">
      {Object.entries(grouped).map(([date, evs]) => {
        const d = new Date(date + "T00:00:00");
        const dayName = `${DAYS_SHORT[d.getDay()].charAt(0)}${DAYS_SHORT[d.getDay()].slice(1).toLowerCase()}, ${MONTHS[d.getMonth()].slice(0,3)} ${d.getDate()}`;
        return (
          <div key={date}>
            {/* Date header row */}
            <div className="py-2 mt-2">
              <span className="text-sm font-semibold text-gray-700">{dayName}</span>
            </div>
            {/* Events for this day */}
            {evs.map(ev => {
              const isLocked = ev.availableUntil && new Date(ev.availableUntil) < new Date();
              const timeFmt = new Date(ev.date).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", hour12:true });
              return (
                <button key={ev.id} onClick={() => onSelectEvent(ev)}
                  className="w-full flex items-start gap-3 py-1.5 px-2 rounded hover:bg-gray-50 transition-colors text-left group">
                  {/* Assignment checkbox icon */}
                  <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none"
                    style={{ color: isLocked ? "#aaa" : ev.color }}>
                    <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4.5 8.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {/* Due label + time */}
                  <span className="text-xs text-gray-500 shrink-0 w-24 pt-0.5">
                    Due {timeFmt.toLowerCase()}
                  </span>
                  {/* Title */}
                  <span className={`text-sm font-medium leading-snug ${isLocked ? "line-through text-gray-400" : ""}`}
                    style={{ color: isLocked ? undefined : ev.color }}>
                    {ev.title}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Event Modal ────────────────────────────────────────────────────────────
function EventModal({ event, onClose }: { event: CalendarEvent|null; onClose: () => void }) {
  if (!event) return null;
  const due = new Date(event.date);
  const dueFmt = due.toLocaleString("en-US", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", hour12:true });
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0" onClick={onClose}/>
      <div className="relative bg-white rounded shadow-xl w-full max-w-md z-10 overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-500">Assignment</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm leading-none">✕</button>
        </div>
        <div className="px-5 py-4">
          <h1 className="text-lg font-semibold leading-snug mb-1" style={{ color: event.color }}>
            {event.title}
          </h1>
          <p className="text-xs text-gray-500 mb-4">Due: {dueFmt}</p>
          <div className="flex gap-3 mb-2 text-xs">
            <span className="text-gray-500 w-28 shrink-0">Source Calendar</span>
            <span className="font-medium" style={{ color: event.color }}>{event.sourceName}</span>
          </div>
          {event.detail && (
            <div className="flex gap-3 text-xs mb-4">
              <span className="text-gray-500 w-28 shrink-0">Details</span>
              <span className="text-gray-700 leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: event.detail ?? "" }}/>
            </div>
          )}
          {event.availableUntil && new Date(event.availableUntil) < new Date() && (
            <p className="text-xs text-gray-500 border-t border-gray-100 pt-3 mt-2">
              This assignment was locked {new Date(event.availableUntil).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:true})}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Undated Event Modal ────────────────────────────────────────────────────
function UndatedModal({ event, onClose }: { event: UndatedEvent|null; onClose: () => void }) {
  if (!event) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0" onClick={onClose}/>
      <div className="relative bg-white rounded shadow-xl w-full max-w-md z-10 overflow-hidden border border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
          <span className="text-xs font-medium text-gray-500">Assignment</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm leading-none">✕</button>
        </div>
        <div className="px-5 py-4">
          <h1 className="text-lg font-semibold leading-snug mb-1" style={{ color: event.color }}>
            {event.title}
          </h1>
          <p className="text-xs text-gray-500 mb-4">No Date</p>
          <div className="flex gap-3 mb-2 text-xs">
            <span className="text-gray-500 w-28 shrink-0">Source Calendar</span>
            <span className="font-medium" style={{ color: event.color }}>{event.sourceName}</span>
          </div>
          {event.detail && (
            <div className="flex gap-3 text-xs mb-4">
              <span className="text-gray-500 w-28 shrink-0">Details</span>
              <span className="text-gray-700 leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: event.detail ?? "" }}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function AdminCalendarPage() {
  const today = new Date();

  const [view,         setView]         = useState<"week"|"month"|"agenda">("month");
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selected,     setSelected]     = useState(today);
  const [weekStart,    setWeekStart]    = useState(() => getWeekStart(today));
  const [selectedEv,   setSelectedEv]   = useState<CalendarEvent|null>(null);
  const [selectedUndated, setSelectedUndated] = useState<UndatedEvent|null>(null);
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(new Set());
  const [events,       setEvents]       = useState<CalendarEvent[]>([]);
  const [undatedEvents, setUndatedEvents] = useState<UndatedEvent[]>([]);
  const [courses,      setCourses]      = useState<Course[]>([]);
  const [groupSets,    setGroupSets]    = useState<GroupSet[]>([]);
  const [loading,      setLoading]      = useState(true);
  const searchParams = useSearchParams();
  const [, startTransition]             = useTransition();

  // Collapse state for sidebar sections
  const [calendarsOpen, setCalendarsOpen] = useState(true);
  const [undatedOpen,   setUndatedOpen]   = useState(true);

  // Color picker
  const [colorPickerId,    setColorPickerId]    = useState<string|null>(null);
  const [colorPickerInput, setColorPickerInput] = useState("#efefef");
  const [colorOverrides,   setColorOverrides]   = useState<Record<string,string>>({});

  const PRESET_COLORS = [
    "#e66000","#e02020","#c81e88","#7e3fa8","#5c4f99",
    "#1d6ac4","#2185ce","#0086d0","#008879","#009688",
    "#4da12b","#9c7a00","#e56b2c","#c53c00","#d84082",
  ];

  const openColorPicker = (id: string, currentColor: string) => {
    setColorPickerId(id);
    setColorPickerInput(currentColor);
  };

  const applyColor = () => {
    if (!colorPickerId) return;
    setColorOverrides(prev => ({ ...prev, [colorPickerId]: colorPickerInput }));
    setEvents(prev => prev.map(e => e.sourceId === colorPickerId ? { ...e, color: colorPickerInput } : e));
    setUndatedEvents(prev => prev.map(e => e.sourceId === colorPickerId ? { ...e, color: colorPickerInput } : e));
    setColorPickerId(null);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, groupsRes, assignRes] = await Promise.all([
          fetch("/api/admin/courses").then(r => r.json()),
          fetch("/api/admin/groupsets").then(r => r.json()).catch(() => ({ groupSets: [] })),
          fetch("/api/admin/assignments").then(r => r.json()).catch(() => ({ assignments: [] })),
        ]);

        const fetchedCourses: Course[]         = coursesRes.courses      ?? [];
        const fetchedGroupSets: GroupSet[]     = groupsRes.groupSets     ?? [];
        const fetchedAssignments: Assignment[] = assignRes.assignments   ?? [];

        setCourses(fetchedCourses);
        setGroupSets(fetchedGroupSets);

        const allEvents: CalendarEvent[] = [];
        const allUndated: UndatedEvent[] = [];

        for (const a of fetchedAssignments) {
          const color      = a.course?.color ?? "#7b1113";
          const sourceId   = a.course?.id ?? (a.group?.id ?? "unknown");
          const sourceName = a.course?.name ?? "Unknown Course";

          if (!a.dueDate) {
            allUndated.push({
              id:         `undated-${a.id}`,
              title:      a.title,
              color,
              sourceName,
              sourceId,
              detail:     a.description,
            });
          } else {
            allEvents.push({
              id:         `asgn-${a.id}`,
              title:      a.title,
              date:       a.dueDate,
              type:       "assignment",
              color,
              sourceId,
              sourceName,
              detail:         a.description,
              availableUntil: a.availableUntil ?? null,
            });
          }
        }

        // If ?course= param present, hide all other sources
        const courseParam = searchParams.get("course");
        startTransition(() => {
          setEvents(allEvents);
          setUndatedEvents(allUndated);
          if (courseParam) {
            const allIds = new Set([
              ...fetchedCourses.map(c => c.id).filter(id => id !== courseParam),
              ...fetchedGroupSets.map(gs => gs.id),
            ]);
            setHiddenSources(allIds);
          }
          setLoading(false);
        });
      } catch {
        startTransition(() => setLoading(false));
      }
    };
    load();
  }, []);

  // Navigation
  const prevMonth = () => currentMonth===0 ? (setCurrentMonth(11), setCurrentYear(y=>y-1)) : setCurrentMonth(m=>m-1);
  const nextMonth = () => currentMonth===11? (setCurrentMonth(0),  setCurrentYear(y=>y+1)) : setCurrentMonth(m=>m+1);
  const prevWeek  = () => { const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  const nextWeek  = () => { const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };

  const goToday = () => {
    setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear());
    setWeekStart(getWeekStart(today)); setSelected(today);
  };

  const handleSelect = (d: Date) => {
    setSelected(d); setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear()); setWeekStart(getWeekStart(d));
  };

  const handlePrev = () => view==="month" ? prevMonth() : view==="week" ? prevWeek() : (() => { const d=new Date(selected); d.setDate(d.getDate()-1); setSelected(d); })();
  const handleNext = () => view==="month" ? nextMonth() : view==="week" ? nextWeek() : (() => { const d=new Date(selected); d.setDate(d.getDate()+1); setSelected(d); })();

  const headerLabel = () => {
    if (view==="month") return `${MONTHS[currentMonth]} ${currentYear}`;
    if (view==="week") {
      const end = new Date(weekStart); end.setDate(end.getDate()+6);
      return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    // Show range: selected date to last visible event date
    const upcoming = [...events].filter(e => e.date >= fmtDate(selected)).sort((a,b) => a.date.localeCompare(b.date));
    const last = upcoming.length > 0 ? new Date(upcoming[upcoming.length-1].date) : selected;
    const startFmt = `${MONTHS[selected.getMonth()].slice(0,3)} ${selected.getDate()}, ${selected.getFullYear()}`;
    const endFmt   = `${MONTHS[last.getMonth()].slice(0,3)} ${last.getDate()}, ${last.getFullYear()}`;
    return startFmt === endFmt ? startFmt : `${startFmt} – ${endFmt}`;
  };

  const toggleSource = (id: string) => {
    setHiddenSources(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const calendarSources = [
    ...courses.map(c => ({ id: c.id, name: c.name, color: colorOverrides[c.id] ?? c.color, type: "course" as const })),
    ...groupSets.map(gs => {
      const base = courses.find(c => c.id === gs.courseId)?.color ?? "#7b1113";
      return { id: gs.id, name: gs.name, color: colorOverrides[gs.id] ?? base, type: "group" as const };
    }),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-200 shrink-0">
          <button onClick={goToday}
            className="px-3 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Today
          </button>
          <button onClick={handlePrev}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded hover:bg-gray-50 text-gray-500 text-sm">
            ‹
          </button>
          <button onClick={handleNext}
            className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded hover:bg-gray-50 text-gray-500 text-sm">
            ›
          </button>
          <h2 className="text-sm font-semibold text-gray-800 ml-1">{headerLabel()}</h2>
          <div className="ml-auto flex items-center border border-gray-200 rounded overflow-hidden">
            {(["Week","Month","Agenda"] as const).map((v,i) => (
              <button key={v}
                onClick={() => setView(v.toLowerCase() as "week"|"month"|"agenda")}
                className={`px-4 py-1.5 text-xs font-medium transition-colors
                  ${i > 0 ? "border-l border-gray-200" : ""}
                  ${view===v.toLowerCase() ? "bg-[#7b1113] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400">Loading calendar...</p>
          </div>
        ) : (
          <>
            {view==="month"  && <MonthView  year={currentYear} month={currentMonth} today={today} events={events} hiddenSources={hiddenSources} onSelectEvent={setSelectedEv}/>}
            {view==="week"   && <WeekView   weekStart={weekStart} today={today} events={events} hiddenSources={hiddenSources}/>}
            {view==="agenda" && <AgendaView startDate={selected} events={events} hiddenSources={hiddenSources} onSelectEvent={setSelectedEv}/>}
          </>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-56 border-l border-gray-200 bg-white overflow-y-auto p-4 shrink-0">
        <MiniCalendar
          year={currentYear} month={currentMonth}
          today={today} selected={selected}
          onPrev={prevMonth} onNext={nextMonth}
          onSelect={handleSelect} events={events}
        />

        {/* CALENDARS section */}
        <div className="mb-5">
          <button
            onClick={() => setCalendarsOpen(o => !o)}
            className="flex items-center gap-1.5 mb-2.5 w-full text-left hover:opacity-70 transition-opacity">
            <span className={`text-[10px] text-gray-400 transition-transform ${calendarsOpen ? "" : "-rotate-90"}`}>▼</span>
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Calendars</h3>
          </button>

          {calendarsOpen && (loading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : calendarSources.length === 0 ? (
            <p className="text-xs text-gray-400">No calendars yet.</p>
          ) : (
            <div className="space-y-1.5">
              {calendarSources.map(src => (
                <div key={src.id} className="flex items-center justify-between group">
                  <label className="flex items-center gap-2 cursor-pointer min-w-0" onClick={() => toggleSource(src.id)}>
                    <div
                      className="w-3 h-3 rounded-sm shrink-0 transition-opacity"
                      style={{ backgroundColor: src.color, opacity: hiddenSources.has(src.id) ? 0.3 : 1 }}
                    />
                    <span className={`text-xs truncate transition-colors ${hiddenSources.has(src.id) ? "text-gray-300" : "text-gray-600"}`}>
                      {src.name}
                    </span>
                  </label>
                  <button
                    onClick={() => openColorPicker(src.id, src.color)}
                    className="text-gray-300 opacity-0 group-hover:opacity-100 text-xs hover:text-gray-600 shrink-0 ml-1"
                    title="Change color">
                    ⋮
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* UNDATED section */}
        <div>
          <button
            onClick={() => setUndatedOpen(o => !o)}
            className="flex items-center gap-1.5 mb-2.5 w-full text-left hover:opacity-70 transition-opacity">
            <span className={`text-[10px] text-gray-400 transition-transform ${undatedOpen ? "" : "-rotate-90"}`}>▼</span>
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Undated</h3>
          </button>

          {undatedOpen && (loading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : undatedEvents.length === 0 ? (
            <p className="text-xs text-gray-400">No undated items.</p>
          ) : (
            <div className="space-y-1">
              {undatedEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => setSelectedUndated(ev)}
                  className="w-full flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-gray-50 transition-colors text-left"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none" style={{ color: ev.color }}>
                    <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4.5 8.5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs truncate font-medium" style={{ color: ev.color }}>
                    {ev.title}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Calendar Feed */}
        <div className="mt-5 pt-4 border-t border-gray-100">
          <button className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
            <span>📅</span> Calendar Feed
          </button>
        </div>
      </div>

      <EventModal event={selectedEv} onClose={() => setSelectedEv(null)}/>
      <UndatedModal event={selectedUndated} onClose={() => setSelectedUndated(null)}/>

      {/* Color Picker Popup */}
      {colorPickerId && (
        <div className="fixed inset-0 z-50" onClick={() => setColorPickerId(null)}>
          <div className="absolute right-60 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 w-56"
            onClick={e => e.stopPropagation()}>
            <p className="text-xs font-semibold text-gray-700 mb-3">Select course colour</p>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {PRESET_COLORS.map(c => (
                <button key={c} onClick={() => setColorPickerInput(c)}
                  className="w-8 h-8 rounded transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: colorPickerInput === c ? "2px solid #333" : "none",
                    outlineOffset: "2px",
                  }}/>
              ))}
            </div>
            <input
              type="text"
              value={colorPickerInput}
              onChange={e => setColorPickerInput(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs mb-3 font-mono"
              placeholder="#efefef"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setColorPickerId(null)}
                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={applyColor}
                className="px-3 py-1.5 text-xs text-white rounded bg-blue-600 hover:bg-blue-700">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}