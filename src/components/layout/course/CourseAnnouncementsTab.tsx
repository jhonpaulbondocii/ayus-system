// src/components/layout/course/CourseAnnouncementsTab.tsx
"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { AnnouncementCreateView } from "@/components/admin/CourseAnnouncementsPage";
import { fmtDateTime, normalizeAnnouncement } from "./helpers";
import type {
  Announcement,
  AnnouncementCreateAttachment,
  Person,
  RawAnnouncement,
} from "./types";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupByDate(announcements: Announcement[]): { label: string; items: Announcement[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, Announcement[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Older: [],
  };

  for (const a of announcements) {
    if (!a.createdAt) continue;
    const d = new Date(a.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today) groups["Today"].push(a);
    else if (day >= yesterday) groups["Yesterday"].push(a);
    else if (day >= weekAgo) groups["This week"].push(a);
    else groups["Older"].push(a);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ─── AuthorAvatar ──────────────────────────────────────────────────────────────
function AuthorAvatar({
  name,
  image,
  size = 36,
}: {
  name: string | null;
  image?: string | null;
  size?: number;
}) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name ?? ""}
        width={size}
        height={size}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", flexShrink: 0,
        }}
      />
    );
  }
  const words = (name ?? "?").trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : words[0].charAt(0).toUpperCase();
  const colors = [MAROON, "#4f46e5", "#0e7490", "#15803d", "#b45309", "#7c3aed"];
  const bg = name ? colors[name.charCodeAt(0) % colors.length] : MAROON;
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: bg, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
        fontFamily: FONT, letterSpacing: "-0.02em",
      }}
    >
      {initials}
    </div>
  );
}

