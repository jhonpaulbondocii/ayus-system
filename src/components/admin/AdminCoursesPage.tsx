"use client";

import { useState, useEffect, useTransition } from "react";
import { Search, Plus, Pencil, Trash2, BookOpen, Users, X } from "lucide-react";

interface Course {
  id:          string;
  code:        string;
  name:        string;
  color:       string;
  status:      "PUBLISHED" | "UNPUBLISHED";
  description: string | null;
  term:        string | null;
  startDate:   string | null;
  endDate:     string | null;
  _count:      { enrollments: number };
}

interface CourseForm {
  name:        string;
  code:        string;
  color:       string;
  status:      "PUBLISHED" | "UNPUBLISHED";
  description: string;
  term:        string;
}

const EMPTY_FORM: CourseForm = {
  name: "", code: "", color: "#cc2a27",
  status: "UNPUBLISHED", description: "", term: "",
};

const TERMS = ["2nd Sem AY 2025-2026", "1st Sem AY 2025-2026", "2nd Sem AY 2024-2025"];
const COLORS = ["#cc2a27","#1a73e8","#0f9d58","#f4b400","#9c27b0","#00bcd4","#ff5722","#607d8b"];

// Mobile course card component
function MobileCourseCard({
  c,
  onEdit,
  onDelete,
}: {
  c: Course;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: c.color + "22" }}
        >
          <BookOpen className="w-4 h-4" style={{ color: c.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{c.name}</p>
          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-1 inline-block">
            {c.code}
          </span>
          {c.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{c.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
        {c.term && <span className="truncate">{c.term}</span>}
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          <span>{c._count.enrollments} enrolled</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ml-auto
            ${c.status === "PUBLISHED"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-100 text-gray-500 border-gray-200"}`}
        >
          {c.status === "PUBLISHED" ? "Published" : "Unpublished"}
        </span>
      </div>
    </div>
  );
}

export default function AdminCoursesPage() {
  const [courses,      setCourses]      = useState<Course[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [modal,        setModal]        = useState<{ mode: "add"|"edit"; id?: string; form: CourseForm } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [, startTransition]             = useTransition();

  const fetchCourses = () => {
    fetch("/api/admin/courses")
      .then(r => r.json())
      .then(d => startTransition(() => { setCourses(d.courses ?? []); setLoading(false); }))
      .catch(() => startTransition(() => setLoading(false)));
  };

  useEffect(() => { fetchCourses(); }, []);

  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const saveCourse = async () => {
    if (!modal || !modal.form.name.trim() || !modal.form.code.trim()) return;
    setSaving(true);
    try {
      if (modal.mode === "add") {
        await fetch("/api/admin/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modal.form),
        });
      } else {
        await fetch(`/api/admin/courses/${modal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modal.form),
        });
      }
      fetchCourses();
      setModal(null);
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (id: string) => {
    await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    startTransition(() => setCourses(prev => prev.filter(c => c.id !== id)));
    setDeleteTarget(null);
  };

  const published   = courses.filter(c => c.status === "PUBLISHED").length;
  const unpublished = courses.filter(c => c.status === "UNPUBLISHED").length;

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800 leading-tight">Course Management</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Create and manage courses</p>
        </div>
        <button
          onClick={() => setModal({ mode: "add", form: { ...EMPTY_FORM } })}
          className="flex items-center gap-1.5 sm:gap-2 bg-[#7b1113] hover:bg-[#5a0d0f] text-white text-xs sm:text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Add Course</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Stat cards — 3-col on sm+, 2+1 on mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-5 sm:mb-6">
        {[
          { label: "Total Courses", value: courses.length, cls: "border-gray-200",    val: "text-gray-800"    },
          { label: "Published",     value: published,      cls: "border-emerald-200", val: "text-emerald-700" },
          { label: "Unpublished",   value: unpublished,    cls: "border-gray-200",    val: "text-gray-500"    },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`bg-white border ${s.cls} rounded-xl px-4 sm:px-5 py-3 sm:py-4
              ${i === 2 ? "col-span-2 sm:col-span-1" : ""}`}
          >
            <p className="text-[10px] sm:text-xs text-gray-400 mb-1">{s.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${s.val}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search bar on mobile (standalone row) */}
      <div className="sm:hidden mb-3">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="flex-1 text-xs outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2.5">
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-10">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No courses found</p>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium">{filtered.length} course{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.map(c => (
              <MobileCourseCard
                key={c.id}
                c={c}
                onEdit={() => setModal({
                  mode: "edit", id: c.id,
                  form: { name: c.name, code: c.code, color: c.color, status: c.status,
                          description: c.description ?? "", term: c.term ?? "" },
                })}
                onDelete={() => setDeleteTarget(c)}
              />
            ))}
          </>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-600">
            {filtered.length} course{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 w-56 bg-gray-50">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="flex-1 text-xs outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {["Code","Course Name","Term","Enrolled","Status",""].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-400">No courses found</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{c.code}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: c.color + "22" }}>
                      <BookOpen className="w-3.5 h-3.5" style={{ color: c.color }}/>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      {c.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{c.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{c.term ?? "—"}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-3.5 h-3.5 text-gray-400" /> {c._count.enrollments}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full
                    ${c.status === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                    {c.status === "PUBLISHED" ? "Published" : "Unpublished"}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setModal({
                        mode: "edit", id: c.id,
                        form: { name: c.name, code: c.code, color: c.color, status: c.status,
                                description: c.description ?? "", term: c.term ?? "" },
                      })}
                      title="Edit"
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal — bottom sheet on mobile, centered on desktop */}
      {modal && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:w-[480px] overflow-hidden max-h-[92vh] flex flex-col">
            {/* Drag handle (mobile only) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">
                {modal.mode === "add" ? "Add New Course" : "Edit Course"}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Course Code *</label>
                  <input
                    value={modal.form.code}
                    onChange={e => setModal(m => m ? { ...m, form: { ...m.form, code: e.target.value } } : m)}
                    placeholder="e.g. IT-101"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#7b1113]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={modal.form.status}
                    onChange={e => setModal(m => m ? { ...m, form: { ...m.form, status: e.target.value as "PUBLISHED"|"UNPUBLISHED" } } : m)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="UNPUBLISHED">Unpublished</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Course Name *</label>
                <input
                  value={modal.form.name}
                  onChange={e => setModal(m => m ? { ...m, form: { ...m.form, name: e.target.value } } : m)}
                  placeholder="Course name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#7b1113]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={modal.form.description}
                  onChange={e => setModal(m => m ? { ...m, form: { ...m.form, description: e.target.value } } : m)}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Term / Semester</label>
                <select
                  value={modal.form.term}
                  onChange={e => setModal(m => m ? { ...m, form: { ...m.form, term: e.target.value } } : m)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                >
                  <option value="">— Select term —</option>
                  {TERMS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(col => (
                    <button
                      key={col}
                      onClick={() => setModal(m => m ? { ...m, form: { ...m.form, color: col } } : m)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110
                        ${modal.form.color === col ? "border-gray-800 scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveCourse}
                disabled={saving || !modal.form.name || !modal.form.code}
                className="flex-1 py-2 bg-[#7b1113] hover:bg-[#5a0d0f] text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : modal.mode === "add" ? "Add Course" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm — bottom sheet on mobile */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6 w-full sm:w-80">
            {/* Drag handle (mobile only) */}
            <div className="sm:hidden flex justify-center mb-4">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 text-center mb-1">Delete Course?</h3>
            <p className="text-xs text-gray-400 text-center mb-5">{deleteTarget.name}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteCourse(deleteTarget.id)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}