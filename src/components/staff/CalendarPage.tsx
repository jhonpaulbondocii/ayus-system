"use client";

import { useState, useEffect, useTransition } from "react";

const DAYS_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAYS_MINI  = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const HOURS      = ["12am","1am","2am","3am","4am","5am","6am","7am","8am","9am","10am","11am","12pm","1pm","2pm","3pm","4pm","5pm","6pm","7pm","8pm","9pm","10pm","11pm"];

// ── Types ──────────────────────────────────────────────────────────────────
interface AssignmentType {
  id:          string;
  title:       string;
  description: string | null;
  dueDate:     string;
  status:      string;
  grade:       number | null;
  course:      { id: string; name: string; code: string; color: string } | null;
  group:       { id: string; name: string } | null;
}

// ── Color helpers ──────────────────────────────────────────────────────────
function statusColor(status: string) {
  switch (status) {
    case "SUBMITTED": return "bg-blue-50 border-blue-300 text-blue-600";
    case "GRADED":    return "bg-green-50 border-green-300 text-green-600";
    case "OVERDUE":   return "bg-red-50 border-red-300 text-red-600";
    default:          return "bg-amber-50 border-amber-300 text-amber-600";
  }
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }
function getWeekStart(d: Date) {
  const w = new Date(d); w.setDate(w.getDate()-w.getDay()); return w;
}

