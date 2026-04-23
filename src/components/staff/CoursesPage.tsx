"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type Status       = "pending" | "submitted" | "overdue" | "graded";
type SubType      = "text" | "file" | "both" | "link";
type ViewMode     = "list" | "detail" | "submit";

interface Assignment {
  id: number;
  title: string;
  description: string;
  assignedBy: string;
  assignedTo: "individual" | "group" | "department";
  group: string | null;
  department: string | null;
  deadline: string;
  postedDate: string;
  status: Status;
  submissionType: SubType;
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
  submittedContent: string | null;
}

// ── Sample Data ────────────────────────────────────────────────────────────
const initialAssignments: Assignment[] = [
  {
    id: 1,
    title: "Q1 Accomplishment Report",
    description: "Submit your Q1 accomplishment report covering all activities, trainings attended, and outputs produced from January to March 2026. Use the standard template provided by the admin office. Attach supporting documents as needed.",
    assignedBy: "Admin",
    assignedTo: "individual",
    group: null,
    department: null,
    deadline: "2026-02-28",
    postedDate: "2026-02-01",
    status: "pending",
    submissionType: "both",
    grade: null,
    feedback: null,
    submittedAt: null,
    submittedContent: null,
  },
  {
    id: 2,
    title: "Faculty Development Plan 2026",
    description: "Each faculty member is required to submit an individual faculty development plan for the year 2026. The plan should include target trainings, research activities, and professional development goals.",
    assignedBy: "Admin",
    assignedTo: "group",
    group: "IT Group",
    department: null,
    deadline: "2026-03-05",
    postedDate: "2026-02-15",
    status: "pending",
    submissionType: "file",
    grade: null,
    feedback: null,
    submittedAt: null,
    submittedContent: null,
  },
  {
    id: 3,
    title: "Research Output Summary",
    description: "Provide a concise summary of your research outputs for the current academic year. Include title, co-authors if any, publication status, and journal/conference details.",
    assignedBy: "Admin",
    assignedTo: "department",
    group: null,
    department: "College of Information Technology",
    deadline: "2026-02-15",
    postedDate: "2026-01-20",
    status: "overdue",
    submissionType: "text",
    grade: null,
    feedback: null,
    submittedAt: null,
    submittedContent: null,
  },
  {
    id: 4,
    title: "Training Attendance Sheet",
    description: "Upload scanned copy of your signed training attendance sheet for the recent faculty training/seminar attended. File must be in PDF or image format.",
    assignedBy: "Admin",
    assignedTo: "group",
    group: "IT Group",
    department: null,
    deadline: "2026-02-10",
    postedDate: "2026-01-25",
    status: "graded",
    submissionType: "file",
    grade: 88,
    feedback: "Good submission. Attendance sheet is complete and properly signed.",
    submittedAt: "2026-02-09",
    submittedContent: "training-attendance.pdf",
  },
  {
    id: 5,
    title: "Semestral Self-Evaluation Form",
    description: "Complete the semestral self-evaluation form honestly and thoroughly. Rate yourself on teaching performance, research involvement, community service, and professional growth.",
    assignedBy: "Admin",
    assignedTo: "individual",
    group: null,
    department: null,
    deadline: "2026-02-20",
    postedDate: "2026-02-05",
    status: "graded",
    submissionType: "both",
    grade: 92,
    feedback: "Excellent self-evaluation. Very detailed and reflective responses.",
    submittedAt: "2026-02-18",
    submittedContent: "Submitted via text entry",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const statusStyle: Record<Status, string> = {
  pending:   "bg-yellow-50 text-yellow-600 border-yellow-200",
  submitted: "bg-blue-50   text-blue-600   border-blue-200",
  overdue:   "bg-red-50    text-red-500    border-red-200",
  graded:    "bg-green-50  text-green-600  border-green-200",
};

const subTypeIcon: Record<SubType, string> = {
  text: "📝", file: "📎", both: "📋", link: "🔗",
};

function Badge({ status }: { status: Status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${statusStyle[status]}`}>
      {status}
    </span>
  );
}

function daysLeft(deadline: string) {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (diff < 0)  return { text: `${Math.abs(diff)}d overdue`, cls: "text-red-500" };
  if (diff === 0) return { text: "Due today", cls: "text-red-500" };
  if (diff <= 3)  return { text: `${diff}d left`, cls: "text-yellow-600" };
  return { text: `${diff}d left`, cls: "text-gray-400" };
}

// ── Submission Form ────────────────────────────────────────────────────────
function SubmitForm({ a, onBack, onSubmit }: {
  a: Assignment;
  onBack: () => void;
  onSubmit: (id: number, content: string) => void;
}) {
  const [subTab, setSubTab]   = useState<"text"|"file"|"link">("text");
  const [text, setText]       = useState("");
  const [link, setLink]       = useState("");
  const [file, setFile]       = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      const content = a.submissionType === "file" || subTab === "file"
        ? file?.name || "file"
        : a.submissionType === "link" || subTab === "link"
        ? link
        : text;
      onSubmit(a.id, content);
      setDone(true);
      setSubmitting(false);
    }, 900);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-sm font-semibold text-green-700 mb-1">Submitted Successfully!</p>
        <p className="text-xs text-gray-400 mb-4">Your submission has been received.</p>
        <button onClick={onBack}
          className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
          Back to Assignments
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
        ← Back
      </button>

      <div className="bg-white border border-gray-100 rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-sm font-semibold text-gray-800">{a.title}</h2>
          <Badge status={a.status} />
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 text-xs mb-3">
          <span className="text-gray-400">Assigned by</span>   <span className="text-gray-700">{a.assignedBy}</span>
          <span className="text-gray-400">For</span>           <span className="text-gray-700">{a.group ?? a.department ?? "Individual"}</span>
          <span className="text-gray-400">Deadline</span>
          <span className={a.status==="overdue"?"text-red-500 font-medium":"text-gray-700"}>{a.deadline}</span>
          <span className="text-gray-400">Type</span>
          <span className="text-gray-700 flex items-center gap-1 capitalize">
            {subTypeIcon[a.submissionType]} {a.submissionType}
          </span>
        </div>
        <p className="text-xs font-medium text-gray-600 mb-1">Instructions</p>
        <p className="text-xs text-gray-500 leading-relaxed">{a.description}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Your Submission</h3>

        {a.submissionType === "both" && (
          <div className="flex gap-0.5 mb-4">
            {(["text","file","link"] as const).map((t) => (
              <button key={t} onClick={() => setSubTab(t)}
                className={`px-3 py-1 text-xs rounded capitalize transition-colors
                  ${subTab===t?"bg-gray-700 text-white":"text-gray-500 hover:bg-gray-100"}`}>
                {t==="text"?"📝 Text":t==="file"?"📎 File":"🔗 Link"}
              </button>
            ))}
          </div>
        )}

        {(a.submissionType==="text"||(a.submissionType==="both"&&subTab==="text")) && (
          <textarea value={text} onChange={(e)=>setText(e.target.value)}
            placeholder="Write your submission here..."
            className="w-full border border-gray-200 rounded px-3 py-2 text-xs h-32 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"/>
        )}

        {(a.submissionType==="file"||(a.submissionType==="both"&&subTab==="file")) && (
          <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${file?"border-green-300 bg-green-50":"border-gray-200 hover:border-gray-300"}`}>
            {file ? (
              <div>
                <p className="text-xs font-medium text-green-700">📎 {file.name}</p>
                <p className="text-xs text-green-500 mt-0.5">{(file.size/1024).toFixed(1)} KB</p>
                <button onClick={()=>setFile(null)} className="text-xs text-red-400 hover:underline mt-1">Remove</button>
              </div>
            ) : (
              <label className="cursor-pointer">
                <p className="text-xs text-gray-400 mb-1">Click to upload or drag & drop</p>
                <p className="text-xs text-gray-300">PDF, DOC, DOCX, JPG, PNG — max 10MB</p>
                <input type="file" className="hidden" onChange={(e)=>setFile(e.target.files?.[0]||null)}/>
                <span className="mt-3 inline-block px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">
                  Choose File
                </span>
              </label>
            )}
          </div>
        )}

        {(a.submissionType==="link"||(a.submissionType==="both"&&subTab==="link")) && (
          <input type="url" placeholder="https://..." value={link}
            onChange={(e)=>setLink(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"/>
        )}

        <div className="flex items-center justify-between mt-4">
          {a.status==="overdue"
            ? <p className="text-xs text-red-400">⚠ Deadline passed — late submission</p>
            : <span/>}
          <button onClick={handleSubmit} disabled={submitting}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-70">
            {submitting ? "Submitting..." : "Submit Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Assignment Detail ──────────────────────────────────────────────────────
function AssignmentDetail({ a, onBack, onSubmit }: {
  a: Assignment;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const dl = daysLeft(a.deadline);

  return (
    <div className="max-w-2xl">
      <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
        ← Back to Assignments
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm mb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-sm font-semibold text-gray-800 mb-1">{a.title}</h1>
            <p className="text-xs text-gray-400">Posted {a.postedDate} by {a.assignedBy}</p>
          </div>
          <Badge status={a.status} />
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-xs mb-4 bg-gray-50 rounded-lg p-3">
          <span className="text-gray-400">Assigned to</span>
          <span className="text-gray-700">{a.group ?? a.department ?? "Individual (You)"}</span>
          <span className="text-gray-400">Deadline</span>
          <span className={a.status==="overdue"?"text-red-500 font-medium":"text-gray-700"}>
            {a.deadline} <span className={`ml-1 ${dl.cls}`}>({dl.text})</span>
          </span>
          <span className="text-gray-400">Submission type</span>
          <span className="text-gray-700 flex items-center gap-1 capitalize">
            {subTypeIcon[a.submissionType]} {a.submissionType}
          </span>
          {a.grade !== null && (
            <>
              <span className="text-gray-400">Grade</span>
              <span className="font-bold text-blue-600">{a.grade}/100</span>
            </>
          )}
        </div>

        <p className="text-xs font-medium text-gray-600 mb-1.5">Instructions</p>
        <p className="text-xs text-gray-600 leading-relaxed">{a.description}</p>
      </div>

      {/* Submission status */}
      {(a.status === "submitted" || a.status === "graded") ? (
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm mb-4">
          <h3 className="text-xs font-semibold text-gray-700 mb-3">Submission</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500 text-base">✅</span>
            <div>
              <p className="text-xs font-medium text-gray-700">Submitted on {a.submittedAt}</p>
              <p className="text-xs text-gray-400">{a.submittedContent}</p>
            </div>
          </div>
          {a.grade !== null && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-1">Grade & Feedback</p>
              <p className="text-xl font-bold text-blue-600 mb-1">{a.grade}<span className="text-sm text-gray-400">/100</span></p>
              {a.feedback && <p className="text-xs text-gray-500 italic">{a.feedback}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-700">No submission yet</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {a.status === "overdue" ? "⚠ You missed the deadline." : "Submit before the deadline."}
              </p>
            </div>
            <button onClick={onSubmit}
              className={`px-4 py-2 text-white text-xs font-semibold rounded transition-colors
                ${a.status==="overdue"
                  ? "bg-orange-500 hover:bg-orange-600"
                  : "bg-blue-600 hover:bg-blue-700"}`}>
              {a.status==="overdue" ? "Submit Late" : "Submit Assignment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [tab, setTab]                 = useState<"all"|"pending"|"overdue"|"submitted"|"graded">("all");
  const [view, setView]               = useState<ViewMode>("list");
  const [selected, setSelected]       = useState<Assignment | null>(null);
  const [search, setSearch]           = useState("");

  const handleSubmit = (id: number, content: string) => {
    setAssignments((prev) => prev.map((a) =>
      a.id === id
        ? { ...a, status: "submitted", submittedAt: new Date().toISOString().split("T")[0], submittedContent: content }
        : a
    ));
  };

  const filtered = assignments
    .filter((a) => tab === "all" || a.status === tab)
    .filter((a) => a.title.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all:       assignments.length,
    pending:   assignments.filter(a=>a.status==="pending").length,
    overdue:   assignments.filter(a=>a.status==="overdue").length,
    submitted: assignments.filter(a=>a.status==="submitted").length,
    graded:    assignments.filter(a=>a.status==="graded").length,
  };

  // Submission view
  if (view === "submit" && selected) {
    return (
      <SubmitForm
        a={selected}
        onBack={() => { setView("detail"); }}
        onSubmit={(id, content) => {
          handleSubmit(id, content);
          setSelected((prev) => prev ? { ...prev, status:"submitted", submittedAt: new Date().toISOString().split("T")[0], submittedContent:content } : null);
        }}
      />
    );
  }

  // Detail view
  if (view === "detail" && selected) {
    return (
      <AssignmentDetail
        a={selected}
        onBack={() => { setView("list"); setSelected(null); }}
        onSubmit={() => setView("submit")}
      />
    );
  }

  // List view
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold text-gray-800">My Assignments</h1>
          <p className="text-xs text-gray-400 mt-0.5">All assignments from Admin — individual and group</p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {(["all","pending","overdue","submitted","graded"] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)}
            className={`rounded-lg border px-3 py-2.5 text-left transition-colors
              ${tab===s
                ? s==="overdue"  ? "bg-red-50 border-red-200"
                : s==="pending"  ? "bg-yellow-50 border-yellow-200"
                : s==="graded"   ? "bg-green-50 border-green-200"
                : s==="submitted"? "bg-blue-50 border-blue-200"
                :                  "bg-gray-100 border-gray-200"
                : "bg-white border-gray-100 hover:bg-gray-50"}`}>
            <p className={`text-lg font-bold
              ${tab===s
                ? s==="overdue"  ? "text-red-500"
                : s==="pending"  ? "text-yellow-600"
                : s==="graded"   ? "text-green-600"
                : s==="submitted"? "text-blue-600"
                :                  "text-gray-700"
                : "text-gray-600"}`}>
              {counts[s]}
            </p>
            <p className="text-xs text-gray-400 capitalize">{s}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-3">
        <input type="text" placeholder="Search assignments..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded px-3 py-1.5 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-blue-400"/>
      </div>

      {/* Assignment list */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-12 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-medium">
          <div className="col-span-1"></div>
          <div className="col-span-4">Title</div>
          <div className="col-span-2">Assigned To</div>
          <div className="col-span-2">Deadline</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-1">Grade</div>
          <div className="col-span-1">Status</div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No assignments found.</p>
        ) : (
          filtered.map((a) => {
            const dl = daysLeft(a.deadline);
            return (
              <div key={a.id}
                onClick={() => { setSelected(a); setView("detail"); }}
                className="grid grid-cols-12 items-center px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors last:border-0 gap-1">
                {/* Icon */}
                <div className="col-span-1 text-sm">{subTypeIcon[a.submissionType]}</div>

                {/* Title */}
                <div className="col-span-4">
                  <p className={`text-xs font-medium leading-snug ${a.status==="overdue"?"text-red-600":"text-gray-800"}`}>
                    {a.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">by {a.assignedBy}</p>
                </div>

                {/* Assigned to */}
                <div className="col-span-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded text-xs
                    ${a.assignedTo==="group" ? "bg-teal-50 text-teal-600" : a.assignedTo==="department" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-500"}`}>
                    {a.group ?? a.department ?? "Individual"}
                  </span>
                </div>

                {/* Deadline */}
                <div className="col-span-2">
                  <p className="text-xs text-gray-600">{a.deadline}</p>
                  {a.status !== "submitted" && a.status !== "graded" && (
                    <p className={`text-xs ${dl.cls}`}>{dl.text}</p>
                  )}
                </div>

                {/* Type */}
                <div className="col-span-1 text-xs text-gray-400 capitalize">{a.submissionType}</div>

                {/* Grade */}
                <div className="col-span-1">
                  {a.grade !== null
                    ? <span className="text-xs font-bold text-blue-600">{a.grade}/100</span>
                    : <span className="text-xs text-gray-300">—</span>
                  }
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <Badge status={a.status} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}