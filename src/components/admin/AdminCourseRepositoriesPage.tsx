"use client";

// src/components/admin/AdminCourseRepositoriesPage.tsx

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Folder, ChevronRight, Files, Activity } from "lucide-react";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

interface Repository {
  id: string; name: string; createdAt: string;
  assignment: { id: string; title: string; dueDate: string | null; points: number; status: string; submissionCount?: number; enrollmentCount?: number };
  files: { id: string }[];
  _count: { files: number; logs: number };
}

// ─── Due date helpers ─────────────────────────────────────────────────────────
function getDueMeta(dueDate: string | null): { label: string; color: string; bg: string; border: string; icon: string } | null {
  if (!dueDate) return null;
  const now    = Date.now();
  const due    = new Date(dueDate).getTime();
  const diff   = due - now;
  const days   = diff / (1000 * 60 * 60 * 24);
  if (diff < 0)       return { label: "Overdue",          color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "🔴" };
  if (days <= 1)      return { label: `Due in < 1 day`,   color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "🔴" };
  if (days <= 2)      return { label: `Due in ${Math.ceil(days)} days`, color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: "🟡" };
  if (days <= 7)      return { label: `Due in ${Math.ceil(days)} days`, color: "#ca8a04", bg: "#fefce8", border: "#fef08a", icon: "🟡" };
  return { label: new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "🟢" };
}

export default function AdminCourseRepositoriesPage({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [, startTransition]              = useTransition();
  const [search,       setSearch]       = useState("");

  const load = useCallback(() => {
    fetch(`/api/admin/courses/${courseId}/repositories`)
      .then(r => r.json())
      .then(d => startTransition(() => {
        setRepositories(d.repositories ?? []);
        setLoading(false);
      }))
      .catch(() => startTransition(() => setLoading(false)));
  }, [courseId, startTransition]);

  // Trigger initial load — setLoading(true) is the only synchronous setState,
  // so we set it in state initializer (useState(true)) and call load() in effect.
  useEffect(() => { load(); }, [load]);

  const filtered = repositories.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.assignment.title.toLowerCase().includes(search.toLowerCase())
  );

  const total     = repositories.length;
  const published = repositories.filter(r => r.assignment.status === "PUBLISHED").length;
  const totalFiles = repositories.reduce((s, r) => s + r._count.files, 0);

  return (
    <div className="h-full flex flex-col bg-[#f8f8f7]" style={{ fontFamily: FONT }}>

      {/* ── Top header ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: MAROON }}>
            Course
          </p>
          <h1 className="text-xl font-black text-gray-900 leading-none">Repositories</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400 font-medium">Auto-created per assignment</p>
          <button onClick={load}
            className="flex items-center gap-1.5 text-xs font-bold text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg transition-all">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""}/>
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Repositories", value: total,      sub: "total",            icon: <Folder size={14}/>,   accent: "#2d3b45" },
            { label: "Published",    value: published,  sub: "active assignments",icon: <Activity size={14}/>, accent: "#15803d" },
            { label: "Total Files",  value: totalFiles, sub: "all submissions",   icon: <Files size={14}/>,    accent: MAROON    },
          ].map(s => (
            <div key={s.label} className="border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 bg-white shadow-sm">
              <div className="rounded-lg p-2.5 shrink-0" style={{ background: "#f3f4f6", color: s.accent }}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-black tabular-nums leading-none text-gray-900">{s.value}</p>
                <p className="text-sm font-semibold mt-0.5 text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table card ── */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col shadow-sm">

          {/* Toolbar */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 bg-white">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 w-64 bg-gray-50 focus-within:bg-white focus-within:border-gray-400 transition-all">
              <Search size={13} className="text-gray-400 shrink-0"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search repositories..."
                className="flex-1 text-xs text-gray-700 placeholder:text-gray-400 outline-none bg-transparent"/>
              {search && (
                <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500">
                  <span className="text-xs">✕</span>
                </button>
              )}
            </div>
            <span className="ml-auto text-xs text-gray-400 font-medium">
              {filtered.length} of {total} repositor{total !== 1 ? "ies" : "y"}
            </span>
          </div>

          {/* Column headers */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center gap-4 px-5 py-2.5 border-b border-gray-100" style={{ background: "#fdf2f2" }}>
              {[
                { label: "Repository",  cls: "flex-1" },
                { label: "Progress",    cls: "w-44"   },
                { label: "Due Date",    cls: "w-36"   },
                { label: "Files / Logs",cls: "w-24"   },
                { label: "Status",      cls: "w-20 text-center" },
                { label: "",            cls: "w-4"    },
              ].map(h => (
                <div key={h.label} className={`text-[10px] font-black uppercase tracking-widest ${h.cls}`} style={{ color: MAROON }}>
                  {h.label}
                </div>
              ))}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 py-20">
              <RefreshCw size={18} className="animate-spin"/>
              <span className="text-xs font-medium">Loading repositories...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "#fdf2f2" }}>
                <Folder size={32} style={{ color: MAROON }}/>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700">
                  {search ? "No repositories match your search" : "No repositories yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {search ? "Try a different keyword" : "Repositories are created automatically when assignments are added"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filtered.map(repo => {
                const dueMeta    = getDueMeta(repo.assignment.dueDate);
                const submitted  = repo._count.files;
                const enrolled   = repo.assignment.enrollmentCount ?? 0;
                const pct        = enrolled > 0 ? Math.min(100, Math.round((submitted / enrolled) * 100)) : (submitted > 0 ? 100 : 0);
                return (
                <div key={repo.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-red-50/30 transition-all cursor-pointer group border-b border-gray-50 last:border-0"
                  onClick={() => router.push(`/admin/courses/${courseId}/repositories/${repo.id}`)}>

                  {/* Icon + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors group-hover:bg-red-100"
                      style={{ background: "#fdf2f2", border: `1px solid rgba(123,17,19,0.15)` }}>
                      <Folder size={18} style={{ color: MAROON }}/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate text-gray-800 group-hover:underline underline-offset-2"
                        style={{ textDecorationColor: MAROON }}>
                        {repo.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">{repo.assignment.title}</p>
                    </div>
                  </div>

                  {/* Submission progress */}
                  <div className="w-44 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-gray-500">
                        {submitted}{enrolled > 0 ? `/${enrolled}` : ""} submitted
                      </span>
                      <span className="text-[10px] font-black tabular-nums" style={{ color: MAROON }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? "#16a34a" : MAROON }}/>
                    </div>
                  </div>

                  {/* Due date — color coded */}
                  <div className="w-36 shrink-0">
                    {dueMeta ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{ background: dueMeta.bg, color: dueMeta.color, border: `1px solid ${dueMeta.border}` }}>
                        <span className="text-[10px]">{dueMeta.icon}</span>
                        {dueMeta.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">No due date</span>
                    )}
                  </div>

                  {/* Files & logs */}
                  <div className="flex items-center gap-3 w-24 shrink-0">
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-700">{repo._count.files}</span>
                      <p className="text-[10px] text-gray-400">files</p>
                    </div>
                    <div className="w-px h-6 bg-gray-100"/>
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-700">{repo._count.logs}</span>
                      <p className="text-[10px] text-gray-400">logs</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-20 shrink-0 flex justify-center">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${
                      repo.assignment.status === "PUBLISHED"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {repo.assignment.status.toLowerCase()}
                    </span>
                  </div>

                  {/* Arrow */}
                  <ChevronRight size={14} className="text-gray-200 group-hover:text-gray-500 transition-colors shrink-0"/>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}