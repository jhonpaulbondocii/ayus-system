"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  MoreVertical, X, Check, Loader2,
  ChevronRight, ChevronDown, GripVertical, User,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   ROLE HELPERS
───────────────────────────────────────────────────────────────────────────── */
type CourseRole = "Staff" | "Head";
const ALL_ROLES: CourseRole[] = ["Staff", "Head"];

function parseRoles(raw: string | null | undefined): CourseRole[] {
  if (!raw) return ["Staff"];
  const parts = raw.split(",").map(r => r.trim()).filter((r): r is CourseRole => ALL_ROLES.includes(r as CourseRole));
  return parts.length > 0 ? parts : ["Staff"];
}
function serializeRoles(roles: CourseRole[]): string {
  return [...new Set(roles)].filter(r => ALL_ROLES.includes(r)).join(",") || "Staff";
}

const ROLE_BADGE: Record<CourseRole, { bg: string; color: string }> = {
  Staff: { bg: "#eff6ff", color: "#1d4ed8" },
  Head:  { bg: "#fef2f2", color: "#7b1113" },
};

const MAROON = "#7b1113";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface Person {
  id: string; name: string; email: string; image: string | null;
  pronouns: string | null; role: string; enrolledAt: string;
  position: string | null; accountType: string | null;
}
interface GroupMember { user: { id: string; name: string; pronouns?: string | null }; isLeader?: boolean; }
interface GroupItem {
  id: string; name: string; leaderId?: string | null;
  _count?: { members: number }; members?: GroupMember[];
}
interface GroupSet {
  id: string; name: string; selfSignUp: boolean; requireSameSection: boolean;
  groupStructure: string; createGroupsNow: number; limitGroupMembers: number;
  autoAssignLeader: boolean; leaderType: string; groups: GroupItem[];
}
interface UserSuggestion { id: string; name: string; email: string; image: string | null; }
interface Chip { id: string; userId?: string; name: string; email: string; image: string | null; status: "pending"|"valid"|"invalid"; }
interface CourseOption { id: string; name: string; code: string; }

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
.cpp-root { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:14px; color:#2d3b45; padding:12px 24px 24px; }
.cpp-tabbar { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:12px; border-bottom:2px solid #f0e4e4; gap:8px; }
.cpp-tabs { display:flex; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; flex:1; }
.cpp-tabs::-webkit-scrollbar { display:none; }
.cpp-tab { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:600; color:#6b7780; background:none; border:none; border-bottom:2px solid transparent; padding:8px 14px; cursor:pointer; margin-bottom:-2px; white-space:nowrap; transition:color .15s; }
.cpp-tab:hover  { color:#7b1113; }
.cpp-tab.active { color:#7b1113; border-bottom-color:#7b1113; }
.cpp-toolbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
.cpp-toolbar-left { display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:1; }
.cpp-input  { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; color:#2d3b45; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; outline:none; background:#fff; transition:all .15s; }
.cpp-input:focus  { border-color:#7b1113; box-shadow:0 0 0 3px rgba(123,17,19,.08); }
.cpp-select { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; color:#2d3b45; border:1px solid #e5e7eb; border-radius:8px; padding:6px 28px 6px 10px; outline:none; background:#fff; appearance:none; cursor:pointer; transition:all .15s; }
.cpp-select:focus { border-color:#7b1113; box-shadow:0 0 0 3px rgba(123,17,19,.08); }
.cpp-btn-primary   { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:700; background:#7b1113; color:#fff; border:none; border-radius:8px; padding:8px 16px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:opacity .15s; white-space:nowrap; }
.cpp-btn-primary:hover:not(:disabled) { opacity:.88; }
.cpp-btn-primary:disabled { opacity:.5; cursor:default; }
.cpp-btn-secondary { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:700; background:#fff; color:#374151; border:1px solid #e5e7eb; border-radius:8px; padding:7px 14px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all .15s; white-space:nowrap; }
.cpp-btn-secondary:hover { border-color:#7b1113; color:#7b1113; }
.cpp-btn-icon { background:none; border:none; cursor:pointer; padding:4px; border-radius:6px; color:#9ca3af; display:flex; align-items:center; transition:all .15s; }
.cpp-btn-icon:hover { background:#fef2f2; color:#7b1113; }

/* Desktop table */
.cpp-table-wrap { width:100%; overflow-x:auto; }
.cpp-table { width:100%; border-collapse:collapse; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; min-width:520px; }
.cpp-table thead tr { border-bottom:1px solid #f0e4e4; }
.cpp-table th { text-align:left; padding:8px 10px; font-size:11px; font-weight:700; color:#6b7780; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
.cpp-table th.avatar-col { width:40px; }
.cpp-table th.action-col { width:32px; }
.cpp-table tbody tr { border-bottom:1px solid #f9fafb; transition:background .1s; }
.cpp-table tbody tr.even { background:#fff; }
.cpp-table tbody tr.odd  { background:#fdf8f8; }
.cpp-table tbody tr:hover { background:#fef2f2; }
.cpp-table td { padding:10px; font-size:13px; color:#6b7780; }
.cpp-table td.name-col { color:#2d3b45; }
.cpp-name-link { color:#7b1113; cursor:pointer; font-size:13px; font-weight:600; }
.cpp-name-link:hover { text-decoration:underline; }
.cpp-badge { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; display:inline-block; letter-spacing:.04em; }

/* Mobile person cards */
.cpp-person-cards { display:none; flex-direction:column; gap:10px; }
.cpp-person-card { background:#fff; border:1px solid #f0e4e4; border-radius:12px; padding:14px; display:flex; align-items:flex-start; gap:12px; }
.cpp-person-card-body { flex:1; min-width:0; }
.cpp-person-card-name { font-size:14px; font-weight:700; color:#7b1113; margin:0 0 2px; cursor:pointer; }
.cpp-person-card-name:hover { text-decoration:underline; }
.cpp-person-card-email { font-size:12px; color:#9ca3af; margin:0 0 8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cpp-person-card-meta { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }

/* Menus */
.cpp-menu       { position:absolute; background:#fff; border:1px solid #f0e4e4; border-radius:12px; box-shadow:0 4px 20px rgba(123,17,19,.08); z-index:50; min-width:180px; padding:4px 0; overflow:hidden; }
.cpp-menu-fixed { position:fixed;    background:#fff; border:1px solid #f0e4e4; border-radius:12px; box-shadow:0 4px 20px rgba(123,17,19,.1);  z-index:99999; min-width:176px; padding:4px 0; overflow:hidden; }
.cpp-menu-item  { display:block; width:100%; text-align:left; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:500; color:#374151; padding:8px 14px; background:none; border:none; cursor:pointer; transition:background .1s; }
.cpp-menu-item:hover { background:#fdf8f8; color:#7b1113; }
.cpp-menu-item.danger { color:#c0392b; }
.cpp-menu-item.danger:hover { background:#fef2f2; }
.cpp-menu-divider { border-top:1px solid #f0e4e4; margin:4px 0; }

/* Modals */
.cpp-overlay { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.35); backdrop-filter:blur(2px); padding:12px; }
.cpp-modal { background:#fff; border-radius:16px; box-shadow:0 8px 40px rgba(0,0,0,.18); border:1px solid #f0e4e4; display:flex; flex-direction:column; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; width:100%; max-width:620px; max-height:90vh; }
.cpp-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 16px; border-bottom:1px solid #f0e4e4; flex-shrink:0; }
.cpp-modal-title  { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:16px; font-weight:800; color:#111827; margin:0; }
.cpp-modal-footer { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:14px 22px; border-top:1px solid #f0e4e4; background:#fdf8f8; border-radius:0 0 16px 16px; flex-shrink:0; }
.cpp-modal-body   { padding:20px 24px; overflow-y:auto; flex:1; }
.cpp-subtabs { display:flex; border-bottom:1px solid #f0e4e4; padding:0 22px; flex-shrink:0; overflow-x:auto; scrollbar-width:none; }
.cpp-subtabs::-webkit-scrollbar { display:none; }
.cpp-subtab { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:600; color:#6b7780; background:none; border:none; border-bottom:2px solid transparent; padding:10px 14px; cursor:pointer; margin-bottom:-1px; transition:color .15s; white-space:nowrap; }
.cpp-subtab:hover  { color:#7b1113; }
.cpp-subtab.active { color:#7b1113; border-bottom-color:#7b1113; }
.cpp-chip-box { min-height:44px; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; display:flex; flex-wrap:wrap; gap:6px; cursor:text; transition:all .15s; }
.cpp-chip-box:focus-within { border-color:#7b1113; box-shadow:0 0 0 3px rgba(123,17,19,.08); }
.cpp-chip-input { flex:1; min-width:120px; height:28px; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; border:none; outline:none; background:transparent; color:#2d3b45; }
.cpp-sugg { border:1px solid #f0e4e4; border-radius:12px; box-shadow:0 4px 16px rgba(123,17,19,.07); margin-top:4px; max-height:200px; overflow-y:auto; background:#fff; }
.cpp-sugg-item { display:flex; align-items:center; gap:10px; width:100%; padding:9px 14px; background:none; border:none; cursor:pointer; text-align:left; transition:background .1s; }
.cpp-sugg-item:hover { background:#fdf8f8; }
.cpp-browse-table { width:100%; border-collapse:collapse; }
.cpp-browse-thead { position:sticky; top:0; background:#fdf8f8; z-index:10; }
.cpp-browse-thead tr { border-bottom:1px solid #f0e4e4; }
.cpp-browse-th { text-align:left; padding:10px 12px; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:700; color:#6b7780; text-transform:uppercase; letter-spacing:.06em; }
.cpp-browse-tr { cursor:pointer; border-bottom:1px solid #f9fafb; transition:background .1s; }
.cpp-browse-tr.even { background:#fff; }
.cpp-browse-tr.odd  { background:#fdf8f8; }
.cpp-browse-tr.sel  { background:#fef2f2; }
.cpp-browse-tr:hover { background:#fdf8f8; }
.cpp-browse-tr.sel:hover { background:#fde8e8; }
.cpp-groups-layout { display:flex; gap:24px; }
.cpp-unassigned-col { width:280px; flex-shrink:0; }
.cpp-groups-col { flex:1; min-width:0; }
.cpp-section-title { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:800; color:#7b1113; margin-bottom:10px; text-transform:uppercase; letter-spacing:.08em; }
.cpp-box        { border:1px solid #f0e4e4; border-radius:10px; overflow:hidden; }
.cpp-box-dashed { border:1px dashed #f0c0c0; border-radius:10px; }
.cpp-empty-box  { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; color:#8b969e; text-align:center; padding:20px 12px; }
.cpp-unassigned-row { display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #f9fafb; background:#fff; position:relative; transition:background .1s; }
.cpp-unassigned-row:hover { background:#fdf8f8; }
.cpp-group-row { display:flex; align-items:center; gap:10px; padding:10px 12px; background:#fff; border-bottom:1px solid #f9fafb; transition:background .1s; }
.cpp-group-row:hover { background:#fdf8f8; }
.cpp-group-members { background:#fdf8f8; border-top:1px solid #f0e4e4; padding:10px 32px; max-height:320px; overflow-y:auto; }
.cpp-member-card { display:flex; align-items:center; gap:8px; border:1px solid #f0e4e4; background:#fff; border-radius:8px; padding:7px 10px; transition:border-color .15s; overflow:visible; position:relative; }
.cpp-member-card:hover { border-color:#7b1113; }
.cpp-gs-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
.cpp-banner { display:flex; align-items:center; justify-content:space-between; background:#fef2f2; border:1px solid #f0c0c0; border-radius:8px; padding:8px 12px; margin-top:10px; flex-wrap:wrap; gap:8px; }
.cpp-plus-btn { width:24px; height:24px; display:flex; align-items:center; justify-content:center; border:1px solid #e5e7eb; border-radius:6px; background:#fff; cursor:pointer; font-size:16px; color:#7b1113; font-weight:700; transition:all .15s; }
.cpp-plus-btn:hover { background:#fef2f2; border-color:#7b1113; }
.cpp-spin-wrap  { display:flex; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
.cpp-spin-input { flex:1; height:34px; padding:0 10px; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; border:none; outline:none; color:#2d3b45; background:#fff; }
.cpp-spin-btns  { display:flex; flex-direction:column; border-left:1px solid #e5e7eb; }
.cpp-spin-up, .cpp-spin-dn { flex:1; padding:0 8px; background:none; border:none; cursor:pointer; color:#6b7780; display:flex; align-items:center; justify-content:center; transition:background .1s; }
.cpp-spin-up:hover, .cpp-spin-dn:hover { background:#fef2f2; color:#7b1113; }
.cpp-spin-dn { border-top:1px solid #e5e7eb; }
.cpp-side-panel { width:320px; background:#fff; box-shadow:-2px 0 24px rgba(123,17,19,.08); border-left:1px solid #f0e4e4; display:flex; flex-direction:column; height:100%; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; }
.cpp-role-check-row { display:flex; flex-direction:column; gap:6px; }
.cpp-role-check-item { display:flex; align-items:flex-start; gap:12px; padding:14px 16px; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; transition:all .15s; }
.cpp-role-check-item:hover { border-color:#7b1113; background:#fdf8f8; }
.cpp-role-check-item.selected { border-color:#7b1113; background:#fef2f2; }
.cpp-role-check-item input[type="checkbox"] { margin-top:2px; accent-color:#7b1113; width:16px; height:16px; flex-shrink:0; cursor:pointer; }
.cpp-role-desc { font-size:12px; color:#6b7780; margin-top:2px; line-height:1.5; }
@keyframes cpp-spin { to { transform: rotate(360deg); } }
.cpp-spin { animation: cpp-spin 1s linear infinite; }

/* ── RESPONSIVE ── */
@media (max-width: 767px) {
  .cpp-root { padding:10px 12px 80px; }
  .cpp-tabbar { flex-wrap:wrap; align-items:stretch; border-bottom:none; padding-bottom:0; }
  .cpp-tabs { border-bottom:2px solid #f0e4e4; width:100%; }
  .cpp-tabbar > .cpp-btn-primary { margin-bottom:2px; }

  .cpp-toolbar { flex-direction:column; align-items:stretch; }
  .cpp-toolbar-left { flex-direction:column; align-items:stretch; }
  .cpp-toolbar-left .cpp-input  { width:100% !important; box-sizing:border-box; }
  .cpp-toolbar-left .cpp-select { width:100% !important; box-sizing:border-box; }
  .cpp-toolbar > .cpp-btn-primary { width:100%; justify-content:center; }

  /* Hide desktop table, show cards */
  .cpp-table-wrap { display:none; }
  .cpp-person-cards { display:flex; }

  .cpp-groups-layout { flex-direction:column; gap:16px; }
  .cpp-unassigned-col { width:100%; }
  .cpp-group-members { padding:10px 16px; }
  .cpp-member-card { flex-wrap:wrap; }

  /* Modals as bottom sheets */
  .cpp-overlay { align-items:flex-end; padding:0; }
  .cpp-modal { max-width:100% !important; width:100% !important; max-height:92vh; border-radius:20px 20px 0 0; }
  .cpp-modal-body { padding:16px; }
  .cpp-modal-header { padding:14px 16px 12px; }
  .cpp-modal-footer { padding:12px 16px; border-radius:0; gap:8px; }
  .cpp-modal-footer .cpp-btn-primary, .cpp-modal-footer .cpp-btn-secondary { flex:1; justify-content:center; }

  .cpp-gs-actions { justify-content:flex-start; }
  .cpp-side-panel { width:100% !important; max-height:85vh; border-left:none; border-top:1px solid #f0e4e4; border-radius:20px 20px 0 0; }
}
@media (min-width: 768px) {
  .cpp-person-cards { display:none !important; }
}
`;

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
const DropArrow = () => (
  <svg style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"#6b7780" }}
    width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SpinnerInput = ({ value, onChange, placeholder, width = 160 }: { value:number; onChange:(v:number)=>void; placeholder?:string; width?:number; }) => (
  <div className="cpp-spin-wrap" style={{ width }}>
    <input type="number" min={0} value={value||""} onChange={e=>onChange(parseInt(e.target.value)||0)} placeholder={placeholder??"No limit"} className="cpp-spin-input" />
    <div className="cpp-spin-btns">
      <button type="button" className="cpp-spin-up" onClick={()=>onChange(value+1)}>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 6l5-6 5 6z"/></svg>
      </button>
      <button type="button" className="cpp-spin-dn" onClick={()=>onChange(Math.max(0,value-1))}>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
      </button>
    </div>
  </div>
);

const Avatar = ({ name, image, size=32 }: { name:string; image:string|null; size?:number }) =>
  image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name} style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", display:"block", flexShrink:0 }} />
  ) : (
    <div style={{ width:size, height:size, borderRadius:"50%", background:"#f0e4e4", color:"#7b1113", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.4, fontWeight:800, flexShrink:0 }}>
      {name?.[0]?.toUpperCase()}
    </div>
  );

const RolePills = ({ raw }: { raw: string }) => (
  <span style={{ display:"inline-flex", gap:4, flexWrap:"wrap" }}>
    {parseRoles(raw).map(r => (
      <span key={r} className="cpp-badge" style={{ background: ROLE_BADGE[r].bg, color: ROLE_BADGE[r].color }}>
        {r}
      </span>
    ))}
  </span>
);

/* Mobile drag-handle for bottom-sheet modals */
const DragHandle = () => (
  <div style={{ display:"flex", justifyContent:"center", paddingTop:12, paddingBottom:4, flexShrink:0 }}>
    <div style={{ width:40, height:4, borderRadius:9999, background:"#e5e7eb" }}/>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function CoursePeoplePage() {
  const params   = useParams<{ id: string }>();
  const courseId = params?.id ?? "";
  const router   = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const accentM = { accentColor: "#7b1113" };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── Core state ─────────────────────────────────────────────────────────── */
  const [courseName,  setCourseName]  = useState("");
  const [activeTab,   setActiveTab]   = useState("everyone");
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("All Roles");
  const [people,      setPeople]      = useState<Person[]>([]);
  const [groupSets,   setGroupSets]   = useState<GroupSet[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [menuOpenId,  setMenuOpenId]  = useState<string|null>(null);
  const [gsMenuOpen,  setGsMenuOpen]  = useState<string|null>(null);
  const [expandedGroups,  setExpandedGroups]  = useState<Set<string>>(new Set());
  const [memberMenuOpen,  setMemberMenuOpen]  = useState<string|null>(null);
  const [groupMenuOpen,   setGroupMenuOpen]   = useState<string|null>(null);
  const [addToGroupMenu,  setAddToGroupMenu]  = useState<string|null>(null);

  const personBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  /* ── Edit Roles modal ───────────────────────────────────────────────────── */
  const [editRolesTarget,  setEditRolesTarget]  = useState<Person|null>(null);
  const [editRolesChecked, setEditRolesChecked] = useState<CourseRole[]>([]);
  const [savingRoles,      setSavingRoles]      = useState(false);

  /* ── Change Office modal ────────────────────────────────────────────────── */
  const [changeOfficeTarget, setChangeOfficeTarget] = useState<Person|null>(null);
  const [allCourses,         setAllCourses]         = useState<CourseOption[]>([]);
  const [selectedNewCourse,  setSelectedNewCourse]  = useState("");
  const [loadingCourses,     setLoadingCourses]     = useState(false);
  const [savingOffice,       setSavingOffice]       = useState(false);

  /* ── Add people ─────────────────────────────────────────────────────────── */
  const [addModal,     setAddModal]     = useState(false);
  const [addModalTab,  setAddModalTab]  = useState<"search"|"browse">("search");
  const [addBy,        setAddBy]        = useState<"email"|"loginid"|"sisid">("email");
  const [chips,        setChips]        = useState<Chip[]>([]);
  const [searchQ,      setSearchQ]      = useState("");
  const [suggestions,  setSuggestions]  = useState<UserSuggestion[]>([]);
  const [showSugg,     setShowSugg]     = useState(false);
  const [suggLoading,  setSuggLoading]  = useState(false);
  const [addRoles,     setAddRoles]     = useState<CourseRole[]>(["Staff"]);
  const [sectionOnly,  setSectionOnly]  = useState(false);
  const [adding,       setAdding]       = useState(false);
  const [addError,     setAddError]     = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  /* ── Browse tab ─────────────────────────────────────────────────────────── */
  const [allUsers,      setAllUsers]      = useState<UserSuggestion[]>([]);
  const [browseSearch,  setBrowseSearch]  = useState("");
  const [browseLoading, setBrowseLoading] = useState(false);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [browseRoles,   setBrowseRoles]   = useState<CourseRole[]>(["Staff"]);
  const [bulkAdding,    setBulkAdding]    = useState(false);
  const [bulkError,     setBulkError]     = useState("");

  /* ── Group set modal ────────────────────────────────────────────────────── */
  const [groupSetModal,      setGroupSetModal]      = useState(false);
  const [groupSetName,       setGroupSetName]       = useState("");
  const [selfSignUp,         setSelfSignUp]         = useState(false);
  const [requireSameSection, setRequireSameSection] = useState(false);
  const [groupStructure,     setGroupStructure]     = useState("Create groups later");
  const [createGroupsNow,    setCreateGroupsNow]    = useState(0);
  const [autoAssignLeader,   setAutoAssignLeader]   = useState(false);
  const [leaderType,         setLeaderType]         = useState("first");
  const [savingGroupSet,     setSavingGroupSet]     = useState(false);

  /* ── Group modal ────────────────────────────────────────────────────────── */
  const [addGroupModal,  setAddGroupModal]  = useState<string|null>(null);
  const [newGroupName,   setNewGroupName]   = useState("");
  const [newGroupLimit,  setNewGroupLimit]  = useState(0);
  const [savingGroup,    setSavingGroup]    = useState(false);
  const [editGroupModal, setEditGroupModal] = useState<{id:string;name:string;limit:number}|null>(null);
  const [editGroupName,  setEditGroupName]  = useState("");
  const [editGroupLimit, setEditGroupLimit] = useState(0);
  const [savingEditGroup, setSavingEditGroup] = useState(false);

  /* ── Edit/Clone group set ───────────────────────────────────────────────── */
  const [editGsModal,              setEditGsModal]              = useState<GroupSet|null>(null);
  const [editGsName,               setEditGsName]               = useState("");
  const [editGsSelfSignUp,         setEditGsSelfSignUp]         = useState(false);
  const [editGsRequireSameSection, setEditGsRequireSameSection] = useState(false);
  const [editGsAutoAssignLeader,   setEditGsAutoAssignLeader]   = useState(false);
  const [editGsLeaderType,         setEditGsLeaderType]         = useState("first");
  const [editGsLimit,              setEditGsLimit]              = useState(0);
  const [savingEditGs,             setSavingEditGs]             = useState(false);
  const [cloneModal,      setCloneModal]      = useState<GroupSet|null>(null);
  const [cloneName,       setCloneName]       = useState("");
  const [submittingClone, setSubmittingClone] = useState(false);

  /* ── Move panel ─────────────────────────────────────────────────────────── */
  const [movePanel,          setMovePanel]          = useState<{groupSetId:string;fromGroupId:string;userId:string;userName:string}|null>(null);
  const [moveToGroupId,      setMoveToGroupId]      = useState("");
  const [movePlacement,      setMovePlacement]      = useState("At the Top");
  const [moveRelativeUserId, setMoveRelativeUserId] = useState("");
  const [movingStudent,      setMovingStudent]      = useState(false);

  /* ── Close menus on outside click ───────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest(".cpp-menu-fixed")||t.closest(".cpp-menu")||t.closest(".cpp-btn-icon")||t.closest(".cpp-plus-btn")) return;
      setMenuOpenId(null); setGsMenuOpen(null); setGroupMenuOpen(null); setMemberMenuOpen(null); setAddToGroupMenu(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  /* ── Fetch course name ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!courseId) return;
    fetch("/api/admin/courses").then(r=>r.json()).then(d => {
      const c = (d.courses??[]).find((c:{id:string;name:string})=>c.id===courseId);
      if (c?.name) setCourseName(c.name);
    }).catch(()=>{});
  }, [courseId]);

  /* ── Fetch people ───────────────────────────────────────────────────────── */
  const fetchPeople = () => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/people`).then(r=>r.json()).then(d =>
      startTransition(()=>{ setPeople(d.people??[]); setLoading(false); })
    ).catch(()=>startTransition(()=>setLoading(false)));
  };

  /* ── Fetch group sets ───────────────────────────────────────────────────── */
  const fetchGroupSets = () => {
    if (!courseId) return;
    fetch(`/api/admin/courses/${courseId}/groupsets`).then(r=>r.json()).then(d=>
      startTransition(()=>setGroupSets(d.groupSets??[]))
    ).catch(()=>{});
  };
  const fetchGroupSetsAsync = (): Promise<void> => new Promise(resolve => {
    fetch(`/api/admin/courses/${courseId}/groupsets`).then(r=>r.json())
      .then(d=>{ startTransition(()=>setGroupSets(d.groupSets??[])); resolve(); })
      .catch(()=>resolve());
  });

  useEffect(()=>{ fetchPeople(); fetchGroupSets(); }, [courseId]); // eslint-disable-line

  useEffect(()=>{
    const tab=searchParams.get("tab"); const gs=searchParams.get("groupSet");
    if(!tab) return;
    if(tab==="groups"&&gs){ if(!groupSets.length) return; const found=groupSets.find(g=>g.id===gs); if(found){setActiveTab(found.id);router.replace(`/admin/courses/${courseId}/people`,{scroll:false});} else setActiveTab("groups"); }
    else if(tab==="groups"){ if(groupSets.length>0){setActiveTab(groupSets[0].id);router.replace(`/admin/courses/${courseId}/people`,{scroll:false});} else setActiveTab("groups"); }
  },[groupSets,searchParams,courseId,router]);

  /* ── Browse users ───────────────────────────────────────────────────────── */
  const loadAllUsers = async () => {
    setBrowseLoading(true);
    try {
      const res=await fetch("/api/admin/users"); const d=await res.json();
      const enrolled=new Set(people.map(p=>p.email.toLowerCase()));
      setAllUsers((d.users??[]).filter((u:UserSuggestion&{role?:string})=>!enrolled.has(u.email.toLowerCase())&&u.role!=="ADMIN"));
    } finally { setBrowseLoading(false); }
  };
  useEffect(()=>{ if(addModal&&addModalTab==="browse") void loadAllUsers(); },[addModal,addModalTab]); // eslint-disable-line

  /* ── Suggestions ────────────────────────────────────────────────────────── */
  const loadSuggestions = async (q:string) => {
    setSuggLoading(true); setShowSugg(true);
    try {
      const res=await fetch(q?`/api/admin/users?search=${encodeURIComponent(q)}`:"/api/admin/users"); const d=await res.json();
      const enrolled=new Set(people.map(p=>p.email.toLowerCase()));
      const chipped=new Set(chips.map(c=>c.email.toLowerCase()));
      setSuggestions((d.users??[]).filter((u:UserSuggestion)=>!enrolled.has(u.email.toLowerCase())&&!chipped.has(u.email.toLowerCase())).slice(0,8));
    } finally { setSuggLoading(false); }
  };
  useEffect(()=>{
    if(!addModal) return;
    const t=setTimeout(()=>{ if(searchQ.length>=1) void loadSuggestions(searchQ); else{setSuggestions([]);setShowSugg(false);} },200);
    return()=>clearTimeout(t);
  },[searchQ,addModal]); // eslint-disable-line

  /* ── Chip helpers ───────────────────────────────────────────────────────── */
  const addChipFromSugg=(u:UserSuggestion)=>{ setChips(p=>[...p,{id:crypto.randomUUID(),userId:u.id,name:u.name,email:u.email,image:u.image,status:"valid"}]); setSearchQ(""); setSuggestions([]); setShowSugg(false); searchRef.current?.focus(); };
  const commitQ=()=>{ const v=searchQ.trim(); if(!v) return; setChips(p=>[...p,{id:crypto.randomUUID(),name:v,email:v,image:null,status:"pending"}]); setSearchQ(""); setSuggestions([]); setShowSugg(false); };
  const removeChip=(id:string)=>setChips(p=>p.filter(c=>c.id!==id));
  const handleKD=(e:React.KeyboardEvent<HTMLInputElement>)=>{ if((e.key==="Enter"||e.key===",")&&searchQ.trim()){e.preventDefault();commitQ();} if(e.key==="Backspace"&&searchQ===""&&chips.length>0) setChips(p=>p.slice(0,-1)); };
  const handlePaste=(e:React.ClipboardEvent<HTMLInputElement>)=>{ const emails=e.clipboardData.getData("text").split(/[\n,;]+/).map(s=>s.trim()).filter(Boolean); if(emails.length>1){e.preventDefault();emails.forEach(email=>setChips(p=>[...p,{id:crypto.randomUUID(),name:email,email,image:null,status:"pending"}]));setSearchQ("");} };

  /* ── Add people ─────────────────────────────────────────────────────────── */
  const handleAddPeople = async () => {
    if(searchQ.trim()) commitQ();
    if(!chips.length){setAddError("Please add at least one person."); return;}
    setAdding(true); setAddError("");
    const bad:string[]=[];
    for(const chip of chips){
      try{
        const res=await fetch(`/api/admin/courses/${courseId}/people`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:chip.email,role:serializeRoles(addRoles)})});
        if(!res.ok) bad.push(chip.email);
        else setChips(p=>p.map(c=>c.id===chip.id?{...c,status:"valid"}:c));
      } catch{ bad.push(chip.email); setChips(p=>p.map(c=>c.id===chip.id?{...c,status:"invalid"}:c)); }
    }
    fetchPeople(); setAdding(false);
    if(bad.length>0){setAddError(`Not found: ${bad.join(", ")}`); setChips(p=>p.map(c=>bad.includes(c.email)?{...c,status:"invalid"}:c));}
    else closeAddModal();
  };

  const handleBulkAdd = async () => {
    if(!selectedIds.size) return;
    setBulkAdding(true); setBulkError("");
    const failed:string[]=[];
    for(const u of allUsers.filter(u=>selectedIds.has(u.id))){
      try{
        const res=await fetch(`/api/admin/courses/${courseId}/people`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:u.email,role:serializeRoles(browseRoles)})});
        const data=await res.json().catch(()=>({}));
        if(!res.ok&&!data?.updated) failed.push(u.name);
      } catch{ failed.push(u.name); }
    }
    await new Promise<void>(resolve=>{
      fetch(`/api/admin/courses/${courseId}/people`).then(r=>r.json()).then(d=>{
        const up=d.people??[]; startTransition(()=>{setPeople(up);setLoading(false);});
        const enrolled=new Set(up.map((p:{email:string})=>p.email.toLowerCase()));
        setAllUsers(p=>p.filter(u=>!enrolled.has(u.email.toLowerCase())));
        setSelectedIds(new Set()); resolve();
      }).catch(()=>resolve());
    });
    setBulkAdding(false);
    if(failed.length>0) setBulkError(`Failed: ${failed.join(", ")}`); else closeAddModal();
  };

  const closeAddModal = () => { setAddModal(false); setChips([]); setSearchQ(""); setSuggestions([]); setAddError(""); setAddRoles(["Staff"]); setSectionOnly(false); setSelectedIds(new Set()); setBrowseSearch(""); setBulkError(""); setAddModalTab("search"); };

  /* ── People operations ──────────────────────────────────────────────────── */
  const removeUser = async (userId:string) => {
    await fetch(`/api/admin/courses/${courseId}/people`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
    startTransition(()=>setPeople(p=>p.filter(x=>x.id!==userId))); setMenuOpenId(null);
  };

  /* ── Edit Roles ─────────────────────────────────────────────────────────── */
  const openEditRoles = (p:Person) => { setEditRolesTarget(p); setEditRolesChecked(parseRoles(p.role)); setMenuOpenId(null); };
  const toggleRoleCheck = (r:CourseRole) => { setEditRolesChecked(prev => prev.includes(r) ? prev.filter(x=>x!==r) : [...prev,r]); };
  const handleSaveRoles = async () => {
    if(!editRolesTarget||editRolesChecked.length===0) return;
    setSavingRoles(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/people/${editRolesTarget.id}`,{
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ roles: editRolesChecked }),
      });
      if(res.ok){
        const data = await res.json();
        setPeople(prev=>prev.map(p=>p.id===editRolesTarget.id?{...p,role:data.courseRole}:p));
        setEditRolesTarget(null);
      }
    } finally { setSavingRoles(false); }
  };

  /* ── Change Office ──────────────────────────────────────────────────────── */
  const openChangeOffice = async (p:Person) => {
    setChangeOfficeTarget(p); setSelectedNewCourse(""); setMenuOpenId(null);
    setLoadingCourses(true);
    try {
      const res=await fetch("/api/admin/courses"); const d=await res.json();
      setAllCourses((d.courses??[]).filter((c:CourseOption)=>c.id!==courseId));
    } finally { setLoadingCourses(false); }
  };
  const handleSaveOffice = async () => {
    if(!changeOfficeTarget||!selectedNewCourse) return;
    setSavingOffice(true);
    try {
      const res=await fetch(`/api/admin/courses/${courseId}/people/${changeOfficeTarget.id}`,{
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ courseId: selectedNewCourse }),
      });
      if(res.ok){ setPeople(prev=>prev.filter(p=>p.id!==changeOfficeTarget.id)); setChangeOfficeTarget(null); }
    } finally { setSavingOffice(false); }
  };

  /* ── Group set operations ───────────────────────────────────────────────── */
  const resetGsModal=()=>{ setGroupSetName(""); setSelfSignUp(false); setRequireSameSection(false); setGroupStructure("Create groups later"); setCreateGroupsNow(0); setAutoAssignLeader(false); setLeaderType("first"); };

  const handleCreateGs = async () => {
    if(!groupSetName.trim()) return; setSavingGroupSet(true);
    try {
      const res=await fetch(`/api/admin/courses/${courseId}/groupsets`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:groupSetName.trim(),selfSignUp,requireSameSection,groupStructure,createGroupsNow,limitGroupMembers:0,autoAssignLeader,leaderType})});
      if(res.ok){ const d=await res.json(); await fetchGroupSetsAsync(); setActiveTab(d.groupSet?.id??"everyone"); setGroupSetModal(false); resetGsModal(); }
    } finally { setSavingGroupSet(false); }
  };

  const deleteGs=async(id:string)=>{ await fetch(`/api/admin/courses/${courseId}/groupsets?groupSetId=${id}`,{method:"DELETE"}); fetchGroupSets(); setActiveTab("everyone"); setGsMenuOpen(null); };

  const handleEditGs=async()=>{
    if(!editGsModal||!editGsName.trim()) return; setSavingEditGs(true);
    try {
      const res=await fetch(`/api/admin/courses/${courseId}/groupsets/${editGsModal.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:editGsName.trim(),selfSignUp:editGsSelfSignUp,requireSameSection:editGsRequireSameSection,autoAssignLeader:editGsAutoAssignLeader,leaderType:editGsLeaderType,limitGroupMembers:editGsLimit})});
      if(res.ok){await fetchGroupSetsAsync();setActiveTab(editGsModal.id);setEditGsModal(null);}
    } finally { setSavingEditGs(false); }
  };

  const handleCloneGs=async()=>{
    if(!cloneModal) return; setSubmittingClone(true);
    try {
      const res=await fetch(`/api/admin/courses/${courseId}/groupsets`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:cloneName.trim()||`(Clone) ${cloneModal.name}`,selfSignUp:cloneModal.selfSignUp,requireSameSection:cloneModal.requireSameSection,groupStructure:cloneModal.groupStructure,createGroupsNow:0,limitGroupMembers:cloneModal.limitGroupMembers,autoAssignLeader:cloneModal.autoAssignLeader,leaderType:cloneModal.leaderType})});
      if(res.ok){ const d=await res.json(); const newId=d.groupSet?.id; for(const g of cloneModal.groups){ await fetch(`/api/admin/courses/${courseId}/groupsets/${newId}/groups`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:g.name,membershipLimit:0})}); } await fetchGroupSetsAsync(); if(newId) setActiveTab(newId); }
      setCloneModal(null);
    } finally { setSubmittingClone(false); }
  };

  /* ── Group operations ───────────────────────────────────────────────────── */
  const handleAddGroup=async()=>{ if(!newGroupName.trim()||!addGroupModal) return; setSavingGroup(true); try{ const res=await fetch(`/api/admin/courses/${courseId}/groupsets/${addGroupModal}/groups`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newGroupName.trim(),membershipLimit:newGroupLimit})}); if(res.ok){fetchGroupSets();setAddGroupModal(null);setNewGroupName("");setNewGroupLimit(0);} }finally{setSavingGroup(false);} };
  const handleEditGroup=async()=>{ if(!editGroupModal||!editGroupName.trim()) return; setSavingEditGroup(true); try{fetchGroupSets();setEditGroupModal(null);}finally{setSavingEditGroup(false);} };
  const deleteGroup=async(gsId:string,gId:string)=>{ await fetch(`/api/admin/courses/${courseId}/groupsets/${gsId}/groups/${gId}`,{method:"DELETE"}); fetchGroupSets(); setGroupMenuOpen(null); };

  /* ── Member operations ──────────────────────────────────────────────────── */
  const toggleGroup=(id:string)=>setExpandedGroups(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s;});
  const addStudentToGroup=async(gsId:string,gId:string,userId:string)=>{ setAddToGroupMenu(null); await fetch(`/api/admin/courses/${courseId}/groupsets/${gsId}/groups/${gId}/members`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})}); fetchGroupSets(); };
  const removeMember=async(gsId:string,gId:string,userId:string)=>{ await fetch(`/api/admin/courses/${courseId}/groupsets/${gsId}/groups/${gId}/members/${userId}`,{method:"DELETE"}); fetchGroupSets(); setMemberMenuOpen(null); };
  const setLeader=async(gsId:string,gId:string,userId:string)=>{ await fetch(`/api/admin/courses/${courseId}/groupsets/${gsId}/groups/${gId}/leader`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})}); fetchGroupSets(); setMemberMenuOpen(null); };
  const removeLeader=async(gsId:string,gId:string)=>{ await fetch(`/api/admin/courses/${courseId}/groupsets/${gsId}/groups/${gId}/leader`,{method:"DELETE"}); fetchGroupSets(); setMemberMenuOpen(null); };
  const handleMoveStudent=async()=>{ if(!movePanel||!moveToGroupId) return; setMovingStudent(true); try{ await fetch(`/api/admin/courses/${courseId}/groupsets/${movePanel.groupSetId}/groups/${movePanel.fromGroupId}/members/${movePanel.userId}`,{method:"DELETE"}); await fetch(`/api/admin/courses/${courseId}/groupsets/${movePanel.groupSetId}/groups/${moveToGroupId}/members`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:movePanel.userId,placement:movePlacement,relativeUserId:moveRelativeUserId||undefined})}); fetchGroupSets(); setMovePanel(null); }finally{setMovingStudent(false);} };

  /* ── Derived ────────────────────────────────────────────────────────────── */
  const filtered = people.filter(p=>{
    const q=search.toLowerCase();
    const matchSearch=p.name.toLowerCase().includes(q)||p.email.toLowerCase().includes(q);
    const matchRole = roleFilter==="All Roles" || parseRoles(p.role).includes(roleFilter as CourseRole);
    return matchSearch&&matchRole;
  });

  const roleCounts: Record<string,number> = {};
  ALL_ROLES.forEach(r=>{ roleCounts[r]=people.filter(p=>parseRoles(p.role).includes(r)).length; });

  const browseFiltered=allUsers.filter(u=>{ const q=browseSearch.toLowerCase(); return u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q); });
  const allBrowseSel=browseFiltered.length>0&&browseFiltered.every(u=>selectedIds.has(u.id));
  const someBrowseSel=browseFiltered.some(u=>selectedIds.has(u.id));
  const toggleAll=()=>{ if(allBrowseSel){ setSelectedIds(p=>{const s=new Set(p);browseFiltered.forEach(u=>s.delete(u.id));return s;}); } else { setSelectedIds(p=>{const s=new Set(p);browseFiltered.forEach(u=>s.add(u.id));return s;}); } };
  const toggleUser=(id:string)=>setSelectedIds(p=>{const s=new Set(p);s.has(id)?s.delete(id):s.add(id);return s;});

  const activeGs=groupSets.find(gs=>gs.id===activeTab)??null;
  const isGroupsArea=activeTab==="groups"||!!activeGs;
  const unassigned=activeGs?people.filter(p=>!activeGs.groups.flatMap(g=>(g.members??[]).map(m=>m.user.id)).includes(p.id)):[];
  const tabs=[{key:"everyone",label:"Everyone"},...groupSets.map(gs=>({key:gs.id,label:gs.name})),...(groupSets.length===0?[{key:"groups",label:"Groups"}]:[])];

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <style>{CSS}</style>
      <div className="cpp-root">

        {/* Tab bar */}
        <div className="cpp-tabbar">
          <div className="cpp-tabs">
            {tabs.map(t=>(
              <button key={t.key} className={`cpp-tab${activeTab===t.key?" active":""}`} onClick={()=>setActiveTab(t.key)}>{t.label}</button>
            ))}
          </div>
          <div style={{paddingBottom:isMobile?2:6,flexShrink:0}}>
            <button className="cpp-btn-primary" onClick={()=>{resetGsModal();setGroupSetModal(true);}}>+ Group Set</button>
          </div>
        </div>

        {/* ── Everyone tab ── */}
        {activeTab==="everyone" && (
          <>
            <div className="cpp-toolbar">
              <div className="cpp-toolbar-left">
                <div style={{position:"relative",flex:1,minWidth:isMobile?"100%":undefined}}>
                  <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",pointerEvents:"none"}} width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
                  <input className="cpp-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people" style={{paddingLeft:30,width:"100%",boxSizing:"border-box"}}/>
                </div>
                <div style={{position:"relative",flex:isMobile?1:undefined}}>
                  <select className="cpp-select" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{minWidth:isMobile?"100%":160,width:isMobile?"100%":undefined,boxSizing:"border-box"}}>
                    <option value="All Roles">All Roles ({people.length})</option>
                    {ALL_ROLES.map(r=>roleCounts[r]>0?<option key={r} value={r}>{r} ({roleCounts[r]})</option>:null)}
                  </select>
                  <DropArrow/>
                </div>
              </div>
              <button className="cpp-btn-primary" onClick={()=>{closeAddModal();setAddModal(true);}}>+ People</button>
            </div>

            {loading ? (
              <p style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:"48px 0"}}>Loading...</p>
            ) : filtered.length === 0 ? (
              <p style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:"48px 0"}}>No people enrolled yet.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="cpp-table-wrap">
                  <table className="cpp-table">
                    <thead>
                      <tr>
                        <th className="avatar-col"/>
                        {["Name","Login ID","Faculty Type","Position","Roles"].map(h=><th key={h}>{h}</th>)}
                        <th className="action-col"/>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p,i)=>(
                        <tr key={p.id} className={i%2===0?"even":"odd"}>
                          <td><Avatar name={p.name} image={p.image}/></td>
                          <td className="name-col">
                            <span className="cpp-name-link" onClick={()=>router.push(`/admin/courses/${courseId}/people/${p.id}`)}>{p.name}</span>
                            {p.pronouns&&<span style={{fontSize:12,color:"#9ca3af",marginLeft:4}}>({p.pronouns})</span>}
                          </td>
                          <td>{p.email}</td>
                          <td>
                            {p.accountType?<span className="cpp-badge" style={{background:p.accountType==="Teaching"?"#eff6ff":"#f5f3ff",color:p.accountType==="Teaching"?"#1d4ed8":"#7c3aed"}}>{p.accountType}</span>:<span style={{color:"#d1d5db"}}>—</span>}
                          </td>
                          <td>{p.position??<span style={{color:"#d1d5db"}}>—</span>}</td>
                          <td><RolePills raw={p.role}/></td>
                          <td>
                            <button
                              ref={el=>{if(el)personBtnRefs.current.set(p.id,el);else personBtnRefs.current.delete(p.id);}}
                              className="cpp-btn-icon"
                              onClick={()=>setMenuOpenId(menuOpenId===p.id?null:p.id)}
                            >
                              <MoreVertical size={15}/>
                            </button>
                            {menuOpenId===p.id&&(
                              <div className="cpp-menu-fixed" onClick={e=>e.stopPropagation()}
                                ref={el=>{ if(!el) return; const btn=personBtnRefs.current.get(p.id); if(!btn) return; const r=btn.getBoundingClientRect(); el.style.top=`${r.bottom+4}px`; el.style.left=`${Math.max(4,r.right-el.offsetWidth)}px`; }}>
                                <button className="cpp-menu-item" onClick={()=>{router.push(`/admin/courses/${courseId}/people/${p.id}`);setMenuOpenId(null);}}>View Profile</button>
                                <div className="cpp-menu-divider"/>
                                <button className="cpp-menu-item" onClick={()=>openEditRoles(p)}>Edit Roles</button>
                                <button className="cpp-menu-item" onClick={()=>void openChangeOffice(p)}>Change Office</button>
                                <div className="cpp-menu-divider"/>
                                <button className="cpp-menu-item danger" onClick={()=>void removeUser(p.id)}>Remove From Office</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile person cards */}
                <div className="cpp-person-cards">
                  {filtered.map(p => (
                    <div key={p.id} className="cpp-person-card">
                      <Avatar name={p.name} image={p.image} size={40}/>
                      <div className="cpp-person-card-body">
                        <p className="cpp-person-card-name" onClick={()=>router.push(`/admin/courses/${courseId}/people/${p.id}`)}>
                          {p.name}{p.pronouns&&<span style={{fontSize:11,color:"#9ca3af",fontWeight:400,marginLeft:4}}>({p.pronouns})</span>}
                        </p>
                        <p className="cpp-person-card-email">{p.email}</p>
                        <div className="cpp-person-card-meta">
                          <RolePills raw={p.role}/>
                          {p.accountType&&(
                            <span className="cpp-badge" style={{background:p.accountType==="Teaching"?"#eff6ff":"#f5f3ff",color:p.accountType==="Teaching"?"#1d4ed8":"#7c3aed"}}>
                              {p.accountType}
                            </span>
                          )}
                          {p.position&&<span style={{fontSize:11,color:"#9ca3af"}}>{p.position}</span>}
                        </div>
                      </div>
                      <div style={{position:"relative",flexShrink:0}}>
                        <button
                          ref={el=>{if(el)personBtnRefs.current.set(p.id,el);else personBtnRefs.current.delete(p.id);}}
                          className="cpp-btn-icon"
                          onClick={()=>setMenuOpenId(menuOpenId===p.id?null:p.id)}
                        >
                          <MoreVertical size={15}/>
                        </button>
                        {menuOpenId===p.id&&(
                          <div className="cpp-menu-fixed" onClick={e=>e.stopPropagation()}
                            ref={el=>{ if(!el) return; const btn=personBtnRefs.current.get(p.id); if(!btn) return; const r=btn.getBoundingClientRect(); el.style.top=`${r.bottom+4}px`; el.style.left=`${Math.max(4,r.right-el.offsetWidth)}px`; }}>
                            <button className="cpp-menu-item" onClick={()=>{router.push(`/admin/courses/${courseId}/people/${p.id}`);setMenuOpenId(null);}}>View Profile</button>
                            <div className="cpp-menu-divider"/>
                            <button className="cpp-menu-item" onClick={()=>openEditRoles(p)}>Edit Roles</button>
                            <button className="cpp-menu-item" onClick={()=>void openChangeOffice(p)}>Change Office</button>
                            <div className="cpp-menu-divider"/>
                            <button className="cpp-menu-item danger" onClick={()=>void removeUser(p.id)}>Remove From Office</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Groups empty state ── */}
        {isGroupsArea&&groupSets.length===0&&(
          <div style={{marginTop:24}}>
            <h2 style={{fontSize:20,fontWeight:800,color:"#7b1113",marginBottom:12}}>Staff Groups</h2>
            <p style={{fontSize:13,color:"#4a5568",lineHeight:1.6,maxWidth:820,marginBottom:8}}>Staff groups are a useful way to organize staff for things like group projects or papers.</p>
          </div>
        )}

        {/* ── Active group set ── */}
        {activeGs&&(
          <>
            <div className="cpp-gs-actions">
              <button className="cpp-btn-secondary" onClick={()=>{setNewGroupName("");setNewGroupLimit(0);setAddGroupModal(activeGs.id);}}>+ Group</button>
              <div style={{position:"relative"}}>
                <button className="cpp-btn-secondary" style={{padding:"7px 10px"}} onClick={e=>{e.stopPropagation();setGsMenuOpen(gsMenuOpen===activeGs.id?null:activeGs.id);}}>
                  <MoreVertical size={16}/>
                </button>
                {gsMenuOpen===activeGs.id&&(
                  <div className="cpp-menu" style={{right:0,top:38}} onClick={e=>e.stopPropagation()}>
                    <button className="cpp-menu-item" onClick={()=>{setEditGsModal(activeGs);setEditGsName(activeGs.name);setEditGsSelfSignUp(activeGs.selfSignUp);setEditGsRequireSameSection(activeGs.requireSameSection);setEditGsAutoAssignLeader(activeGs.autoAssignLeader);setEditGsLeaderType(activeGs.leaderType);setEditGsLimit(activeGs.limitGroupMembers??0);setGsMenuOpen(null);}}>Edit</button>
                    <button className="cpp-menu-item" onClick={()=>{setCloneName(`(Clone) ${activeGs.name}`);setCloneModal(activeGs);setGsMenuOpen(null);}}>Clone Group Set</button>
                    <div className="cpp-menu-divider"/>
                    <button className="cpp-menu-item danger" onClick={()=>void deleteGs(activeGs.id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>

            <div className="cpp-groups-layout">
              <div className="cpp-unassigned-col">
                <p className="cpp-section-title">Unassigned Members ({unassigned.length})</p>
                <input className="cpp-input" placeholder="Search users" style={{width:"100%",marginBottom:10,boxSizing:"border-box"}}/>
                {unassigned.length===0?<div className="cpp-box-dashed cpp-empty-box">No unassigned members.</div>:(
                  <div className="cpp-box">
                    {unassigned.map(p=>(
                      <div key={p.id} className="cpp-unassigned-row">
                        <Avatar name={p.name} image={p.image} size={28}/>
                        <span className="cpp-name-link" style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                        <div style={{position:"relative"}}>
                          <button className="cpp-plus-btn" onClick={e=>{e.stopPropagation();setAddToGroupMenu(addToGroupMenu===p.id?null:p.id);}}>+</button>
                          {addToGroupMenu===p.id&&activeGs.groups.length>0&&(
                            <div className="cpp-menu" style={{right:0,top:28}} onClick={e=>e.stopPropagation()}>
                              <p style={{fontSize:11,fontWeight:800,color:"#7b1113",padding:"6px 12px 4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Add to Group</p>
                              {activeGs.groups.map(g=><button key={g.id} className="cpp-menu-item" style={{color:"#7b1113"}} onClick={()=>void addStudentToGroup(activeGs.id,g.id,p.id)}>{g.name}</button>)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cpp-groups-col">
                <p className="cpp-section-title">Groups ({activeGs.groups.length})</p>
                {activeGs.groups.length===0?(
                  <div className="cpp-box-dashed" style={{padding:"32px 0",textAlign:"center"}}>
                    <p style={{fontSize:13,color:"#9ca3af"}}>No groups yet. Click &quot;+ Group&quot; to create one.</p>
                  </div>
                ):(
                  <div className="cpp-box">
                    {activeGs.groups.map(g=>{
                      const expanded=expandedGroups.has(g.id); const mc=g._count?.members??g.members?.length??0; const leader=g.members?.find(m=>m.isLeader);
                      return(
                        <div key={g.id}>
                          <div className="cpp-group-row">
                            <button className="cpp-btn-icon" style={{padding:0}} onClick={()=>toggleGroup(g.id)}>{expanded?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button>
                            <span className="cpp-name-link" style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{g.name}</span>
                            {leader&&<span style={{display:"flex",alignItems:"center",gap:4,fontSize:12,color:"#6b7780",flexShrink:0}}><User size={13} color="#9ca3af"/>{leader.user.name}</span>}
                            <span style={{fontSize:12,color:"#9ca3af",marginLeft:8,flexShrink:0}}>{mc} member{mc!==1?"s":""}</span>
                            <div style={{position:"relative",flexShrink:0}}>
                              <button className="cpp-btn-icon" onClick={e=>{e.stopPropagation();setGroupMenuOpen(groupMenuOpen===g.id?null:g.id);}}>
                                <MoreVertical size={15}/>
                              </button>
                              {groupMenuOpen===g.id&&(
                                <div className="cpp-menu" style={{right:0,top:28}} onClick={e=>e.stopPropagation()}>
                                  <button className="cpp-menu-item">Visit Group Homepage</button>
                                  <button className="cpp-menu-item" onClick={()=>{setEditGroupModal({id:g.id,name:g.name,limit:0});setEditGroupName(g.name);setEditGroupLimit(0);setGroupMenuOpen(null);}}>Edit</button>
                                  <div className="cpp-menu-divider"/>
                                  <button className="cpp-menu-item danger" onClick={()=>void deleteGroup(activeGs.id,g.id)}>Delete</button>
                                </div>
                              )}
                            </div>
                          </div>
                          {expanded&&(
                            <div className="cpp-group-members">
                              {!g.members||g.members.length===0?(<p style={{fontSize:12,color:"#9ca3af",textAlign:"center",padding:"12px 0"}}>No members yet.</p>):(
                                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,overflow:"visible"}}>
                                  {g.members.map(m=>{
                                    const mk=`${g.id}:${m.user.id}`;
                                    return(
                                      <div key={m.user.id} className="cpp-member-card">
                                        <GripVertical size={14} color="#d1d5db" style={{cursor:"grab",flexShrink:0}}/>
                                        <span style={{fontSize:13,color:"#2d3b45",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                          {m.user.name}{m.user.pronouns&&<span style={{color:"#9ca3af",fontSize:11,marginLeft:4}}>({m.user.pronouns})</span>}
                                        </span>
                                        {m.isLeader&&<User size={13} color="#7b1113" style={{flexShrink:0}}/>}
                                        <div style={{position:"relative"}}>
                                          <button className="cpp-btn-icon" style={{padding:3}} onClick={e=>{e.stopPropagation();setMemberMenuOpen(memberMenuOpen===mk?null:mk);}}>
                                            <MoreVertical size={14}/>
                                          </button>
                                          {memberMenuOpen===mk&&(
                                            <div className="cpp-menu-fixed" onClick={e=>e.stopPropagation()}
                                              ref={el=>{if(el){const btn=el.previousElementSibling as HTMLElement;if(btn){const r=btn.getBoundingClientRect();el.style.top=`${r.bottom+4}px`;el.style.left=`${Math.max(4,r.right-176)}px`;}}}}>
                                              <button className="cpp-menu-item" onClick={()=>void removeMember(activeGs.id,g.id,m.user.id)}>Remove</button>
                                              {m.isLeader?<button className="cpp-menu-item" onClick={()=>void removeLeader(activeGs.id,g.id)}>Remove as Leader</button>:<button className="cpp-menu-item" onClick={()=>void setLeader(activeGs.id,g.id,m.user.id)}>Set as Leader</button>}
                                              <button className="cpp-menu-item" onClick={()=>{setMovePanel({groupSetId:activeGs.id,fromGroupId:g.id,userId:m.user.id,userName:m.user.name});const first=activeGs.groups.find(og=>og.id!==g.id);setMoveToGroupId(first?.id??"");setMovePlacement("At the Top");setMoveRelativeUserId("");setMemberMenuOpen(null);}}>Move To...</button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            MODALS
        ════════════════════════════════════════════════════════════════════ */}

        {/* ── Edit Roles Modal ── */}
        {editRolesTarget&&(
          <div className="cpp-overlay" onClick={e=>{if(e.target===e.currentTarget)setEditRolesTarget(null);}}>
            <div className="cpp-modal" style={{maxWidth:420}}>
              {isMobile&&<DragHandle/>}
              <div className="cpp-modal-header">
                <h2 className="cpp-modal-title">Edit Roles</h2>
                <button className="cpp-btn-icon" onClick={()=>setEditRolesTarget(null)}><X size={18}/></button>
              </div>
              <div className="cpp-modal-body">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"10px 14px",background:"#fdf8f8",borderRadius:10,border:"1px solid #f0e4e4"}}>
                  <Avatar name={editRolesTarget.name} image={editRolesTarget.image} size={36}/>
                  <div>
                    <p style={{margin:0,fontWeight:700,fontSize:14,color:"#2d3b45"}}>{editRolesTarget.name}</p>
                    <p style={{margin:0,fontSize:12,color:"#9ca3af"}}>{editRolesTarget.email}</p>
                  </div>
                </div>
                <p style={{fontSize:12,fontWeight:700,color:"#6b7780",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Assign Roles</p>
                <div className="cpp-role-check-row">
                  {ALL_ROLES.map(r=>{
                    const checked=editRolesChecked.includes(r);
                    const desc = r==="Staff"
                      ? "Can view course content and submit assignments/forms."
                      : "Can create assignments and forms, and manage course content.";
                    return(
                      <label key={r} className={`cpp-role-check-item${checked?" selected":""}`}>
                        <input type="checkbox" checked={checked} onChange={()=>toggleRoleCheck(r)} style={{accentColor:"#7b1113",marginTop:2,width:16,height:16,flexShrink:0,cursor:"pointer"}}/>
                        <div>
                          <span style={{fontWeight:700,fontSize:13,color:checked?ROLE_BADGE[r].color:"#2d3b45"}}>{r}</span>
                          <p className="cpp-role-desc">{desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {editRolesChecked.length===0&&(
                  <p style={{fontSize:12,color:"#c0392b",marginTop:10,fontWeight:600}}>At least one role must be selected.</p>
                )}
              </div>
              <div className="cpp-modal-footer">
                <button className="cpp-btn-secondary" onClick={()=>setEditRolesTarget(null)}>Cancel</button>
                <button className="cpp-btn-primary" onClick={()=>void handleSaveRoles()} disabled={savingRoles||editRolesChecked.length===0}>
                  {savingRoles&&<Loader2 size={13} className="cpp-spin"/>}Save Roles
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Change Office Modal ── */}
        {changeOfficeTarget&&(
          <div className="cpp-overlay" onClick={e=>{if(e.target===e.currentTarget)setChangeOfficeTarget(null);}}>
            <div className="cpp-modal" style={{maxWidth:440}}>
              {isMobile&&<DragHandle/>}
              <div className="cpp-modal-header">
                <h2 className="cpp-modal-title">Change Office</h2>
                <button className="cpp-btn-icon" onClick={()=>setChangeOfficeTarget(null)}><X size={18}/></button>
              </div>
              <div className="cpp-modal-body">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"10px 14px",background:"#fdf8f8",borderRadius:10,border:"1px solid #f0e4e4"}}>
                  <Avatar name={changeOfficeTarget.name} image={changeOfficeTarget.image} size={36}/>
                  <div>
                    <p style={{margin:0,fontWeight:700,fontSize:14,color:"#2d3b45"}}>{changeOfficeTarget.name}</p>
                    <p style={{margin:0,fontSize:12,color:"#9ca3af"}}>{changeOfficeTarget.email}</p>
                  </div>
                </div>
                <p style={{fontSize:12,color:"#6b7780",marginBottom:16,lineHeight:1.6}}>
                  Select the office/course to transfer this person to. They will be removed from <strong>{courseName}</strong>.
                </p>
                <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>
                  Target Office <span style={{color:"#c0392b"}}>*</span>
                </label>
                {loadingCourses?(
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 0",color:"#9ca3af",fontSize:13}}>
                    <Loader2 size={16} className="cpp-spin"/>Loading offices...
                  </div>
                ):(
                  <div style={{position:"relative"}}>
                    <select className="cpp-select" value={selectedNewCourse} onChange={e=>setSelectedNewCourse(e.target.value)} style={{width:"100%"}}>
                      <option value="">— Select an office —</option>
                      {allCourses.map(c=>(
                        <option key={c.id} value={c.id}>{c.name} {c.code?`(${c.code})`:""}</option>
                      ))}
                    </select>
                    <DropArrow/>
                  </div>
                )}
              </div>
              <div className="cpp-modal-footer">
                <button className="cpp-btn-secondary" onClick={()=>setChangeOfficeTarget(null)}>Cancel</button>
                <button className="cpp-btn-primary" onClick={()=>void handleSaveOffice()} disabled={savingOffice||!selectedNewCourse}>
                  {savingOffice&&<Loader2 size={13} className="cpp-spin"/>}Transfer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Add People Modal ── */}
        {addModal&&(
          <div className="cpp-overlay" onClick={e=>{if(e.target===e.currentTarget)closeAddModal();}}>
            <div className="cpp-modal" style={{maxHeight:isMobile?"92vh":"88vh"}}>
              {isMobile&&<DragHandle/>}
              <div className="cpp-modal-header">
                <h2 className="cpp-modal-title">Add People</h2>
                <button className="cpp-btn-icon" onClick={closeAddModal}><X size={18}/></button>
              </div>
              <div className="cpp-subtabs">
                {[{key:"search",label:"Search by Email"},{key:"browse",label:"Browse & Select Users"}].map(t=>(
                  <button key={t.key} className={`cpp-subtab${addModalTab===t.key?" active":""}`} onClick={()=>setAddModalTab(t.key as "search"|"browse")}>{t.label}</button>
                ))}
              </div>

              {addModalTab==="search"&&(
                <div className="cpp-modal-body">
                  <div style={{marginBottom:16}}>
                    <p style={{fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:8}}>Add user(s) by</p>
                    <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                      {(["email","loginid","sisid"] as const).map(opt=>(
                        <label key={opt} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:13,color:"#2d3b45"}}>
                          <input type="radio" name="addBy" value={opt} checked={addBy===opt} onChange={()=>setAddBy(opt)} style={accentM}/>
                          {opt==="email"?"Email Address":opt==="loginid"?"Login ID":"SIS ID"}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{marginBottom:16}}>
                    <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>
                      {addBy==="email"?"Email Addresses":addBy==="loginid"?"Login IDs":"SIS IDs"} <span style={{color:"#c0392b"}}>*</span>
                    </label>
                    <div className="cpp-chip-box" onClick={()=>searchRef.current?.focus()}>
                      {chips.map(chip=>(
                        <span key={chip.id} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 6px 3px 8px",borderRadius:6,fontSize:12,background:chip.status==="valid"?"#f0fdf4":"#fef2f2",border:`1px solid ${chip.status==="valid"?"#86efac":"#f0c0c0"}`,color:chip.status==="valid"?"#15803d":"#7b1113"}}>
                          {chip.name!==chip.email?chip.name:chip.email}
                          {chip.status==="valid"&&<Check size={11} color="#16a34a"/>}
                          {chip.status==="invalid"&&<X size={11} color="#7b1113"/>}
                          <button onMouseDown={e=>{e.preventDefault();removeChip(chip.id);}} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",color:"inherit",opacity:0.7}}><X size={11}/></button>
                        </span>
                      ))}
                      <input ref={searchRef} className="cpp-chip-input" value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={handleKD} onPaste={handlePaste} onBlur={()=>setTimeout(()=>setShowSugg(false),150)} placeholder={chips.length===0?"Search by name or email…":""}/>
                    </div>
                    {showSugg&&(suggestions.length>0||suggLoading)&&(
                      <div className="cpp-sugg">
                        {suggLoading&&!suggestions.length&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",fontSize:13,color:"#9ca3af"}}><Loader2 size={14} className="cpp-spin"/>Searching…</div>}
                        {suggestions.map(u=>(
                          <button key={u.id} className="cpp-sugg-item" onMouseDown={e=>{e.preventDefault();addChipFromSugg(u);}}>
                            <Avatar name={u.name} image={u.image} size={30}/>
                            <div><p style={{fontSize:13,fontWeight:700,color:"#2d3b45",margin:0}}>{u.name}</p><p style={{fontSize:12,color:"#9ca3af",margin:0}}>{u.email}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                    <p style={{fontSize:11,color:"#9ca3af",marginTop:4}}>Press Enter or , to add · Paste multiple emails at once</p>
                    {addError&&<p style={{fontSize:12,color:"#7b1113",marginTop:4,fontWeight:600}}>{addError}</p>}
                  </div>

                  {/* Role + Section row */}
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:16,marginBottom:12}}>
                    <div>
                      <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Role(s)</label>
                      <div className="cpp-role-check-row" style={{flexDirection:"row",gap:8}}>
                        {ALL_ROLES.map(r=>{
                          const checked = addRoles.includes(r);
                          return(
                            <label key={r} className={`cpp-role-check-item${checked?" selected":""}`} style={{flex:1,padding:"10px 12px"}}>
                              <input type="checkbox" checked={checked} onChange={()=>setAddRoles(prev=>prev.includes(r)?prev.filter(x=>x!==r):[...prev,r])} style={{accentColor:"#7b1113",width:15,height:15,flexShrink:0,cursor:"pointer"}}/>
                              <span style={{fontWeight:700,fontSize:13,color:checked?ROLE_BADGE[r].color:"#2d3b45"}}>{r}</span>
                            </label>
                          );
                        })}
                      </div>
                      {addRoles.length===0&&<p style={{fontSize:12,color:"#c0392b",marginTop:6,fontWeight:600}}>At least one role must be selected.</p>}
                    </div>
                    <div>
                      <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Section</label>
                      <div style={{position:"relative"}}>
                        <select className="cpp-select" style={{width:"100%"}}><option>{courseName}</option></select>
                        <DropArrow/>
                      </div>
                    </div>
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#2d3b45"}}>
                    <input type="checkbox" checked={sectionOnly} onChange={e=>setSectionOnly(e.target.checked)} style={accentM}/>
                    Can interact with users in their section only
                  </label>
                </div>
              )}

              {addModalTab==="browse"&&(
                <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
                  <div style={{padding:"16px 20px 12px",flexShrink:0}}>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      <div style={{position:"relative",flex:1,minWidth:160}}>
                        <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",pointerEvents:"none"}} width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/></svg>
                        <input className="cpp-input" value={browseSearch} onChange={e=>setBrowseSearch(e.target.value)} placeholder="Search users…" style={{paddingLeft:30,width:"100%",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {ALL_ROLES.map(r=>{
                          const checked = browseRoles.includes(r);
                          return(
                            <label key={r} className={`cpp-role-check-item${checked?" selected":""}`} style={{padding:"6px 12px",flexDirection:"row",alignItems:"center",gap:6,cursor:"pointer"}}>
                              <input type="checkbox" checked={checked} onChange={()=>setBrowseRoles(prev=>prev.includes(r)?prev.filter(x=>x!==r):[...prev,r])} style={{accentColor:"#7b1113",width:14,height:14,cursor:"pointer"}}/>
                              <span style={{fontWeight:700,fontSize:12,color:checked?ROLE_BADGE[r].color:"#2d3b45"}}>{r}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    {selectedIds.size>0&&(
                      <div className="cpp-banner">
                        <span style={{fontSize:13,color:"#7b1113",fontWeight:600}}>{selectedIds.size} user{selectedIds.size!==1?"s":""} selected</span>
                        <button onClick={()=>setSelectedIds(new Set())} style={{fontSize:12,color:"#7b1113",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontWeight:600}}>Clear</button>
                      </div>
                    )}
                  </div>
                  <div style={{flex:1,overflowY:"auto",borderTop:"1px solid #f0e4e4"}}>
                    {browseLoading?<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 0",gap:8,color:"#9ca3af",fontSize:13}}><Loader2 size={18} className="cpp-spin"/>Loading users…</div>:
                    browseFiltered.length===0?<p style={{fontSize:13,color:"#9ca3af",textAlign:"center",padding:"40px 0"}}>No users found.</p>:(
                      <table className="cpp-browse-table">
                        <thead className="cpp-browse-thead">
                          <tr>
                            <th style={{width:40,padding:"10px 14px"}}>
                              <input type="checkbox" checked={allBrowseSel} ref={el=>{if(el) el.indeterminate=someBrowseSel&&!allBrowseSel;}} onChange={toggleAll} style={{width:14,height:14,accentColor:"#7b1113",cursor:"pointer"}}/>
                            </th>
                            <th className="cpp-browse-th">Name</th>
                            {!isMobile&&<th className="cpp-browse-th">Email</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {browseFiltered.map((u,i)=>(
                            <tr key={u.id} className={`cpp-browse-tr${selectedIds.has(u.id)?" sel":i%2===0?" even":" odd"}`} onClick={()=>toggleUser(u.id)}>
                              <td style={{padding:"10px 14px"}}>
                                <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${selectedIds.has(u.id)?"#7b1113":"#e5e7eb"}`,background:selectedIds.has(u.id)?"#7b1113":"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                  {selectedIds.has(u.id)&&<Check size={11} color="#fff"/>}
                                </div>
                              </td>
                              <td style={{padding:"10px 12px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:10}}>
                                  <Avatar name={u.name} image={u.image} size={30}/>
                                  <div>
                                    <span style={{fontSize:13,color:"#2d3b45",fontWeight:600,display:"block"}}>{u.name}</span>
                                    {isMobile&&<span style={{fontSize:11,color:"#9ca3af"}}>{u.email}</span>}
                                  </div>
                                </div>
                              </td>
                              {!isMobile&&<td style={{padding:"10px 12px",fontSize:13,color:"#6b7780"}}>{u.email}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {bulkError&&<p style={{fontSize:12,color:"#7b1113",padding:"6px 20px",fontWeight:600}}>{bulkError}</p>}
                </div>
              )}

              <div className="cpp-modal-footer">
                <button className="cpp-btn-secondary" onClick={closeAddModal}>Cancel</button>
                {addModalTab==="search"?(
                  <button className="cpp-btn-primary" onClick={()=>void handleAddPeople()} disabled={adding||chips.length===0}>
                    {adding&&<Loader2 size={13} className="cpp-spin"/>}{adding?"Adding…":"Next"}
                  </button>
                ):(
                  <button className="cpp-btn-primary" onClick={()=>void handleBulkAdd()} disabled={bulkAdding||selectedIds.size===0}>
                    {bulkAdding&&<Loader2 size={13} className="cpp-spin"/>}{bulkAdding?"Adding…":`Add ${selectedIds.size>0?selectedIds.size:""} to Course`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Create Group Set Modal ── */}
        {groupSetModal&&(
          <div className="cpp-overlay" onClick={e=>{if(e.target===e.currentTarget)setGroupSetModal(false);}}>
            <div className="cpp-modal" style={{maxWidth:560}}>
              {isMobile&&<DragHandle/>}
              <div className="cpp-modal-header">
                <h2 className="cpp-modal-title">Create Group Set</h2>
                <button className="cpp-btn-icon" onClick={()=>setGroupSetModal(false)}><X size={18}/></button>
              </div>
              <div className="cpp-modal-body">
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"160px 1fr",gap:12,alignItems:"center",marginBottom:20}}>
                  <label style={{fontSize:13,color:"#2d3b45",fontWeight:600}}>Group Set Name <span style={{color:"#c0392b"}}>*</span></label>
                  <input className="cpp-input" value={groupSetName} onChange={e=>setGroupSetName(e.target.value)} placeholder="Enter Group Set Name" style={{height:34,width:"100%",boxSizing:"border-box"}}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"160px 1fr",gap:12,alignItems:"flex-start",borderTop:"1px solid #f0e4e4",paddingTop:20,marginBottom:20}}>
                  <label style={{fontSize:13,color:"#2d3b45",fontWeight:600,paddingTop:2}}>Self Sign-Up</label>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#2d3b45"}}><input type="checkbox" checked={selfSignUp} onChange={e=>{setSelfSignUp(e.target.checked);if(!e.target.checked)setRequireSameSection(false);}} style={accentM}/>Allow self sign-up</label>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:selfSignUp?"pointer":"default",fontSize:13,color:selfSignUp?"#2d3b45":"#9ca3af"}}><input type="checkbox" checked={requireSameSection} onChange={e=>setRequireSameSection(e.target.checked)} disabled={!selfSignUp} style={accentM}/>Require same section</label>
                  </div>
                </div>
                {!selfSignUp&&(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"160px 1fr",gap:12,alignItems:"flex-start",borderTop:"1px solid #f0e4e4",paddingTop:20,marginBottom:20}}>
                    <label style={{fontSize:13,color:"#2d3b45",fontWeight:600,paddingTop:6}}>Group Structure</label>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{position:"relative"}}>
                        <select className="cpp-select" value={groupStructure} onChange={e=>{setGroupStructure(e.target.value);setCreateGroupsNow(0);}} style={{width:"100%"}}>
                          <option>Create groups later</option>
                          <option>Split staff by number of groups</option>
                          <option>Split number of staff per group</option>
                        </select>
                        <DropArrow/>
                      </div>
                      {groupStructure!=="Create groups later"&&<SpinnerInput value={createGroupsNow} onChange={setCreateGroupsNow} placeholder="0" width={120}/>}
                    </div>
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"160px 1fr",gap:12,alignItems:"flex-start",borderTop:"1px solid #f0e4e4",paddingTop:20}}>
                  <label style={{fontSize:13,color:"#2d3b45",fontWeight:600,paddingTop:2}}>Leadership</label>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#2d3b45"}}><input type="checkbox" checked={autoAssignLeader} onChange={e=>setAutoAssignLeader(e.target.checked)} style={accentM}/>Automatically assign a group leader</label>
                    {[{val:"first",label:"Set first member to join as group leader"},{val:"random",label:"Set a random member as group leader"}].map(opt=>(
                      <label key={opt.val} style={{display:"flex",alignItems:"center",gap:8,cursor:autoAssignLeader?"pointer":"default",fontSize:13,color:autoAssignLeader?"#2d3b45":"#9ca3af",paddingLeft:8}}><input type="radio" name="leaderType" value={opt.val} checked={leaderType===opt.val} onChange={()=>setLeaderType(opt.val)} disabled={!autoAssignLeader} style={accentM}/>{opt.label}</label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="cpp-modal-footer">
                <button className="cpp-btn-secondary" onClick={()=>setGroupSetModal(false)}>Cancel</button>
                <button className="cpp-btn-primary" onClick={()=>void handleCreateGs()} disabled={savingGroupSet||!groupSetName.trim()}>{savingGroupSet?"Saving…":"Save"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Add Group Modal ── */}
        {addGroupModal&&(
          <div className="cpp-overlay" onClick={e=>{if(e.target===e.currentTarget)setAddGroupModal(null);}}>
            <div className="cpp-modal" style={{maxWidth:440}}>
              {isMobile&&<DragHandle/>}
              <div className="cpp-modal-header">
                <h2 className="cpp-modal-title">Add Group</h2>
                <button className="cpp-btn-icon" onClick={()=>setAddGroupModal(null)}><X size={18}/></button>
              </div>
              <div className="cpp-modal-body">
                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Group Name <span style={{color:"#c0392b"}}>*</span></label>
                  <input className="cpp-input" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="Name" style={{width:"100%",boxSizing:"border-box",height:34}}/>
                </div>
                <div>
                  <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Group Membership Limit</label>
                  <SpinnerInput value={newGroupLimit} onChange={setNewGroupLimit}/>
                </div>
              </div>
              <div className="cpp-modal-footer">
                <button className="cpp-btn-secondary" onClick={()=>setAddGroupModal(null)}>Cancel</button>
                <button className="cpp-btn-primary" onClick={()=>void handleAddGroup()} disabled={savingGroup||!newGroupName.trim()}>{savingGroup?"Saving…":"Save"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Group Modal ── */}
        {editGroupModal&&(
          <div className="cpp-overlay" onClick={e=>{if(e.target===e.currentTarget)setEditGroupModal(null);}}>
            <div className="cpp-modal" style={{maxWidth:380}}>
              {isMobile&&<DragHandle/>}
              <div className="cpp-modal-header">
                <h2 className="cpp-modal-title">Edit Group</h2>
                <button className="cpp-btn-icon" onClick={()=>setEditGroupModal(null)}><X size={18}/></button>
              </div>
              <div className="cpp-modal-body">
                <div style={{marginBottom:16}}>
                  <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Group Name <span style={{color:"#c0392b"}}>*</span></label>
                  <input className="cpp-input" value={editGroupName} onChange={e=>setEditGroupName(e.target.value)} style={{width:"100%",boxSizing:"border-box",height:34}}/>
                </div>
                <div>
                  <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Membership Limit</label>
                  <SpinnerInput value={editGroupLimit} onChange={setEditGroupLimit} placeholder="Number"/>
                </div>
              </div>
              <div className="cpp-modal-footer">
                <button className="cpp-btn-secondary" onClick={()=>setEditGroupModal(null)}>Cancel</button>
                <button className="cpp-btn-primary" onClick={()=>void handleEditGroup()} disabled={savingEditGroup||!editGroupName.trim()}>{savingEditGroup?"Saving…":"Save"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Edit Group Set Modal ── */}
        {editGsModal&&(
          <div className="cpp-overlay" onClick={e=>{if(e.target===e.currentTarget)setEditGsModal(null);}}>
            <div className="cpp-modal" style={{maxWidth:560}}>
              {isMobile&&<DragHandle/>}
              <div className="cpp-modal-header">
                <h2 className="cpp-modal-title">Edit Group Set</h2>
                <button className="cpp-btn-icon" onClick={()=>setEditGsModal(null)}><X size={18}/></button>
              </div>
              <div className="cpp-modal-body">
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
                  <label style={{fontSize:13,color:"#2d3b45",fontWeight:600,flexShrink:0}}>Group Set Name</label>
                  <input className="cpp-input" value={editGsName} onChange={e=>setEditGsName(e.target.value)} style={{flex:1,minWidth:160,height:34}}/>
                </div>
                <div style={{borderTop:"1px solid #f0e4e4",paddingTop:16,marginBottom:16,display:"flex",flexDirection:"column",gap:10}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#2d3b45"}}><input type="checkbox" checked={editGsSelfSignUp} onChange={e=>{setEditGsSelfSignUp(e.target.checked);if(!e.target.checked){setEditGsRequireSameSection(false);setEditGsLimit(0);}}} style={accentM}/>Allow self sign-up</label>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:editGsSelfSignUp?"pointer":"default",fontSize:13,color:editGsSelfSignUp?"#2d3b45":"#9ca3af"}}><input type="checkbox" checked={editGsRequireSameSection} onChange={e=>setEditGsRequireSameSection(e.target.checked)} disabled={!editGsSelfSignUp} style={accentM}/>Require group members to be in the same section</label>
                </div>
                <div style={{borderTop:"1px solid #f0e4e4",paddingTop:16,display:"flex",flexDirection:"column",gap:10}}>
                  <p style={{fontSize:13,fontWeight:700,color:"#2d3b45",margin:0}}>Leadership</p>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:"#2d3b45"}}><input type="checkbox" checked={editGsAutoAssignLeader} onChange={e=>setEditGsAutoAssignLeader(e.target.checked)} style={accentM}/>Automatically assign a group leader</label>
                  {[{val:"first",label:"Set first member to join as group leader"},{val:"random",label:"Set a random member as group leader"}].map(opt=>(
                    <label key={opt.val} style={{display:"flex",alignItems:"center",gap:8,cursor:editGsAutoAssignLeader?"pointer":"default",fontSize:13,color:editGsAutoAssignLeader?"#2d3b45":"#9ca3af",paddingLeft:8}}><input type="radio" name="editLeaderType" value={opt.val} checked={editGsLeaderType===opt.val} onChange={()=>setEditGsLeaderType(opt.val)} disabled={!editGsAutoAssignLeader} style={accentM}/>{opt.label}</label>
                  ))}
                </div>
              </div>
              <div className="cpp-modal-footer">
                <button className="cpp-btn-secondary" onClick={()=>setEditGsModal(null)}>Cancel</button>
                <button className="cpp-btn-primary" onClick={()=>void handleEditGs()} disabled={savingEditGs||!editGsName.trim()}>{savingEditGs&&<Loader2 size={13} className="cpp-spin"/>}Save</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Clone Group Set Modal ── */}
        {cloneModal&&(
          <div className="cpp-overlay" onClick={e=>{if(e.target===e.currentTarget)setCloneModal(null);}}>
            <div className="cpp-modal" style={{maxWidth:440}}>
              {isMobile&&<DragHandle/>}
              <div className="cpp-modal-header">
                <h2 className="cpp-modal-title">Clone Group Set</h2>
                <button className="cpp-btn-icon" onClick={()=>setCloneModal(null)}><X size={18}/></button>
              </div>
              <div className="cpp-modal-body">
                <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Group Set Name <span style={{color:"#c0392b"}}>*</span></label>
                <input className="cpp-input" value={cloneName} onChange={e=>setCloneName(e.target.value)} style={{width:"100%",boxSizing:"border-box",height:34}}/>
              </div>
              <div className="cpp-modal-footer">
                <button className="cpp-btn-secondary" onClick={()=>setCloneModal(null)}>Cancel</button>
                <button className="cpp-btn-primary" onClick={()=>void handleCloneGs()} disabled={submittingClone||!cloneName.trim()}>{submittingClone&&<Loader2 size={13} className="cpp-spin"/>}Submit</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Move Member Panel ── */}
        {movePanel&&(()=>{
          const gs=groupSets.find(g=>g.id===movePanel.groupSetId); const others=gs?.groups.filter(g=>g.id!==movePanel.fromGroupId)??[];
          return(
            <div style={{position:"fixed",inset:0,zIndex:50,display:"flex",justifyContent:isMobile?"center":"flex-end",alignItems:isMobile?"flex-end":"stretch"}}>
              <div style={{flex:isMobile?undefined:1}} onClick={()=>setMovePanel(null)}/>
              <div className="cpp-side-panel" style={isMobile?{width:"100%",maxHeight:"85vh",borderLeft:"none",borderTop:"1px solid #f0e4e4",borderRadius:"20px 20px 0 0"}:{}}>
                {isMobile&&<DragHandle/>}
                <div className="cpp-modal-header">
                  <h2 style={{fontSize:16,fontWeight:800,color:"#2d3b45",margin:0}}>Move Member</h2>
                  <button className="cpp-btn-icon" onClick={()=>setMovePanel(null)}><X size={16}/></button>
                </div>
                <div style={{padding:20,flex:1,display:"flex",flexDirection:"column",gap:18}}>
                  <div>
                    <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Groups</label>
                    <div style={{position:"relative"}}>
                      <select className="cpp-select" value={moveToGroupId} onChange={e=>{setMoveToGroupId(e.target.value);setMoveRelativeUserId("");}} style={{width:"100%"}}>
                        {others.length===0?<option value="">No other groups</option>:others.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <DropArrow/>
                    </div>
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:13,fontWeight:700,color:"#2d3b45",marginBottom:6}}>Place &quot;{movePanel.userName}&quot;</label>
                    <div style={{position:"relative"}}>
                      <select className="cpp-select" value={movePlacement} onChange={e=>{setMovePlacement(e.target.value);setMoveRelativeUserId("");}} style={{width:"100%"}}>
                        <option>At the Top</option><option>Before..</option><option>After..</option><option>At the Bottom</option>
                      </select>
                      <DropArrow/>
                    </div>
                  </div>
                </div>
                <div className="cpp-modal-footer">
                  <button className="cpp-btn-secondary" onClick={()=>setMovePanel(null)}>Cancel</button>
                  <button className="cpp-btn-primary" onClick={()=>void handleMoveStudent()} disabled={movingStudent||!moveToGroupId}>{movingStudent&&<Loader2 size={13} className="cpp-spin"/>}Move</button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </>
  );
}