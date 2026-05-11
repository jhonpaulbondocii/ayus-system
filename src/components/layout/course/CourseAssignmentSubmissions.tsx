"use client";

// src/components/layout/course/CourseAssignmentSubmissions.tsx

import { useState, useEffect } from "react";
import {
  ArrowLeft, FileText, Download, CheckCircle,
  Clock, ExternalLink, Search, Filter,
} from "lucide-react";
import { MAROON, FONT, fmtDate } from "./helpers";
import type { Assignment } from "./types";

type AssignmentWithRole = Assignment & {
  _assignmentRole?: "manager" | "submitter";
};

interface Submission {
  fileUrl: string | null;
  fileName?: string | null;
  userName: string | null;
  userEmail: string;
  userId: string;
  submittedAt: string | null;
  points?: number | null;
  grade?: string | null;
  textEntry?: string | null;
  onlineUrl?: string | null;
}

function GradeChip({ grade, points }: { grade?: number | null; points: number }) {
  if (grade == null) return <span className="text-xs text-gray-400 italic">Not graded</span>;
  const pct = Math.round((grade / points) * 100);
  const color = pct >= 90 ? "#15803d" : pct >= 75 ? "#ca8a04" : "#dc2626";
  return (
    <span className="text-sm font-black" style={{ color }}>
      {grade}/{points} <span className="text-xs font-semibold">({pct}%)</span>
    </span>
  );
}

interface Props {
  assignment: AssignmentWithRole;
  courseId: string;
  onBack: () => void;
}

export default function CourseAssignmentSubmissions({ assignment, courseId, onBack }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "submitted" | "unsubmitted">("all");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/assignments/${assignment.id}/submissions`)
      .then(r => r.json())
      .then((d: { submissions?: Submission[] }) => {
        setSubmissions(d.submissions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [courseId, assignment.id]);

  const submitted = submissions.filter(s => s.submittedAt);
  const unsubmitted = submissions.filter(s => !s.submittedAt);

  const filtered = submissions.filter(s => {
    const matchesSearch =
      !search ||
      (s.userName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.userEmail.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "submitted" && !!s.submittedAt) ||
      (filter === "unsubmitted" && !s.submittedAt);
    return matchesSearch && matchesFilter;
  });

  const downloadAll = async () => {
    setDownloading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const sub of submitted) {
        if (!sub.fileUrl) continue;
        const studentName = (sub.userName ?? sub.userEmail)
          .replace(/[^a-z0-9\s]/gi, "").trim().replace(/\s+/g, "_");
        const url = sub.fileUrl.startsWith("/") || sub.fileUrl.startsWith("http")
          ? sub.fileUrl : `/uploads/submissions/${sub.fileUrl}`;
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const ext = (sub.fileName ?? url).split(".").pop() ?? "bin";
          zip.file(`${studentName}_${sub.userId.slice(-6)}.${ext}`, blob);
        } catch { /* skip */ }
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${assignment.title.replace(/[^a-z0-9]/gi, "_")}_submissions.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Failed to generate zip.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden" style={{ fontFamily: FONT }}>

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: MAROON }}
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back to Assignment</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Submissions</p>
            <h1 className="text-sm font-black text-gray-900 leading-tight truncate max-w-xs">
              {assignment.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs">
            <span className="font-bold text-green-600">{submitted.length} submitted</span>
            <span className="text-gray-300">·</span>
            <span className="font-bold text-gray-400">{unsubmitted.length} missing</span>
          </div>

          {/* Download */}
          <button
            onClick={downloadAll}
            disabled={downloading || submitted.filter(s => s.fileUrl).length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:border-gray-400 text-gray-600 disabled:opacity-40 transition-all"
          >
            <Download size={13} />
            {downloading ? "Preparing..." : "Download All"}
          </button>

          {/* SpeedGrader */}
          <button
            onClick={() =>
              window.open(
                `/courses/${courseId}/assignments/${assignment.id}/speedgrader`,
                "_blank"
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white transition-all hover:opacity-90"
            style={{ background: MAROON }}
          >
            <ExternalLink size={13} />
            SpeedGrader™
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-40 max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={11} className="text-gray-400" />
          {(["all", "submitted", "unsubmitted"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 text-xs font-semibold rounded-full capitalize transition-all"
              style={
                filter === f
                  ? { background: MAROON, color: "#fff" }
                  : { background: "#f3f4f6", color: "#6b7280" }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div
              className="w-6 h-6 border-2 border-gray-200 rounded-full animate-spin"
              style={{ borderTopColor: MAROON }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
            <FileText size={36} className="opacity-30" />
            <p className="text-sm font-semibold">No submissions found</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Header */}
            <div
              className="grid grid-cols-12 px-5 py-3 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400"
              style={{ background: "#fdf2f2" }}
            >
              <div className="col-span-4">Student</div>
              <div className="col-span-3">Submitted</div>
              <div className="col-span-2">File</div>
              <div className="col-span-2">Grade</div>
              <div className="col-span-1" />
            </div>

            {/* Rows */}
            {filtered.map((sub, i) => (
              <div
                key={`${sub.userId}-${i}`}
                className="grid grid-cols-12 px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors items-center"
              >
                {/* Student */}
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ background: MAROON }}
                  >
                    {(sub.userName ?? sub.userEmail).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{sub.userName ?? "Unknown"}</p>
                    <p className="text-xs text-gray-400 truncate">{sub.userEmail}</p>
                  </div>
                </div>

                {/* Submitted at */}
                <div className="col-span-3">
                  {sub.submittedAt ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={12} className="text-green-500 shrink-0" />
                      <span className="text-xs text-gray-600">{fmtDate(sub.submittedAt)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-300 shrink-0" />
                      <span className="text-xs text-gray-400 italic">Not submitted</span>
                    </div>
                  )}
                </div>

                {/* File */}
                <div className="col-span-2">
                  {sub.fileUrl ? (
                    <a
                      href={sub.fileUrl.startsWith("/") || sub.fileUrl.startsWith("http")
                        ? sub.fileUrl : `/uploads/submissions/${sub.fileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold hover:underline truncate"
                      style={{ color: MAROON }}
                    >
                      <FileText size={11} />
                      <span className="truncate">{sub.fileName ?? "View"}</span>
                    </a>
                  ) : sub.onlineUrl ? (
                    <a
                      href={sub.onlineUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-semibold hover:underline"
                      style={{ color: MAROON }}
                    >
                      <ExternalLink size={11} /> URL
                    </a>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </div>

                {/* Grade */}
                <div className="col-span-2">
                  <GradeChip
                    grade={sub.grade != null ? Number(sub.grade) : sub.points ?? null}
                    points={assignment.points ?? 100}
                  />
                </div>

                {/* Action */}
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() =>
                      window.open(
                        `/courses/${courseId}/assignments/${assignment.id}/speedgrader?student=${sub.userId}`,
                        "_blank"
                      )
                    }
                    className="text-[10px] font-bold hover:underline"
                    style={{ color: MAROON }}
                  >
                    Grade
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}