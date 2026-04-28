"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Pencil, Reply, ReplyAll, Download, Trash2,
  MoreVertical, Search, ChevronDown, X, Send,
  Inbox, MailOpen, Clock, ArrowUpRight, Bell, Archive, UserRound,
  BookOpen, ClipboardList, Megaphone, GraduationCap, FileText,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface CourseOption {
  id:   string;
  name: string;
  type: "course" | "group";
}

interface UserResult {
  id:        string;
  name:      string | null;
  email:     string;
  role?:     string;
  pronouns?: string | null;
  image?:    string | null;
}

interface ConvoParticipant {
  id:    string;
  name:  string | null;
  image: string | null;
  role:  string;
}

interface Conversation {
  id:           string;
  subject:      string;
  participants: ConvoParticipant[];
  preview:      string;
  date:         string;
  unread:       boolean;
  courseId:     string | null;
}

interface MessageAttachment {
  id:        string;
  name:      string;
  url:       string;
  size?:     number | null;
  mimeType?: string | null;
}

interface Message {
  id:        string;
  body:      string;
  createdAt: string;
  sender: {
    id:    string;
    name:  string | null;
    image: string | null;
    role:  string;
  };
  attachments: MessageAttachment[];
}

interface FullConversation {
  id:      string;
  subject: string;
  scope:   string;
  participants: {
    id:       string;
    isAuthor: boolean;
    user: {
      id:          string;
      name:        string | null;
      image:       string | null;
      role:        string;
      position?:   string | null;
      department?: string | null;
    };
  }[];
  messages: Message[];
}

interface CourseRef {
  id:    string;
  name:  string;
  code:  string;
  color: string;
}

interface NotifAssignment {
  id:          string;
  title:       string;
  description: string | null;
  dueDate:     string | null;
  course:      CourseRef | null;
  group:       { id: string; name: string } | null;
  status:      string;
  grade:       number | null;
  submittedAt: string | null;
}

interface NotifAnnouncement {
  id:          string;
  title:       string;
  bodyText:    string;
  author:      string;
  createdAt:   string;
  course:      CourseRef;
  attachments: { id: string; name: string; url: string }[];
}

interface NotifQuiz {
  id:          string;
  title:       string;
  description: string | null;
  quizType:    string;
  points:      number;
  dueDate:     string | null;
  course:      CourseRef;
  attempted:   boolean;
  score:       number | null;
  submittedAt: string | null;
}

interface NotifForm {
  id:          string;
  title:       string;
  description: string | null;
  formType:    string;
  points:      number;
  dueDate:     string | null;
  course:      CourseRef;
  submitted:   boolean;
  score:       number | null;
  submittedAt: string | null;
}

interface NotifEnrollment {
  id:         string;
  courseRole: string;
  section:    string | null;
  createdAt:  string;
  course:     CourseRef & { image: string | null; status: string };
}

type NotifTab = "assignments" | "announcements" | "quizzes" | "enrollments";

// ── Constants ──────────────────────────────────────────────────────────────────
const FONT        = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const MAROON      = "#7b1113";
const MAROON_DARK = "#5a0d0f";
const MAROON_BG   = "#fdf8f8";
const MAROON_MID  = "#f0e4e4";

const API_BASE          = "/api/inbox/conversations";
const API_USERS         = "/api/users";
const API_COURSES       = "/api/courses";
const API_COURSE_PEOPLE = (courseId: string) => `/api/courses/${courseId}/people`;

const MAILBOX_FILTERS = [
  { key: "inbox",    label: "Inbox",           Icon: Inbox        },
  { key: "unread",   label: "Unread",          Icon: MailOpen     },
  { key: "starred",  label: "Starred",         Icon: Bell         },
  { key: "sent",     label: "Sent",            Icon: Send         },
  { key: "archived", label: "Archived",        Icon: Archive      },
  { key: "recent",   label: "Submission Cmts", Icon: Clock        },
  { key: "forward",  label: "Filter Redir.",   Icon: ArrowUpRight },
];

const NOTIF_TABS: { key: NotifTab; label: string; Icon: React.ElementType }[] = [
  { key: "assignments",   label: "Assignments",   Icon: ClipboardList },
  { key: "announcements", label: "Announcements", Icon: Megaphone     },
  { key: "quizzes",       label: "Quizzes/Forms", Icon: FileText      },
  { key: "enrollments",   label: "Enrollments",   Icon: GraduationCap },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDue(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function initials(name: string | null | undefined) {
  return (name ?? "?").slice(0, 2).toUpperCase();
}

function CourseDot({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8,
      borderRadius: "50%", background: color, flexShrink: 0,
    }} />
  );
}

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 20,
      padding: "2px 8px", background: color + "22", color, fontFamily: FONT,
    }}>
      {label}
    </span>
  );
}

