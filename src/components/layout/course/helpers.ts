  // src/components/layout/course/helpers.ts

  import type { RawAnnouncement, Announcement } from "./types";

  export const FONT = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";
  export const MAROON = "#7b1113";
  export const COLORS = {
    primary: "#7b1113",
    primaryHover: "#5a0d0f",
    primarySoft: "#fdf8f8",
    primarySoftBorder: "#f0e4e4",
    text: "#111827",
    textSecondary: "#6b7280",
    textMuted: "#9ca3af",
    link: "#7b1113",
    border: "#e5e7eb",
    success: "#15803d",
  };

  export const ALL_TABS = [
    "Home","Announcements","Assignments","Discussions",
    "Grades","People","Files","Syllabus","Collaborations","Form",
  ] as const;

  export const HIDDEN_FOR_HEAD: string[] = ["Discussions","Collaborations","Syllabus","Files"];
  export const HIDDEN_FOR_STAFF: string[] = ["Discussions","Collaborations","Syllabus","Files"];

  export const GRADE_OPTIONS = [
    "Points","Percentage","Complete/Incomplete",
    "Letter Grade","GPA Scale","Not Graded",
  ];
  export const SUBMISSION_TYPES = [
    "Online","On Paper","No Submission","External Tool","Lucid",
  ];
  export const SUBMISSION_ENTRY_TYPES = [
    "File Upload","Text Entry","Website URL","Media Recording",
  ];

  export function buildTimes(): string[] {
    const list: string[] = [];
    for (let h = 0; h < 24; h++)
      for (let m = 0; m < 60; m += 30) {
        const hh = ((h + 11) % 12) + 1;
        list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`);
      }
    return list;
  }
  export const TIME_OPTIONS = buildTimes();

  // ── localStorage helpers ───────────────────────────────────────────────────────
  export function groupsStorageKey(courseId: string) {
    return `assignment_groups_${courseId}`;
  }
  export function loadPersistedGroups(courseId: string): string[] {
    try {
      const raw = localStorage.getItem(groupsStorageKey(courseId));
      if (!raw) return [];
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  export function persistGroups(courseId: string, groups: string[]) {
    try {
      localStorage.setItem(groupsStorageKey(courseId), JSON.stringify(groups));
    } catch {}
  }

  // ── Date formatters ────────────────────────────────────────────────────────────
  export function fmtDate(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " by " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
    );
  }

  export function fmtDateLong(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    });
  }

  export function fmtDateTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      ", " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    );
  }

  export function fmtDue(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " at " +
      d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
    );
  }

  export function fmtAvail(from: string | null, until: string | null) {
    const f = from
      ? new Date(from).toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " at " +
        new Date(from).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
      : null;
    const u = until
      ? new Date(until).toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " at " +
        new Date(until).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
      : null;
    return [f, u].filter(Boolean).join(" - ");
  }

  export function fmtDateLabel(date: string, time: string) {
    if (!date) return "";
    try {
      const d = new Date(`${date}T00:00:00`);
      return (
        d.toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric", year: "numeric",
        }) +
        " " +
        (time || "11:59 PM")
      );
    } catch {
      return "";
    }
  }

  export function isoToDate(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toISOString().split("T")[0];
  }

  export function isoToTime(iso: string | null) {
    if (!iso) return "11:59 PM";
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  export function stripHtml(html: string) {
    if (!html) return "";
    if (typeof window === "undefined") return html.replace(/<[^>]+>/g, " ");
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }

  export function normalizeRecipients(value: string | string[] | undefined) {
    if (!value) return "Everyone";
    if (Array.isArray(value)) return value.length === 0 ? "Everyone" : value.join(", ");
    return value;
  }

  export function normalizeAnnouncement(a: RawAnnouncement, index: number): Announcement {
    return {
      id: String(a.id ?? index),
      title: a.title || a.topicTitle || "(Untitled announcement)",
      body: a.bodyText || a.message || stripHtml(a.bodyHtml || "") || "",
      bodyHtml: a.bodyHtml || "",
      authorName: a.authorName || a.author || "Admin",
      authorImage: a.authorImage ?? null,
      recipientsLabel: normalizeRecipients(a.assignTo || a.postTo),
      createdAt: a.createdAtIso || a.createdAt || a.created_at || null,
      read: Boolean(a.read),
      locked: Boolean(a.locked),
      allowComments: a.allowComments !== false,
      allowLiking: Boolean(a.allowLiking),
      attachments: (a.attachments ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.mimeType || f.type || "",
        url: f.url,
      })),
    };
  }

  export function normalizeCourseRole(role: string | null | undefined): string {
  const parts = (role ?? "").split(",").map(r => r.trim()).filter(r => r === "Staff" || r === "Head");
  return parts.length > 0 ? parts.join(",") : "Staff";
}

  export function normalizeOpt(opt: string): string {
    const o = opt.toLowerCase().replace(/\s+/g, "_");
    if (o.includes("text")) return "online_text_entry";
    if (o.includes("file")) return "file_upload";
    if (o.includes("url") || o.includes("website")) return "online_url";
    if (o.includes("media")) return "media_recording";
    if (o.includes("annotation")) return "student_annotation";
    return o;
  }

  export const OPT_LABELS: Record<string, string> = {
    online_text_entry: "Text Entry",
    file_upload: "File Upload",
    online_url: "Website URL",
    media_recording: "Media Recording",
    student_annotation: "Student Annotation",
  };