// ── Mini Calendar ──────────────────────────────────────────────────────────
function MiniCalendar({ year, month, today, selected, onPrev, onNext, onSelect, assignments }: {
  year: number; month: number; today: Date; selected: Date;
  onPrev: () => void; onNext: () => void;
  onSelect: (d: Date) => void; assignments: AssignmentType[];
}) {
  const first = getFirstDay(year, month);
  const days  = getDaysInMonth(year, month);
  const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length%7!==0) cells.push(null);

  const hasDue = (day: number|null) => {
    if (!day) return false;
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return assignments.some(a => a.dueDate.startsWith(ds));
  };

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <button onClick={onPrev} className="text-gray-300 hover:text-gray-600 px-1">‹</button>
        <span className="text-xs font-semibold text-gray-600">{MONTHS[month]} {year}</span>
        <button onClick={onNext} className="text-gray-300 hover:text-gray-600 px-1">›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS_MINI.map((d,i) => <div key={i} className="text-center text-xs text-gray-300">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day,i) => {
          const isToday = day!==null && sameDay(new Date(year,month,day), today);
          const isSel   = day!==null && sameDay(new Date(year,month,day), selected);
          return (
            <div key={i} className="flex flex-col items-center">
              <button onClick={() => day && onSelect(new Date(year,month,day))}
                className={`text-xs w-6 h-6 flex items-center justify-center rounded-full transition-colors
                  ${!day?"invisible":"hover:bg-gray-100 cursor-pointer"}
                  ${isToday?"border border-blue-400 text-blue-500 font-bold":"text-gray-600"}
                  ${isSel&&!isToday?"bg-blue-500 text-white":""}`}>
                {day||""}
              </button>
              {hasDue(day) && <div className="w-1 h-1 rounded-full bg-amber-400 mt-0.5"/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month View ─────────────────────────────────────────────────────────────
function MonthView({ year, month, today, assignments, onSelect }: {
  year: number; month: number; today: Date;
  assignments: AssignmentType[]; onSelect: (a: AssignmentType) => void;
}) {
  const first = getFirstDay(year, month);
  const days  = getDaysInMonth(year, month);
  const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({length:days},(_,i)=>i+1)];
  while (cells.length%7!==0) cells.push(null);

  const forDay = (day: number|null) => {
    if (!day) return [];
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return assignments.filter(a => a.dueDate.startsWith(ds));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100 shrink-0">
        {DAYS_SHORT.map(d => <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>)}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7">
          {cells.map((day,idx) => {
            const isToday = day!==null && sameDay(new Date(year,month,day),today);
            const items   = forDay(day);
            return (
              <div key={idx}
                className={`border-b border-r border-gray-50 min-h-24 p-1
                  ${!day?"bg-gray-50/30":"bg-white hover:bg-gray-50/50"}
                  ${isToday?"bg-blue-50/30":""}`}>
                {day && (
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday?"bg-blue-500 text-white":"text-gray-600"}`}>
                    {day}
                  </span>
                )}
                <div className="mt-1 space-y-0.5">
                  {items.map(a => (
                    <button key={a.id} onClick={() => onSelect(a)}
                      className={`w-full text-left text-xs rounded border px-1.5 py-0.5 truncate leading-tight hover:shadow-sm transition-shadow
                        ${statusColor(a.status)}
                        ${(a.status==="GRADED"||a.status==="SUBMITTED")?"line-through opacity-60":""}`}>
                      {new Date(a.dueDate).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})} {a.title}
                    </button>
                  ))}
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
function WeekView({ weekStart, today, assignments }: {
  weekStart: Date; today: Date; assignments: AssignmentType[];
}) {
  const days = Array.from({length:7},(_,i) => { const d=new Date(weekStart); d.setDate(d.getDate()+i); return d; });
  const forDay = (d: Date) => assignments.filter(a => a.dueDate.startsWith(fmtDate(d)));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-8 border-b border-gray-100 shrink-0">
        <div/>
        {days.map((d,i) => (
          <div key={i} className={`py-2 text-center border-l border-gray-50 ${sameDay(d,today)?"border-t-2 border-t-blue-400":""}`}>
            <div className="text-xs font-medium text-gray-500">{DAYS_SHORT[d.getDay()]} {d.getMonth()+1}/{d.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-50" style={{minHeight:"40px"}}>
            <div className="text-xs text-gray-300 text-right pr-2 pt-1">{hour}</div>
            {days.map((d,i) => {
              const items = forDay(d).filter(a => {
                const h = new Date(a.dueDate).getHours();
                const label = h===0?"12am":h<12?`${h}am`:h===12?"12pm":`${h-12}pm`;
                return label===hour;
              });
              return (
                <div key={i} className="border-l border-gray-50">
                  {items.map(a => (
                    <div key={a.id}
                      className={`mx-0.5 mt-0.5 px-1 py-0.5 text-xs rounded border truncate
                        ${statusColor(a.status)}
                        ${(a.status==="GRADED"||a.status==="SUBMITTED")?"line-through opacity-60":""}`}>
                      {a.title}
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
function AgendaView({ startDate, assignments }: { startDate: Date; assignments: AssignmentType[] }) {
  const ds = fmtDate(startDate);
  const upcoming = [...assignments]
    .filter(a => a.dueDate >= ds)
    .sort((a,b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {upcoming.length===0 ? (
        <p className="text-xs text-gray-400">No upcoming assignments.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map(a => (
            <div key={a.id}
              className={`flex items-start gap-4 p-2.5 rounded border text-xs
                ${statusColor(a.status)}
                ${(a.status==="GRADED"||a.status==="SUBMITTED")?"line-through opacity-60":""}`}>
              <span className="font-medium w-24 shrink-0">{a.dueDate.slice(0,10)}</span>
              <span>{a.title} {a.course ? `· ${a.course.name}` : a.group ? `· ${a.group.name}` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Assignment Modal ───────────────────────────────────────────────────────
function AssignmentModal({ assignment, onClose }: { assignment: AssignmentType|null; onClose: () => void }) {
  if (!assignment) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose}/>
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto z-10">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-sm font-medium text-gray-600">Assignment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <h1 className="text-lg font-semibold text-blue-600 leading-tight">{assignment.title}</h1>
          <div className="space-y-1.5 text-sm">
            <p className="text-gray-700"><strong>Due:</strong> {new Date(assignment.dueDate).toLocaleString()}</p>
            {assignment.course && <p className="text-gray-700"><strong>Course:</strong> {assignment.course.name}</p>}
            {assignment.group  && <p className="text-gray-700"><strong>Group:</strong>  {assignment.group.name}</p>}
          </div>
          {assignment.description && (
            <div className="border-t border-gray-100 pt-3">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Details</h3>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{assignment.description}</p>
            </div>
          )}
          <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <p className="text-xs text-gray-700">
              <strong>Status:</strong>{" "}
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium inline-block
                ${assignment.status==="GRADED"?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                {assignment.status}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Color Picker ───────────────────────────────────────────────────────────
const COLORS = [
  {hex:"#BD3C14",bg:"bg-orange-600"},{hex:"#FF0000",bg:"bg-red-500"},{hex:"#FF1493",bg:"bg-pink-500"},
  {hex:"#A020F0",bg:"bg-purple-600"},{hex:"#4B0082",bg:"bg-indigo-700"},{hex:"#0000FF",bg:"bg-blue-600"},
  {hex:"#00CED1",bg:"bg-cyan-500"}, {hex:"#20B2AA",bg:"bg-teal-500"}, {hex:"#00AA00",bg:"bg-green-600"},
  {hex:"#9ACD32",bg:"bg-lime-500"}, {hex:"#FFD700",bg:"bg-yellow-500"},{hex:"#FFA500",bg:"bg-orange-500"},
  {hex:"#FFB6C1",bg:"bg-pink-300"},
];

function ColorPicker({ onClose, onApply }: { onClose:()=>void; onApply:(c:string)=>void }) {
  const [sel, setSel] = useState(COLORS[0].hex);
  return (
    <div className="bg-white rounded-lg shadow-lg p-5 max-w-sm w-full border border-gray-200">
      <div className="mb-4 flex items-center gap-2">
        <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono font-semibold">{sel}</div>
        <h2 className="text-sm font-medium text-gray-700">Course colour</h2>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {COLORS.map(c => (
          <button key={c.hex} onClick={() => setSel(c.hex)}
            className={`w-10 h-10 rounded ${c.bg} ${sel===c.hex?"ring-2 ring-offset-1 ring-gray-400":""}`}/>
        ))}
      </div>
      <input type="text" value={sel} onChange={e=>setSel(e.target.value.toUpperCase())}
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none font-mono mb-4"/>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-600">Cancel</button>
        <button onClick={() => { onApply(COLORS.find(c=>c.hex===sel)?.bg||sel); onClose(); }}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Apply</button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const today = new Date();
  const [view,         setView]         = useState<"week"|"month"|"agenda">("month");
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selected,     setSelected]     = useState(today);
  const [weekStart,    setWeekStart]    = useState(() => getWeekStart(today));
  const [selectedA,    setSelectedA]    = useState<AssignmentType|null>(null);
  const [colorOpen,    setColorOpen]    = useState<string|null>(null);
  const [calColors,    setCalColors]    = useState<Record<string,string>>({});
  const [assignments,  setAssignments]  = useState<AssignmentType[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [, startTransition]             = useTransition();

  useEffect(() => {
    fetch("/api/assignments")
      .then(r => r.json())
      .then(d => startTransition(() => { setAssignments(d.assignments ?? []); setLoading(false); }))
      .catch(() => startTransition(() => setLoading(false)));
  }, []);

  const prevMonth = () => currentMonth===0 ? (setCurrentMonth(11), setCurrentYear(y=>y-1)) : setCurrentMonth(m=>m-1);
  const nextMonth = () => currentMonth===11? (setCurrentMonth(0),  setCurrentYear(y=>y+1)) : setCurrentMonth(m=>m+1);
  const prevWeek  = () => { const d=new Date(weekStart); d.setDate(d.getDate()-7); setWeekStart(d); };
  const nextWeek  = () => { const d=new Date(weekStart); d.setDate(d.getDate()+7); setWeekStart(d); };
  const prevDay   = () => { const d=new Date(selected);  d.setDate(d.getDate()-1); setSelected(d); };
  const nextDay   = () => { const d=new Date(selected);  d.setDate(d.getDate()+1); setSelected(d); };

  const goToday = () => {
    setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear());
    setWeekStart(getWeekStart(today)); setSelected(today);
  };

  const handleSelect = (d: Date) => {
    setSelected(d); setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear()); setWeekStart(getWeekStart(d));
  };

  const handlePrev = () => view==="month"?prevMonth():view==="week"?prevWeek():prevDay();
  const handleNext = () => view==="month"?nextMonth():view==="week"?nextWeek():nextDay();

  const headerLabel = () => {
    if (view==="month") return `${MONTHS[currentMonth]} ${currentYear}`;
    if (view==="week") {
      const end=new Date(weekStart); end.setDate(end.getDate()+6);
      return `${MONTHS[weekStart.getMonth()]} ${weekStart.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${MONTHS[selected.getMonth()]} ${selected.getDate()}, ${selected.getFullYear()}`;
  };

  // Unique calendars from assignments
  const calendarSources = [
    ...new Map(
      assignments
        .filter(a => a.course)
        .map(a => [a.course!.id, { id: a.course!.id, name: a.course!.name }])
    ).values()
  ];

  const pendingAssignments = assignments.filter(a => a.status==="PENDING"||a.status==="OVERDUE");

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-100 shrink-0">
          <button onClick={goToday} className="px-3 py-1 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">Today</button>
          <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded text-gray-400">←</button>
          <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded text-gray-400">→</button>
          <h2 className="text-sm font-semibold text-gray-700">{headerLabel()}</h2>
          <div className="ml-auto flex items-center gap-0.5">
            {(["Week","Month","Agenda"] as const).map(v => (
              <button key={v} onClick={() => setView(v.toLowerCase() as "week"|"month"|"agenda")}
                className={`px-3 py-1 text-xs border rounded transition-colors
                  ${view===v.toLowerCase()?"bg-gray-700 text-white border-gray-700":"bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-gray-400">Loading calendar...</p>
          </div>
        )}
        {!loading && view==="month"  && <MonthView  year={currentYear} month={currentMonth} today={today} assignments={assignments} onSelect={setSelectedA}/>}
        {!loading && view==="week"   && <WeekView   weekStart={weekStart} today={today} assignments={assignments}/>}
        {!loading && view==="agenda" && <AgendaView startDate={selected} assignments={assignments}/>}
      </div>

      {/* Right sidebar */}
      {colorOpen ? (
        <div className="w-52 border-l border-gray-100 bg-white p-4 shrink-0">
          <ColorPicker onClose={() => setColorOpen(null)}
            onApply={c => { setCalColors(prev=>({...prev,[colorOpen!]:c})); setColorOpen(null); }}/>
        </div>
      ) : (
        <div className="w-52 border-l border-gray-100 bg-white overflow-y-auto p-4 shrink-0">
          <MiniCalendar year={currentYear} month={currentMonth} today={today} selected={selected}
            onPrev={prevMonth} onNext={nextMonth} onSelect={handleSelect} assignments={assignments}/>

          {/* Calendars */}
          {calendarSources.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-xs text-gray-300">▼</span>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Calendars</h3>
              </div>
              <div className="space-y-1.5">
                {calendarSources.map(cal => (
                  <div key={cal.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-sm ${calColors[cal.id]||"bg-blue-500"}`}/>
                      <span className="text-xs text-gray-600">{cal.name}</span>
                    </div>
                    <button onClick={() => setColorOpen(cal.id)}
                      className="text-gray-300 opacity-0 group-hover:opacity-100 text-xs hover:text-gray-600">⋮</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pending</h3>
            {pendingAssignments.length===0 ? (
              <p className="text-xs text-gray-400">No pending assignments</p>
            ) : (
              <div className="space-y-1.5">
                {pendingAssignments.map(a => (
                  <div key={a.id} className="flex items-start gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0"/>
                    <div>
                      <p className="text-xs text-gray-700 leading-snug">{a.title}</p>
                      <p className="text-xs text-amber-500">{a.dueDate.slice(0,10)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AssignmentModal assignment={selectedA} onClose={() => setSelectedA(null)}/>
    </div>
  );
}