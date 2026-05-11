// src/components/layout/course/CourseAnnouncementsTab.tsx
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { AnnouncementCreateView } from "@/components/admin/CourseAnnouncementsPage";
import { COLORS, MAROON, fmtDateTime, normalizeAnnouncement } from "./helpers";
import type {
  Announcement,
  AnnouncementCreateAttachment,
  Person,
  RawAnnouncement,
} from "./types";

function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void
) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function Avatar({
  name,
  image,
  size = 36,
}: {
  name: string | null;
  image: string | null;
  size?: number;
}) {
  const dim = size;
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? ""}
        width={dim}
        height={dim}
        className="rounded-full object-cover shrink-0"
        style={{ width: dim, height: dim }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-white text-sm font-semibold"
      style={{ width: dim, height: dim, background: MAROON }}
    >
      {name?.charAt(0)?.toUpperCase() ?? "A"}
    </div>
  );
}

function AnnouncementThreeDot({
  read,
  onMarkRead,
}: {
  read: boolean;
  onMarkRead: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  if (read) return null;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
      >
        ⋮
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 bg-white border border-gray-200 rounded shadow-lg min-w-38"
          style={{ marginTop: 2 }}
        >
          <button
            type="button"
            onClick={() => {
              onMarkRead();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Mark as Read
          </button>
        </div>
      )}
    </div>
  );
}

interface Reply {
  id: number;
  text: string;
  date: string;
}

