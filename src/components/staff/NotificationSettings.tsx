"use client";

// src/components/staff/NotificationSettings.tsx

import { useState } from "react";
import AccountSidebar from "@/components/layout/AccountSidebar";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

type FrequencyType = "immediately" | "daily" | "weekly" | "never";

interface NotificationItem {
  id: string;
  title: string;
  description?: string;
  subItems?: string[];
  frequency: FrequencyType;
}

interface NotificationGroup {
  group: string;
  items: NotificationItem[];
}

const initialData: NotificationGroup[] = [
  {
    group: "Course Activities",
    items: [
      { id: "due_date",            title: "Due Date",                    description: "Assignment due date change",                                                     frequency: "immediately" },
      { id: "grading_policies",    title: "Grading Policies",            description: "Course grading policy change",                                                   frequency: "immediately" },
      { id: "course_content",      title: "Course Content",              description: "New or changed course content", subItems: ["Pages", "Files", "Syllabus", "Assignments", "Quiz content"], frequency: "daily" },
      { id: "files",               title: "Files",                       description: "New file added to a course",                                                     frequency: "never"       },
      { id: "announcement",        title: "Announcement",                description: "New announcement in your courses",                                               frequency: "immediately" },
      { id: "announcement_created",title: "Announcement Created By You", description: "Announcements you have created",                                                 frequency: "never"       },
      { id: "grading",             title: "Grading",                     description: "Assignment or submission grade entered or changed",                              frequency: "immediately" },
      { id: "invitation",          title: "Invitation",                  subItems: ["Course invitations", "Group invitations", "Collaborations", "Peer Reviews", "TA invitations"], frequency: "immediately" },
      { id: "all_submissions",     title: "All Submissions",             description: "Instructor only. Assignment submission, resubmission, and recall actions",      frequency: "never"       },
      { id: "late_grading",        title: "Late Grading",                description: "Instructor only. Late assignment submission",                                   frequency: "never"       },
      { id: "submission_comment",  title: "Submission Comment",          description: "Assignment submission comment",                                                  frequency: "immediately" },
      { id: "blueprint_sync",      title: "Blueprint Sync",              description: "Blueprint sync operations initiated to course by associated course",            frequency: "immediately" },
    ],
  },
  {
    group: "Discussions",
    items: [
      { id: "new_topic",      title: "New Topic",      description: "New discussion topic in a course",           frequency: "never"       },
      { id: "new_reply",      title: "New Reply",       description: "New reply on a topic you are subscribed to", frequency: "immediately" },
      { id: "new_mention",    title: "New Mention",     description: "Someone mentioned you in a discussion",      frequency: "immediately" },
      { id: "reported_reply", title: "Reported Reply",  description: "New comment reported in a discussion",       frequency: "immediately" },
    ],
  },
  {
    group: "Conversations",
    items: [
      { id: "added_to_conv", title: "Added To Conversation",      description: "You are added to a conversation", frequency: "immediately" },
      { id: "conv_message",  title: "Conversation Message",       description: "New inbox message",               frequency: "immediately" },
      { id: "conv_created",  title: "Conversation Created By Me", description: "Not created conversations",       frequency: "never"       },
    ],
  },
  {
    group: "Scheduling",
    items: [
      { id: "student_appt", title: "Student Appointment Signup", description: "Instructor and Peers only. Student appointment signup", frequency: "never"       },
      { id: "appt_signup",  title: "Appointment Signup",         description: "Appointment signup confirmation",                      frequency: "immediately" },
      { id: "appt_cancel",  title: "Appointment Cancellation",   description: "Appointment cancelled",                               frequency: "immediately" },
      { id: "appt_avail",   title: "Appointment Availability",   description: "New appointment slots available for signup",          frequency: "immediately" },
      { id: "calendar",     title: "Calendar",                   description: "New activity on your course calendar",                frequency: "never"       },
    ],
  },
  {
    group: "Groups",
    items: [
      { id: "membership", title: "Membership Update", subItems: ["Joining a group", "Leaving a group", "Group membership accepted", "Group membership rejected"], frequency: "immediately" },
    ],
  },
  {
    group: "Conferences",
    items: [
      { id: "recording", title: "Recording Ready", description: "Conference recording is ready", frequency: "immediately" },
    ],
  },
  {
    group: "Alerts",
    items: [
      { id: "admin", title: "Administrative Notification", description: "Account or institution alerts", frequency: "immediately" },
    ],
  },
];