function Avatar({ name, image, size = 34 }: { name?: string | null; image?: string | null; size?: number }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name ?? "avatar"}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: MAROON_MID,
      color: MAROON, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 800, fontFamily: FONT, flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  );
}

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div style={{ padding: "10px 12px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: MAROON_MID, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 11, borderRadius: 4, marginBottom: 4, width: "55%", animation: "shimmer 1.4s infinite", backgroundImage: "linear-gradient(90deg,#f3f4f6 25%,#e8d5d5 50%,#f3f4f6 75%)", backgroundSize: "200% 100%" }} />
            <div style={{ height: 10, borderRadius: 4, width: "75%", animation: "shimmer 1.4s infinite", backgroundImage: "linear-gradient(90deg,#f3f4f6 25%,#e8d5d5 50%,#f3f4f6 75%)", backgroundSize: "200% 100%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── useOnClickOutside ──────────────────────────────────────────────────────────
function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void
) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, handler]);
}

// ── Address Book Picker ────────────────────────────────────────────────────────
type PickView = "root" | "courses" | "course-roles" | "course-people" | "users";

function AddressBookPicker({
  courseOptions,
  onSelectUser,
}: {
  courseOptions: CourseOption[];
  onSelectUser:  (u: UserResult) => void;
}) {
  const [open,         setOpen]         = useState(false);
  const [view,         setView]         = useState<PickView>("root");
  const [query,        setQuery]        = useState("");
  const [activeCourse, setActiveCourse] = useState<CourseOption | null>(null);
  const [activeRole,   setActiveRole]   = useState<string | null>(null);
  const [people,       setPeople]       = useState<UserResult[]>([]);
  const [allPeople,    setAllPeople]    = useState<UserResult[]>([]);
  const [users,        setUsers]        = useState<UserResult[]>([]);
  const [loading,      setLoading]      = useState(false);
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeAll = useCallback(() => {
    setOpen(false); setView("root"); setQuery("");
    setActiveCourse(null); setActiveRole(null);
  }, []);

  useOnClickOutside(ref, closeAll);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40); }, [open, view]);

  const fetchUsers = useCallback((q: string) => {
    setLoading(true);
    const url = q.trim()
      ? `${API_USERS}?search=${encodeURIComponent(q.trim())}`
      : API_USERS;
    fetch(url)
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open || view !== "users") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchUsers(query), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, open, view, fetchUsers]);

  useEffect(() => {
    if (!open || view !== "course-people" || !activeCourse) return;
    setLoading(true);
    fetch(API_COURSE_PEOPLE(activeCourse.id))
      .then(r => r.json())
      .then(d => {
        const list: (UserResult & { role?: string })[] = d.people ?? [];
        const byRole = activeRole
          ? list.filter(u => (u.role ?? "").toLowerCase() === activeRole.toLowerCase())
          : list;
        setAllPeople(byRole);
        setPeople(byRole);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, view, activeCourse, activeRole]);

  useEffect(() => {
    if (view !== "course-people" || allPeople.length === 0) return;
    setPeople(
      query.trim()
        ? allPeople.filter(u =>
            (u.name ?? "").toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase())
          )
        : allPeople
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, view]);

  const filteredCourses = courseOptions.filter(o =>
    o.name.toLowerCase().includes(query.toLowerCase())
  );

  const enterCourse = (course: CourseOption) => {
    setActiveCourse(course); setView("course-roles");
    setQuery(""); setPeople([]); setAllPeople([]); setActiveRole(null);
  };

  const goBack = () => {
    if (view === "course-people")     { setView("course-roles"); setQuery(""); setAllPeople([]); }
    else if (view === "course-roles") { setView("courses"); setQuery(""); setActiveCourse(null); setActiveRole(null); }
    else                              { setView("root"); setQuery(""); }
  };

  const backLabel =
    view === "course-roles"  ? (activeCourse?.name ?? "Course") :
    view === "course-people" ? (activeRole ?? activeCourse?.name ?? "Course") :
    view === "users"         ? "Users" : "Courses";

  const UserRow = ({ u }: { u: UserResult }) => (
    <button
      onClick={() => { onSelectUser(u); closeAll(); }}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", border: "none", background: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid #f9fafb", fontFamily: FONT }}
      onMouseEnter={e => (e.currentTarget.style.background = MAROON_BG)}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      <Avatar name={u.name} image={u.image} size={32} />
      <div style={{ minWidth: 0, flex: 1 }}>
        {u.name && <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>}
        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
        {u.pronouns && <p style={{ fontSize: 10, color: "#c4b5b5", margin: 0 }}>{u.pronouns}</p>}
      </div>
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 200 }}>
      <div style={{ display: "flex", alignItems: "center", height: 36, border: `1px solid ${open ? MAROON : "#d1d5db"}`, borderRadius: open ? "6px 6px 0 0" : 6, background: "#fff", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, padding: "0 10px", cursor: "text" }}
          onClick={() => !open && setOpen(true)}>
          <Search size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
          <input
            ref={open ? inputRef : undefined}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => { if (!open) { setOpen(true); setView("root"); } }}
            placeholder="Search recipients..."
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: FONT, color: "#374151", background: "transparent" }}
          />
          {query && open && (
            <button onClick={e => { e.stopPropagation(); setQuery(""); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>
        <div style={{ width: 1, height: 20, background: "#e5e7eb", flexShrink: 0 }} />
        <button onClick={() => setOpen(v => !v)} title="Address Book"
          style={{ width: 36, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: open ? MAROON_BG : "none", border: "none", cursor: "pointer", color: open ? MAROON : "#6b7280", flexShrink: 0 }}
          onMouseEnter={e => { if (!open) { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; } }}
          onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#6b7280"; } }}>
          <UserRound size={15} />
        </button>
      </div>

      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, background: "#fff", border: `1px solid ${MAROON}`, borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "0 8px 32px rgba(0,0,0,0.10)", maxHeight: 400, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {view !== "root" && (
            <button onClick={goBack}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 12px", border: "none", background: MAROON, cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>‹</span>{backLabel}
            </button>
          )}
          {view !== "root" && view !== "course-roles" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: `1px solid ${MAROON_MID}`, flexShrink: 0 }}>
              <Search size={12} style={{ color: "#9ca3af" }} />
              <input
                ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder={view === "courses" ? "Search courses…" : view === "users" ? "Search users…" : `Search in ${activeCourse?.name}…`}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: FONT, color: "#374151", background: "transparent" }}
              />
              {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}><X size={11} /></button>}
            </div>
          )}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {view === "root" && (
              <>
                <button onClick={() => { setView("courses"); setQuery(""); }}
                  style={{ display: "flex", alignItems: "center", width: "100%", padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: `1px solid ${MAROON_MID}`, textAlign: "left" }}
                  onMouseEnter={e => { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}>
                  <span style={{ flex: 1 }}>Courses</span><span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
                </button>
                <button onClick={() => { setView("users"); setQuery(""); fetchUsers(""); }}
                  style={{ display: "flex", alignItems: "center", width: "100%", padding: "11px 14px", fontSize: 13, fontWeight: 600, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, textAlign: "left" }}
                  onMouseEnter={e => { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}>
                  <span style={{ flex: 1 }}>Users</span><span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
                </button>
              </>
            )}
            {view === "courses" && (
              filteredCourses.length === 0
                ? <p style={{ fontSize: 12, color: "#9ca3af", padding: "16px 12px", margin: 0 }}>No courses.</p>
                : filteredCourses.map(o => (
                    <button key={o.id} onClick={() => enterCourse(o)}
                      style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: "1px solid #f9fafb", textAlign: "left" }}
                      onMouseEnter={e => { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}>
                      <span style={{ flex: 1 }}>{o.name}</span><span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
                    </button>
                  ))
            )}
            {view === "course-roles" && (
              ["Teachers", "Staff", "Dean"].map(role => (
                <button key={role} onClick={() => { setActiveRole(role); setView("course-people"); setQuery(""); }}
                  style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: "1px solid #f9fafb", textAlign: "left" }}
                  onMouseEnter={e => { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}>
                  <span style={{ flex: 1 }}>{role}</span><span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
                </button>
              ))
            )}
            {view === "course-people" && (
              loading ? <SkeletonRows /> :
              people.length === 0
                ? <p style={{ fontSize: 12, color: "#9ca3af", padding: "16px 12px", margin: 0 }}>{query ? "No results." : "No people in this course."}</p>
                : people.map(u => <UserRow key={u.id} u={u} />)
            )}
            {view === "users" && (
              loading ? <SkeletonRows /> :
              users.length === 0
                ? <p style={{ fontSize: 12, color: "#9ca3af", padding: "16px 12px", margin: 0 }}>{query ? "No results." : "No users found."}</p>
                : users.map(u => <UserRow key={u.id} u={u} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Course Filter Dropdown ─────────────────────────────────────────────────────
function CourseFilter({
  options, selected, onSelect,
}: {
  options: CourseOption[]; selected: CourseOption | null; onSelect: (o: CourseOption | null) => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const ref      = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useOnClickOutside(ref, useCallback(() => setOpen(false), []));
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 40); }, [open]);

  const courses = options.filter(o => o.type === "course" && o.name.toLowerCase().includes(query.toLowerCase()));
  const groups  = options.filter(o => o.type === "group"  && o.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 200 }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 10px", border: `1px solid ${open ? MAROON : "#d1d5db"}`, borderRadius: open ? "6px 6px 0 0" : 6, background: open ? MAROON_BG : "#fff", cursor: "pointer", userSelect: "none", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: selected ? MAROON : "#374151" }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected ? selected.name : "All Courses"}</span>
        {selected
          ? <button onClick={e => { e.stopPropagation(); onSelect(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}><X size={12} /></button>
          : <ChevronDown size={13} style={{ color: "#9ca3af", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, minWidth: "100%", zIndex: 9999, background: "#fff", border: `1px solid ${MAROON}`, borderTop: "none", borderRadius: "0 0 6px 6px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", maxHeight: 340, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "8px 10px", borderBottom: `1px solid ${MAROON_MID}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 8px" }}>
              <Search size={12} style={{ color: "#9ca3af" }} />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
                style={{ flex: 1, border: "none", background: "none", outline: "none", fontSize: 12, fontFamily: FONT, color: "#374151" }} />
              {query && <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}><X size={11} /></button>}
            </div>
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <button onClick={() => { onSelect(null); setOpen(false); setQuery(""); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, fontWeight: 600, color: !selected ? MAROON : "#374151", background: !selected ? MAROON_BG : "none", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: `1px solid ${MAROON_MID}` }}>
              All Courses
            </button>
            {courses.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 12px 4px", margin: 0 }}>Courses</p>
                {courses.map(o => (
                  <button key={o.id} onClick={() => { onSelect(o); setOpen(false); setQuery(""); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", fontSize: 13, color: selected?.id === o.id ? MAROON : "#374151", background: selected?.id === o.id ? MAROON_BG : "none", border: "none", cursor: "pointer", fontFamily: FONT }}
                    onMouseEnter={e => { if (selected?.id !== o.id) e.currentTarget.style.background = MAROON_BG; }}
                    onMouseLeave={e => { if (selected?.id !== o.id) e.currentTarget.style.background = "none"; }}>
                    {o.name}
                  </button>
                ))}
              </>
            )}
            {groups.length > 0 && (
              <>
                <p style={{ fontSize: 10, fontWeight: 800, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 12px 4px", margin: 0, borderTop: `1px solid ${MAROON_MID}` }}>Groups</p>
                {groups.map(o => (
                  <button key={o.id} onClick={() => { onSelect(o); setOpen(false); setQuery(""); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", fontSize: 13, color: selected?.id === o.id ? MAROON : "#374151", background: selected?.id === o.id ? MAROON_BG : "none", border: "none", cursor: "pointer", fontFamily: FONT }}
                    onMouseEnter={e => { if (selected?.id !== o.id) e.currentTarget.style.background = MAROON_BG; }}
                    onMouseLeave={e => { if (selected?.id !== o.id) e.currentTarget.style.background = "none"; }}>
                    {o.name}
                  </button>
                ))}
              </>
            )}
            {courses.length === 0 && groups.length === 0 && query && (
              <p style={{ fontSize: 12, color: "#9ca3af", padding: "14px 12px", margin: 0 }}>No results.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mailbox Filter ─────────────────────────────────────────────────────────────
function MailboxFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, useCallback(() => setOpen(false), []));
  const current  = MAILBOX_FILTERS.find(f => f.key === value) ?? MAILBOX_FILTERS[0];
  const CurrIcon = current.Icon;
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 180 }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 10px", border: `1px solid ${open ? MAROON : "#d1d5db"}`, borderRadius: open ? "6px 6px 0 0" : 6, background: open ? MAROON_BG : "#fff", cursor: "pointer", userSelect: "none", fontFamily: FONT, fontSize: 13, fontWeight: 600, color: "#374151" }}>
        <CurrIcon size={13} style={{ color: MAROON }} />
        <span style={{ flex: 1 }}>{current.label}</span>
        <ChevronDown size={13} style={{ color: "#9ca3af", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, background: "#fff", border: `1px solid ${MAROON}`, borderTop: "none", borderRadius: "0 0 6px 6px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", overflow: "hidden" }}>
          {MAILBOX_FILTERS.map(({ key, label, Icon: FIcon }) => (
            <button key={key} onClick={() => { onChange(key); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", fontSize: 13, fontWeight: value === key ? 700 : 400, color: value === key ? MAROON : "#374151", background: value === key ? MAROON_BG : "none", border: "none", cursor: "pointer", fontFamily: FONT, textAlign: "left" }}
              onMouseEnter={e => { if (value !== key) e.currentTarget.style.background = MAROON_BG; }}
              onMouseLeave={e => { if (value !== key) e.currentTarget.style.background = "none"; }}>
              <FIcon size={13} style={{ color: value === key ? MAROON : "#9ca3af" }} />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ mailbox }: { mailbox: string }) {
  const msg: Record<string, [string, string]> = {
    inbox:    ["No Conversations to Show",  "New messages will appear here."],
    unread:   ["No Unread Messages",        "You're all caught up!"],
    starred:  ["No Starred Messages",       "Star a message to find it quickly later."],
    sent:     ["No Sent Messages",          "Messages you send will appear here."],
    archived: ["No Archived Conversations", "Archived messages will appear here."],
    recent:   ["No Submission Comments",    "Submission comments will appear here."],
    forward:  ["No Filter Redirections",    "Filter redirections will appear here."],
  };
  const [title, sub] = msg[mailbox] ?? msg.inbox;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "80px 0", gap: 14 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="44" r="24" fill={MAROON_MID} />
        <circle cx="40" cy="44" r="24" stroke={MAROON} strokeWidth="1" strokeDasharray="4 3" opacity="0.35"/>
        <path d="M20 30 L56 22 L44 52 L38 42 Z" stroke={MAROON} strokeWidth="1.5" strokeLinejoin="round" fill={MAROON_BG}/>
        <path d="M38 42 L44 52" stroke={MAROON} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M38 42 L56 22" stroke={MAROON} strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
        <circle cx="58" cy="18" r="2" fill={MAROON} opacity="0.35"/>
        <circle cx="62" cy="24" r="1.5" fill={MAROON} opacity="0.25"/>
      </svg>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: 0, fontFamily: FONT }}>{title}</p>
      <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, fontFamily: FONT }}>{sub}</p>
    </div>
  );
}

// ── Conversation Row ───────────────────────────────────────────────────────────
function ConvoRow({
  convo, selected, onSelect,
}: {
  convo: Conversation; selected: boolean; onSelect: () => void;
}) {
  const [hov, setHov] = useState(false);
  const displayName = convo.participants.map(p => p.name ?? "Unknown").join(", ") || "No participants";
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 14px", background: selected ? MAROON_BG : hov ? "#fafafa" : "#fff", borderBottom: "1px solid #f3f4f6", cursor: "pointer", borderLeft: selected ? `3px solid ${MAROON}` : "3px solid transparent" }}
    >
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: convo.unread ? MAROON : "transparent", flexShrink: 0, marginTop: 7 }} />
      <Avatar name={convo.participants[0]?.name} image={convo.participants[0]?.image} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, marginBottom: 1 }}>
          <span style={{ fontSize: 13, fontWeight: convo.unread ? 700 : 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT }}>{displayName}</span>
          <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, fontFamily: FONT }}>{timeAgo(convo.date)}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: convo.unread ? 600 : 400, color: "#374151", margin: "0 0 1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT }}>{convo.subject}</p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT }}>{convo.preview}</p>
      </div>
    </div>
  );
}

// ── List Skeleton ──────────────────────────────────────────────────────────────
function ListSkeleton() {
  return (
    <div>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ display: "flex", gap: 10, padding: "12px 14px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f3f4f6", marginTop: 7, flexShrink: 0 }} />
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: MAROON_MID, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            {[["60%", 12], ["80%", 11], ["40%", 11]].map(([w, h], j) => (
              <div key={j} style={{ height: Number(h), borderRadius: 4, marginBottom: j < 2 ? 5 : 0, width: String(w), animation: "shimmer 1.4s infinite", backgroundImage: "linear-gradient(90deg,#f3f4f6 25%,#e8d5d5 50%,#f3f4f6 75%)", backgroundSize: "200% 100%" }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Thread Viewer ──────────────────────────────────────────────────────────────
function ThreadViewer({
  convoId, currentUserId, onBack, onArchive,
}: {
  convoId:       string;
  currentUserId: string;
  onBack:        () => void;
  onArchive:     (id: string) => void;
}) {
  const [convo,   setConvo]   = useState<FullConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply,   setReply]   = useState("");
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/${convoId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setConvo(data.conversation);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [convoId]);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [loading, convo?.messages.length]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res  = await fetch(`${API_BASE}/${convoId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setConvo(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev);
      setReply("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleArchive = async () => {
    try {
      await fetch(`${API_BASE}/${convoId}`, { method: "DELETE" });
    } catch {
      // best-effort
    }
    onArchive(convoId);
    onBack();
  };

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontFamily: FONT, fontSize: 13 }}>
      Loading…
    </div>
  );

  if (error || !convo) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <p style={{ color: "#ef4444", fontFamily: FONT, fontSize: 13 }}>{error ?? "Conversation not found."}</p>
      <button onClick={onBack} style={{ fontSize: 13, color: MAROON, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>← Back</button>
    </div>
  );

  const participants = convo.participants.filter(p => p.user.id !== currentUserId);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${MAROON_MID}`, flexShrink: 0, background: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <button onClick={onBack}
            style={{ background: "none", border: "none", cursor: "pointer", color: MAROON, fontSize: 13, fontWeight: 600, fontFamily: FONT, padding: 0, marginTop: 2, flexShrink: 0 }}>
            ←
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: "0 0 4px", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{convo.subject}</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {participants.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Avatar name={p.user.name} image={p.user.image} size={20} />
                  <span style={{ fontSize: 12, color: "#6b7280", fontFamily: FONT }}>{p.user.name ?? "Unknown"}</span>
                  <span style={{ fontSize: 10, background: MAROON_MID, color: MAROON, borderRadius: 10, padding: "1px 6px", fontWeight: 700, fontFamily: FONT }}>{p.user.role}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleArchive} title="Archive conversation"
            style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", color: "#6b7280", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; e.currentTarget.style.background = MAROON_BG; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "none"; }}>
            <Archive size={13} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {convo.messages.map(msg => {
          const isMine = msg.sender.id === currentUserId;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", gap: 10, alignItems: "flex-start" }}>
              <Avatar name={msg.sender.name} image={msg.sender.image} size={32} />
              <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", gap: 4, alignItems: isMine ? "flex-end" : "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: FONT }}>{isMine ? "You" : (msg.sender.name ?? "Unknown")}</span>
                  <span style={{ fontSize: 10, color: "#9ca3af", fontFamily: FONT }}>{timeAgo(msg.createdAt)}</span>
                </div>
                <div style={{ background: isMine ? MAROON : "#f3f4f6", color: isMine ? "#fff" : "#111827", borderRadius: isMine ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "10px 14px", fontSize: 13, lineHeight: 1.6, fontFamily: FONT, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {msg.body}
                </div>
                {msg.attachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                    {msg.attachments.map(a => (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 8px", fontSize: 11, color: "#374151", textDecoration: "none", fontFamily: FONT }}>
                        📎 {a.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 24px", borderTop: `1px solid ${MAROON_MID}`, background: "#fafafa", flexShrink: 0 }}>
        {error && <p style={{ fontSize: 12, color: "#ef4444", fontFamily: FONT, margin: "0 0 8px" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
            placeholder="Write a reply… (⌘+Enter to send)"
            rows={3}
            style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontFamily: FONT, resize: "none", outline: "none", lineHeight: 1.6, color: "#111827" }}
            onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
            onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")}
          />
          <button onClick={sendReply} disabled={sending || !reply.trim()}
            style={{ height: 38, padding: "0 16px", fontSize: 13, fontWeight: 700, color: "#fff", background: sending || !reply.trim() ? "#d1d5db" : MAROON, border: "none", borderRadius: 8, cursor: sending || !reply.trim() ? "default" : "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <Send size={13} />{sending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compose Modal ──────────────────────────────────────────────────────────────
function ComposeModal({
  initialRecipient,
  courseOptions,
  onClose,
  onSent,
}: {
  initialRecipient?: UserResult;
  courseOptions:     CourseOption[];
  onClose:           () => void;
  onSent:            () => void;
}) {
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(null);
  const [courseOpen,     setCourseOpen]     = useState(false);
  const [individual,     setIndividual]     = useState(false);
  const [recipients,     setRecipients]     = useState<UserResult[]>(
    initialRecipient ? [initialRecipient] : []
  );
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [subject,      setSubject]      = useState("");
  const [body,         setBody]         = useState("");
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [attachments,  setAttachments]  = useState<File[]>([]);

  const [toView,      setToView]      = useState<PickView>("root");
  const [toQuery,     setToQuery]     = useState("");
  const [toUsers,     setToUsers]     = useState<UserResult[]>([]);
  const [toPeople,    setToPeople]    = useState<UserResult[]>([]);
  const [toAllPeople, setToAllPeople] = useState<UserResult[]>([]);
  const [toCourse,    setToCourse]    = useState<CourseOption | null>(null);
  const [toRole,      setToRole]      = useState<string | null>(null);
  const [toLoading,   setToLoading]   = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const courseRef = useRef<HTMLDivElement>(null);
  const toRef     = useRef<HTMLDivElement>(null);
  const toTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetToPicker = useCallback(() => {
    setToView("root"); setToQuery(""); setToCourse(null);
    setToRole(null); setToAllPeople([]);
  }, []);

  useOnClickOutside(courseRef, useCallback(() => setCourseOpen(false), []));
  useOnClickOutside(toRef, useCallback(() => { setToPickerOpen(false); resetToPicker(); }, [resetToPicker]));

  useEffect(() => {
    if (!toPickerOpen || toView !== "users") return;
    if (toTimer.current) clearTimeout(toTimer.current);
    toTimer.current = setTimeout(() => {
      setToLoading(true);
      const url = toQuery.trim()
        ? `${API_USERS}?search=${encodeURIComponent(toQuery.trim())}`
        : API_USERS;
      fetch(url)
        .then(r => r.json())
        .then(d => { setToUsers(d.users ?? []); setToLoading(false); })
        .catch(() => setToLoading(false));
    }, toQuery.trim() ? 300 : 0);
  }, [toQuery, toPickerOpen, toView]);

  useEffect(() => {
    if (!toPickerOpen || toView !== "course-people" || !toCourse) return;
    setToLoading(true);
    fetch(API_COURSE_PEOPLE(toCourse.id))
      .then(r => r.json())
      .then(d => {
        const list: (UserResult & { role?: string })[] = d.people ?? [];
        const byRole = toRole
          ? list.filter(u => (u.role ?? "").toLowerCase() === toRole.toLowerCase())
          : list;
        setToAllPeople(byRole);
        setToPeople(byRole);
        setToLoading(false);
      })
      .catch(() => setToLoading(false));
  }, [toPickerOpen, toView, toCourse, toRole]);

  useEffect(() => {
    if (toView !== "course-people" || toAllPeople.length === 0) return;
    setToPeople(
      toQuery.trim()
        ? toAllPeople.filter(u =>
            (u.name ?? "").toLowerCase().includes(toQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(toQuery.toLowerCase())
          )
        : toAllPeople
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toQuery, toView]);

  const addRecipient = (u: UserResult) => {
    if (!recipients.find(r => r.id === u.id)) setRecipients(prev => [...prev, u]);
    setToPickerOpen(false);
    resetToPicker();
  };

  const removeRecipient = (id: string) =>
    setRecipients(prev => prev.filter(r => r.id !== id));

  const handleSend = async () => {
    if (recipients.length === 0 || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject:      subject.trim() || "(no subject)",
          body:         body.trim(),
          recipientIds: recipients.map(r => r.id),
          courseId:     selectedCourse?.id ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      onSent();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  };

  const courseOptions2    = courseOptions.filter(o => o.type === "course");
  const filteredForPicker = courseOptions.filter(o =>
    o.name.toLowerCase().includes(toQuery.toLowerCase())
  );

  const toBackLabel =
    toView === "course-people" ? (toRole ?? `All in ${toCourse?.name}`) :
    toView === "course-roles"  ? (toCourse?.name ?? "Course") :
    toView === "users"         ? "Users" : "Courses";

  const goToBack = () => {
    if (toView === "course-people")     { setToView("course-roles"); setToQuery(""); setToRole(null); setToAllPeople([]); }
    else if (toView === "course-roles") { setToView("courses"); setToQuery(""); setToCourse(null); }
    else                                { setToView("root"); setToQuery(""); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1px solid #e5e7eb", borderRadius: 6,
    padding: "8px 12px", fontSize: 13, fontFamily: FONT,
    outline: "none", color: "#111827", background: "#fff",
    boxSizing: "border-box", transition: "border-color .15s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "#374151", marginBottom: 6, fontFamily: FONT,
  };

  const PersonRow = ({ u }: { u: UserResult }) => (
    <button
      onClick={() => addRecipient(u)}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", border: "none", background: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid #f9fafb", fontFamily: FONT }}
      onMouseEnter={e => (e.currentTarget.style.background = MAROON_BG)}
      onMouseLeave={e => (e.currentTarget.style.background = "none")}
    >
      <Avatar name={u.name} image={u.image} size={30} />
      <div style={{ minWidth: 0, flex: 1 }}>
        {u.name && <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>}
        <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
      </div>
    </button>
  );

  const ToPickerList = () => {
    if (toView === "root") return (
      <>
        <button onClick={() => { setToView("courses"); setToQuery(""); }}
          style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: `1px solid ${MAROON_MID}`, textAlign: "left" }}
          onMouseEnter={e => { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}>
          <span style={{ flex: 1 }}>Courses</span><span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
        </button>
        <button onClick={() => { setToView("users"); setToQuery(""); }}
          style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, textAlign: "left" }}
          onMouseEnter={e => { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}>
          <span style={{ flex: 1 }}>Users</span><span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
        </button>
      </>
    );
    if (toView === "courses") return (
      filteredForPicker.filter(o => o.type === "course").length === 0
        ? <p style={{ fontSize: 12, color: "#9ca3af", padding: "14px 12px", margin: 0 }}>No courses.</p>
        : <>
            {filteredForPicker.filter(o => o.type === "course").map(o => (
              <button key={o.id} onClick={() => { setToCourse(o); setToView("course-roles"); setToQuery(""); }}
                style={{ display: "flex", alignItems: "center", width: "100%", padding: "9px 14px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: "1px solid #f9fafb", textAlign: "left" }}
                onMouseEnter={e => { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}>
                <span style={{ flex: 1 }}>{o.name}</span><span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
              </button>
            ))}
          </>
    );
    if (toView === "course-roles") return (
      <>
        <button onClick={() => { setToRole(null); setToView("course-people"); setToQuery(""); setToAllPeople([]); }}
          style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#fff", background: MAROON, border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: `1px solid ${MAROON_MID}`, textAlign: "left" }}>
          <span style={{ flex: 1 }}>All in {toCourse?.name}</span>
        </button>
        {["Teachers", "Staff", "Dean"].map(role => (
          <button key={role} onClick={() => { setToRole(role); setToView("course-people"); setToQuery(""); setToAllPeople([]); }}
            style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: "1px solid #f9fafb", textAlign: "left" }}
            onMouseEnter={e => { e.currentTarget.style.background = MAROON_BG; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#374151"; }}>
            <span style={{ flex: 1 }}>{role}</span><span style={{ color: "#9ca3af", fontSize: 16 }}>›</span>
          </button>
        ))}
      </>
    );
    const list = toView === "course-people" ? toPeople : toUsers;
    if (toLoading) return <SkeletonRows />;
    if (list.length === 0) return (
      <p style={{ fontSize: 12, color: "#9ca3af", padding: "14px 12px", margin: 0 }}>
        {toQuery ? "No results." : "No people found."}
      </p>
    );
    return <>{list.map(u => <PersonRow key={u.id} u={u} />)}</>;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 12px 48px rgba(0,0,0,0.18)", fontFamily: FONT, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${MAROON_MID}`, flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Compose Message</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", fontSize: 20, padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div ref={courseRef} style={{ position: "relative" }}>
            <label style={labelStyle}>Course (optional)</label>
            <div onClick={() => setCourseOpen(v => !v)}
              style={{ ...inputStyle, display: "flex", alignItems: "center", cursor: "pointer", padding: "8px 12px" }}>
              <span style={{ flex: 1, color: selectedCourse ? "#111827" : "#9ca3af" }}>
                {selectedCourse ? selectedCourse.name : "No Course (Direct Message)"}
              </span>
              <ChevronDown size={13} style={{ color: "#9ca3af", transform: courseOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </div>
            {courseOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, background: "#fff", border: `1px solid ${MAROON}`, borderRadius: "0 0 6px 6px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", maxHeight: 220, overflowY: "auto" }}>
                <button onClick={() => { setSelectedCourse(null); setCourseOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, color: !selectedCourse ? MAROON : "#374151", background: !selectedCourse ? MAROON_BG : "none", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: `1px solid ${MAROON_MID}` }}>
                  No Course
                </button>
                {courseOptions2.map(o => (
                  <button key={o.id} onClick={() => { setSelectedCourse(o); setCourseOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, color: selectedCourse?.id === o.id ? MAROON : "#374151", background: selectedCourse?.id === o.id ? MAROON_BG : "none", border: "none", cursor: "pointer", fontFamily: FONT }}
                    onMouseEnter={e => { if (selectedCourse?.id !== o.id) e.currentTarget.style.background = MAROON_BG; }}
                    onMouseLeave={e => { if (selectedCourse?.id !== o.id) e.currentTarget.style.background = "none"; }}>
                    {o.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#374151", fontFamily: FONT }}>
            <input type="checkbox" checked={individual} onChange={e => setIndividual(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: MAROON, cursor: "pointer" }} />
            Send an individual message to each recipient
          </label>

          <div ref={toRef} style={{ position: "relative" }}>
            <label style={labelStyle}>To <span style={{ color: MAROON }}>*</span></label>
            <div
              style={{ display: "flex", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 8px", gap: 6, flexWrap: "wrap", minHeight: 38, background: "#fff", cursor: "text" }}
              onClick={() => { if (!toPickerOpen) { setToPickerOpen(true); setToView("root"); setToQuery(""); } }}
            >
              <Search size={13} style={{ color: "#9ca3af", flexShrink: 0 }} />
              {recipients.map(r => (
                <span key={r.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: MAROON_MID, color: MAROON, borderRadius: 20, padding: "2px 8px 2px 10px", fontSize: 12, fontWeight: 600 }}>
                  {r.name ?? r.email}
                  <button onClick={e => { e.stopPropagation(); removeRecipient(r.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: MAROON, padding: 0, display: "flex", fontSize: 14, lineHeight: 1 }}>×</button>
                </span>
              ))}
              <input
                value="" readOnly
                placeholder={recipients.length === 0 ? "Click to select recipients…" : ""}
                style={{ flex: 1, minWidth: 120, border: "none", outline: "none", fontSize: 13, fontFamily: FONT, color: "#374151", background: "transparent", cursor: "pointer" }}
              />
              <button
                onClick={e => { e.stopPropagation(); setToPickerOpen(v => !v); setToView("root"); }}
                style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: toPickerOpen ? MAROON_BG : "none", border: `1px solid ${toPickerOpen ? MAROON : "#e5e7eb"}`, borderRadius: 4, cursor: "pointer", color: toPickerOpen ? MAROON : "#6b7280", flexShrink: 0 }}>
                <UserRound size={13} />
              </button>
            </div>

            {toPickerOpen && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, background: "#fff", border: `1px solid ${MAROON}`, borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "0 8px 32px rgba(0,0,0,0.10)", maxHeight: 300, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {toView !== "root" && (
                  <button onClick={goToBack}
                    style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "9px 12px", border: "none", background: MAROON, cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    <span style={{ fontSize: 16 }}>‹</span>{toBackLabel}
                  </button>
                )}
                {toView !== "root" && toView !== "course-roles" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", borderBottom: `1px solid ${MAROON_MID}` }}>
                    <Search size={12} style={{ color: "#9ca3af" }} />
                    <input
                      autoFocus value={toQuery} onChange={e => setToQuery(e.target.value)}
                      placeholder={toView === "courses" ? "Search courses…" : toView === "users" ? "Search users…" : `Search in ${toCourse?.name}…`}
                      style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: FONT, color: "#374151", background: "transparent" }}
                    />
                    {toQuery && <button onClick={() => setToQuery("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", padding: 0 }}><X size={11} /></button>}
                  </div>
                )}
                <div style={{ overflowY: "auto", flex: 1 }}><ToPickerList /></div>
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter subject…"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")} />
          </div>

          <div>
            <label style={labelStyle}>Message <span style={{ color: MAROON }}>*</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
              onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
              onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")} />
          </div>

          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {attachments.map((f, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#f3f4f6", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#374151" }}>
                  {f.name}
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 0, fontSize: 14 }}>×</button>
                </span>
              ))}
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0, fontFamily: FONT }}>{error}</p>}
        </div>

        <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderTop: `1px solid ${MAROON_MID}`, background: "#fafafa", flexShrink: 0, gap: 6 }}>
          <button title="Add attachment" onClick={() => fileRef.current?.click()}
            style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", color: "#6b7280" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; e.currentTarget.style.background = MAROON_BG; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; e.currentTarget.style.background = "none"; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }}
            onChange={e => { if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]); }} />
          <div style={{ flex: 1 }} />
          <button onClick={onClose}
            style={{ padding: "7px 16px", fontSize: 12, fontWeight: 700, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}>
            Cancel
          </button>
          <button onClick={handleSend} disabled={sending || recipients.length === 0 || !body.trim()}
            style={{ padding: "7px 20px", fontSize: 12, fontWeight: 700, color: "#fff", background: sending || recipients.length === 0 || !body.trim() ? "#d1d5db" : MAROON, border: "none", borderRadius: 8, cursor: sending || recipients.length === 0 || !body.trim() ? "default" : "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}>
            <Send size={12} />{sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Notifications Panel ────────────────────────────────────────────────────────
function NotificationsPanel() {
  const [activeTab, setActiveTab] = useState<NotifTab>("assignments");
  const [assignments,   setAssignments]   = useState<NotifAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<NotifAnnouncement[]>([]);
  const [quizzes,       setQuizzes]       = useState<NotifQuiz[]>([]);
  const [forms,         setForms]         = useState<NotifForm[]>([]);
  const [enrollments,   setEnrollments]   = useState<NotifEnrollment[]>([]);
  const [loading,       setLoading]       = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [asgn, ann, qz, enr] = await Promise.allSettled([
      fetch("/api/assignments").then(r => r.json()),
      fetch("/api/announcements").then(r => r.json()),
      fetch("/api/quizzes").then(r => r.json()),
      fetch("/api/inbox/enrollments").then(r => r.json()),
    ]);
    if (asgn.status === "fulfilled") setAssignments(asgn.value.assignments ?? []);
    if (ann.status  === "fulfilled") setAnnouncements(ann.value.announcements ?? []);
    if (qz.status   === "fulfilled") {
      setQuizzes(qz.value.quizzes ?? []);
      setForms(qz.value.forms ?? []);
    }
    if (enr.status  === "fulfilled") setEnrollments(enr.value.enrollments ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statusColor = (s: string) => {
    if (s === "SUBMITTED" || s === "GRADED") return "#15803d";
    if (s === "OVERDUE")  return "#dc2626";
    return "#d97706";
  };
  const statusLabel = (s: string) => {
    if (s === "SUBMITTED") return "Submitted";
    if (s === "GRADED")    return "Graded";
    if (s === "OVERDUE")   return "Overdue";
    return "Pending";
  };

  const quizTypeLabel = (t: string) => {
    if (t === "GRADED_QUIZ")     return "Graded Quiz";
    if (t === "PRACTICE_QUIZ")   return "Practice Quiz";
    if (t === "GRADED_SURVEY")   return "Graded Survey";
    if (t === "UNGRADED_SURVEY") return "Survey";
    return t;
  };

  const formTypeLabel = (t: string) => {
    if (t === "SURVEY_FEEDBACK")  return "Survey";
    if (t === "EVALUATION")       return "Evaluation";
    if (t === "REGISTRATION_FORM")return "Registration";
    if (t === "GRADED_ASSESSMENT")return "Assessment";
    return t;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${MAROON_MID}`, background: "#fff", flexShrink: 0, overflowX: "auto" }}>
        {NOTIF_TABS.map(({ key, label, Icon }) => {
          const count =
            key === "assignments"   ? assignments.length :
            key === "announcements" ? announcements.length :
            key === "quizzes"       ? quizzes.length + forms.length :
            enrollments.length;
          const active = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 14px", border: "none", background: "none",
                cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: active ? 700 : 500,
                color: active ? MAROON : "#6b7280", borderBottom: active ? `2px solid ${MAROON}` : "2px solid transparent",
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <Icon size={13} />
              {label}
              {count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, background: active ? MAROON : "#e5e7eb", color: active ? "#fff" : "#6b7280", borderRadius: 10, padding: "0 5px", minWidth: 16, textAlign: "center" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <ListSkeleton />
        ) : activeTab === "assignments" ? (
          assignments.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <ClipboardList size={32} style={{ color: MAROON_MID, marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: FONT, margin: 0 }}>No assignments assigned to you.</p>
            </div>
          ) : (
            assignments.map(a => (
              <div key={a.id} style={{ padding: "12px 16px", borderBottom: `1px solid #f3f4f6`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: a.course?.color ?? MAROON_MID, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <BookOpen size={15} style={{ color: "#fff" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
                    <StatusPill label={statusLabel(a.status)} color={statusColor(a.status)} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {a.course && (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280", fontFamily: FONT }}>
                        <CourseDot color={a.course.color} />
                        {a.course.name}
                      </span>
                    )}
                    {a.dueDate && (
                      <span style={{ fontSize: 11, color: new Date(a.dueDate) < new Date() && a.status === "PENDING" ? "#dc2626" : "#9ca3af", fontFamily: FONT }}>
                        Due {fmtDue(a.dueDate)}
                      </span>
                    )}
                    {a.grade !== null && (
                      <span style={{ fontSize: 11, color: "#15803d", fontFamily: FONT, fontWeight: 700 }}>
                        Grade: {a.grade}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : activeTab === "announcements" ? (
          announcements.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <Megaphone size={32} style={{ color: MAROON_MID, marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: FONT, margin: 0 }}>No announcements in your courses.</p>
            </div>
          ) : (
            announcements.map(a => (
              <div key={a.id} style={{ padding: "12px 16px", borderBottom: `1px solid #f3f4f6`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: a.course?.color ?? MAROON, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Megaphone size={15} style={{ color: "#fff" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: FONT, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
                  {a.bodyText && (
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.bodyText}</p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280", fontFamily: FONT }}>
                      <CourseDot color={a.course.color} />{a.course.name}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT }}>{timeAgo(a.createdAt)}</span>
                    <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT }}>by {a.author}</span>
                    {a.attachments.length > 0 && (
                      <span style={{ fontSize: 11, color: MAROON, fontFamily: FONT }}>📎 {a.attachments.length} file{a.attachments.length > 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )
        ) : activeTab === "quizzes" ? (
          quizzes.length === 0 && forms.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <FileText size={32} style={{ color: MAROON_MID, marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: FONT, margin: 0 }}>No quizzes or forms assigned to you.</p>
            </div>
          ) : (
            <>
              {quizzes.map(q => (
                <div key={q.id} style={{ padding: "12px 16px", borderBottom: `1px solid #f3f4f6`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: q.course?.color ?? MAROON, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={15} style={{ color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.title}</span>
                      <StatusPill label={quizTypeLabel(q.quizType)} color={MAROON} />
                      {q.attempted
                        ? <StatusPill label="Attempted" color="#15803d" />
                        : <StatusPill label="Not Yet Taken" color="#d97706" />}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280", fontFamily: FONT }}>
                        <CourseDot color={q.course.color} />{q.course.name}
                      </span>
                      {q.dueDate && <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT }}>Due {fmtDue(q.dueDate)}</span>}
                      <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT }}>{q.points} pts</span>
                      {q.score !== null && <span style={{ fontSize: 11, color: "#15803d", fontWeight: 700, fontFamily: FONT }}>Score: {q.score}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {forms.map(f => (
                <div key={f.id} style={{ padding: "12px 16px", borderBottom: `1px solid #f3f4f6`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: f.course?.color ?? "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ClipboardList size={15} style={{ color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</span>
                      <StatusPill label={formTypeLabel(f.formType)} color="#6366f1" />
                      {f.submitted
                        ? <StatusPill label="Submitted" color="#15803d" />
                        : <StatusPill label="Pending" color="#d97706" />}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280", fontFamily: FONT }}>
                        <CourseDot color={f.course.color} />{f.course.name}
                      </span>
                      {f.dueDate && <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT }}>Due {fmtDue(f.dueDate)}</span>}
                      {f.score !== null && <span style={{ fontSize: 11, color: "#15803d", fontWeight: 700, fontFamily: FONT }}>Score: {f.score}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )
        ) : (
          // enrollments
          enrollments.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <GraduationCap size={32} style={{ color: MAROON_MID, marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: "#9ca3af", fontFamily: FONT, margin: 0 }}>You are not enrolled in any courses.</p>
            </div>
          ) : (
            enrollments.map(e => (
              <div key={e.id} style={{ padding: "12px 16px", borderBottom: `1px solid #f3f4f6`, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: e.course?.color ?? MAROON, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {e.course.image
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={e.course.image} alt={e.course.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <GraduationCap size={15} style={{ color: "#fff" }} />
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: FONT }}>{e.course.name}</span>
                    <StatusPill label={e.courseRole} color={MAROON} />
                    <StatusPill
                      label={e.course.status === "PUBLISHED" ? "Published" : "Unpublished"}
                      color={e.course.status === "PUBLISHED" ? "#15803d" : "#9ca3af"}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#6b7280", fontFamily: FONT }}>{e.course.code}</span>
                    {e.section && <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT }}>Section: {e.section}</span>}
                    <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT }}>Enrolled {timeAgo(e.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}

// ── Action Button ──────────────────────────────────────────────────────────────
function ActionBtn({
  icon, title, onClick, disabled = false,
}: {
  icon: React.ReactNode; title: string; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, cursor: disabled ? "default" : "pointer", color: disabled ? "#d1d5db" : "#6b7280", transition: "all 0.12s" }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; e.currentTarget.style.background = MAROON_BG; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = disabled ? "#d1d5db" : "#6b7280"; e.currentTarget.style.background = "none"; }}>
      {icon}
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
type MainTab = "messages" | "notifications";

export default function InboxPage({ currentUserId }: { currentUserId: string }) {
  const [mainTab,       setMainTab]       = useState<MainTab>("messages");
  const [courses,       setCourses]       = useState<CourseOption[]>([]);
  const [selectedCtx,   setSelectedCtx]   = useState<CourseOption | null>(null);
  const [mailbox,       setMailbox]       = useState("inbox");
  const [convos,        setConvos]        = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [composing,     setComposing]     = useState(false);
  const [composeFor,    setComposeFor]    = useState<UserResult | undefined>(undefined);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(API_COURSES).then(r => r.json()).catch(() => ({ courses: [] })),
      fetch("/api/groups").then(r => r.json()).catch(() => ({ groups: [] })),
    ]).then(([cd, gd]) => {
      const c: CourseOption[] = (cd.courses ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name, type: "course" as const }));
      const g: CourseOption[] = (gd.groups  ?? []).map((x: { id: string; name: string }) => ({ id: x.id, name: x.name, type: "group"  as const }));
      setCourses([...c, ...g]);
    });
  }, []);

  const fetchConvos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mailbox });
      if (selectedCtx?.type === "course") params.set("courseId", selectedCtx.id);
      const res  = await fetch(`${API_BASE}?${params}`);
      const data = await res.json();
      setConvos(data.conversations ?? []);
    } catch {
      setConvos([]);
    } finally {
      setLoading(false);
    }
  }, [mailbox, selectedCtx]);

  useEffect(() => { fetchConvos(); }, [fetchConvos]);

  useEffect(() => {
    const id = setInterval(fetchConvos, 30_000);
    return () => clearInterval(id);
  }, [fetchConvos]);

  const handleSelectUser = (u: UserResult) => {
    setComposeFor(u);
    setComposing(true);
  };

  const handleArchive = (id: string) => {
    setConvos(prev => prev.filter(c => c.id !== id));
    if (activeConvoId === id) setActiveConvoId(null);
  };

  const handleSelectConvo = (id: string) => {
    setActiveConvoId(prev => (prev === id ? null : id));
    setConvos(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c));
  };

  const unreadCount = convos.filter(c => c.unread).length;
  const hasActive   = !!activeConvoId && mainTab === "messages";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: FONT, background: "#fff" }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>

      {/* ── Main tab switcher ── */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${MAROON_MID}`, background: "#fff", flexShrink: 0 }}>
        {(["messages", "notifications"] as MainTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setMainTab(tab); setActiveConvoId(null); }}
            style={{
              padding: "10px 18px", border: "none", background: "none",
              cursor: "pointer", fontFamily: FONT, fontSize: 13, fontWeight: mainTab === tab ? 700 : 500,
              color: mainTab === tab ? MAROON : "#6b7280",
              borderBottom: mainTab === tab ? `2px solid ${MAROON}` : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {tab === "messages"
              ? <><Inbox size={14} />Messages{unreadCount > 0 && <span style={{ fontSize: 10, fontWeight: 800, background: MAROON, color: "#fff", borderRadius: 10, padding: "0 5px" }}>{unreadCount}</span>}</>
              : <><Bell size={14} />Notifications</>
            }
          </button>
        ))}
      </div>

      {mainTab === "notifications" ? (
        <NotificationsPanel />
      ) : (
        <>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${MAROON_MID}`, background: "#fff", flexShrink: 0 }}>
            <CourseFilter options={courses} selected={selectedCtx} onSelect={setSelectedCtx} />
            <MailboxFilter value={mailbox} onChange={v => { setMailbox(v); setActiveConvoId(null); }} />
            <AddressBookPicker courseOptions={courses} onSelectUser={handleSelectUser} />
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => { setComposeFor(undefined); setComposing(true); }} title="Compose"
                  style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", background: MAROON, border: "none", borderRadius: 6, cursor: "pointer", color: "#fff" }}
                  onMouseEnter={e => (e.currentTarget.style.background = MAROON_DARK)}
                  onMouseLeave={e => (e.currentTarget.style.background = MAROON)}>
                  <Pencil size={13} />
                </button>
                {unreadCount > 0 && (
                  <span style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 10, padding: "1px 5px", fontFamily: FONT, pointerEvents: "none" }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 2px" }} />
              <ActionBtn icon={<Reply size={13}/>}        title="Reply"     disabled={!hasActive} onClick={() => { if (activeConvoId) { setComposeFor(undefined); setComposing(true); } }} />
              <ActionBtn icon={<ReplyAll size={13}/>}     title="Reply All" disabled={!hasActive} />
              <ActionBtn icon={<Download size={13}/>}     title="Archive"   disabled={!hasActive} onClick={() => { if (activeConvoId) handleArchive(activeConvoId); }} />
              <ActionBtn icon={<Trash2 size={13}/>}       title="Delete"    disabled={!hasActive} onClick={() => { if (activeConvoId) handleArchive(activeConvoId); }} />
              <ActionBtn icon={<MoreVertical size={13}/>} title="More" />
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ width: hasActive ? 320 : "100%", borderRight: hasActive ? `1px solid ${MAROON_MID}` : "none", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
              {loading ? (
                <ListSkeleton />
              ) : convos.length === 0 ? (
                <EmptyState mailbox={mailbox} />
              ) : (
                convos.map(c => (
                  <ConvoRow key={c.id} convo={c} selected={activeConvoId === c.id} onSelect={() => handleSelectConvo(c.id)} />
                ))
              )}
            </div>

            {hasActive && (
              <ThreadViewer
                convoId={activeConvoId!}
                currentUserId={currentUserId}
                onBack={() => setActiveConvoId(null)}
                onArchive={handleArchive}
              />
            )}
          </div>
        </>
      )}

      {composing && (
        <ComposeModal
          initialRecipient={composeFor}
          courseOptions={courses}
          onClose={() => setComposing(false)}
          onSent={fetchConvos}
        />
      )}
    </div>
  );
}