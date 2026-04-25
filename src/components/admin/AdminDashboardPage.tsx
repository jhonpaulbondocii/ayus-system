"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  BookOpen, MoreVertical, Trash2, GraduationCap, Briefcase,
  ChevronDown, ChevronRight, LayoutGrid, List, Plus,
} from "lucide-react";

interface Course {
  id: string; name: string; code: string; color: string;
  image: string | null;
  status: "PUBLISHED" | "UNPUBLISHED";
  term: string | null;
  _count: { enrollments: number };
}

type Category = "Academic" | "Non-Academic";
type ViewMode = "grid" | "list";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";
const font: React.CSSProperties = { fontFamily: FONT };

const PRESET_COLORS = [
  "#e91e8c","#d41e00","#e66000","#f5a623",
  "#6d9b00","#2d7a2d","#00695c","#0770a2",
  "#1565c0","#4527a0","#6a0dad","#7b1113",
  "#37474f","#546e7a","#78909c","#5d4037",
];

function getGroupKey(c: Course): string {
  if (c.status === "UNPUBLISHED") return "unpublished";
  return c.term === "Academic" ? "academic" : c.term === "Non-Academic" ? "non-academic" : "uncategorized";
}

// ── Publish Modal ──────────────────────────────────────────────────────────────
function PublishModal({ course, onConfirm, onCancel }: {
  course: Course; onConfirm: (cat: Category) => void; onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Category | null>((course.term as Category | null) ?? null);

  const opts: { value: Category; icon: React.ReactNode; desc: string }[] = [
    { value: "Academic",     icon: <GraduationCap size={20}/>, desc: "Degree programs, subjects, and academic disciplines" },
    { value: "Non-Academic", icon: <Briefcase size={20}/>,     desc: "Training, seminars, extension, and administrative courses" },
  ];

  return (
    <div style={{ position:"fixed",inset:0,zIndex:100000,background:"rgba(0,0,0,0.4)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,padding:"16px" }}
      onClick={onCancel}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.18)",overflow:"hidden" }}>
        <div style={{ background:MAROON,padding:"18px 22px" }}>
          <p style={{ fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.6)",textTransform:"uppercase",letterSpacing:"0.15em",margin:0 }}>Publishing Course</p>
          <p style={{ fontSize:15,fontWeight:800,color:"#fff",margin:"4px 0 0",lineHeight:1.3 }}>{course.name}</p>
        </div>
        <div style={{ padding:"20px 22px 8px" }}>
          <p style={{ fontSize:12,color:"#6b7280",margin:"0 0 14px",fontWeight:500 }}>Choose a category before publishing:</p>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {opts.map(opt => (
              <button key={opt.value} onClick={()=>setSelected(opt.value)}
                style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,cursor:"pointer",border:selected===opt.value?`2px solid ${MAROON}`:"2px solid #e5e7eb",background:selected===opt.value?"#fdf3f3":"#fafafa",textAlign:"left",transition:"all 0.15s",fontFamily:FONT }}>
                <span style={{ color:selected===opt.value?MAROON:"#9ca3af",flexShrink:0 }}>{opt.icon}</span>
                <div>
                  <p style={{ fontSize:13,fontWeight:800,color:selected===opt.value?MAROON:"#374151",margin:0 }}>{opt.value}</p>
                  <p style={{ fontSize:11,color:"#9ca3af",margin:"2px 0 0",fontWeight:500 }}>{opt.desc}</p>
                </div>
                <span style={{ marginLeft:"auto",flexShrink:0,display:"inline-block",width:16,height:16,borderRadius:"50%",border:selected===opt.value?`5px solid ${MAROON}`:"2px solid #d1d5db",transition:"all 0.15s" }}/>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex",gap:8,padding:"16px 22px 22px" }}>
          <button onClick={onCancel} style={{ flex:1,padding:"9px 0",border:"1px solid #e5e7eb",borderRadius:10,fontSize:13,fontWeight:600,color:"#6b7280",background:"#fff",cursor:"pointer",fontFamily:FONT }}>Cancel</button>
          <button onClick={()=>selected&&onConfirm(selected)} disabled={!selected}
            style={{ flex:2,padding:"9px 0",borderRadius:10,fontSize:13,fontWeight:800,color:"#fff",border:"none",cursor:selected?"pointer":"not-allowed",background:selected?MAROON:"#d1d5db",fontFamily:FONT }}>
            Publish as {selected ?? "…"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, count, collapsed, onToggle, badge }: {
  label: string; count: number; collapsed: boolean; onToggle: () => void;
  accent: { text: string; bg: string; border: string }; badge?: React.ReactNode;
}) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center gap-3 py-2.5 px-0 group transition-all"
      style={{ background:"none",border:"none",cursor:"pointer",fontFamily:FONT }}>
      <span style={{ color:"#9ca3af",transition:"transform 0.2s",display:"flex" }}>
        {collapsed ? <ChevronRight size={14}/> : <ChevronDown size={14}/>}
      </span>
      {badge}
      <span style={{ fontSize:11,color:"#9ca3af",fontWeight:600 }}>
        {count} {count===1?"course":"courses"}
      </span>
      <span style={{ flex:1,height:1,background:"#f3f4f6",marginLeft:4 }}/>
    </button>
  );
}

// ── List Row ───────────────────────────────────────────────────────────────────
function CourseListRow({ course, onTogglePublish, onDelete, onColorChange, onMove, onChangeCategory, onClick, onAssignments }: {
  course: Course; onTogglePublish: ()=>void; onDelete: ()=>void;
  onColorChange: (c:string)=>void; onMove: (d:"top"|"up"|"down"|"bottom")=>void;
  onChangeCategory: (c:Category)=>void; onClick: ()=>void; onAssignments: ()=>void;
}) {
  return (
    <div onClick={onClick}
      className="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border border-gray-100 bg-white cursor-pointer hover:shadow-md transition-all group"
      style={{ fontFamily:FONT }}>
      {course.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={course.image} alt={course.name}
          style={{ width:32,height:32,borderRadius:8,objectFit:"cover",flexShrink:0 }}/>
      ) : (
        <div style={{ width:10,height:10,borderRadius:"50%",background:course.color,flexShrink:0 }}/>
      )}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize:13,fontWeight:700,color:"#111827",margin:0 }} className="truncate group-hover:underline">{course.name}</p>
        <p style={{ fontSize:11,color:"#9ca3af",margin:0 }}>{course.code}</p>
      </div>
      {/* Hide enrollment count on very small screens */}
      <span className="hidden sm:inline" style={{ fontSize:11,color:"#9ca3af",fontWeight:600,flexShrink:0 }}>{course._count.enrollments} enrolled</span>
      <span style={{
        fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,
        background:course.status==="PUBLISHED"?"#f0fdf4":"#f9fafb",
        color:course.status==="PUBLISHED"?"#15803d":"#6b7280",
        border:`1px solid ${course.status==="PUBLISHED"?"#bbf7d0":"#e5e7eb"}`,
        flexShrink:0,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap",
      }}>{course.status==="PUBLISHED"?"Published":"Draft"}</span>
      {/* Assignments button hidden on mobile, shown on sm+ */}
      <button onClick={e=>{e.stopPropagation();onAssignments();}}
        className="hidden sm:block"
        style={{ fontSize:11,color:MAROON,fontWeight:700,background:"#fdf2f2",border:"none",borderRadius:8,padding:"4px 10px",cursor:"pointer",flexShrink:0 }}>
        Assignments
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const [courses,       setCourses]       = useState<Course[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [, startTransition]               = useTransition();
  const [order,         setOrder]         = useState<string[]>([]);
  const [publishTarget, setPublishTarget] = useState<Course | null>(null);
  const [viewMode,      setViewMode]      = useState<ViewMode>("grid");

  const [colAcademic,    setColAcademic]    = useState(true);
  const [colNonAcademic, setColNonAcademic] = useState(true);
  const [colUnpublished, setColUnpublished] = useState(true);
  const [colUncat,       setColUncat]       = useState(true);

  const fetchCourses = () => {
    fetch("/api/admin/courses")
      .then(r=>r.json())
      .then(d=>startTransition(()=>{
        const list: Course[] = d.courses ?? [];
        setCourses(list);
        setOrder(prev=>{
          const existing = prev.filter(id=>list.some(c=>c.id===id));
          const newIds   = list.filter(c=>!prev.includes(c.id)).map(c=>c.id);
          return [...existing,...newIds];
        });
        setLoading(false);
      }))
      .catch(()=>startTransition(()=>setLoading(false)));
  };

  useEffect(() => {
    fetchCourses();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchCourses();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePublishClick = (course: Course) => {
    if (course.status==="PUBLISHED") handleTogglePublish(course.id,"PUBLISHED",null);
    else setPublishTarget(course);
  };

  const handleTogglePublish = async (id: string, current: "PUBLISHED"|"UNPUBLISHED", category: Category|null) => {
    const status = current==="PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    await fetch(`/api/admin/courses/${id}`,{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ status, term:status==="PUBLISHED"?category:null }),
    });
    setPublishTarget(null); fetchCourses();
  };

  const handleChangeCategory = async (id: string, category: Category) => {
    await fetch(`/api/admin/courses/${id}`,{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ term:category }),
    });
    startTransition(()=>setCourses(prev=>prev.map(c=>c.id===id?{...c,term:category}:c)));
  };

  const deleteCourse = async (id: string) => {
    await fetch(`/api/admin/courses/${id}`,{ method:"DELETE" });
    startTransition(()=>{ setCourses(p=>p.filter(c=>c.id!==id)); setOrder(p=>p.filter(oid=>oid!==id)); });
  };

  const updateColor = async (id: string, color: string) => {
    await fetch(`/api/admin/courses/${id}`,{ method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({color}) });
    startTransition(()=>setCourses(prev=>prev.map(c=>c.id===id?{...c,color}:c)));
  };

  const moveCourse = (id: string, direction: "top"|"up"|"down"|"bottom", groupKey: string) => {
    setOrder(prev=>{
      const groupIds = prev.filter(oid=>{ const c=courses.find(x=>x.id===oid); return c && getGroupKey(c)===groupKey; });
      const idx = groupIds.indexOf(id);
      if (idx===-1) return prev;
      const newGroup = [...groupIds];
      if (direction==="top")    { newGroup.splice(idx,1); newGroup.unshift(id); }
      if (direction==="up"   && idx>0)               { [newGroup[idx-1],newGroup[idx]]=[newGroup[idx],newGroup[idx-1]]; }
      if (direction==="down" && idx<newGroup.length-1){ [newGroup[idx],newGroup[idx+1]]=[newGroup[idx+1],newGroup[idx]]; }
      if (direction==="bottom") { newGroup.splice(idx,1); newGroup.push(id); }
      const otherIds = prev.filter(oid=>{ const c=courses.find(x=>x.id===oid); return !c||getGroupKey(c)!==groupKey; });
      const result: string[] = []; let gi=0,oi=0;
      prev.forEach(oid=>{ const c=courses.find(x=>x.id===oid); if(c&&getGroupKey(c)===groupKey) result.push(newGroup[gi++]); else result.push(otherIds[oi++]); });
      return result;
    });
  };

  const sorted        = [...courses].sort((a,b)=>{ const ai=order.indexOf(a.id),bi=order.indexOf(b.id); return (ai===-1?999:ai)-(bi===-1?999:bi); });
  const published     = sorted.filter(c=>c.status==="PUBLISHED");
  const unpublished   = sorted.filter(c=>c.status==="UNPUBLISHED");
  const academic      = published.filter(c=>c.term==="Academic");
  const nonAcademic   = published.filter(c=>c.term==="Non-Academic");
  const uncategorized = published.filter(c=>c.term!=="Academic"&&c.term!=="Non-Academic");
  const totalPublished = published.length;

  const cardProps = (c: Course) => ({
    course:c,
    onTogglePublish: ()=>handlePublishClick(c),
    onDelete:        ()=>deleteCourse(c.id),
    onColorChange:   (color:string)=>updateColor(c.id,color),
    onMove:          (dir:"top"|"up"|"down"|"bottom")=>moveCourse(c.id,dir,getGroupKey(c)),
    onChangeCategory:(cat:Category)=>handleChangeCategory(c.id,cat),
    onClick:         ()=>router.push(`/admin/courses/${c.id}/home`),
    onAssignments:   ()=>router.push(`/admin/courses/${c.id}/assignments`),
    onDiscussions:   ()=>router.push(`/admin/courses/${c.id}/discussions`),
    onFiles:         ()=>router.push(`/admin/courses/${c.id}/files`),
  });

  // Responsive grid CSS injected once
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gap: 12,
    // Fluid columns: min 150px, fills row
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  };

  return (
    <div style={{ ...font, minHeight:"100vh", background:"#f8f8f7" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 480px) {
          .course-grid { grid-template-columns: repeat(auto-fill, minmax(178px, 1fr)) !important; }
        }
        @media (min-width: 768px) {
          .course-grid { grid-template-columns: repeat(auto-fill, minmax(178px, 1fr)) !important; }
        }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #f0e4e4", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
        <div>
          <p style={{ fontSize:10,fontWeight:800,color:MAROON,textTransform:"uppercase",letterSpacing:"0.2em",margin:0 }}>Administration</p>
          <h1 style={{ fontSize:18,fontWeight:900,color:"#111827",margin:"2px 0 0" }}>Dashboard</h1>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
          <button
            onClick={() => window.dispatchEvent(new Event("admin:openCreateCourse"))}
            style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:10,border:"none",background:MAROON,color:"#fff",cursor:"pointer",fontFamily:FONT,fontSize:12,fontWeight:800,transition:"opacity 0.15s",whiteSpace:"nowrap" }}
            onMouseEnter={e=>(e.currentTarget.style.opacity="0.88")}
            onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
            <Plus size={13}/> <span className="hidden xs:inline">Start a </span>New Course
          </button>
          <div style={{ display:"flex",gap:3,background:"#f3f4f6",borderRadius:10,padding:3 }}>
            {([["grid","Grid"] as const,["list","List"] as const]).map(([mode, label]) => (
              <button key={mode} onClick={()=>setViewMode(mode)}
                style={{ display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:FONT,fontSize:11,fontWeight:700,transition:"all 0.15s",background:viewMode===mode?"#fff":"none",color:viewMode===mode?"#111827":"#9ca3af",boxShadow:viewMode===mode?"0 1px 4px rgba(0,0,0,0.08)":"none" }}>
                {mode==="grid" ? <LayoutGrid size={12}/> : <List size={12}/>} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat bar — scrollable on mobile ── */}
      {!loading && courses.length > 0 && (
        <div style={{ background:"#fff", borderBottom:"1px solid #f3f4f6", padding:"10px 16px", overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
          <div style={{ display:"flex", gap:20, minWidth:"max-content" }}>
            {[
              { label:"Total",       value:courses.length },
              { label:"Published",   value:totalPublished, color:"#15803d" },
              { label:"Academic",    value:academic.length },
              { label:"Non-Academic",value:nonAcademic.length },
              { label:"Unpublished", value:unpublished.length, color:"#9ca3af" },
            ].map(s=>(
              <div key={s.label} style={{ display:"flex",flexDirection:"column",flexShrink:0 }}>
                <span style={{ fontSize:18,fontWeight:900,color:s.color??MAROON,lineHeight:1 }}>{s.value}</span>
                <span style={{ fontSize:10,color:"#9ca3af",fontWeight:600,marginTop:2,whiteSpace:"nowrap" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding:"16px" }}>
        {loading ? (
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:10 }}>
            <div style={{ width:20,height:20,border:`2px solid #f0e4e4`,borderTop:`2px solid ${MAROON}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
            <p style={{ fontSize:13,color:"#9ca3af",margin:0 }}>Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"80px 0",gap:12 }}>
            <div style={{ width:56,height:56,borderRadius:"50%",background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <BookOpen size={24} color={MAROON}/>
            </div>
            <p style={{ fontSize:14,fontWeight:700,color:"#374151",margin:0 }}>No courses yet</p>
            <p style={{ fontSize:12,color:"#9ca3af",margin:0 }}>Create your first course to get started.</p>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>

            {/* ── Published ── */}
            {published.length > 0 && (
              <div style={{ background:"#fff",borderRadius:16,border:"1px solid #f0e4e4",overflow:"hidden" }}>
                <div style={{ padding:"14px 16px 0" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                    <span style={{ fontSize:11,fontWeight:900,color:MAROON,textTransform:"uppercase",letterSpacing:"0.12em" }}>Published</span>
                    <span style={{ fontSize:11,color:"#9ca3af",fontWeight:600 }}>({published.length})</span>
                  </div>
                </div>
                <div style={{ padding:"4px 16px 16px", display:"flex",flexDirection:"column",gap:0 }}>

                  {/* Academic */}
                  {academic.length > 0 && (
                    <div style={{ marginBottom:4 }}>
                      <SectionHeader
                        label="Academic" count={academic.length}
                        collapsed={colAcademic} onToggle={()=>setColAcademic(v=>!v)}
                        accent={{ text:"#1565c0",bg:"#eff6ff",border:"#bfdbfe" }}
                        badge={
                          <span style={{ display:"inline-flex",alignItems:"center",gap:5,background:"#eff6ff",color:"#1565c0",border:"1px solid #bfdbfe",borderRadius:20,padding:"3px 10px 3px 8px",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:FONT,whiteSpace:"nowrap" }}>
                            <GraduationCap size={12}/> Academic
                          </span>
                        }
                      />
                      {!colAcademic && (
                        viewMode==="grid" ? (
                          <div className="course-grid" style={{ ...gridStyle, paddingBottom:12 }}>
                            {academic.map(c=><CourseCard key={c.id} {...cardProps(c)}/>)}
                          </div>
                        ) : (
                          <div style={{ display:"flex",flexDirection:"column",gap:6,paddingBottom:12 }}>
                            {academic.map(c=><CourseListRow key={c.id} {...cardProps(c)}/>)}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Non-Academic */}
                  {nonAcademic.length > 0 && (
                    <div style={{ marginBottom:4 }}>
                      <SectionHeader
                        label="Non-Academic" count={nonAcademic.length}
                        collapsed={colNonAcademic} onToggle={()=>setColNonAcademic(v=>!v)}
                        accent={{ text:"#b45309",bg:"#fffbeb",border:"#fde68a" }}
                        badge={
                          <span style={{ display:"inline-flex",alignItems:"center",gap:5,background:"#fffbeb",color:"#b45309",border:"1px solid #fde68a",borderRadius:20,padding:"3px 10px 3px 8px",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:FONT,whiteSpace:"nowrap" }}>
                            <Briefcase size={12}/> Non-Academic
                          </span>
                        }
                      />
                      {!colNonAcademic && (
                        viewMode==="grid" ? (
                          <div className="course-grid" style={{ ...gridStyle, paddingBottom:12 }}>
                            {nonAcademic.map(c=><CourseCard key={c.id} {...cardProps(c)}/>)}
                          </div>
                        ) : (
                          <div style={{ display:"flex",flexDirection:"column",gap:6,paddingBottom:12 }}>
                            {nonAcademic.map(c=><CourseListRow key={c.id} {...cardProps(c)}/>)}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Uncategorized */}
                  {uncategorized.length > 0 && (
                    <div style={{ marginBottom:4 }}>
                      <SectionHeader
                        label="Uncategorized" count={uncategorized.length}
                        collapsed={colUncat} onToggle={()=>setColUncat(v=>!v)}
                        accent={{ text:"#6b7280",bg:"#f9fafb",border:"#e5e7eb" }}
                        badge={
                          <span style={{ display:"inline-flex",alignItems:"center",gap:5,background:"#f9fafb",color:"#6b7280",border:"1px solid #e5e7eb",borderRadius:20,padding:"3px 10px 3px 8px",fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:FONT,whiteSpace:"nowrap" }}>
                            <BookOpen size={12}/> Uncategorized
                          </span>
                        }
                      />
                      {!colUncat && (
                        viewMode==="grid" ? (
                          <div className="course-grid" style={{ ...gridStyle, paddingBottom:12 }}>
                            {uncategorized.map(c=><CourseCard key={c.id} {...cardProps(c)}/>)}
                          </div>
                        ) : (
                          <div style={{ display:"flex",flexDirection:"column",gap:6,paddingBottom:12 }}>
                            {uncategorized.map(c=><CourseListRow key={c.id} {...cardProps(c)}/>)}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Unpublished ── */}
            {unpublished.length > 0 && (
              <div style={{ background:"#fff",borderRadius:16,border:"1px solid #f3f4f6",overflow:"hidden" }}>
                <div style={{ padding:"14px 16px 0" }}>
                  <SectionHeader
                    label="Unpublished" count={unpublished.length}
                    collapsed={colUnpublished} onToggle={()=>setColUnpublished(v=>!v)}
                    accent={{ text:"#6b7280",bg:"#f9fafb",border:"#e5e7eb" }}
                    badge={
                      <span style={{ fontSize:11,fontWeight:900,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:FONT }}>
                        Unpublished
                      </span>
                    }
                  />
                </div>
                {!colUnpublished && (
                  <div style={{ padding:"0 16px 16px" }}>
                    {viewMode==="grid" ? (
                      <div className="course-grid" style={{ ...gridStyle }}>
                        {unpublished.map(c=><CourseCard key={c.id} {...cardProps(c)}/>)}
                      </div>
                    ) : (
                      <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                        {unpublished.map(c=><CourseListRow key={c.id} {...cardProps(c)}/>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {publishTarget && (
        <PublishModal
          course={publishTarget}
          onConfirm={cat=>handleTogglePublish(publishTarget.id,"UNPUBLISHED",cat)}
          onCancel={()=>setPublishTarget(null)}
        />
      )}
    </div>
  );
}

// ── Course Card ────────────────────────────────────────────────────────────────
function CourseCard({ course, onTogglePublish, onDelete, onColorChange, onMove, onChangeCategory, onClick, onAssignments, onDiscussions, onFiles }: {
  course:Course; onTogglePublish:()=>void; onDelete:()=>void;
  onColorChange:(c:string)=>void; onMove:(d:"top"|"up"|"down"|"bottom")=>void;
  onChangeCategory:(c:Category)=>void; onClick:()=>void;
  onAssignments:()=>void; onDiscussions:()=>void; onFiles:()=>void;
}) {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [menuTab,       setMenuTab]       = useState<"color"|"move"|"more">("color");
  const [hexInput,      setHexInput]      = useState(course.color);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [menuStyle,     setMenuStyle]     = useState<React.CSSProperties>({});
  const [, startTransition]               = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(()=>{ startTransition(()=>setHexInput(course.color)); },[course.color]);

  useEffect(()=>{
    if(!menuOpen||!triggerRef.current) return;
    const r     = triggerRef.current.getBoundingClientRect();
    const menuW = 230;
    const menuH = 340;
    const vw    = window.innerWidth;
    const vh    = window.innerHeight;
    // On mobile: center horizontally and position above/below trigger
    let left = r.right - menuW;
    if (left < 8) left = 8;
    if (left + menuW > vw - 8) left = vw - menuW - 8;
    const spaceBelow = vh - r.bottom - 8;
    const top = spaceBelow >= menuH ? r.bottom + 4 : r.top - menuH - 4;
    setMenuStyle({ top, left, width: Math.min(menuW, vw - 16) });
  },[menuOpen]);

  useEffect(()=>{
    if(!menuOpen) return;
    const h = (e:MouseEvent) => {
      const t = e.target as HTMLElement;
      if(!t.closest("[data-course-menu]")&&!t.closest("[data-course-trigger]")){ setMenuOpen(false); setConfirmDelete(false); }
    };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[menuOpen]);

  const openMenu  = (e:React.MouseEvent) => { e.stopPropagation(); setMenuTab("color"); setHexInput(course.color); setConfirmDelete(false); setMenuOpen(v=>!v); };
  const closeMenu = () => { setMenuOpen(false); setConfirmDelete(false); };
  const applyColor = (e:React.MouseEvent) => { e.stopPropagation(); onColorChange(hexInput.startsWith("#")?hexInput:`#${hexInput}`); closeMenu(); };

  const iconBtn = (title:string,cb:()=>void,svg:React.ReactNode) => (
    <button onClick={e=>{e.stopPropagation();cb();}} title={title}
      style={{ background:"none",border:"none",cursor:"pointer",padding:0,color:"#d1d5db",display:"flex",lineHeight:1,transition:"color .15s" }}
      onMouseEnter={e=>(e.currentTarget.style.color=MAROON)} onMouseLeave={e=>(e.currentTarget.style.color="#d1d5db")}>
      {svg}
    </button>
  );

  const MOVE_ITEMS = [
    { label:"Move to top",    dir:"top"    as const, icon:"⇈" },
    { label:"Move up",        dir:"up"     as const, icon:"↑" },
    { label:"Move down",      dir:"down"   as const, icon:"↓" },
    { label:"Move to bottom", dir:"bottom" as const, icon:"⇊" },
  ];

  const CATEGORIES: { value:Category; icon:React.ReactNode }[] = [
    { value:"Academic",     icon:<GraduationCap size={13}/> },
    { value:"Non-Academic", icon:<Briefcase size={13}/> },
  ];

  const tabStyle = (tab:string): React.CSSProperties => ({
    flex:1, padding:"8px 0", fontSize:11, fontWeight:700,
    color:menuTab===tab?MAROON:"#9ca3af", background:"none", border:"none", cursor:"pointer",
    borderBottom:menuTab===tab?`2px solid ${MAROON}`:"2px solid transparent", fontFamily:FONT,
  });

  const dropdown = menuOpen ? createPortal(
    <div data-course-menu="true" onClick={e=>e.stopPropagation()}
      style={{ position:"fixed",zIndex:99999,background:"#fff",border:"1px solid #f0e4e4",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,0.14)",overflow:"hidden",fontFamily:FONT,...menuStyle }}>
      <div style={{ display:"flex",borderBottom:"1px solid #f0e4e4",background:"#fdf8f8" }}>
        <button style={tabStyle("color")} onClick={()=>setMenuTab("color")}>Color</button>
        <button style={tabStyle("move")}  onClick={()=>setMenuTab("move")}>Move</button>
        <button style={tabStyle("more")}  onClick={()=>setMenuTab("more")}>More</button>
        <button onClick={closeMenu} style={{ padding:"8px 10px",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:14,fontFamily:FONT }}>✕</button>
      </div>

      {menuTab==="color" && (
        <div style={{ padding:"12px 14px" }}>
          <p style={{ fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 6px" }}>Nickname</p>
          <input value={course.name} readOnly style={{ width:"100%",border:"1px solid #e5e7eb",borderRadius:6,padding:"5px 8px",fontSize:12,color:"#374151",marginBottom:10,boxSizing:"border-box",background:"#f9fafb",fontFamily:FONT }}/>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:4,marginBottom:10 }}>
            {PRESET_COLORS.map(c=>(
              <button key={c} onClick={()=>{ onColorChange(c); setHexInput(c); closeMenu(); }}
                style={{ width:22,height:22,borderRadius:4,background:c,padding:0,cursor:"pointer",border:c===course.color?`3px solid ${MAROON}`:"2px solid transparent",outline:c===course.color?"2px solid #fff":"none",outlineOffset:-3,transition:"transform 0.1s" }}
                onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.2)")}
                onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")}/>
            ))}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
            <div style={{ width:24,height:24,borderRadius:4,background:hexInput,border:"1px solid #e5e7eb",flexShrink:0 }}/>
            <input value={hexInput} onChange={e=>setHexInput(e.target.value)}
              style={{ flex:1,border:"1px solid #e5e7eb",borderRadius:6,padding:"5px 8px",fontSize:12,fontFamily:"monospace",outline:"none" }}
              onFocus={e=>(e.currentTarget.style.borderColor=MAROON)} onBlur={e=>(e.currentTarget.style.borderColor="#e5e7eb")}
              onKeyDown={e=>e.key==="Enter"&&applyColor(e as unknown as React.MouseEvent)}/>
          </div>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:6 }}>
            <button onClick={closeMenu}
              style={{ padding:"5px 12px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,background:"#fff",cursor:"pointer",color:"#374151",fontFamily:FONT }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=MAROON; e.currentTarget.style.color=MAROON; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.color="#374151"; }}>Cancel</button>
            <button onClick={applyColor} style={{ padding:"5px 12px",fontSize:12,background:MAROON,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontFamily:FONT }}>Apply</button>
          </div>
        </div>
      )}

      {menuTab==="move" && (
        <div style={{ padding:"4px 0 8px" }}>
          {MOVE_ITEMS.map(item=>(
            <button key={item.dir} onClick={()=>{ onMove(item.dir); closeMenu(); }}
              style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 16px",fontSize:13,color:"#374151",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:FONT }}
              onMouseEnter={e=>{ e.currentTarget.style.background="#fdf8f8"; e.currentTarget.style.color=MAROON; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="none"; e.currentTarget.style.color="#374151"; }}>
              <span style={{ fontSize:16,width:20,textAlign:"center",color:"#9ca3af" }}>{item.icon}</span>{item.label}
            </button>
          ))}
          {course.status==="PUBLISHED" && (
            <>
              <div style={{ borderTop:"1px solid #f0e4e4",margin:"6px 16px",opacity:0.6 }}/>
              <p style={{ fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.08em",margin:"6px 16px 4px",fontFamily:FONT }}>Change Category</p>
              {CATEGORIES.map(cat=>{
                const active = course.term===cat.value;
                return (
                  <button key={cat.value} onClick={()=>{ onChangeCategory(cat.value); closeMenu(); }}
                    style={{ display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 16px",fontSize:12,color:active?MAROON:"#374151",background:active?"#fdf3f3":"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:FONT,fontWeight:active?800:500 }}
                    onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background="#fdf8f8"; e.currentTarget.style.color=MAROON; }}}
                    onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background="none"; e.currentTarget.style.color="#374151"; }}}>
                    <span style={{ color:active?MAROON:"#9ca3af" }}>{cat.icon}</span>{cat.value}
                    {active&&<span style={{ marginLeft:"auto",fontSize:10,color:MAROON }}>✓ current</span>}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}

      {menuTab==="more" && (
        <div style={{ padding:"8px 14px 12px" }}>
          {!confirmDelete ? (
            <button onClick={()=>setConfirmDelete(true)}
              style={{ display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 10px",fontSize:13,color:"#dc2626",background:"none",border:"1px solid #fee2e2",borderRadius:8,cursor:"pointer",fontFamily:FONT }}
              onMouseEnter={e=>(e.currentTarget.style.background="#fef2f2")} onMouseLeave={e=>(e.currentTarget.style.background="none")}>
              <Trash2 size={14}/> Delete Course
            </button>
          ) : (
            <div>
              <p style={{ fontSize:12,color:"#374151",margin:"0 0 10px" }}>Delete <strong>{course.name}</strong>? This cannot be undone.</p>
              <div style={{ display:"flex",gap:6 }}>
                <button onClick={()=>setConfirmDelete(false)} style={{ flex:1,padding:"6px 0",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,background:"#fff",cursor:"pointer",fontFamily:FONT }}>Cancel</button>
                <button onClick={()=>{ onDelete(); closeMenu(); }} style={{ flex:1,padding:"6px 0",fontSize:12,background:"#dc2626",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontFamily:FONT }}>Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div
      // width is now controlled by the CSS grid — no fixed 178px
      style={{ background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"visible",display:"flex",flexDirection:"column",boxShadow:"0 1px 4px rgba(0,0,0,.06)",fontFamily:FONT,transition:"box-shadow 0.15s, transform 0.15s",position:"relative",minWidth:0 }}
      onMouseEnter={e=>{ if(!menuOpen){ e.currentTarget.style.boxShadow="0 4px 16px rgba(123,17,19,.10)"; e.currentTarget.style.transform="translateY(-1px)"; }}}
      onMouseLeave={e=>{ if(!menuOpen){ e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.06)"; e.currentTarget.style.transform="translateY(0)"; }}}>

      {/* ── Banner ── */}
      <div
        style={{ position:"relative",height:90,backgroundColor:course.color,cursor:"pointer",borderRadius:"12px 12px 0 0",overflow:"hidden" }}
        onClick={onClick}
      >
        {course.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.image}
            alt={course.name}
            style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }}
          />
        )}
        {course.status==="UNPUBLISHED" && (
          <button onClick={e=>{ e.stopPropagation(); onTogglePublish(); }}
            style={{ position:"absolute",top:6,left:6,background:"rgba(255,255,255,0.92)",border:"none",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,color:"#374151",cursor:"pointer",fontFamily:FONT,zIndex:1 }}
            onMouseEnter={e=>(e.currentTarget.style.background="#fff")}
            onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,0.92)")}>
            Publish
          </button>
        )}
        <button ref={triggerRef} data-course-trigger="true" onClick={openMenu}
          style={{ position:"absolute",top:5,right:5,background:menuOpen?"rgba(255,255,255,0.25)":"none",border:menuOpen?"1px solid rgba(255,255,255,0.4)":"none",borderRadius:"50%",cursor:"pointer",color:"rgba(255,255,255,0.9)",padding:3,display:"flex",zIndex:1 }}>
          <MoreVertical size={15}/>
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ padding:"8px 10px 4px",cursor:"pointer",flex:1 }} onClick={onClick}>
        <p style={{ fontSize:12,fontWeight:800,color:course.color,lineHeight:1.3,margin:0,wordBreak:"break-word" }}>{course.name}</p>
        <p style={{ fontSize:10,color:"#9ca3af",margin:"2px 0 0",fontWeight:600 }}>{course.code}</p>
      </div>

      {/* ── Icons ── */}
      <div style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 10px 10px" }}>
        {iconBtn("Assignments",onAssignments,<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>)}
        {iconBtn("Discussions",onDiscussions,<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>)}
        {iconBtn("Files",onFiles,<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>)}
      </div>

      {dropdown}
    </div>
  );
}