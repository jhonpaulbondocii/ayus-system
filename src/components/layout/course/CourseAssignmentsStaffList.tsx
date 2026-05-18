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
    ADMIN:   { background: "#fef2f2", color: MAROON,    border: "1px solid #fecaca" },
    HEAD:    { background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa" },
    STAFF:   { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
    TEACHER: { background: "#f5f3ff", color: "#6d28d9", border: "1px solid #ddd6fe" },
  };
  const style = styles[normalized] ?? { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" };
  return (
    <span style={{ ...style, fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase", whiteSpace: "nowrap" }}>
      {normalized}
    </span>
  );
}

/* ─── Publisher Chip ─────────────────────────────────────────────────────── */
function PublisherChip({ name, image, role }: { name?: string | null; image?: string | null; role?: string | null }) {
  if (!name) return null;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", overflow: "hidden", border: "1px solid #e5e7eb", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, fontWeight: 900, color: "#fff", backgroundColor: MAROON }}>
        {image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : name.charAt(0).toUpperCase()}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{name}</span>
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
      style={{ position: "relative", cursor: "pointer", borderBottom: "1px solid #f3f4f6", padding: "14px 16px 14px 20px", display: "flex", alignItems: "flex-start", gap: 12 }}
      onClick={() => onSelect(a)}
      onMouseEnter={e => (e.currentTarget.style.background = "#f9fafb")}
      onMouseLeave={e => (e.currentTarget.style.background = "")}
    >
      {/* Left accent bar */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: 9, background: MAROON }} />

      {/* Icon */}
      <div style={{ flexShrink: 0, marginTop: 1 }}>
        {sub?.submittedAt
          ? <CheckCircle size={18} style={{ color: "#22c55e" }} />
          : <AssignmentIcon className="w-5 h-5 text-gray-400" />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title */}
        <p style={{ fontSize: 13, fontWeight: 700, color: MAROON, fontFamily: FONT, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {a.title}
        </p>

        {/* Meta row — wraps on mobile */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 8px", marginTop: 5 }}>
          {isLocked && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#d97706" }}>Opens {fmtDate(a.availableFrom)}</span>
          )}
          {isClosed && !isLocked && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Closed</span>
          )}
          {!isLocked && !isClosed && a.availableFrom && a.availableUntil && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>Available {fmtAvail(a.availableFrom, a.availableUntil)}</span>
          )}

          {a.dueDate && (
            <>
              <span style={{ color: "#d1d5db", fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>Due</span>{" "}{fmtDate(a.dueDate)}
              </span>
            </>
          )}

          <span style={{ color: "#d1d5db", fontSize: 11 }}>·</span>
          <span style={{ fontSize: 11, color: sub?.grade != null ? "#111827" : "#6b7280", fontWeight: sub?.grade != null ? 700 : 400 }}>
            {sub?.grade != null ? `${sub.grade} / ${a.points} pts` : `- / ${a.points} pts`}
          </span>

          {a._publisherName && (
            <>
              <span style={{ color: "#d1d5db", fontSize: 11 }}>·</span>
              <PublisherChip name={a._publisherName} image={a._publisherImage} role={a._publisherRole} />
            </>
          )}

          {sub?.submittedAt && (
            <>
              <span style={{ color: "#d1d5db", fontSize: 11 }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", display: "flex", alignItems: "center", gap: 3 }}>
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
  title, count, items, onSelect,
}: {
  title: string; count: number; items: AssignmentWithRole[]; onSelect: (a: AssignmentWithRole) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", cursor: "pointer", userSelect: "none", borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{ fontSize: 10, color: "#9ca3af", transition: "transform 0.15s", display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{title}</span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>({count})</span>
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

/* ─── Publisher Group ─────────────────────────────────────────────────────── */
function PublisherGroup({
  publisherName, publisherImage, publisherRole, items, onSelect,
}: {
  publisherName: string; publisherImage?: string | null; publisherRole?: string | null;
  items: AssignmentWithRole[]; onSelect: (a: AssignmentWithRole) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", userSelect: "none", background: "#eff6ff" }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{ fontSize: 10, color: "#9ca3af", transition: "transform 0.15s", display: "inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▼</span>
        <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", border: "2px solid #fff", boxShadow: "0 1px 4px rgba(0,0,0,.12)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff", background: MAROON }}>
          {publisherImage
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={publisherImage} alt={publisherName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : publisherName.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{publisherName}</span>
        {publisherRole && <RoleBadge role={publisherRole} />}
        <span style={{ fontSize: 11, color: "#93c5fd", marginLeft: "auto" }}>({items.length})</span>
      </div>
      {!collapsed && (
        <div style={{ borderTop: "1px solid #e5e7eb" }}>
          {items.map(a => <AssignmentRow key={a.id} a={a} onSelect={onSelect} />)}
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

  const upcoming: AssignmentWithRole[] = [];
  const undated: AssignmentWithRole[] = [];
  const past: AssignmentWithRole[] = [];
  filtered.forEach(a => {
    if (!a.dueDate) undated.push(a);
    else if (new Date(a.dueDate) >= now) upcoming.push(a);
    else past.push(a);
  });

  const authorMap = new Map<string, { name: string; image?: string | null; role?: string | null; items: AssignmentWithRole[] }>();
  filtered.forEach(a => {
    const key = a._publisherName ?? "Unknown";
    if (!authorMap.has(key)) authorMap.set(key, { name: key, image: a._publisherImage, role: a._publisherRole, items: [] });
    authorMap.get(key)!.items.push(a);
  });

  const handleSelect = (a: AssignmentWithRole) => {
    if (onSelectAssignment) onSelectAssignment(a);
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#fff", flexWrap: "wrap", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#9ca3af" }} />
          <input
            placeholder="Search assignments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, paddingRight: 14, paddingTop: 6, paddingBottom: 6, border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: "min(200px, calc(100vw - 200px))", outline: "none", fontFamily: FONT }}
          />
        </div>
        <div style={{ display: "flex", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          {(["name", "author"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "none", whiteSpace: "nowrap", background: viewMode === mode ? MAROON : "transparent", color: viewMode === mode ? "#fff" : "#6b7280", transition: "background 0.15s" }}
            >
              {mode === "name" ? "By Name" : "By Author"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <svg style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.3 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
          </svg>
          <p style={{ fontSize: 13, fontWeight: 600 }}>
            {search ? `No assignments found for "${search}".` : "No assignments yet."}
          </p>
        </div>
      )}

      {/* ── By Name view ── */}
      {filtered.length > 0 && viewMode === "name" && (
        <div style={{ paddingTop: 8, paddingBottom: 8 }}>
          {upcoming.length > 0 && <AssignmentSection title="Upcoming" count={upcoming.length} items={upcoming} onSelect={handleSelect} />}
          {undated.length > 0 && <AssignmentSection title="Undated" count={undated.length} items={undated} onSelect={handleSelect} />}
          {past.length > 0 && <AssignmentSection title="Past" count={past.length} items={past} onSelect={handleSelect} />}
        </div>
      )}

      {/* ── By Author view ── */}
      {filtered.length > 0 && viewMode === "author" && (
        <div style={{ padding: "16px" }}>
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