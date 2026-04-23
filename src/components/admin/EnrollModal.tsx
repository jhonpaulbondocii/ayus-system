"use client";

// src/components/admin/EnrollModal.tsx

import { useState, useEffect, useMemo } from "react";
import { Search, X, BookOpen, Check, Loader2, AlertCircle } from "lucide-react";

interface Course {
  id:     string;
  name:   string;
  code:   string;
  color:  string;
  status: string;
}

interface Enrollment {
  courseId:   string;
  courseName: string;
  courseCode: string;
  color:      string;
  createdAt:  string;
}

interface Props {
  user: { id: string; name: string; image?: string | null };
  onClose: () => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EnrollModal({ user, onClose }: Props) {
  const [allCourses,   setAllCourses]   = useState<Course[]>([]);
  const [enrollments,  setEnrollments]  = useState<Enrollment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [acting,       setActing]       = useState<string | null>(null); // courseId being acted on
  const [search,       setSearch]       = useState("");
  const [error,        setError]        = useState("");
  const [tab,          setTab]          = useState<"available" | "enrolled">("available");

  // Fetch all courses + current enrollments in parallel
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/courses").then(r => r.json()),
      fetch(`/api/admin/users/${user.id}/enrollments`).then(r => r.json()),
    ])
      .then(([cData, eData]) => {
        setAllCourses(cData.courses ?? []);
        setEnrollments(eData.enrollments ?? []);
      })
      .catch(() => setError("Failed to load courses"))
      .finally(() => setLoading(false));
  }, [user.id]);

  const enrolledIds = useMemo(() => new Set(enrollments.map(e => e.courseId)), [enrollments]);

  const available = useMemo(() =>
    allCourses.filter(c =>
      !enrolledIds.has(c.id) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
       c.code.toLowerCase().includes(search.toLowerCase()))
    ), [allCourses, enrolledIds, search]);

  const enrolledFiltered = useMemo(() =>
    enrollments.filter(e =>
      e.courseName.toLowerCase().includes(search.toLowerCase()) ||
      e.courseCode.toLowerCase().includes(search.toLowerCase())
    ), [enrollments, search]);

  const enroll = async (courseId: string) => {
    setActing(courseId); setError("");
    try {
      const res  = await fetch(`/api/admin/users/${user.id}/enrollments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to enroll");

      setEnrollments(prev => [...prev, data.enrollment]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setActing(null); }
  };

  const unenroll = async (courseId: string) => {
    setActing(courseId); setError("");
    try {
      const res = await fetch(`/api/admin/users/${user.id}/enrollments`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to unenroll");

      setEnrollments(prev => prev.filter(e => e.courseId !== courseId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setActing(null); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4"
      style={{ backdropFilter: "blur(10px)", backgroundColor: "rgba(0,0,0,0.25)" }}
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7b1113]/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#7b1113]"/>
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Enroll to Course</h2>
              <p className="text-xs text-gray-400 mt-0.5">{user.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>

        {/* Tabs + Search */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 space-y-3 shrink-0">
          <div className="flex gap-0.5 bg-gray-100 p-0.5 rounded-xl w-fit">
            {(["available", "enrolled"] as const).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-[10px] transition-all capitalize
                  ${tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                {t === "available" ? `Available` : `Enrolled ${enrollments.length > 0 ? `(${enrollments.length})` : ""}`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white focus-within:border-gray-400 transition-colors">
            <Search className="w-3.5 h-3.5 text-gray-300 shrink-0"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="flex-1 text-xs outline-none text-gray-700 placeholder:text-gray-300 bg-transparent"/>
            {search && (
              <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
                <X className="w-3 h-3"/>
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0"/> {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-300">
              <Loader2 className="w-5 h-5 animate-spin"/>
            </div>
          ) : tab === "available" ? (
            available.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2"/>
                <p className="text-sm text-gray-300">
                  {search ? "No courses match your search" : "All courses are already enrolled"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {available.map(course => (
                  <div key={course.id}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all group">
                    {/* Color dot */}
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: course.color + "20" }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }}/>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{course.name}</p>
                      <p className="text-xs text-gray-400">{course.code}
                        <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full
                          ${course.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                          {course.status === "PUBLISHED" ? "Published" : "Unpublished"}
                        </span>
                      </p>
                    </div>

                    <button type="button" onClick={() => enroll(course.id)}
                      disabled={acting === course.id}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-[#7b1113] text-white hover:bg-[#5a0d0f] transition-colors disabled:opacity-50 shrink-0 shadow-sm">
                      {acting === course.id
                        ? <Loader2 className="w-3 h-3 animate-spin"/>
                        : <Check className="w-3 h-3"/>}
                      Enroll
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Enrolled tab
            enrolledFiltered.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2"/>
                <p className="text-sm text-gray-300">
                  {search ? "No courses match your search" : "Not enrolled in any course yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {enrolledFiltered.map(e => (
                  <div key={e.courseId}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all">
                    <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: e.color + "20" }}>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: e.color }}/>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{e.courseName}</p>
                      <p className="text-xs text-gray-400">{e.courseCode}
                        <span className="ml-2 text-[10px] text-gray-300">since {formatDate(e.createdAt)}</span>
                      </p>
                    </div>

                    <button type="button" onClick={() => unenroll(e.courseId)}
                      disabled={acting === e.courseId}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0">
                      {acting === e.courseId
                        ? <Loader2 className="w-3 h-3 animate-spin"/>
                        : <X className="w-3 h-3"/>}
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {enrollments.length} course{enrollments.length !== 1 ? "s" : ""} enrolled
          </span>
          <button type="button" onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}