const FREQ_OPTIONS: { value: FrequencyType; label: string }[] = [
  { value: "immediately", label: "Immediately" },
  { value: "daily",       label: "Daily"       },
  { value: "weekly",      label: "Weekly"      },
  { value: "never",       label: "Never"       },
];

function FrequencyToggle({ value, onChange }: { value: FrequencyType; onChange: (v: FrequencyType) => void }) {
  return (
    <div className="flex items-center shrink-0">
      {FREQ_OPTIONS.map((opt, i) => {
        const isActive = value === opt.value;
        const isNever  = opt.value === "never";
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            title={opt.label}
            className={[
              "h-6 px-2.5 text-[10px] font-black border transition-all",
              i === 0 ? "rounded-l-md" : "",
              i === FREQ_OPTIONS.length - 1 ? "rounded-r-md" : "",
              i > 0 ? "-ml-px" : "",
              isActive
                ? isNever
                  ? "bg-gray-400 text-white border-gray-400 z-10"
                  : `text-white border-transparent z-10`
                : "bg-white text-gray-400 border-gray-200 hover:border-gray-300",
            ].join(" ")}
            style={isActive && !isNever ? { background: MAROON, borderColor: MAROON } : {}}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function NotifRow({ item, onChangeFrequency }: { item: NotificationItem; onChangeFrequency: (v: FrequencyType) => void }) {
  return (
    <div className="flex items-start justify-between gap-6 px-5 py-3 border-b last:border-0 hover:bg-gray-50/60 transition-colors" style={{ borderColor: "#f9f0f0" }}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700">{item.title}</p>
        {item.description && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>}
        {item.subItems    && <p className="text-[11px] text-gray-400 mt-0.5">{item.subItems.join(" · ")}</p>}
      </div>
      <FrequencyToggle value={item.frequency} onChange={onChangeFrequency} />
    </div>
  );
}

export default function NotificationSettings() {
  const [data, setData]             = useState<NotificationGroup[]>(initialData);
  const [showBanner, setShowBanner] = useState(true);

  const updateFrequency = (gIdx: number, iIdx: number, value: FrequencyType) => {
    setData(prev => prev.map((g, gi) =>
      gi !== gIdx ? g : { ...g, items: g.items.map((item, ii) => ii !== iIdx ? item : { ...item, frequency: value }) }
    ));
  };

  return (
    <div className="flex h-full" style={{ fontFamily: FONT }}>
      <AccountSidebar />

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Breadcrumb */}
        <p className="text-[11px] text-gray-400 mb-4 font-medium">
          Account <span className="mx-1">›</span> Notifications
        </p>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-base font-black text-gray-900">Notification Preferences</h1>
            <p className="text-xs text-gray-400 mt-0.5">Choose how often you receive each type of notification.</p>
          </div>
          <select className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 bg-white outline-none"
            onFocus={e => { e.currentTarget.style.borderColor = MAROON; }}
            onBlur={e =>  { e.currentTarget.style.borderColor = "#e5e7eb"; }}>
            <option>Account (All Courses)</option>
          </select>
        </div>

        {/* Info banner */}
        {showBanner && (
          <div className="flex items-start justify-between rounded-xl px-4 py-3 mb-5 text-xs border"
            style={{ background: "#fdf8f8", borderColor: "#f0e4e4", color: MAROON }}>
            <div className="flex gap-2.5">
              <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" style={{ color: MAROON }}>
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
              <span className="text-gray-600">
                These are account-level defaults. Individual course notifications can be changed within each course and will override these settings.
                Daily digests are sent around 6 PM; weekly digests on Saturdays between 12–1 PM.
              </span>
            </div>
            <button onClick={() => setShowBanner(false)} className="ml-3 shrink-0 transition-colors text-gray-300 hover:text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}

        {/* Notification groups */}
        <div className="space-y-3">
          {data.map((group, gIdx) => (
            <div key={group.group} className="bg-white rounded-xl overflow-hidden border" style={{ borderColor: "#f0e4e4" }}>
              <div className="flex items-center justify-between px-5 py-2.5 border-b" style={{ background: "#fdf8f8", borderColor: "#f0e4e4" }}>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: MAROON }}>{group.group}</span>
                <span className="text-[10px] text-gray-400">{group.items.length} notification{group.items.length !== 1 ? "s" : ""}</span>
              </div>
              {group.items.map((item, iIdx) => (
                <NotifRow key={item.id} item={item} onChangeFrequency={v => updateFrequency(gIdx, iIdx, v)} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}