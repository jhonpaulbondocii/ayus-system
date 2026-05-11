"use client";

// src/components/layout/course/CoursePeopleTab.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVertical, X, Check, Loader2, ChevronRight,
  ChevronDown, GripVertical, User,
} from "lucide-react";
import { normalizeCourseRole } from "./helpers";
import type { Course, Person, Group, Membership } from "./types";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface GroupMember {
  user: { id: string; name: string; pronouns?: string | null };
  isLeader?: boolean;
}
interface GroupItem {
  id: string;
  name: string;
  leaderId?: string | null;
  _count?: { members: number };
  members?: GroupMember[];
}
interface GroupSet {
  id: string;
  name: string;
  selfSignUp: boolean;
  requireSameSection: boolean;
  groupStructure: string;
  createGroupsNow: number;
  limitGroupMembers: number;
  autoAssignLeader: boolean;
  leaderType: string;
  groups: GroupItem[];
}
interface Chip {
  id: string;
  email: string;
  role: string;
  status: "idle" | "valid" | "invalid";
  errorMsg?: string;
}

interface Props {
  course: Course;
  courseId: string;
  people: Person[];
  groups: Group[];
  membership: Membership | null;
  canManagePeople: boolean;
  currentUserId: string | null; // ← accepts null
  onAddPeople: () => void;
  onAddGroup: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   AVAILABLE ROLES (extend here in the future)
───────────────────────────────────────────────────────────────────────────── */
const ENROLLABLE_ROLES = ["Staff"] as const;
type EnrollableRole = typeof ENROLLABLE_ROLES[number];

/* ─────────────────────────────────────────────────────────────────────────────
   CSS
───────────────────────────────────────────────────────────────────────────── */
const CSS = `
.cpt-root { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:14px; color:#2d3b45; }
.cpt-tabbar { display:flex; align-items:flex-end; justify-content:space-between; padding:0 20px; border-bottom:2px solid #f0e4e4; }
.cpt-tabs { display:flex; }
.cpt-tab { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; font-weight:600; color:#6b7780; background:none; border:none; border-bottom:2px solid transparent; padding:10px 16px; cursor:pointer; margin-bottom:-2px; white-space:nowrap; transition:color .15s; }
.cpt-tab:hover { color:#7b1113; }
.cpt-tab.active { color:#7b1113; border-bottom-color:#7b1113; }
.cpt-toolbar { display:flex; align-items:center; justify-content:space-between; padding:12px 20px; }
.cpt-toolbar-left { display:flex; align-items:center; gap:8px; }
.cpt-input { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; color:#2d3b45; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; outline:none; background:#fff; transition:all .15s; }
.cpt-input:focus { border-color:#7b1113; box-shadow:0 0 0 3px rgba(123,17,19,.08); }
.cpt-select { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; color:#2d3b45; border:1px solid #e5e7eb; border-radius:8px; padding:6px 28px 6px 10px; outline:none; background:#fff; appearance:none; cursor:pointer; transition:all .15s; }
.cpt-select:focus { border-color:#7b1113; box-shadow:0 0 0 3px rgba(123,17,19,.08); }
.cpt-btn-primary { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:700; background:#7b1113; color:#fff; border:none; border-radius:8px; padding:8px 16px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:opacity .15s; }
.cpt-btn-primary:hover:not(:disabled) { opacity:.88; }
.cpt-btn-primary:disabled { opacity:.5; cursor:default; }
.cpt-btn-secondary { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:700; background:#fff; color:#374151; border:1px solid #e5e7eb; border-radius:8px; padding:7px 14px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:all .15s; }
.cpt-btn-secondary:hover { border-color:#7b1113; color:#7b1113; }
.cpt-btn-icon { background:none; border:none; cursor:pointer; padding:4px; border-radius:6px; color:#9ca3af; display:flex; align-items:center; transition:all .15s; }
.cpt-btn-icon:hover { background:#fef2f2; color:#7b1113; }
.cpt-table { width:100%; border-collapse:collapse; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; }
.cpt-table thead tr { border-bottom:1px solid #f0e4e4; }
.cpt-table th { text-align:left; padding:8px 10px; font-size:11px; font-weight:700; color:#6b7780; text-transform:uppercase; letter-spacing:.06em; white-space:nowrap; }
.cpt-table th.avatar-col { width:40px; }
.cpt-table th.action-col { width:32px; }
.cpt-table tbody tr { border-bottom:1px solid #f9fafb; transition:background .1s; }
.cpt-table tbody tr.even { background:#fff; }
.cpt-table tbody tr.odd { background:#fdf8f8; }
.cpt-table tbody tr:hover { background:#fef2f2; }
.cpt-table td { padding:10px; font-size:13px; color:#6b7780; }
.cpt-table td.name-col { color:#2d3b45; }
.cpt-name-link { color:#7b1113; cursor:pointer; font-size:13px; font-weight:600; }
.cpt-name-link:hover { text-decoration:underline; }
.cpt-badge { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; display:inline-block; letter-spacing:.04em; }
.cpt-menu { position:absolute; background:#fff; border:1px solid #f0e4e4; border-radius:12px; box-shadow:0 4px 20px rgba(123,17,19,.08); z-index:50; min-width:180px; padding:4px 0; overflow:hidden; }
.cpt-menu-fixed { position:fixed; background:#fff; border:1px solid #f0e4e4; border-radius:12px; box-shadow:0 4px 20px rgba(123,17,19,.1); z-index:9999; min-width:176px; padding:4px 0; overflow:hidden; }
.cpt-menu-item { display:block; width:100%; text-align:left; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:500; color:#374151; padding:8px 14px; background:none; border:none; cursor:pointer; transition:background .1s; }
.cpt-menu-item:hover { background:#fdf8f8; color:#7b1113; }
.cpt-menu-item.danger { color:#c0392b; }
.cpt-menu-item.danger:hover { background:#fef2f2; }
.cpt-menu-item:disabled { opacity:.45; cursor:default; color:#9ca3af; }
.cpt-menu-item:disabled:hover { background:none; color:#9ca3af; }
.cpt-menu-divider { border-top:1px solid #f0e4e4; margin:4px 0; }
.cpt-overlay { position:fixed; inset:0; z-index:50; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.35); backdrop-filter:blur(2px); }
.cpt-modal { background:#fff; border-radius:16px; box-shadow:0 8px 40px rgba(0,0,0,.18); border:1px solid #f0e4e4; display:flex; flex-direction:column; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; }
.cpt-modal-header { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 16px; border-bottom:1px solid #f0e4e4; flex-shrink:0; }
.cpt-modal-title { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:16px; font-weight:800; color:#111827; margin:0; }
.cpt-modal-footer { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:14px 22px; border-top:1px solid #f0e4e4; background:#fdf8f8; border-radius:0 0 16px 16px; flex-shrink:0; }
.cpt-modal-body { padding:20px 24px; overflow-y:auto; flex:1; }
.cpt-chip-box { min-height:80px; border:1px solid #e5e7eb; border-radius:8px; padding:8px; display:flex; flex-wrap:wrap; gap:6px; cursor:text; transition:all .15s; align-content:flex-start; }
.cpt-chip-box:focus-within { border-color:#7b1113; box-shadow:0 0 0 3px rgba(123,17,19,.08); }
.cpt-chip-input { flex:1; min-width:180px; height:28px; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; border:none; outline:none; background:transparent; color:#2d3b45; }
.cpt-groups-layout { display:flex; gap:24px; padding:16px 20px; }
.cpt-unassigned-col { width:280px; flex-shrink:0; }
.cpt-groups-col { flex:1; }
.cpt-section-title { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; font-weight:800; color:#7b1113; margin-bottom:10px; text-transform:uppercase; letter-spacing:.08em; }
.cpt-box { border:1px solid #f0e4e4; border-radius:10px; overflow:hidden; }
.cpt-box-dashed { border:1px dashed #f0c0c0; border-radius:10px; }
.cpt-empty-box { font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:12px; color:#8b969e; text-align:center; padding:20px 12px; }
.cpt-unassigned-row { display:flex; align-items:center; gap:8px; padding:8px 10px; border-bottom:1px solid #f9fafb; background:#fff; position:relative; transition:background .1s; }
.cpt-unassigned-row:hover { background:#fdf8f8; }
.cpt-group-row { display:flex; align-items:center; gap:10px; padding:10px 12px; background:#fff; border-bottom:1px solid #f9fafb; transition:background .1s; }
.cpt-group-row:hover { background:#fdf8f8; }
.cpt-group-members { background:#fdf8f8; border-top:1px solid #f0e4e4; padding:10px 32px; }
.cpt-member-card { display:flex; align-items:center; gap:8px; border:1px solid #f0e4e4; background:#fff; border-radius:8px; padding:7px 10px; transition:border-color .15s; }
.cpt-member-card:hover { border-color:#7b1113; }
.cpt-plus-btn { width:24px; height:24px; display:flex; align-items:center; justify-content:center; border:1px solid #e5e7eb; border-radius:6px; background:#fff; cursor:pointer; font-size:16px; color:#7b1113; font-weight:700; transition:all .15s; }
.cpt-plus-btn:hover { background:#fef2f2; border-color:#7b1113; }
.cpt-spin-wrap { display:flex; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
.cpt-spin-input { flex:1; height:34px; padding:0 10px; font-family:'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif; font-size:13px; border:none; outline:none; color:#2d3b45; background:#fff; }
.cpt-spin-btns { display:flex; flex-direction:column; border-left:1px solid #e5e7eb; }
.cpt-spin-up, .cpt-spin-dn { flex:1; padding:0 8px; background:none; border:none; cursor:pointer; color:#6b7780; display:flex; align-items:center; justify-content:center; transition:background .1s; }
.cpt-spin-up:hover, .cpt-spin-dn:hover { background:#fef2f2; color:#7b1113; }
.cpt-spin-dn { border-top:1px solid #e5e7eb; }
@keyframes cpt-spin { to { transform: rotate(360deg); } }
.cpt-spin { animation: cpt-spin 1s linear infinite; }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   SMALL HELPERS
───────────────────────────────────────────────────────────────────────────── */
const DropArrow = () => (
  <svg
    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#6b7780" }}
    width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
  >
    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SpinnerInput = ({ value, onChange, placeholder, width = 160 }: {
  value: number; onChange: (v: number) => void; placeholder?: string; width?: number;
}) => (
  <div className="cpt-spin-wrap" style={{ width }}>
    <input type="number" min={0} value={value || ""} onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      placeholder={placeholder ?? "No limit"} className="cpt-spin-input" />
    <div className="cpt-spin-btns">
      <button type="button" className="cpt-spin-up" onClick={() => onChange(value + 1)}>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 6l5-6 5 6z" /></svg>
      </button>
      <button type="button" className="cpt-spin-dn" onClick={() => onChange(Math.max(0, value - 1))}>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z" /></svg>
      </button>
    </div>
  </div>
);

function Avatar({ name, image, size = 32 }: { name: string | null; image: string | null; size?: number }) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={name ?? ""} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#f0e4e4", color: "#7b1113", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, fontWeight: 800, flexShrink: 0 }}>
      {(name ?? "A")[0]?.toUpperCase()}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function CoursePeopleTab({
  courseId, people: initialPeople,
  canManagePeople, currentUserId,
}: Props) {
  const router = useRouter();
  const accentM = { accentColor: "#7b1113" };

  const [people, setPeople] = useState(initialPeople);
  const [activeTab, setActiveTab] = useState("everyone");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [groupSets, setGroupSets] = useState<GroupSet[]>([]);
  const [gsMenuOpen, setGsMenuOpen] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [memberMenuOpen, setMemberMenuOpen] = useState<string | null>(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState<string | null>(null);
  const [addToGroupMenu, setAddToGroupMenu] = useState<string | null>(null);

  const [addModal, setAddModal] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [inputRole, setInputRole] = useState<EnrollableRole>("Staff");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [groupSetModal, setGroupSetModal] = useState(false);
  const [groupSetName, setGroupSetName] = useState("");
  const [selfSignUp, setSelfSignUp] = useState(false);
  const [requireSameSection, setRequireSameSection] = useState(false);
  const [groupStructure, setGroupStructure] = useState("Create groups later");
  const [createGroupsNow, setCreateGroupsNow] = useState(0);
  const [autoAssignLeader, setAutoAssignLeader] = useState(false);
  const [leaderType, setLeaderType] = useState("first");
  const [savingGroupSet, setSavingGroupSet] = useState(false);

  const [addGroupModal, setAddGroupModal] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupLimit, setNewGroupLimit] = useState(0);
  const [savingGroup, setSavingGroup] = useState(false);

  const [editGroupModal, setEditGroupModal] = useState<{ id: string; name: string; limit: number } | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupLimit, setEditGroupLimit] = useState(0);
  const [savingEditGroup, setSavingEditGroup] = useState(false);

  const [editGsModal, setEditGsModal] = useState<GroupSet | null>(null);
  const [editGsName, setEditGsName] = useState("");
  const [editGsSelfSignUp, setEditGsSelfSignUp] = useState(false);
  const [editGsRequireSameSection, setEditGsRequireSameSection] = useState(false);
  const [editGsAutoAssignLeader, setEditGsAutoAssignLeader] = useState(false);
  const [editGsLeaderType, setEditGsLeaderType] = useState("first");
  const [editGsLimit, setEditGsLimit] = useState(0);
  const [savingEditGs, setSavingEditGs] = useState(false);

  const [movePanel, setMovePanel] = useState<{ groupSetId: string; fromGroupId: string; userId: string; userName: string } | null>(null);
  const [moveToGroupId, setMoveToGroupId] = useState("");
  const [movePlacement, setMovePlacement] = useState("At the Top");
  const [movingStudent, setMovingStudent] = useState(false);

  const [cloneModal, setCloneModal] = useState<GroupSet | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [submittingClone, setSubmittingClone] = useState(false);

  useEffect(() => { setPeople(initialPeople); }, [initialPeople]);

  const fetchGroupSets = useCallback(() => {
    fetch(`/api/courses/${courseId}/groupsets`)
      .then((r) => r.json())
      .then((d) => setGroupSets(d.groupSets ?? []))
      .catch(() => {});
  }, [courseId]);

  const fetchGroupSetsAsync = useCallback((): Promise<void> =>
    new Promise((resolve) => {
      fetch(`/api/courses/${courseId}/groupsets`)
        .then((r) => r.json())
        .then((d) => { setGroupSets(d.groupSets ?? []); resolve(); })
        .catch(() => resolve());
    }), [courseId]);

  useEffect(() => { fetchGroupSets(); }, [fetchGroupSets]);

  const fetchPeople = useCallback(() => {
    fetch(`/api/courses/${courseId}/people`)
      .then((r) => r.json())
      .then((d) => setPeople((d.people ?? []).map((p: Person) => ({ ...p, role: normalizeCourseRole(p.role) }))))
      .catch(() => {});
  }, [courseId]);

  const isValidEmailFormat = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const commitInput = () => {
    const v = inputVal.trim();
    if (!v) return;
    const already = chips.some((c) => c.email.toLowerCase() === v.toLowerCase());
    if (!already) {
      setChips((prev) => [...prev, { id: crypto.randomUUID(), email: v, role: inputRole, status: "idle" }]);
    }
    setInputVal("");
  };

  const removeChip = (id: string) => setChips((p) => p.filter((c) => c.id !== id));

  const handleKD = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && inputVal.trim()) {
      e.preventDefault();
      commitInput();
    }
    if (e.key === "Backspace" && inputVal === "" && chips.length > 0) {
      setChips((p) => p.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text");
    const emails = raw.split(/[\n,;\s]+/).map((s) => s.trim()).filter(Boolean);
    if (emails.length > 1) {
      e.preventDefault();
      const enrolled = new Set(people.map((p) => p.email.toLowerCase()));
      const existing = new Set(chips.map((c) => c.email.toLowerCase()));
      const toAdd: Chip[] = [];
      emails.forEach((email) => {
        const key = email.toLowerCase();
        if (!existing.has(key) && !enrolled.has(key)) {
          toAdd.push({ id: crypto.randomUUID(), email, role: inputRole, status: "idle" });
          existing.add(key);
        }
      });
      setChips((p) => [...p, ...toAdd]);
      setInputVal("");
    }
  };

  const handleAddPeople = async () => {
    if (inputVal.trim()) commitInput();

    const currentChips = chips.length > 0
      ? chips
      : inputVal.trim()
        ? [{ id: crypto.randomUUID(), email: inputVal.trim(), role: inputRole, status: "idle" as const }]
        : [];

    if (currentChips.length === 0) {
      setAddError("Please enter at least one email address.");
      return;
    }

    const badFormat = currentChips.filter((c) => !isValidEmailFormat(c.email));
    if (badFormat.length > 0) {
      setChips(currentChips.map((c) =>
        badFormat.find((b) => b.id === c.id)
          ? { ...c, status: "invalid", errorMsg: "Invalid email format" }
          : c
      ));
      setAddError(`Invalid email format: ${badFormat.map((b) => b.email).join(", ")}`);
      return;
    }

    setAdding(true);
    setAddError("");
    setChips(currentChips.map((c) => ({ ...c, status: "idle" })));

    const notFound: string[] = [];
    const alreadyEnrolled: string[] = [];

    for (const chip of currentChips) {
      try {
        const res = await fetch(`/api/courses/${courseId}/people`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: chip.email.trim(), role: chip.role }),
        });

        if (res.ok) {
          setChips((p) => p.map((c) => c.id === chip.id ? { ...c, status: "valid" } : c));
        } else {
          const body = await res.json().catch(() => ({}));
          if (res.status === 409) {
            alreadyEnrolled.push(chip.email);
            setChips((p) => p.map((c) => c.id === chip.id ? { ...c, status: "invalid", errorMsg: "Already enrolled" } : c));
          } else {
            notFound.push(chip.email);
            setChips((p) => p.map((c) => c.id === chip.id ? { ...c, status: "invalid", errorMsg: body?.message ?? "Not found" } : c));
          }
        }
      } catch {
        notFound.push(chip.email);
        setChips((p) => p.map((c) => c.id === chip.id ? { ...c, status: "invalid", errorMsg: "Request failed" } : c));
      }
    }

    fetchPeople();
    setAdding(false);

    const errParts: string[] = [];
    if (notFound.length > 0) errParts.push(`No account found: ${notFound.join(", ")}`);
    if (alreadyEnrolled.length > 0) errParts.push(`Already enrolled: ${alreadyEnrolled.join(", ")}`);

    if (errParts.length > 0) {
      setAddError(errParts.join(" · "));
    } else {
      closeAddModal();
    }
  };

  const closeAddModal = () => {
    setAddModal(false);
    setChips([]);
    setInputVal("");
    setInputRole("Staff");
    setAddError("");
  };

  const removeUser = async (userId: string) => {
    if (userId === currentUserId) return;
    await fetch(`/api/courses/${courseId}/people`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setPeople((p) => p.filter((x) => x.id !== userId));
    setMenuOpenId(null);
  };

  const resetGsModal = () => {
    setGroupSetName(""); setSelfSignUp(false); setRequireSameSection(false);
    setGroupStructure("Create groups later"); setCreateGroupsNow(0);
    setAutoAssignLeader(false); setLeaderType("first");
  };

  const handleCreateGs = async () => {
    if (!groupSetName.trim()) return;
    setSavingGroupSet(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groupsets`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupSetName.trim(), selfSignUp, requireSameSection, groupStructure, createGroupsNow, limitGroupMembers: 0, autoAssignLeader, leaderType }),
      });
      if (res.ok) {
        const d = await res.json();
        await fetchGroupSetsAsync();
        setActiveTab(d.groupSet?.id ?? "everyone");
        setGroupSetModal(false); resetGsModal();
      }
    } finally { setSavingGroupSet(false); }
  };

  const deleteGs = async (id: string) => {
    await fetch(`/api/courses/${courseId}/groupsets?groupSetId=${id}`, { method: "DELETE" });
    fetchGroupSets(); setActiveTab("everyone"); setGsMenuOpen(null);
  };

  const handleEditGs = async () => {
    if (!editGsModal || !editGsName.trim()) return;
    setSavingEditGs(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groupsets/${editGsModal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editGsName.trim(), selfSignUp: editGsSelfSignUp, requireSameSection: editGsRequireSameSection, autoAssignLeader: editGsAutoAssignLeader, leaderType: editGsLeaderType, limitGroupMembers: editGsLimit }),
      });
      if (res.ok) { await fetchGroupSetsAsync(); setActiveTab(editGsModal.id); setEditGsModal(null); }
    } finally { setSavingEditGs(false); }
  };

  const handleCloneGs = async () => {
    if (!cloneModal) return;
    setSubmittingClone(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groupsets`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cloneName.trim() || `(Clone) ${cloneModal.name}`, selfSignUp: cloneModal.selfSignUp, requireSameSection: cloneModal.requireSameSection, groupStructure: cloneModal.groupStructure, createGroupsNow: 0, limitGroupMembers: cloneModal.limitGroupMembers, autoAssignLeader: cloneModal.autoAssignLeader, leaderType: cloneModal.leaderType }),
      });
      if (res.ok) {
        const d = await res.json();
        const newId = d.groupSet?.id;
        for (const g of cloneModal.groups) {
          await fetch(`/api/courses/${courseId}/groupsets/${newId}/groups`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: g.name, membershipLimit: 0 }),
          });
        }
        await fetchGroupSetsAsync();
        if (newId) setActiveTab(newId);
      }
      setCloneModal(null);
    } finally { setSubmittingClone(false); }
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim() || !addGroupModal) return;
    setSavingGroup(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groupsets/${addGroupModal}/groups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim(), membershipLimit: newGroupLimit }),
      });
      if (res.ok) { fetchGroupSets(); setAddGroupModal(null); setNewGroupName(""); setNewGroupLimit(0); }
    } finally { setSavingGroup(false); }
  };

  const handleEditGroup = async () => {
    if (!editGroupModal || !editGroupName.trim()) return;
    setSavingEditGroup(true);
    try { fetchGroupSets(); setEditGroupModal(null); }
    finally { setSavingEditGroup(false); }
  };

  const deleteGroup = async (gsId: string, gId: string) => {
    await fetch(`/api/courses/${courseId}/groupsets/${gsId}/groups/${gId}`, { method: "DELETE" });
    fetchGroupSets(); setGroupMenuOpen(null);
  };

  const addStudentToGroup = async (gsId: string, gId: string, userId: string) => {
    setAddToGroupMenu(null);
    await fetch(`/api/courses/${courseId}/groupsets/${gsId}/groups/${gId}/members`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    fetchGroupSets();
  };

  const removeMember = async (gsId: string, gId: string, userId: string) => {
    await fetch(`/api/courses/${courseId}/groupsets/${gsId}/groups/${gId}/members/${userId}`, { method: "DELETE" });
    fetchGroupSets(); setMemberMenuOpen(null);
  };

  const setLeaderFn = async (gsId: string, gId: string, userId: string) => {
    await fetch(`/api/courses/${courseId}/groupsets/${gsId}/groups/${gId}/leader`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    fetchGroupSets(); setMemberMenuOpen(null);
  };

  const removeLeader = async (gsId: string, gId: string) => {
    await fetch(`/api/courses/${courseId}/groupsets/${gsId}/groups/${gId}/leader`, { method: "DELETE" });
    fetchGroupSets(); setMemberMenuOpen(null);
  };

  const handleMoveStudent = async () => {
    if (!movePanel || !moveToGroupId) return;
    setMovingStudent(true);
    try {
      await fetch(`/api/courses/${courseId}/groupsets/${movePanel.groupSetId}/groups/${movePanel.fromGroupId}/members/${movePanel.userId}`, { method: "DELETE" });
      await fetch(`/api/courses/${courseId}/groupsets/${movePanel.groupSetId}/groups/${moveToGroupId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: movePanel.userId, placement: movePlacement }),
      });
      fetchGroupSets(); setMovePanel(null);
    } finally { setMovingStudent(false); }
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((p) => {
      const s = new Set(p);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const filtered = people.filter((p) => {
    const q = search.toLowerCase();
    return (p.name ?? p.email).toLowerCase().includes(q) &&
      (roleFilter === "All Roles" || normalizeCourseRole(p.role) === roleFilter);
  });

  const roleCounts = ["Staff", "Head"].reduce<Record<string, number>>((a, r) => {
    a[r] = people.filter((p) => normalizeCourseRole(p.role) === r).length;
    return a;
  }, {});

  const activeGs = groupSets.find((gs) => gs.id === activeTab) ?? null;
  const isGroupsArea = activeTab === "groups" || !!activeGs;

  const unassigned = activeGs
    ? people.filter((p) => !activeGs.groups.flatMap((g) => (g.members ?? []).map((m) => m.user.id)).includes(p.id))
    : [];

  const tabs = [
    { key: "everyone", label: "Everyone" },
    ...groupSets.map((gs) => ({ key: gs.id, label: gs.name })),
    ...(groupSets.length === 0 ? [{ key: "groups", label: "Groups" }] : []),
  ];

  const validChipCount = chips.filter((c) => c.status !== "invalid").length + (inputVal.trim() ? 1 : 0);

  return (
    <>
      <style>{CSS}</style>
      <div className="cpt-root">

        <div className="cpt-tabbar">
          <div className="cpt-tabs">
            {tabs.map((t) => (
              <button key={t.key} className={`cpt-tab${activeTab === t.key ? " active" : ""}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          {canManagePeople && (
            <button type="button" className="cpt-btn-secondary" style={{ marginBottom: 6, fontSize: 11 }}
              onClick={() => { resetGsModal(); setGroupSetModal(true); }}>
              + Group Set
            </button>
          )}
        </div>

        {activeTab === "everyone" && (
          <>
            <div className="cpt-toolbar">
              <div className="cpt-toolbar-left">
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af", pointerEvents: "none" }}
                    width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
                  </svg>
                  <input className="cpt-input" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search people" style={{ paddingLeft: 30, width: 200 }} />
                </div>
                <div style={{ position: "relative" }}>
                  <select className="cpt-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ minWidth: 160 }}>
                    <option value="All Roles">All Roles ({people.length})</option>
                    {["Staff", "Head"].filter((r) => roleCounts[r] > 0).map((r) => (
                      <option key={r} value={r}>{r} ({roleCounts[r]})</option>
                    ))}
                  </select>
                  <DropArrow />
                </div>
              </div>
              {canManagePeople && (
                <button className="cpt-btn-primary" onClick={() => { closeAddModal(); setAddModal(true); }}>
                  + People
                </button>
              )}
            </div>

            <table className="cpt-table">
              <thead>
                <tr>
                  <th className="avatar-col" />
                  {["Name", "Login ID", "Staff Type", "Position", "Role"].map((h) => <th key={h}>{h}</th>)}
                  {canManagePeople && <th className="action-col" />}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={canManagePeople ? 8 : 7} style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
                    No people enrolled yet.
                  </td></tr>
                ) : (
                  filtered.map((p, i) => {
                    const isSelf = currentUserId !== null && p.id === currentUserId;
                    return (
                      <tr key={p.id} className={i % 2 === 0 ? "even" : "odd"}>
                        <td><Avatar name={p.name} image={p.image} /></td>
                        <td className="name-col">
                          <span className="cpt-name-link" onClick={() => router.push(`/courses/${courseId}/people/${p.id}`)}>
                            {p.name ?? p.email}
                          </span>
                          {p.pronouns && <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 4 }}>({p.pronouns})</span>}
                          {p.status === "PENDING" && <span style={{ fontSize: 10, background: "#374151", color: "#fff", padding: "2px 6px", borderRadius: 4, marginLeft: 6 }}>pending</span>}
                        </td>
                        <td>{p.email}</td>
                        <td>
                          {p.accountType
                            ? <span className="cpt-badge" style={{
                                background: p.accountType === "Teaching" ? "#eff6ff" : "#f5f3ff",
                                color: p.accountType === "Teaching" ? "#1d4ed8" : "#7c3aed",
                              }}>
                                {p.accountType}
                              </span>
                            : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td>{p.position ?? <span style={{ color: "#d1d5db" }}>—</span>}</td>
                        <td>
                          <span className="cpt-badge" style={{ color: "#7b1113" }}>
                            {normalizeCourseRole(p.role)}
                          </span>
                        </td>
                        {canManagePeople && (
                          <td style={{ position: "relative" }}>
                            <button className="cpt-btn-icon" onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}>
                              <MoreVertical size={15} />
                            </button>
                            {menuOpenId === p.id && (
                              <div className="cpt-menu" style={{ right: 0, top: 36 }}>
                                <button className="cpt-menu-item" onClick={() => { router.push(`/courses/${courseId}/people/${p.id}`); setMenuOpenId(null); }}>
                                  View Profile
                                </button>
                                <div className="cpt-menu-divider" />
                                <button
                                  className="cpt-menu-item danger"
                                  disabled={isSelf}
                                  title={isSelf ? "You cannot remove yourself from the course." : undefined}
                                  onClick={() => !isSelf && void removeUser(p.id)}
                                  style={isSelf ? { opacity: 0.4, cursor: "not-allowed", color: "#9ca3af" } : undefined}
                                >
                                  {isSelf ? "Cannot Remove Yourself" : "Remove From Course"}
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </>
        )}

        {isGroupsArea && groupSets.length === 0 && (
          <div style={{ padding: "24px 20px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#7b1113", marginBottom: 12 }}>Student Groups</h2>
            <p style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.6, maxWidth: 820, marginBottom: 8 }}>
              Staff groups are a useful way to organize students for things like group projects or papers.
            </p>
          </div>
        )}

        {activeGs && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "12px 20px 0" }}>
              <button className="cpt-btn-secondary" onClick={() => { setNewGroupName(""); setNewGroupLimit(0); setAddGroupModal(activeGs.id); }}>
                + Group
              </button>
              <div style={{ position: "relative" }}>
                <button className="cpt-btn-secondary" style={{ padding: "7px 10px" }}
                  onClick={() => setGsMenuOpen(gsMenuOpen === activeGs.id ? null : activeGs.id)}>
                  <MoreVertical size={16} />
                </button>
                {gsMenuOpen === activeGs.id && (
                  <div className="cpt-menu" style={{ right: 0, top: 38 }}>
                    <button className="cpt-menu-item" onClick={() => { setEditGsModal(activeGs); setEditGsName(activeGs.name); setEditGsSelfSignUp(activeGs.selfSignUp); setEditGsRequireSameSection(activeGs.requireSameSection); setEditGsAutoAssignLeader(activeGs.autoAssignLeader); setEditGsLeaderType(activeGs.leaderType); setEditGsLimit(activeGs.limitGroupMembers ?? 0); setGsMenuOpen(null); }}>Edit</button>
                    <button className="cpt-menu-item" onClick={() => { setCloneName(`(Clone) ${activeGs.name}`); setCloneModal(activeGs); setGsMenuOpen(null); }}>Clone Group Set</button>
                    <div className="cpt-menu-divider" />
                    <button className="cpt-menu-item danger" onClick={() => void deleteGs(activeGs.id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>

            <div className="cpt-groups-layout">
              <div className="cpt-unassigned-col">
                <p className="cpt-section-title">Unassigned Members ({unassigned.length})</p>
                <input className="cpt-input" placeholder="Search users" style={{ width: "100%", marginBottom: 10, boxSizing: "border-box" }} />
                {unassigned.length === 0 ? (
                  <div className="cpt-box-dashed cpt-empty-box">No unassigned members.</div>
                ) : (
                  <div className="cpt-box">
                    {unassigned.map((p) => (
                      <div key={p.id} className="cpt-unassigned-row">
                        <Avatar name={p.name} image={p.image} size={28} />
                        <span className="cpt-name-link" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name ?? p.email}
                        </span>
                        {canManagePeople && (
                          <div style={{ position: "relative" }}>
                            <button className="cpt-plus-btn" onClick={() => setAddToGroupMenu(addToGroupMenu === p.id ? null : p.id)}>+</button>
                            {addToGroupMenu === p.id && activeGs.groups.length > 0 && (
                              <div className="cpt-menu" style={{ right: 0, top: 28 }}>
                                <p style={{ fontSize: 11, fontWeight: 800, color: "#7b1113", padding: "6px 12px 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Add to Group</p>
                                {activeGs.groups.map((g) => (
                                  <button key={g.id} className="cpt-menu-item" style={{ color: "#7b1113" }}
                                    onClick={() => void addStudentToGroup(activeGs.id, g.id, p.id)}>
                                    {g.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cpt-groups-col">
                <p className="cpt-section-title">Groups ({activeGs.groups.length})</p>
                {activeGs.groups.length === 0 ? (
                  <div className="cpt-box-dashed" style={{ padding: "32px 0", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "#9ca3af" }}>No groups yet. Click &quot;+ Group&quot; to create one.</p>
                  </div>
                ) : (
                  <div className="cpt-box">
                    {activeGs.groups.map((g) => {
                      const expanded = expandedGroups.has(g.id);
                      const mc = g._count?.members ?? g.members?.length ?? 0;
                      const leader = g.members?.find((m) => m.isLeader);
                      return (
                        <div key={g.id}>
                          <div className="cpt-group-row">
                            <button className="cpt-btn-icon" style={{ padding: 0 }} onClick={() => toggleGroup(g.id)}>
                              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            <span className="cpt-name-link" style={{ flex: 1 }}>{g.name}</span>
                            {leader && (
                              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#6b7780" }}>
                                <User size={13} color="#9ca3af" />{leader.user.name}
                              </span>
                            )}
                            <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 12 }}>{mc} member{mc !== 1 ? "s" : ""}</span>
                            {canManagePeople && (
                              <div style={{ position: "relative" }}>
                                <button className="cpt-btn-icon" onClick={() => setGroupMenuOpen(groupMenuOpen === g.id ? null : g.id)}>
                                  <MoreVertical size={15} />
                                </button>
                                {groupMenuOpen === g.id && (
                                  <div className="cpt-menu" style={{ right: 0, top: 28 }}>
                                    <button className="cpt-menu-item" onClick={() => { setEditGroupModal({ id: g.id, name: g.name, limit: 0 }); setEditGroupName(g.name); setEditGroupLimit(0); setGroupMenuOpen(null); }}>Edit</button>
                                    <div className="cpt-menu-divider" />
                                    <button className="cpt-menu-item danger" onClick={() => void deleteGroup(activeGs.id, g.id)}>Delete</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {expanded && (
                            <div className="cpt-group-members">
                              {!g.members || g.members.length === 0 ? (
                                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "12px 0" }}>No members yet.</p>
                              ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                  {g.members.map((m) => {
                                    const mk = `${g.id}:${m.user.id}`;
                                    return (
                                      <div key={m.user.id} className="cpt-member-card">
                                        <GripVertical size={14} color="#d1d5db" style={{ cursor: "grab", flexShrink: 0 }} />
                                        <span style={{ fontSize: 13, color: "#2d3b45", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                          {m.user.name}
                                          {m.user.pronouns && <span style={{ color: "#9ca3af", fontSize: 11, marginLeft: 4 }}>({m.user.pronouns})</span>}
                                        </span>
                                        {m.isLeader && <User size={13} color="#7b1113" style={{ flexShrink: 0 }} />}
                                        {canManagePeople && (
                                          <div style={{ position: "relative" }}>
                                            <button className="cpt-btn-icon" style={{ padding: 3 }}
                                              onClick={(e) => { e.stopPropagation(); setMemberMenuOpen(memberMenuOpen === mk ? null : mk); }}>
                                              <MoreVertical size={14} />
                                            </button>
                                            {memberMenuOpen === mk && (
                                              <div className="cpt-menu-fixed"
                                                ref={(el) => {
                                                  if (el) {
                                                    const btn = el.previousElementSibling as HTMLElement;
                                                    if (btn) { const r = btn.getBoundingClientRect(); el.style.top = `${r.bottom + 4}px`; el.style.left = `${r.right - 176}px`; }
                                                  }
                                                }}>
                                                <button className="cpt-menu-item" onClick={() => void removeMember(activeGs.id, g.id, m.user.id)}>Remove</button>
                                                {m.isLeader ? (
                                                  <button className="cpt-menu-item" onClick={() => void removeLeader(activeGs.id, g.id)}>Remove as Leader</button>
                                                ) : (
                                                  <button className="cpt-menu-item" onClick={() => void setLeaderFn(activeGs.id, g.id, m.user.id)}>Set as Leader</button>
                                                )}
                                                <button className="cpt-menu-item" onClick={() => {
                                                  setMovePanel({ groupSetId: activeGs.id, fromGroupId: g.id, userId: m.user.id, userName: m.user.name });
                                                  const first = activeGs.groups.find((og) => og.id !== g.id);
                                                  setMoveToGroupId(first?.id ?? "");
                                                  setMovePlacement("At the Top");
                                                  setMemberMenuOpen(null);
                                                }}>Move To...</button>
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

        {/* MODALS */}
        {addModal && canManagePeople && (
          <div className="cpt-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeAddModal(); }}>
            <div className="cpt-modal" style={{ width: 520 }}>
              <div className="cpt-modal-header">
                <h2 className="cpt-modal-title">Add People</h2>
                <button className="cpt-btn-icon" onClick={closeAddModal}><X size={18} /></button>
              </div>
              <div className="cpt-modal-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", gap: 10, background: "#fef2f2", border: "1px solid #f0c0c0", borderRadius: 8, padding: "10px 14px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7b1113" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </svg>
                  <p style={{ fontSize: 12, color: "#7b1113", margin: 0, lineHeight: 1.5 }}>
                    Enter the <strong>email address</strong> of each person you want to add. They must already have an account in the system.
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#2d3b45", marginBottom: 6 }}>
                    Email Addresses <span style={{ color: "#c0392b" }}>*</span>
                  </label>
                  <div className="cpt-chip-box" onClick={() => inputRef.current?.focus()}>
                    {chips.map((chip) => {
                      const isInvalid = chip.status === "invalid";
                      const isValid = chip.status === "valid";
                      return (
                        <span key={chip.id} title={chip.errorMsg} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 6px 3px 8px", borderRadius: 6, fontSize: 12, background: isValid ? "#f0fdf4" : isInvalid ? "#fef2f2" : "#f3f4f6", border: `1px solid ${isValid ? "#86efac" : isInvalid ? "#f0c0c0" : "#e5e7eb"}`, color: isValid ? "#15803d" : isInvalid ? "#7b1113" : "#374151" }}>
                          {chip.email}
                          {isValid && <Check size={11} color="#16a34a" />}
                          <button type="button" onMouseDown={(e) => { e.preventDefault(); removeChip(chip.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "inherit", opacity: 0.6, marginLeft: 1 }}>
                            <X size={11} />
                          </button>
                        </span>
                      );
                    })}
                    <input ref={inputRef} className="cpt-chip-input" type="email" value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)} onKeyDown={handleKD} onPaste={handlePaste}
                      placeholder={chips.length === 0 ? "e.g. juan@example.com" : ""} autoComplete="off" />
                  </div>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 5 }}>
                    Press <kbd style={{ fontSize: 10, background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 4, padding: "1px 4px" }}>Enter</kbd> after each email
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: "#2d3b45", flexShrink: 0 }}>Role <span style={{ color: "#c0392b" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <select className="cpt-select" value={inputRole} onChange={(e) => setInputRole(e.target.value as EnrollableRole)} style={{ minWidth: 140 }}>
                      {ENROLLABLE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <DropArrow />
                  </div>
                </div>
                {addError && (
                  <div style={{ display: "flex", gap: 8, background: "#fef2f2", border: "1px solid #f0c0c0", borderRadius: 8, padding: "9px 12px" }}>
                    <p style={{ fontSize: 12, color: "#7b1113", margin: 0, fontWeight: 600 }}>{addError}</p>
                  </div>
                )}
              </div>
              <div className="cpt-modal-footer">
                <button className="cpt-btn-secondary" onClick={closeAddModal} disabled={adding}>Cancel</button>
                <button className="cpt-btn-primary" onClick={() => void handleAddPeople()} disabled={adding || (chips.length === 0 && !inputVal.trim())}>
                  {adding && <Loader2 size={13} className="cpt-spin" />}
                  {adding ? "Adding…" : `Add ${validChipCount > 0 ? validChipCount : ""} to Course`}
                </button>
              </div>
            </div>
          </div>
        )}

        {groupSetModal && canManagePeople && (
          <div className="cpt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setGroupSetModal(false); }}>
            <div className="cpt-modal" style={{ width: 560, maxHeight: "90vh" }}>
              <div className="cpt-modal-header">
                <h2 className="cpt-modal-title">Create Group Set</h2>
                <button className="cpt-btn-icon" onClick={() => setGroupSetModal(false)}><X size={18} /></button>
              </div>
              <div className="cpt-modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center", marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: "#2d3b45", fontWeight: 600 }}>Group Set Name <span style={{ color: "#c0392b" }}>*</span></label>
                  <input className="cpt-input" value={groupSetName} onChange={(e) => setGroupSetName(e.target.value)} placeholder="Enter Group Set Name" style={{ height: 34 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "flex-start", borderTop: "1px solid #f0e4e4", paddingTop: 20, marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: "#2d3b45", fontWeight: 600, paddingTop: 2 }}>Self Sign-Up</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#2d3b45" }}>
                      <input type="checkbox" checked={selfSignUp} onChange={(e) => { setSelfSignUp(e.target.checked); if (!e.target.checked) setRequireSameSection(false); }} style={accentM} />
                      Allow self sign-up
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: selfSignUp ? "pointer" : "default", fontSize: 13, color: selfSignUp ? "#2d3b45" : "#9ca3af" }}>
                      <input type="checkbox" checked={requireSameSection} onChange={(e) => setRequireSameSection(e.target.checked)} disabled={!selfSignUp} style={accentM} />
                      Require group members to be in the same section
                    </label>
                  </div>
                </div>
                {!selfSignUp && (
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "flex-start", borderTop: "1px solid #f0e4e4", paddingTop: 20, marginBottom: 20 }}>
                    <label style={{ fontSize: 13, color: "#2d3b45", fontWeight: 600, paddingTop: 6 }}>Group Structure</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ position: "relative" }}>
                        <select className="cpt-select" value={groupStructure} onChange={(e) => { setGroupStructure(e.target.value); setCreateGroupsNow(0); }} style={{ width: "100%" }}>
                          <option>Create groups later</option>
                          <option>Split students by number of groups</option>
                          <option>Split number of students per group</option>
                        </select>
                        <DropArrow />
                      </div>
                      {groupStructure !== "Create groups later" && (
                        <SpinnerInput value={createGroupsNow} onChange={setCreateGroupsNow} placeholder="0" width={120} />
                      )}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "flex-start", borderTop: "1px solid #f0e4e4", paddingTop: 20 }}>
                  <label style={{ fontSize: 13, color: "#2d3b45", fontWeight: 600, paddingTop: 2 }}>Leadership</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#2d3b45" }}>
                      <input type="checkbox" checked={autoAssignLeader} onChange={(e) => setAutoAssignLeader(e.target.checked)} style={accentM} />
                      Automatically assign a group leader
                    </label>
                    {[{ val: "first", label: "Set first member to join as group leader" }, { val: "random", label: "Set a random member as group leader" }].map((opt) => (
                      <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: autoAssignLeader ? "pointer" : "default", fontSize: 13, color: autoAssignLeader ? "#2d3b45" : "#9ca3af", paddingLeft: 8 }}>
                        <input type="radio" name="gsLeaderType" value={opt.val} checked={leaderType === opt.val} onChange={() => setLeaderType(opt.val)} disabled={!autoAssignLeader} style={accentM} />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="cpt-modal-footer">
                <button className="cpt-btn-secondary" onClick={() => setGroupSetModal(false)}>Cancel</button>
                <button className="cpt-btn-primary" onClick={() => void handleCreateGs()} disabled={savingGroupSet || !groupSetName.trim()}>
                  {savingGroupSet ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {addGroupModal && canManagePeople && (
          <div className="cpt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setAddGroupModal(null); }}>
            <div className="cpt-modal" style={{ width: 440 }}>
              <div className="cpt-modal-header">
                <h2 className="cpt-modal-title">Add Group</h2>
                <button className="cpt-btn-icon" onClick={() => setAddGroupModal(null)}><X size={18} /></button>
              </div>
              <div className="cpt-modal-body">
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#2d3b45", marginBottom: 6 }}>Group Name <span style={{ color: "#c0392b" }}>*</span></label>
                  <input className="cpt-input" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Name" style={{ width: "100%", boxSizing: "border-box", height: 34 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#2d3b45", marginBottom: 6 }}>Group Membership Limit</label>
                  <SpinnerInput value={newGroupLimit} onChange={setNewGroupLimit} />
                </div>
              </div>
              <div className="cpt-modal-footer">
                <button className="cpt-btn-secondary" onClick={() => setAddGroupModal(null)}>Cancel</button>
                <button className="cpt-btn-primary" onClick={() => void handleAddGroup()} disabled={savingGroup || !newGroupName.trim()}>
                  {savingGroup ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {editGroupModal && canManagePeople && (
          <div className="cpt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditGroupModal(null); }}>
            <div className="cpt-modal" style={{ width: 380 }}>
              <div className="cpt-modal-header">
                <h2 className="cpt-modal-title">Edit Group</h2>
                <button className="cpt-btn-icon" onClick={() => setEditGroupModal(null)}><X size={18} /></button>
              </div>
              <div className="cpt-modal-body">
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#2d3b45", marginBottom: 6 }}>Group Name <span style={{ color: "#c0392b" }}>*</span></label>
                  <input className="cpt-input" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", height: 34 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#2d3b45", marginBottom: 6 }}>Group Membership Limit</label>
                  <SpinnerInput value={editGroupLimit} onChange={setEditGroupLimit} placeholder="Number" />
                </div>
              </div>
              <div className="cpt-modal-footer">
                <button className="cpt-btn-secondary" onClick={() => setEditGroupModal(null)}>Cancel</button>
                <button className="cpt-btn-primary" onClick={() => void handleEditGroup()} disabled={savingEditGroup || !editGroupName.trim()}>
                  {savingEditGroup ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {editGsModal && canManagePeople && (
          <div className="cpt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditGsModal(null); }}>
            <div className="cpt-modal" style={{ width: 560, maxHeight: "90vh" }}>
              <div className="cpt-modal-header">
                <h2 className="cpt-modal-title">Edit Group Set</h2>
                <button className="cpt-btn-icon" onClick={() => setEditGsModal(null)}><X size={18} /></button>
              </div>
              <div className="cpt-modal-body">
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                  <label style={{ fontSize: 13, color: "#2d3b45", fontWeight: 600, width: 160, flexShrink: 0 }}>Group Set Name</label>
                  <input className="cpt-input" value={editGsName} onChange={(e) => setEditGsName(e.target.value)} style={{ flex: 1, height: 34 }} />
                </div>
                <div style={{ borderTop: "1px solid #f0e4e4", paddingTop: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#2d3b45" }}>
                    <input type="checkbox" checked={editGsSelfSignUp} onChange={(e) => { setEditGsSelfSignUp(e.target.checked); if (!e.target.checked) { setEditGsRequireSameSection(false); setEditGsLimit(0); } }} style={accentM} />
                    Allow self sign-up
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: editGsSelfSignUp ? "pointer" : "default", fontSize: 13, color: editGsSelfSignUp ? "#2d3b45" : "#9ca3af" }}>
                    <input type="checkbox" checked={editGsRequireSameSection} onChange={(e) => setEditGsRequireSameSection(e.target.checked)} disabled={!editGsSelfSignUp} style={accentM} />
                    Require group members to be in the same section
                  </label>
                </div>
                <div style={{ borderTop: "1px solid #f0e4e4", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#2d3b45", margin: 0 }}>Leadership</p>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#2d3b45" }}>
                    <input type="checkbox" checked={editGsAutoAssignLeader} onChange={(e) => setEditGsAutoAssignLeader(e.target.checked)} style={accentM} />
                    Automatically assign a group leader
                  </label>
                  {[{ val: "first", label: "Set first member to join as group leader" }, { val: "random", label: "Set a random member as group leader" }].map((opt) => (
                    <label key={opt.val} style={{ display: "flex", alignItems: "center", gap: 8, cursor: editGsAutoAssignLeader ? "pointer" : "default", fontSize: 13, color: editGsAutoAssignLeader ? "#2d3b45" : "#9ca3af", paddingLeft: 8 }}>
                      <input type="radio" name="editGsLeaderType" value={opt.val} checked={editGsLeaderType === opt.val} onChange={() => setEditGsLeaderType(opt.val)} disabled={!editGsAutoAssignLeader} style={accentM} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="cpt-modal-footer">
                <button className="cpt-btn-secondary" onClick={() => setEditGsModal(null)}>Cancel</button>
                <button className="cpt-btn-primary" onClick={() => void handleEditGs()} disabled={savingEditGs || !editGsName.trim()}>
                  {savingEditGs && <Loader2 size={13} className="cpt-spin" />}Save
                </button>
              </div>
            </div>
          </div>
        )}

        {cloneModal && canManagePeople && (
          <div className="cpt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCloneModal(null); }}>
            <div className="cpt-modal" style={{ width: 440 }}>
              <div className="cpt-modal-header">
                <h2 className="cpt-modal-title">Clone Group Set</h2>
                <button className="cpt-btn-icon" onClick={() => setCloneModal(null)}><X size={18} /></button>
              </div>
              <div className="cpt-modal-body">
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#2d3b45", marginBottom: 6 }}>Group Set Name <span style={{ color: "#c0392b" }}>*</span></label>
                <input className="cpt-input" value={cloneName} onChange={(e) => setCloneName(e.target.value)} style={{ width: "100%", boxSizing: "border-box", height: 34 }} />
              </div>
              <div className="cpt-modal-footer">
                <button className="cpt-btn-secondary" onClick={() => setCloneModal(null)}>Cancel</button>
                <button className="cpt-btn-primary" onClick={() => void handleCloneGs()} disabled={submittingClone || !cloneName.trim()}>
                  {submittingClone && <Loader2 size={13} className="cpt-spin" />}Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {movePanel && (() => {
          const gs = groupSets.find((g) => g.id === movePanel.groupSetId);
          const others = gs?.groups.filter((g) => g.id !== movePanel.fromGroupId) ?? [];
          return (
            <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
              <div style={{ flex: 1 }} onClick={() => setMovePanel(null)} />
              <div style={{ width: 320, background: "#fff", boxShadow: "-2px 0 24px rgba(123,17,19,.08)", borderLeft: "1px solid #f0e4e4", display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif" }}>
                <div className="cpt-modal-header">
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: "#2d3b45", margin: 0 }}>Move Member</h2>
                  <button className="cpt-btn-icon" onClick={() => setMovePanel(null)}><X size={16} /></button>
                </div>
                <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#2d3b45", marginBottom: 6 }}>Groups</label>
                    <div style={{ position: "relative" }}>
                      <select className="cpt-select" value={moveToGroupId} onChange={(e) => setMoveToGroupId(e.target.value)} style={{ width: "100%" }}>
                        {others.length === 0 ? <option value="">No other groups</option> : others.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <DropArrow />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#2d3b45", marginBottom: 6 }}>Place &quot;{movePanel.userName}&quot;</label>
                    <div style={{ position: "relative" }}>
                      <select className="cpt-select" value={movePlacement} onChange={(e) => setMovePlacement(e.target.value)} style={{ width: "100%" }}>
                        <option>At the Top</option>
                        <option>At the Bottom</option>
                      </select>
                      <DropArrow />
                    </div>
                  </div>
                </div>
                <div className="cpt-modal-footer">
                  <button className="cpt-btn-secondary" onClick={() => setMovePanel(null)}>Cancel</button>
                  <button className="cpt-btn-primary" onClick={() => void handleMoveStudent()} disabled={movingStudent || !moveToGroupId}>
                    {movingStudent && <Loader2 size={13} className="cpt-spin" />}Move
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}