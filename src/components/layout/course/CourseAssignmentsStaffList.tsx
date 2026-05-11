"use client";

// src/components/layout/course/CourseAssignmentsStaffList.tsx

import { useState } from "react";
import { Search, CheckCircle } from "lucide-react";
import { MAROON, FONT, fmtDate, fmtAvail } from "./helpers";
import type { Assignment } from "./types";

type AssignmentWithRole = Assignment & {
  _assignmentRole?: "manager" | "submitter";
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherRole?: string | null;
  _publisherId?: string | null;
};

/* ─── Role Badge ─────────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role?: string | null }) {
  if (!role) return null;
  const normalized = role.toUpperCase();
  const styles: Record<string, React.CSSProperties> = {
    ADMIN: { background: "#fef2f2", color: MAROON, border: "1px solid #fecaca" },
    HEAD: { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
    STAFF: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
  };
  const style = styles[normalized] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
  return (
    <span style={{ ...style, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
      {normalized}
    </span>
  );
}

/* ─── Publisher Chip ─────────────────────────────────────────────────────── */
function PublisherChip({ name, image, role }: { name?: string | null; image?: string | null; role?: string | null }) {
  if (!name) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-5 h-5 rounded-full overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0 text-[9px] font-black text-white" style={{ background: MAROON }}>
        {image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={image} alt={name} className="w-full h-full object-cover" />
          : name.charAt(0).toUpperCase()}
      </span>
      <span className="text-xs font-semibold text-gray-700 truncate max-w-30">{name}</span>
      <RoleBadge role={role} />
    </span>
  );
}

