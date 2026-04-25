// src/components/layout/course/CourseGradesTab.tsx
"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { COLORS, MAROON, FONT, fmtDate, fmtDateTime } from "./helpers";
import type { Course, Assignment } from "./types";

interface Props {
  course: Course;
  assignments: Assignment[];
}

export default function CourseGradesTab({ course, assignments }: Props) {
  const [arrangeBy, setArrangeBy] = useState("Due Date");

  return (
    <div className="flex h-full">
      <div className="flex-1 px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-light" style={{ color: COLORS.text }}>
            Grades for {course.code}
          </h2>
          <button
            className="flex items-center gap-2 px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
            style={{ borderColor: "#d1d5db", color: COLORS.textSecondary, fontFamily: FONT }}
          >
            <Printer className="w-4 h-4" />
            Print Grades
          </button>
        </div>

        {/* Arrange By */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm" style={{ color: COLORS.textSecondary }}>
            Arrange By
          </span>
          <div className="relative">
            <select
              value={arrangeBy}
              onChange={(e) => setArrangeBy(e.target.value)}
              className="border rounded text-sm px-3 py-1.5 bg-white focus:outline-none appearance-none pr-8 w-40"
              style={{ borderColor: "#d1d5db", fontFamily: FONT }}
            >
              <option>Due Date</option>
              <option>Title</option>
              <option>Assignment Group</option>
            </select>
            <svg
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          <button
            className="px-4 py-1.5 text-sm rounded"
            style={{ background: COLORS.primarySoft, color: COLORS.primary, fontFamily: FONT }}
          >
            Apply
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-4" style={{ borderColor: COLORS.border }}>
          <button
            className="px-4 py-2 text-sm border-b-2 font-semibold"
            style={{ borderColor: COLORS.primary, color: COLORS.text, fontFamily: FONT }}
          >
            Assignments
          </button>
          <button
            className="px-4 py-2 text-sm"
            style={{ color: COLORS.primary, fontFamily: FONT }}
          >
            Learning Mastery
          </button>
        </div>

        {/* Table */}
        <table className="w-full text-sm" style={{ fontFamily: FONT }}>
          <thead>
            <tr className="border-b" style={{ borderColor: COLORS.border }}>
              {["Name", "Due", "Submitted", "Status", "Score"].map((h) => (
                <th
                  key={h}
                  className="text-left pb-2.5 font-semibold"
                  style={{ color: COLORS.textSecondary }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center" style={{ color: COLORS.textMuted }}>
                  No assignments yet.
                </td>
              </tr>
            ) : (
              assignments.map((a) => {
                const sub = a.submissions?.[0];
                return (
                  <tr
                    key={a.id}
                    className="border-b hover:bg-gray-50"
                    style={{ borderColor: "#f3f4f6" }}
                  >
                    <td className="py-3">
                      <button style={{ color: COLORS.primary }}>{a.title}</button>
                      <p className="text-xs mt-0.5" style={{ color: COLORS.textMuted }}>
                        {a.assignmentGroup}
                      </p>
                    </td>
                    <td className="py-3" style={{ color: COLORS.textSecondary }}>
                      {fmtDate(a.dueDate)}
                    </td>
                    <td className="py-3" style={{ color: COLORS.textSecondary }}>
                      {sub?.submittedAt ? fmtDateTime(sub.submittedAt) : "—"}
                    </td>
                    <td className="py-3" style={{ color: COLORS.textSecondary }}>
                      {sub?.status ?? "—"}
                    </td>
                    <td className="py-3" style={{ color: COLORS.text }}>
                      {sub?.grade != null ? `${sub.grade} / ${a.points}` : `— / ${a.points}`}
                    </td>
                  </tr>
                );
              })
            )}
            <tr
              className="border-t-2"
              style={{ borderColor: COLORS.border, background: COLORS.primarySoft }}
            >
              <td className="py-2.5 font-semibold" style={{ color: COLORS.textSecondary }}>
                Total
              </td>
              <td colSpan={3} />
              <td className="py-2.5" style={{ color: COLORS.textSecondary }}>
                N/A &nbsp; 0.00 / 0.00
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Right Sidebar */}
      <div
        className="w-56 border-l px-4 py-5 shrink-0 space-y-4"
        style={{ borderColor: COLORS.border }}
      >
        <div>
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            Total: <span className="font-semibold">N/A</span>
          </p>
          <button
            className="mt-2 w-full px-3 py-1.5 border rounded text-xs hover:bg-gray-50"
            style={{ borderColor: "#d1d5db", color: COLORS.textSecondary, fontFamily: FONT }}
          >
            Show All Details
          </button>
        </div>
        <div
          className="pt-3 border-t text-xs space-y-2"
          style={{ borderColor: "#f3f4f6", color: COLORS.textSecondary }}
        >
          <p className="font-semibold">Course assignments are not weighted.</p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5" />
            <span>Calculate based only on graded assignments</span>
          </label>
        </div>
      </div>
    </div>
  );
}