function StudentAnnouncementDetail({
  announcement,
  onBack,
  onMarkRead,
}: {
  announcement: Announcement;
  onBack: () => void;
  onMarkRead: (id: string) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const submitReply = () => {
    if (!replyText.trim()) return;
    setReplies((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: replyText.trim(),
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      },
    ]);
    setReplyText("");
    setShowReplyEditor(false);
  };

  return (
    <div className="px-6 py-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm mb-4 hover:underline"
        style={{ color: MAROON }}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Announcements
      </button>

      <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
          <Avatar name={announcement.authorName} image={announcement.authorImage} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">
                {announcement.authorName}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                AUTHOR
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Posted {fmtDateTime(announcement.createdAt)}
            </div>
            <div className="text-xs text-gray-400">
              To: {announcement.recipientsLabel}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {announcement.locked && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded px-2 py-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Locked
              </span>
            )}
            <AnnouncementThreeDot
              read={announcement.read}
              onMarkRead={() => onMarkRead(announcement.id)}
            />
          </div>
        </div>

        <div className="px-5 py-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4">{announcement.title}</h1>
          {announcement.bodyHtml ? (
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: announcement.bodyHtml }}
              style={{ lineHeight: 1.8 }}
            />
          ) : announcement.body ? (
            <p className="text-sm text-gray-700 leading-relaxed">{announcement.body}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No content.</p>
          )}

          {announcement.attachments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Attachments
              </div>
              <div className="flex flex-wrap gap-2">
                {announcement.attachments.map((f) => (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-200 rounded-full bg-gray-50 hover:bg-gray-100"
                    style={{ color: MAROON }}
                  >
                    📎 {f.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {announcement.allowLiking && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setLikeCount((c) => (liked ? c - 1 : c + 1));
                  setLiked((v) => !v);
                }}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded border transition-colors"
                style={{
                  borderColor: liked ? MAROON : "#d1d5db",
                  color: liked ? MAROON : "#6b7280",
                  background: liked ? "#fef2f2" : "transparent",
                }}
              >
                👍 {liked ? "Liked" : "Like"} {likeCount > 0 && `(${likeCount})`}
              </button>
            </div>
          )}
        </div>

        {announcement.allowComments && !announcement.locked && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            {replies.length > 0 && (
              <div className="space-y-3 mb-4">
                {replies.map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <Avatar name="Me" image={null} size={32} />
                    <div className="flex-1 bg-white rounded border border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">You</span>
                        <span className="text-xs text-gray-400">{r.date}</span>
                      </div>
                      <p className="text-sm text-gray-600">{r.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!showReplyEditor ? (
              <button
                type="button"
                onClick={() => setShowReplyEditor(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded hover:opacity-90"
                style={{ background: MAROON }}
              >
                ↩ Reply
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">Write a reply</p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none outline-none focus:border-[#7b1113]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyEditor(false);
                      setReplyText("");
                    }}
                    className="h-8 px-4 border border-gray-300 text-xs text-gray-700 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitReply}
                    disabled={!replyText.trim()}
                    style={{ background: MAROON }}
                    className="h-8 px-4 text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
                  >
                    Post Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {announcement.locked && (
          <div className="px-5 py-3 border-t border-gray-100 bg-amber-50">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              This announcement is locked.
            </p>
          </div>
        )}

        {announcement.allowComments === false && !announcement.locked && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Comments are disabled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StudentAnnouncementList({
  announcements,
  filter,
  setFilter,
  search,
  setSearch,
  onMarkAllRead,
  onView,
  onMarkRead,
  onDeleteSelected,
  selectedIds,
  setSelectedIds,
}: {
  announcements: Announcement[];
  filter: string;
  setFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  onMarkAllRead: () => void;
  onView: (id: string) => void;
  onMarkRead: (id: string) => void;
  onDeleteSelected: (ids: string[]) => void;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}) {
  const allChecked =
    announcements.length > 0 && announcements.every((a) => selectedIds.has(a.id));

  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(announcements.map((a) => a.id)));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-40">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none appearance-none pr-8"
          >
            <option value="All">All</option>
            <option value="Unread">Unread</option>
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-[#7b1113]"
          />
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="inline-flex items-center gap-2 text-sm border border-gray-300 px-3 py-2 rounded hover:bg-gray-50 text-gray-700 shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Mark All as Read
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
          <span className="font-medium" style={{ color: MAROON }}>
            {selectedIds.size}
          </span>{" "}
          selected
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="underline hover:no-underline text-gray-400"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => onDeleteSelected([...selectedIds])}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-lg font-semibold text-gray-600">No Announcements</div>
          <div className="text-sm text-gray-400 mt-1">Nothing to show here yet.</div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          <div className="flex items-center gap-3 py-2 px-1">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300"
              style={{ accentColor: MAROON }}
              title="Select all"
            />
            <span className="text-xs text-gray-400">Select all</span>
          </div>
          {announcements.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 py-4 hover:bg-gray-50 transition-colors"
              style={{ background: selectedIds.has(a.id) ? "#fef9f9" : undefined }}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(a.id)}
                onChange={() => toggleOne(a.id)}
                className="mt-1 h-4 w-4 rounded border-gray-300 shrink-0"
                style={{ accentColor: MAROON }}
              />
              <Avatar name={a.authorName} image={a.authorImage} size={36} />
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onView(a.id)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {!a.read && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: MAROON }}
                    />
                  )}
                  <h3
                    className="text-sm font-semibold hover:underline"
                    style={{ color: MAROON }}
                  >
                    {a.title}
                  </h3>
                  {a.locked && (
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Locked
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{a.recipientsLabel}</div>
                {a.body && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.body}</p>
                )}
                {a.attachments.length > 0 && (
                  <div
                    className="flex flex-wrap gap-2 mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {a.attachments.map((f) => (
                      <a
                        key={f.id}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 border border-gray-200 rounded bg-gray-50 hover:bg-gray-100"
                        style={{ color: MAROON }}
                      >
                        📎 {f.name}
                      </a>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(a.id);
                  }}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs hover:underline"
                  style={{ color: MAROON }}
                >
                  ↩ Reply
                </button>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <AnnouncementThreeDot
                  read={a.read}
                  onMarkRead={() => onMarkRead(a.id)}
                />
                <div className="text-right text-xs text-gray-500 leading-snug">
                  <div>Posted on:</div>
                  <div>{fmtDateTime(a.createdAt)}</div>
                </div>
              </div>
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
}

export default function CourseAnnouncementsTab({
  courseId,
  courseStatus,
  announcements,
  setAnnouncements,
  people,
  canManageAnnouncements,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);

  const [topicTitle, setTopicTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [attachments, setAttachments] = useState<AnnouncementCreateAttachment[]>([]);
  const [assignTo, setAssignTo] = useState<string[]>(["Everyone"]);
  const [allowComment, setAllowComment] = useState(true);
  const [availableFromDate, setAvailableFromDate] = useState("");
  const [availableFromTime, setAvailableFromTime] = useState("");
  const [untilDate, setUntilDate] = useState("");
  const [untilTime, setUntilTime] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  const onMarkAllRead = () =>
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })));

  const onMarkRead = (id: string) =>
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );

  const onView = (id: string) => {
    setViewingId(id);
    onMarkRead(id);
  };

  const onDeleteSelected = (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} announcement${ids.length > 1 ? "s" : ""}?`)) return;
    setAnnouncements((prev) => prev.filter((a) => !ids.includes(a.id)));
    setSelectedIds(new Set());
  };

  const resetCreateForm = () => {
    setTopicTitle("");
    setBodyHtml("");
    setBodyText("");
    setAttachments([]);
    setAssignTo(["Everyone"]);
    setAllowComment(true);
    setAvailableFromDate("");
    setAvailableFromTime("");
    setUntilDate("");
    setUntilTime("");
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
          allowComments: allowComment,
          availableFrom: availableFromDate
            ? `${availableFromDate}T${availableFromTime || "00:00"}`
            : null,
          availableUntil: untilDate
            ? `${untilDate}T${untilTime || "00:00"}`
            : null,
          attachments: attachments.map((f) => ({
            name: f.name,
            url: f.url,
            size: f.size,
            mimeType: f.type,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      const d = await res.json();
      const raw = d.announcement ?? d;
      setAnnouncements((prev) => [
        normalizeAnnouncement(raw as RawAnnouncement, Date.now()),
        ...prev,
      ]);
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
    return announcements.filter((a) => {
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q);
      const matchesFilter = filter === "All" || (filter === "Unread" && !a.read);
      return matchesSearch && matchesFilter;
    });
  }, [announcements, search, filter]);

  const viewingAnnouncement = announcements.find((a) => a.id === viewingId) ?? null;

  if (viewingAnnouncement) {
    return (
      <StudentAnnouncementDetail
        announcement={viewingAnnouncement}
        onBack={() => setViewingId(null)}
        onMarkRead={onMarkRead}
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
        onRemoveAttachment={(id) =>
          setAttachments((prev) => prev.filter((f) => f.id !== id))
        }
        assignTo={assignTo}
        setAssignTo={setAssignTo}
        staff={people.map((p) => ({ id: p.id, name: p.name ?? p.email }))}
        allowComment={allowComment}
        setAllowComment={setAllowComment}
        availableFromDate={availableFromDate}
        setAvailableFromDate={setAvailableFromDate}
        availableFromTime={availableFromTime}
        setAvailableFromTime={setAvailableFromTime}
        untilDate={untilDate}
        setUntilDate={setUntilDate}
        untilTime={untilTime}
        setUntilTime={setUntilTime}
        onCancel={() => {
          resetCreateForm();
          setShowCreate(false);
        }}
        onPublish={handlePublish}
        onResetUntil={() => {
          setUntilDate("");
          setUntilTime("");
        }}
        isPublishing={isPublishing}
      />
    );
  }

  return (
    <div>
      {canManageAnnouncements && (
        <div className="px-5 pt-4">
          <div
            className="rounded-lg border px-4 py-3 bg-[#fdf8f8]"
            style={{ borderColor: "#f0e4e4" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: COLORS.text }}>
                  Head Controls
                </p>
                <p className="text-xs text-gray-500">
                  You can manage announcements for this course.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="text-sm text-white rounded px-4 py-2 hover:opacity-90"
                style={{ background: MAROON }}
              >
                Create Announcement
              </button>
            </div>
          </div>
        </div>
      )}
      <StudentAnnouncementList
        announcements={filtered}
        filter={filter}
        setFilter={setFilter}
        search={search}
        setSearch={setSearch}
        onMarkAllRead={onMarkAllRead}
        onView={onView}
        onMarkRead={onMarkRead}
        onDeleteSelected={onDeleteSelected}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
      />
    </div>
  );
}