// ─── ConfirmModal ──────────────────────────────────────────────────────────────
function ConfirmModal({
  title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel?: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-gray-200"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: FONT }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-4 py-4">
          <p className="text-sm text-gray-600">{message}</p>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 px-4 border border-gray-300 text-xs text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-9 px-4 text-white text-xs rounded-lg hover:opacity-90"
            style={{ background: danger ? "#dc2626" : MAROON }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SwipeableCard ─────────────────────────────────────────────────────────────
function SwipeableCard({
  children,
  onDelete,
  onMarkRead,
  isRead,
}: {
  children: React.ReactNode;
  onDelete: () => void;
  onMarkRead: () => void;
  isRead: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const ACTION_WIDTH = 120;
  const THRESHOLD = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (!isDragging.current && dy > Math.abs(dx)) return;
    if (dx < 0) {
      isDragging.current = true;
      setSwiping(true);
      setOffset(Math.max(dx, -ACTION_WIDTH));
    }
  };

  const handleTouchEnd = () => {
    setOffset(Math.abs(offset) > THRESHOLD ? -ACTION_WIDTH : 0);
    setSwiping(false);
    isDragging.current = false;
  };

  const close = () => setOffset(0);

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: ACTION_WIDTH, display: "flex" }}>
        <button
          type="button"
          onClick={() => { onMarkRead(); close(); }}
          style={{
            flex: 1, background: "#3b82f6", color: "#fff",
            border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 3, fontSize: 10, fontFamily: FONT, fontWeight: 600,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {isRead ? "Unread" : "Read"}
        </button>
        <button
          type="button"
          onClick={() => { onDelete(); close(); }}
          style={{
            flex: 1, background: "#ef4444", color: "#fff",
            border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 3, fontSize: 10, fontFamily: FONT, fontWeight: 600,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
          Delete
        </button>
      </div>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.2s ease",
          position: "relative", background: "#fff",
        }}
      >
        {children}
        {offset < -10 && (
          <button
            type="button"
            onClick={close}
            style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              background: "transparent", border: "none", cursor: "default",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── AnnouncementCard (list item) ──────────────────────────────────────────────
function AnnouncementCard({
  a,
  selected,
  onToggleSelect,
  onView,
  onDelete,
  onToggleRead,
  canDelete,
}: {
  a: Announcement;
  selected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onDelete: () => void;
  onToggleRead: () => void;
  canDelete: boolean;
}) {
  const fileIcon = (name: string) =>
    /\.(png|jpe?g|gif|webp|svg)$/i.test(name) ? "🖼️"
    : /\.pdf$/i.test(name) ? "📄"
    : /\.(docx?)$/i.test(name) ? "📝"
    : /\.(xlsx?|csv)$/i.test(name) ? "📊"
    : "📎";

  const inner = (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        padding: "12px 14px",
        background: selected ? "#fef9f9" : a.read ? "#fff" : "#fffbfb",
        borderBottom: "1px solid #f3f4f6",
        cursor: "pointer", transition: "background 0.15s",
        fontFamily: FONT,
      }}
      onClick={onView}
    >
      {/* Checkbox */}
      <div onClick={(e) => { e.stopPropagation(); onToggleSelect(); }} style={{ paddingTop: 2, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          style={{ width: 15, height: 15, accentColor: MAROON, cursor: "pointer" }}
        />
      </div>

      {/* Avatar */}
      <AuthorAvatar name={a.authorName} image={a.authorImage} size={34} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 2 }}>
          {!a.read && (
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: MAROON, flexShrink: 0, marginTop: 4 }} />
          )}
          {a.locked && (
            <svg style={{ width: 11, height: 11, flexShrink: 0, marginTop: 3, color: "#9ca3af" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          <span style={{ fontSize: 13, fontWeight: a.read ? 500 : 700, color: MAROON, lineHeight: 1.35, wordBreak: "break-word" }}>
            {a.title}
          </span>
        </div>

        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 3 }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>{a.authorName}</span>
          <span style={{ margin: "0 4px" }}>·</span>
          <span>To: {a.recipientsLabel ?? "Everyone"}</span>
        </div>

        {a.body && (
          <p style={{
            fontSize: 12, color: "#6b7280", lineHeight: 1.45,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden", margin: 0,
          }}>
            {a.body}
          </p>
        )}

        {a.attachments.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
            {a.attachments.slice(0, 2).map((f) => (
              <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontSize: 10, padding: "2px 7px",
                  border: "1px solid #e5e7eb", borderRadius: 20,
                  background: "#f9fafb", color: MAROON, textDecoration: "none",
                }}>
                {fileIcon(f.name)} {f.name.length > 14 ? f.name.slice(0, 12) + "…" : f.name}
              </a>
            ))}
            {a.attachments.length > 2 && (
              <span style={{ fontSize: 10, padding: "2px 7px", border: "1px solid #e5e7eb", borderRadius: 20, background: "#f9fafb", color: "#6b7280" }}>
                +{a.attachments.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Date */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" }}>
          {fmtDateTime(a.createdAt).split(",")[0]}
        </span>
      </div>
    </div>
  );

  if (canDelete) {
    return (
      <SwipeableCard onDelete={onDelete} onMarkRead={onToggleRead} isRead={a.read}>
        {inner}
      </SwipeableCard>
    );
  }
  return inner;
}

// ─── Detail View ───────────────────────────────────────────────────────────────
function StudentAnnouncementDetail({
  announcement,
  onBack,
  onDelete,
  canDelete,
}: {
  announcement: Announcement;
  onBack: () => void;
  onDelete?: (id: string) => void;
  canDelete: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fileIcon = (name: string) =>
    /\.(png|jpe?g|gif|webp|svg)$/i.test(name) ? "🖼️"
    : /\.pdf$/i.test(name) ? "📄"
    : /\.(docx?)$/i.test(name) ? "📝"
    : /\.(xlsx?|csv)$/i.test(name) ? "📊"
    : "📎";

  return (
    <div style={{ fontFamily: FONT }}>
      {confirmDelete && (
        <ConfirmModal
          title="Delete announcement"
          message="Delete this announcement? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => { onDelete?.(announcement.id); onBack(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Sticky top bar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#fff", borderBottom: "1px solid #f0e4e4",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 14px", height: 46,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: MAROON, fontSize: 13, fontWeight: 600, fontFamily: FONT,
            padding: "6px 0",
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Announcements
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "5px 10px",
              cursor: "pointer", color: "#dc2626", fontSize: 11, fontWeight: 600, fontFamily: FONT,
            }}
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
            Delete
          </button>
        )}
      </div>

      {/* Author card */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px", borderBottom: "1px solid #f3f4f6",
        background: "#fff",
      }}>
        <AuthorAvatar name={announcement.authorName} image={announcement.authorImage} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{announcement.authorName}</span>
            {announcement.locked && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 10, color: "#6b7280", background: "#f3f4f6",
                padding: "1px 6px", borderRadius: 4, fontWeight: 500,
              }}>
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Locked
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
            {fmtDateTime(announcement.createdAt)}
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            To: <span style={{ color: "#6b7280", fontWeight: 500 }}>{announcement.recipientsLabel ?? "Everyone"}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 16px 32px", background: "#fff" }}>
        <h1 style={{
          fontSize: 17, fontWeight: 800, color: "#111827",
          lineHeight: 1.35, marginBottom: 12, fontFamily: FONT,
        }}>
          {announcement.title}
        </h1>

        {announcement.bodyHtml ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }}
            style={{ fontSize: 14, color: "#374151", lineHeight: 1.75 }}
          />
        ) : announcement.body ? (
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.75 }}>{announcement.body}</p>
        ) : (
          <p style={{ fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>No content.</p>
        )}

        {/* Attachments */}
        {announcement.attachments.length > 0 && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Attachments
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {announcement.attachments.map((f) => (
                <a
                  key={f.id}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px",
                    border: "1px solid #e5e7eb", borderRadius: 10,
                    background: "#f9fafb", textDecoration: "none", color: MAROON,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{fileIcon(f.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: MAROON, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.name}
                    </div>
                  </div>
                  <svg width="14" height="14" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Like */}
        {announcement.allowLiking && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #f3f4f6" }}>
            <button
              type="button"
              onClick={() => { setLikeCount((c) => (liked ? c - 1 : c + 1)); setLiked((v) => !v); }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 20,
                border: `1.5px solid ${liked ? MAROON : "#d1d5db"}`,
                background: liked ? "#fef2f2" : "transparent",
                color: liked ? MAROON : "#6b7280",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                transition: "all 0.15s",
              }}
            >
              👍 {liked ? "Liked" : "Like"} {likeCount > 0 && `(${likeCount})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List View ─────────────────────────────────────────────────────────────────
type FilterType = "All" | "Unread" | "Recent";

function StudentAnnouncementList({
  announcements,
  filter,
  setFilter,
  search,
  setSearch,
  onMarkAllRead,
  onView,
  onToggleRead,
  onDeleteSelected,
  onDeleteOne,
  selectedIds,
  setSelectedIds,
  canDelete,
  onAdd,
  canCreate,
}: {
  announcements: Announcement[];
  filter: FilterType;
  setFilter: (v: FilterType) => void;
  search: string;
  setSearch: (v: string) => void;
  onMarkAllRead: () => void;
  onView: (id: string) => void;
  onToggleRead: (id: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  onDeleteOne: (id: string) => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  canDelete: boolean;
  onAdd: () => void;
  canCreate: boolean;
}) {
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [confirmSingleId, setConfirmSingleId] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const hasSelection = selectedIds.size > 0;
  const allChecked = announcements.length > 0 && announcements.every((a) => selectedIds.has(a.id));
  const unreadCount = announcements.filter((a) => !a.read).length;

  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(announcements.map((a) => a.id)));
  };
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const grouped = useMemo(() => groupByDate(announcements), [announcements]);

  const FILTER_PILLS: { label: string; value: FilterType; count?: number }[] = [
    { label: "All", value: "All" },
    { label: "Unread", value: "Unread", count: unreadCount },
    { label: "Recent", value: "Recent" },
  ];

  return (
    <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", minHeight: "100%" }}>
      {confirmBulkDelete && (
        <ConfirmModal
          title="Delete announcements"
          message={`Delete ${selectedIds.size} announcement${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { onDeleteSelected([...selectedIds]); setSelectedIds(new Set()); setConfirmBulkDelete(false); }}
          onCancel={() => setConfirmBulkDelete(false)}
        />
      )}
      {confirmSingleId && (
        <ConfirmModal
          title="Delete announcement"
          message="Delete this announcement? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={() => { onDeleteOne(confirmSingleId); setConfirmSingleId(null); }}
          onCancel={() => setConfirmSingleId(null)}
        />
      )}

      {/* ── Sticky Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#fff", borderBottom: "1px solid #f0e4e4" }}>

        {/* Filter pills */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 14px 0", overflowX: "auto", scrollbarWidth: "none",
        }}>
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setFilter(pill.value)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 20, flexShrink: 0,
                border: filter === pill.value ? `1.5px solid ${MAROON}` : "1.5px solid #e5e7eb",
                background: filter === pill.value ? "#fef2f2" : "#fff",
                color: filter === pill.value ? MAROON : "#6b7280",
                fontSize: 12, fontWeight: filter === pill.value ? 700 : 500,
                cursor: "pointer", fontFamily: FONT, transition: "all 0.15s",
              }}
            >
              {pill.label}
              {pill.count !== undefined && pill.count > 0 && (
                <span style={{
                  background: filter === pill.value ? MAROON : "#e5e7eb",
                  color: filter === pill.value ? "#fff" : "#374151",
                  fontSize: 10, fontWeight: 700, padding: "0 5px",
                  borderRadius: 10, minWidth: 16, textAlign: "center",
                }}>
                  {pill.count}
                </span>
              )}
            </button>
          ))}
          <div style={{ marginLeft: "auto", flexShrink: 0 }}>
            <button
              type="button"
              onClick={onMarkAllRead}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: 20,
                border: "1.5px solid #e5e7eb", background: "#fff",
                color: "#6b7280", fontSize: 11, fontWeight: 500,
                cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap",
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Mark all read
            </button>
          </div>
        </div>

        {/* Search + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px 10px" }}>
          <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
            <svg style={{ position: "absolute", left: 10, color: "#9ca3af", flexShrink: 0 }}
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search announcements…"
              style={{
                width: "100%", height: 36, paddingLeft: 32, paddingRight: 10,
                border: `1.5px solid ${searchFocused ? MAROON : "#e5e7eb"}`,
                borderRadius: 20, fontSize: 13, outline: "none",
                background: "#f9fafb", color: "#111827", fontFamily: FONT,
                transition: "border-color 0.15s",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{ position: "absolute", right: 10, background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 0 }}
              >×</button>
            )}
          </div>

          {canCreate && (
            <button
              type="button"
              onClick={onAdd}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                height: 36, padding: "0 14px", borderRadius: 20,
                background: MAROON, color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: FONT,
                flexShrink: 0, whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
              <span>New</span>
            </button>
          )}

          {canDelete && hasSelection && (
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(true)}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: "50%",
                background: "#fef2f2", border: "1px solid #fecaca",
                cursor: "pointer", color: "#dc2626", flexShrink: 0,
              }}
              title={`Delete ${selectedIds.size} selected`}
            >
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
        </div>

        {/* Selection bar */}
        {hasSelection && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px 8px",
            background: "#fef9f9", borderTop: "1px solid #fde8e8",
          }}>
            <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ width: 15, height: 15, accentColor: MAROON }} />
            <span style={{ fontSize: 12, color: MAROON, fontWeight: 600 }}>{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#9ca3af", fontFamily: FONT, textDecoration: "underline" }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      {announcements.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "60px 20px",
          textAlign: "center", color: "#9ca3af", flex: 1,
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📢</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#374151", marginBottom: 4 }}>No announcements</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            {search ? `No results for "${search}"` : filter !== "All" ? `No ${filter.toLowerCase()} announcements` : "Nothing here yet."}
          </div>
          {!search && filter === "All" && canCreate && (
            <button
              type="button"
              onClick={onAdd}
              style={{
                padding: "9px 20px", borderRadius: 20,
                background: MAROON, color: "#fff",
                border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: FONT,
              }}
            >
              ＋ New Announcement
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Select-all row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 14px", borderBottom: "1px solid #f3f4f6", background: "#f9fafb",
          }}>
            <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ width: 15, height: 15, accentColor: MAROON }} />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>Select all</span>
          </div>

          {grouped.map(({ label, items }) => (
            <div key={label}>
              <div style={{
                padding: "8px 14px 4px",
                fontSize: 10, fontWeight: 700, color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.07em",
                background: "#f9fafb", borderBottom: "1px solid #f3f4f6",
              }}>
                {label}
              </div>
              {items.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  a={a}
                  selected={selectedIds.has(a.id)}
                  onToggleSelect={() => toggleOne(a.id)}
                  onView={() => onView(a.id)}
                  onDelete={() => {
                    if (canDelete) setConfirmSingleId(a.id);
                  }}
                  onToggleRead={() => onToggleRead(a.id)}
                  canDelete={canDelete}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
interface Props {
  courseId: string;
  courseStatus: string;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  people: Person[];
  canManageAnnouncements: boolean;
  canDelete: boolean;
  isHead: boolean;
  isStaff: boolean;
  currentUserId: string;
}

export default function CourseAnnouncementsTab({
  courseId,
  courseStatus,
  announcements,
  setAnnouncements,
  people,
  canDelete,
  isHead,
  isStaff,
  currentUserId,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);

  const [topicTitle, setTopicTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [attachments, setAttachments] = useState<AnnouncementCreateAttachment[]>([]);
  const [assignTo, setAssignTo] = useState<string[]>(["Everyone"]);
  const [availableFromDate, setAvailableFromDate] = useState("");
  const [availableFromTime, setAvailableFromTime] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [untilTime, setUntilTime] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const canCreate = isHead || isStaff;

  const markReadInDb = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await fetch(`/api/courses/${courseId}/announcements`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcementIds: ids }),
    }).catch(() => {});
  }, [courseId]);

  const onMarkAllRead = () => {
    const unreadIds = announcements.filter((a) => !a.read).map((a) => a.id);
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));
    markReadInDb(unreadIds);
  };

  const onMarkRead = (id: string) => {
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
    markReadInDb([id]);
  };

  const onToggleRead = (id: string) => {
    setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, read: !a.read } : a)));
    // optimistic — no separate unread API needed for student tab
  };

  const onView = (id: string) => {
    setViewingId(id);
    onMarkRead(id);
  };

  const onDeleteOne = async (id: string) => {
    const ann = announcements.find((a) => a.id === id);
    if (!ann) return;
    const canDo =
      isHead
        ? ann.authorRole === "staff" || ann.authorId === currentUserId
        : isStaff
        ? ann.authorId === currentUserId
        : false;
    if (!canDo) { alert("You don't have permission to delete this announcement."); return; }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    await fetch(`/api/admin/courses/${courseId}/announcements/${id}`, { method: "DELETE" }).catch(() => {});
  };

  const onDeleteSelected = async (ids: string[]) => {
    const deletable = ids.filter((id) => {
      const ann = announcements.find((a) => a.id === id);
      if (!ann) return false;
      if (isHead) return ann.authorRole === "staff" || ann.authorId === currentUserId;
      if (isStaff) return ann.authorId === currentUserId;
      return false;
    });
    if (!deletable.length) { alert("You don't have permission to delete the selected announcement(s)."); return; }
    setAnnouncements((prev) => prev.filter((a) => !deletable.includes(a.id)));
    setSelectedIds(new Set());
    await Promise.all(
      deletable.map((id) =>
        fetch(`/api/admin/courses/${courseId}/announcements/${id}`, { method: "DELETE" })
      )
    ).catch(console.error);
  };

  const resetCreateForm = () => {
    setTopicTitle(""); setBodyHtml(""); setBodyText(""); setAttachments([]);
    setAssignTo(["Everyone"]);
    setAvailableFromDate(""); setAvailableFromTime(""); setUntilDate(""); setUntilTime("");
  };

  const handlePublish = async () => {
    if (!topicTitle.trim()) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: topicTitle.trim(),
          bodyText: bodyText.trim(),
          bodyHtml,
          assignTo: assignTo.length ? assignTo : ["Everyone"],
          availableFrom: availableFromDate ? `${availableFromDate}T${availableFromTime || "00:00"}` : null,
          availableUntil: untilDate ? `${untilDate}T${untilTime || "00:00"}` : null,
          attachments: attachments.map((f) => ({ name: f.name, url: f.url, size: f.size, mimeType: f.type })),
        }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      const d = await res.json();
      const raw = d.announcement ?? d;
      setAnnouncements((prev) => [normalizeAnnouncement(raw as RawAnnouncement, Date.now()), ...prev]);
      resetCreateForm();
      setShowCreate(false);
    } catch (err) {
      console.error(err);
      alert("Cannot publish announcement. Please try again.");
    } finally {
      setIsPublishing(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const latest = announcements.reduce<number | null>((acc, a) => {
      if (!a.createdAt) return acc;
      const t = Date.parse(a.createdAt);
      return isNaN(t) ? acc : acc === null ? t : Math.max(acc, t);
    }, null);
    const now = new Date();
return announcements.filter((a) => {
  const matchSearch =
    !q ||
    a.title.toLowerCase().includes(q) ||
    a.body.toLowerCase().includes(q) ||
    a.authorName.toLowerCase().includes(q);
  const matchFilter =
    filter === "All" ||
    (filter === "Unread" && !a.read) ||
    (filter === "Recent" && latest !== null && a.createdAt !== null && latest - Date.parse(a.createdAt) <= sevenDaysMs);
  const matchAvailableFrom = !a.availableFrom || new Date(a.availableFrom) <= now;
  const matchUntil = !a.availableUntil || new Date(a.availableUntil) >= now;
  return matchSearch && matchFilter && matchAvailableFrom && matchUntil;
});
  }, [announcements, search, filter]);

  const viewingAnnouncement = announcements.find((a) => a.id === viewingId) ?? null;

  if (viewingAnnouncement) {
    return (
      <StudentAnnouncementDetail
        announcement={viewingAnnouncement}
        onBack={() => setViewingId(null)}
        onDelete={canDelete ? onDeleteOne : undefined}
        canDelete={canDelete}
      />
    );
  }

  if (showCreate) {
    return (
      <AnnouncementCreateView
        isCoursePublished={courseStatus?.toLowerCase?.() === "published"}
        topicTitle={topicTitle}
        setTopicTitle={setTopicTitle}
        bodyHtml={bodyHtml}
        setBodyHtml={setBodyHtml}
        setBodyText={setBodyText}
        attachments={attachments}
        onAddAttachments={(files) =>
          setAttachments((prev) => [
            ...prev,
            ...files.map((f, i) => ({
              id: f.id || `attachment-${Date.now()}-${i}`,
              name: f.name,
              size: f.size,
              type: f.type || "",
              url: f.url,
            })),
          ])
        }
        onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((f) => f.id !== id))}
        assignTo={assignTo}
        setAssignTo={setAssignTo}
        staff={people.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
        availableFromDate={availableFromDate}
        setAvailableFromDate={setAvailableFromDate}
        availableFromTime={availableFromTime}
        setAvailableFromTime={setAvailableFromTime}
        untilDate={untilDate}
        setUntilDate={setUntilDate}
        untilTime={untilTime}
        setUntilTime={setUntilTime}
        onCancel={() => { resetCreateForm(); setShowCreate(false); }}
        onPublish={handlePublish}
        onResetUntil={() => { setUntilDate(""); setUntilTime(""); }}
        isPublishing={isPublishing}
      />
    );
  }

  return (
    <StudentAnnouncementList
      announcements={filtered}
      filter={filter}
      setFilter={setFilter}
      search={search}
      setSearch={setSearch}
      onMarkAllRead={onMarkAllRead}
      onView={onView}
      onToggleRead={onToggleRead}
      onDeleteSelected={onDeleteSelected}
      onDeleteOne={onDeleteOne}
      selectedIds={selectedIds}
      setSelectedIds={setSelectedIds}
      canDelete={canDelete}
      onAdd={() => setShowCreate(true)}
      canCreate={canCreate}
    />
  );
}