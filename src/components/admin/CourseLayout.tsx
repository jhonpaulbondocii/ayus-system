"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  courseId:    string;
  courseName?: string;
  activeItem:  string;
  subItem?:    string;
  children:    React.ReactNode;
}

interface Repository {
  id: string;
  name: string;
  assignment: { title: string; status: string };
  _count: { files: number };
}

const NAV_ITEMS = [
  { label: "Home",          href: (id: string) => `/admin/courses/${id}/home`          },
  { label: "Announcements", href: (id: string) => `/admin/courses/${id}/announcements` },
  { label: "Assignments",   href: (id: string) => `/admin/courses/${id}/assignments`   },
  { label: "Repositories",  href: (id: string) => `/admin/courses/${id}/repositories`  },
  { label: "Grades",        href: (id: string) => `/admin/courses/${id}/grades`        },
  { label: "People",        href: (id: string) => `/admin/courses/${id}/people`        },
  { label: "Files",         href: (id: string) => `/admin/courses/${id}/files`         },
  { label: "Quizzes",       href: (id: string) => `/admin/courses/${id}/quizzes`       },
  { label: "Settings",      href: (id: string) => `/admin/courses/${id}/settings`      }
];

export default function CourseLayout({ courseId, courseName: propName, activeItem, subItem, children }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const [sidebarOpen,  setSidebarOpen]  = useState(true);
  const [fetchedName,  setFetchedName]  = useState("");
  const [repoOpen,     setRepoOpen]     = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repoLoading,  setRepoLoading]  = useState(false);
  const [repoFetched,  setRepoFetched]  = useState(false);

  useEffect(() => {
    if (propName || !courseId) return;
    fetch(`/api/admin/courses/${courseId}`)
      .then(r => r.json())
      .then(d => { if (d.course?.name) setFetchedName(d.course.name); })
      .catch(() => {});
  }, [courseId, propName]);

  useEffect(() => {
    if (pathname?.includes("/repositories")) {
      setRepoOpen(true);
      if (!repoFetched) {
        fetch(`/api/admin/courses/${courseId}/repositories`)
          .then(r => r.json())
          .then(d => { setRepositories(d.repositories ?? []); setRepoFetched(true); })
          .catch(() => {});
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleRepoToggle = () => {
    const next = !repoOpen;
    setRepoOpen(next);
    if (next && !repoFetched) {
      setRepoLoading(true);
      fetch(`/api/admin/courses/${courseId}/repositories`)
        .then(r => r.json())
        .then(d => { setRepositories(d.repositories ?? []); setRepoLoading(false); setRepoFetched(true); })
        .catch(() => setRepoLoading(false));
    }
  };

  const courseName    = propName || fetchedName || "";
  const activeRepoId  = pathname?.match(/\/repositories\/([^/]+)/)?.[1];
  const isRepoSection = activeItem === "Repositories";

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {sidebarOpen && (
        <div className="w-52 border-r border-gray-200 shrink-0 py-3 overflow-y-auto">
          <nav className="space-y-0.5 px-2">
            {NAV_ITEMS.map(item => {
              const isActive = item.label === activeItem;

              // ── Repositories — expandable ──────────────────────────────
              if (item.label === "Repositories") {
                return (
                  <div key="Repositories">
                    <div className={`flex items-center rounded transition-colors
                      ${isRepoSection && !activeRepoId
                        ? "bg-[#fdf8f8] border-l-[3px] border-[#7b1113] rounded-none"
                        : isRepoSection
                        ? "border-l-[3px] border-[#f0e4e4] rounded-none"
                        : ""}`}>

                      {/* Clickable label → /repositories */}
                      <button type="button"
                        onClick={() => router.push(item.href(courseId))}
                        className={`flex-1 text-left text-sm px-3 py-2 flex items-center gap-1.5 transition-colors
                          ${isRepoSection
                            ? "text-gray-900 font-semibold"
                            : "text-[#7b1113] hover:bg-[#fdf8f8] rounded"}`}>
                        <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                        </svg>
                        Repositories
                      </button>

                      {/* Chevron toggle */}
                      <button type="button" onClick={handleRepoToggle}
                        className="pr-2.5 py-2 text-gray-400 hover:text-[#7b1113] transition-colors shrink-0">
                        {repoOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
                      </button>
                    </div>

                    {/* Dropdown */}
                    {repoOpen && (
                      <div className="ml-3 mt-0.5 border-l-2 border-[#f0e4e4] pl-2 pb-1 space-y-0.5">
                        {repoLoading ? (
                          <p className="px-2 py-1.5 text-[11px] text-gray-400 animate-pulse">Loading...</p>
                        ) : repositories.length === 0 ? (
                          <p className="px-2 py-1.5 text-[11px] text-gray-400 italic">No repositories yet</p>
                        ) : repositories.map(repo => {
                          const active = activeRepoId === repo.id;
                          return (
                            <button key={repo.id} type="button"
                              onClick={() => router.push(`/admin/courses/${courseId}/repositories/${repo.id}`)}
                              className={`w-full text-left px-2 py-1.5 rounded text-[11px] flex items-center gap-1.5 transition-colors group
                                ${active
                                  ? "bg-[#fef2f2] text-[#7b1113] font-bold"
                                  : "text-gray-600 hover:bg-[#fdf8f8] hover:text-[#7b1113]"}`}>
                              <svg className={`w-3 h-3 shrink-0 transition-colors
                                ${active ? "text-[#7b1113]" : "text-gray-300 group-hover:text-[#7b1113]"}`}
                                viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
                              </svg>
                              <span className="truncate flex-1">{repo.name}</span>
                              {repo._count.files > 0 && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0
                                  ${active
                                    ? "bg-[#fef2f2] text-[#7b1113]"
                                    : "bg-gray-100 text-gray-400 group-hover:bg-[#fef2f2] group-hover:text-[#7b1113]"}`}>
                                  {repo._count.files}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Regular nav item ──────────────────────────────────────
              return (
                <button key={item.label} type="button"
                  onClick={() => router.push(item.href(courseId))}
                  className={`w-full text-left text-sm px-3 py-2 rounded transition-colors
                    ${isActive
                      ? "text-gray-900 font-semibold bg-[#fdf8f8] border-l-[3px] border-[#7b1113] rounded-none"
                      : "text-[#7b1113] hover:bg-[#fdf8f8]"}`}>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb */}
        <div className="h-11 border-b border-gray-200 flex items-center px-5 shrink-0 gap-2">
          <button type="button" onClick={() => setSidebarOpen(o => !o)}
            className="text-gray-500 hover:text-gray-700 mr-1 text-base leading-none">☰</button>
          <button type="button"
            onClick={() => router.push(`/admin/courses/${courseId}/home`)}
            className="text-sm font-semibold text-[#7b1113] hover:underline transition-colors">
            {courseName || "..."}
          </button>
          <span className="text-gray-300 text-sm">›</span>
          <button type="button"
            onClick={() => router.push(NAV_ITEMS.find(i => i.label === activeItem)?.href(courseId) ?? `/admin/courses/${courseId}/home`)}
            className={`text-sm transition-colors hover:underline ${subItem ? "text-[#7b1113] font-semibold" : "text-gray-500"}`}>
            {activeItem}
          </button>
          {subItem && (
            <>
              <span className="text-gray-300 text-sm">›</span>
              <span className="text-sm text-gray-700">{subItem}</span>
            </>
          )}
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}