/* ─── Assignment Icon ────────────────────────────────────────────────────── */
function AssignmentIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="3" width="14" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Single Assignment Row ──────────────────────────────────────────────── */
function AssignmentRow({
  a,
  onSelect,
}: {
  a: AssignmentWithRole;
  onSelect: (a: AssignmentWithRole) => void;
}) {
  const now = new Date();
  const sub = a.submissions?.[0];
  const isLocked = a.availableFrom && now < new Date(a.availableFrom);
  const isClosed = a.availableUntil && now > new Date(a.availableUntil);

  return (
    <div
      className="flex items-start sm:items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 relative cursor-pointer group"
      onClick={() => onSelect(a)}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full" style={{ background: MAROON }} />

      {/* Submitted check or doc icon */}
      <div className="shrink-0 mt-0.5">
        {sub?.submittedAt
          ? <CheckCircle size={18} className="text-green-500" />
          : <AssignmentIcon className="w-5 h-5 text-gray-400" />}
      </div>

      <div className="flex-1 min-w-0">
        {/* Title */}
        <p
          className="text-sm font-semibold truncate group-hover:underline"
          style={{ color: MAROON, fontFamily: FONT }}
        >
          {a.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
          {/* Availability status */}
          {isLocked && (
            <span className="font-medium text-amber-600">Opens {fmtDate(a.availableFrom)}</span>
          )}
          {isClosed && !isLocked && (
            <span className="font-medium text-gray-500">Closed</span>
          )}
          {!isLocked && !isClosed && a.availableFrom && a.availableUntil && (
            <span className="font-medium text-gray-600">Available {fmtAvail(a.availableFrom, a.availableUntil)}</span>
          )}

          {/* Due date */}
          {a.dueDate && (
            <>
              <span className="text-gray-300">·</span>
              <span>
                <span className="font-medium text-gray-700">Due</span>{" "}
                {fmtDate(a.dueDate)}
              </span>
            </>
          )}

          {/* Points */}
          <span className="text-gray-300">·</span>
          <span className={sub?.grade != null ? "font-bold text-gray-800" : ""}>
            {sub?.grade != null ? `${sub.grade} / ${a.points} pts` : `- / ${a.points} pts`}
          </span>

          {/* Publisher */}
          {a._publisherName && (
            <>
              <span className="text-gray-300">·</span>
              <PublisherChip name={a._publisherName} image={a._publisherImage} role={a._publisherRole} />
            </>
          )}

          {/* Submitted badge */}
          {sub?.submittedAt && (
            <>
              <span className="text-gray-300">·</span>
              <span className="font-semibold text-green-600 flex items-center gap-1">
                <CheckCircle size={11} /> Submitted
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Collapsible Section ────────────────────────────────────────────────── */
function AssignmentSection({
  title,
  count,
  items,
  onSelect,
}: {
  title: string;
  count: number;
  items: AssignmentWithRole[];
  onSelect: (a: AssignmentWithRole) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-1">
      {/* Section header — matches Head UI style */}
      <div
        className="flex items-center gap-2 px-4 sm:px-5 py-2.5 cursor-pointer select-none border-b border-gray-200"
        style={{ background: "#fafafa" }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span
          className="text-[10px] transition-transform inline-block text-gray-400"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >▼</span>
        <span className="text-sm font-bold text-gray-700">{title}</span>
        <span className="text-xs text-gray-400 ml-0.5">({count})</span>
      </div>

      {!collapsed && (
        <div>
          {items.map(a => (
            <AssignmentRow key={a.id} a={a} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Publisher Group (for "By Author" view) ─────────────────────────────── */
function PublisherGroup({
  publisherName,
  publisherImage,
  publisherRole,
  items,
  onSelect,
}: {
  publisherName: string;
  publisherImage?: string | null;
  publisherRole?: string | null;
  items: AssignmentWithRole[];
  onSelect: (a: AssignmentWithRole) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3">
      {/* Group header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        style={{ background: "#f0f4ff" }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span
          className="text-[10px] transition-transform inline-block text-gray-400"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        >▼</span>
        <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow shrink-0 flex items-center justify-center text-xs font-black text-white" style={{ background: MAROON }}>
          {publisherImage
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={publisherImage} alt={publisherName} className="w-full h-full object-cover" />
            : publisherName.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-bold text-gray-800">{publisherName}</span>
        {publisherRole && <RoleBadge role={publisherRole} />}
        <span className="text-xs text-gray-400 ml-auto">({items.length})</span>
      </div>

      {/* Items */}
      {!collapsed && (
        <div className="border-t border-gray-100">
          {items.map(a => (
            <AssignmentRow key={a.id} a={a} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Export ────────────────────────────────────────────────────────── */
interface Props {
  assignments: AssignmentWithRole[];
  courseId: string;
  onSelectAssignment?: (a: AssignmentWithRole) => void;
}

export default function CourseAssignmentsStaffList({ assignments, courseId, onSelectAssignment }: Props) {
  void courseId;
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"name" | "author">("name");
  const now = new Date();

  const filtered = assignments.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── By Name groups ─────────────────────────────────────────────────────────
  const upcoming: AssignmentWithRole[] = [];
  const undated: AssignmentWithRole[] = [];
  const past: AssignmentWithRole[] = [];
  filtered.forEach(a => {
    if (!a.dueDate) undated.push(a);
    else if (new Date(a.dueDate) >= now) upcoming.push(a);
    else past.push(a);
  });

  // ── By Author groups ────────────────────────────────────────────────────────
  const authorMap = new Map<string, {
    name: string;
    image?: string | null;
    role?: string | null;
    items: AssignmentWithRole[];
  }>();
  filtered.forEach(a => {
    const key = a._publisherName ?? "Unknown";
    if (!authorMap.has(key)) {
      authorMap.set(key, { name: key, image: a._publisherImage, role: a._publisherRole, items: [] });
    }
    authorMap.get(key)!.items.push(a);
  });

  const handleSelect = (a: AssignmentWithRole) => {
    if (onSelectAssignment) onSelectAssignment(a);
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200 gap-2 flex-wrap bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            placeholder="Search assignments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 border rounded-lg text-sm w-48 sm:w-60 focus:outline-none focus:border-gray-400 transition-colors"
            style={{ borderColor: "#d1d5db", fontFamily: FONT }}
          />
        </div>

        {/* View toggle — matches Head UI */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          {(["name", "author"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap"
              style={viewMode === mode
                ? { background: MAROON, color: "#fff" }
                : { background: "transparent", color: "#6b7280" }}
            >
              {mode === "name" ? "Show by Name" : "By Author"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="w-10 h-10 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-semibold">
            {search ? `No assignments found for "${search}".` : "No assignments yet."}
          </p>
        </div>
      )}

      {/* ── By Name view ── */}
      {filtered.length > 0 && viewMode === "name" && (
        <div className="py-2">
          {upcoming.length > 0 && (
            <AssignmentSection
              title="Upcoming Assignments"
              count={upcoming.length}
              items={upcoming}
              onSelect={handleSelect}
            />
          )}
          {undated.length > 0 && (
            <AssignmentSection
              title="Undated Assignments"
              count={undated.length}
              items={undated}
              onSelect={handleSelect}
            />
          )}
          {past.length > 0 && (
            <AssignmentSection
              title="Past Assignments"
              count={past.length}
              items={past}
              onSelect={handleSelect}
            />
          )}
        </div>
      )}

      {/* ── By Author view ── */}
      {filtered.length > 0 && viewMode === "author" && (
        <div className="px-4 sm:px-5 py-4 space-y-3">
          {Array.from(authorMap.values()).map(group => (
            <PublisherGroup
              key={group.name}
              publisherName={group.name}
              publisherImage={group.image}
              publisherRole={group.role}
              items={group.items}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}