"use client";

// src/components/layout/GroupHomePage.tsx

import { useState, useEffect } from "react";
import { Plus, Calendar, Search, Upload, Folder, Trash2, Download, FileText, ChevronRight } from "lucide-react";

type Section = "home" | "announcements" | "pages" | "people" | "assignments" | "discussions" | "files";

interface GroupMember {
  id:       string;
  name:     string | null;
  email:    string;
  image:    string | null;
  isLeader: boolean;
  position: string | null;
  department: string | null;
}

interface GroupDetail {
  id:           string;
  name:         string;
  courseId:     string;
  courseName:   string;
  groupSetName: string | null;
  isMember:     boolean;
  members:      GroupMember[];
}

interface GroupHomePageProps {
  groupName:  string;
  parentName: string;
  onBack:     () => void;
  courseId:   string;
  groupId:    string;
}

const sidebarLinks: { label: string; key: Section }[] = [
  { label: "Home",          key: "home"          },
  { label: "Announcements", key: "announcements" },
  { label: "Pages",         key: "pages"         },
  { label: "People",        key: "people"        },
  { label: "Assignments",   key: "assignments"   },
  { label: "Discussions",   key: "discussions"   },
  { label: "Files",         key: "files"         },
];

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = 32 }: { name: string | null; image: string | null; size?: number }) {
  const initials = (name ?? "?")
    .trim().split(/[\s,]+/).filter(Boolean)
    .map(n => n[0]).slice(0, 2).join("").toUpperCase();
  if (image) return (
    <img src={image} alt={name ?? ""}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}/>
  );
  return (
    <div className="rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-500 font-semibold select-none"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────────
function HomeSection({ groupName }: { groupName: string }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-1">Recent Activity in {groupName}</h1>
      <hr className="border-gray-200 mb-5"/>
      <div className="flex items-start gap-3 p-4 border border-blue-200 bg-blue-50/40 rounded-lg max-w-2xl">
        <div className="w-6 h-6 rounded-full bg-[#1b7cbc] flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">i</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          <span className="font-semibold text-gray-800">No Recent Messages</span>
          {" "}You don&apos;t have any messages to show in your stream yet. Once you begin participating in your courses you&apos;ll see this stream fill up with messages from discussions, grading updates, private messages between you and other users, etc.
        </p>
      </div>
    </div>
  );
}

function AnnouncementsSection() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 max-w-xs border border-gray-300 rounded flex items-center px-2 py-1.5 bg-white">
          <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0"/>
          <input placeholder="Search..." className="text-sm text-gray-700 flex-1 outline-none bg-transparent placeholder:text-gray-400"/>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b7cbc] hover:bg-[#1669a1] text-white text-sm rounded font-medium transition-colors">
          <Plus className="w-3.5 h-3.5"/> Add Announcement
        </button>
      </div>
      {[
        { title: "Pinned Announcements", empty: "You currently have no pinned announcements" },
        { title: "Announcements",        empty: "There are no announcements to show",         ordered: true },
        { title: "Closed for Comments",  empty: "You currently have no announcements with closed comments" },
      ].map(s => (
        <div key={s.title} className="mx-0 mb-4 border border-gray-200 rounded overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <span className="text-gray-400 text-xs">▼</span> {s.title}
            </div>
            {s.ordered && <span className="text-xs italic text-gray-400">Ordered by Recent Activity</span>}
          </div>
          <div className="py-10 flex items-center justify-center">
            <p className="text-sm text-gray-500">{s.empty}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PagesSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-gray-800">Pages</h2>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b7cbc] hover:bg-[#1669a1] text-white text-sm rounded font-medium transition-colors">
          <Plus className="w-3.5 h-3.5"/> Page
        </button>
      </div>
      <p className="text-sm text-gray-500">No pages created yet.</p>
    </div>
  );
}

function PeopleSection({ members }: { members: GroupMember[] }) {
  const [search, setSearch] = useState("");
  const leader  = members.find(m => m.isLeader);
  const others  = members.filter(m => !m.isLeader);
  const filtered = [...(leader ? [leader] : []), ...others].filter(m =>
    (m.name ?? m.email).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
          <input placeholder="Search people" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 border border-gray-300 rounded text-sm w-52 focus:outline-none"/>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="pb-2 px-2 w-12"/>
            <th className="text-left pb-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">Name</th>
            <th className="text-left pb-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">Department</th>
            <th className="text-left pb-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">Position</th>
            <th className="text-left pb-2 font-semibold text-gray-600 uppercase text-xs tracking-wide">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <tr><td colSpan={5} className="py-10 text-center text-gray-400">No members found.</td></tr>
          ) : filtered.map((m, i) => (
            <tr key={m.id} className={`hover:bg-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
              <td className="py-2.5 px-2">
                <Avatar name={m.name} image={m.image} size={36}/>
              </td>
              <td className="py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[#0770a2]">{m.name ?? m.email}</span>
                  {m.isLeader && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Leader
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2.5 text-gray-500 text-xs">{m.department ?? "—"}</td>
              <td className="py-2.5 text-gray-500 text-xs">{m.position ?? "—"}</td>
              <td className="py-2.5 text-gray-600">{m.isLeader ? "Leader" : "Member"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentsSection() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Assignments</h2>
      </div>
      <p className="text-sm text-gray-400 text-center py-10">No assignments yet.</p>
    </div>
  );
}

function DiscussionsSection() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 border border-gray-300 rounded flex items-center px-2 py-1.5 bg-white">
          <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0"/>
          <input placeholder="Search by title or author..." className="text-sm text-gray-700 flex-1 outline-none bg-transparent placeholder:text-gray-400"/>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b7cbc] hover:bg-[#1669a1] text-white text-sm rounded font-medium transition-colors">
          <Plus className="w-3.5 h-3.5"/> Add Discussion
        </button>
      </div>
      {["Discussions", "Closed for Comments"].map(s => (
        <div key={s} className="mb-4 border border-gray-200 rounded overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <span className="text-gray-400 text-xs">▼</span> {s}
            </div>
            <span className="text-xs italic text-gray-400">Ordered by Recent Activity</span>
          </div>
          <div className="py-10 flex items-center justify-center">
            <p className="text-sm text-gray-500">No discussions to show.</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilesSection({ groupName }: { groupName: string }) {
  const [dragOver, setDragOver] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Files</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm text-gray-600 rounded hover:bg-gray-50">
            <Folder className="w-3.5 h-3.5"/> Folder
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b7cbc] hover:bg-[#1669a1] text-white text-sm font-medium rounded transition-colors">
            <Upload className="w-3.5 h-3.5"/> Upload
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700">{groupName}</p>
        <div className="flex items-center gap-2">
          <button className="p-1 text-gray-400 hover:text-gray-600"><Download className="w-3.5 h-3.5"/></button>
          <button className="p-1 text-gray-400 hover:text-gray-600"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-2 border-b border-gray-200 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <div className="col-span-2">Name</div>
        <div>Created</div>
        <div>Last Modified</div>
        <div>Modified By</div>
        <div>Size</div>
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={() => setDragOver(false)}
        className={`border-2 border-dashed rounded my-2 p-16 flex flex-col items-center justify-center text-center transition-colors
          ${dragOver ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"}`}>
        <p className="text-sm text-gray-500 mb-1">Drop files here to upload</p>
        <label className="cursor-pointer">
          <span className="text-sm text-[#0770a2] hover:underline">or choose files</span>
          <input type="file" className="hidden" multiple/>
        </label>
      </div>
      <p className="text-xs text-gray-400 border-t border-gray-200 pt-2 mt-1">0 KB of 50 MB used</p>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function GroupHomePage({ groupName, parentName, onBack, courseId, groupId }: GroupHomePageProps) {
  const [section, setSection] = useState<Section>("home");
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    fetch(`/api/courses/${courseId}/groups/${groupId}`)
      .then(r => r.json())
      .then(d => { if (d?.group?.members) setMembers(d.group.members); })
      .catch(() => {});
  }, [courseId, groupId]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden"
      style={{ fontFamily: "'LatoWeb','Lato','Helvetica Neue',Arial,sans-serif", fontSize: 13 }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white shrink-0" style={{ minHeight: 40 }}>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={onBack} className="text-[#0770a2] hover:underline text-sm font-medium">
          {parentName}
        </button>
        <span className="text-gray-400">›</span>
        <span className="text-sm text-gray-700 font-medium">{groupName}</span>
        {section !== "home" && (
          <>
            <span className="text-gray-400">›</span>
            <span className="text-sm text-gray-700 capitalize">{section}</span>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <nav className="w-48 border-r border-gray-200 bg-white shrink-0 overflow-y-auto pt-2 pb-6">
          {sidebarLinks.map(link => (
            <button key={link.key} onClick={() => setSection(link.key)}
              className={`w-full text-left py-2 text-sm transition-colors leading-snug
                ${section === link.key
                  ? "font-bold text-gray-900 border-l-[3px] border-[#0a7040] pl-[17px] bg-gray-50"
                  : "text-[#0770a2] hover:bg-gray-50 pl-5"}`}>
              {link.label}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="px-8 py-6">
            {section === "home"          && <HomeSection groupName={groupName}/>}
            {section === "announcements" && <AnnouncementsSection/>}
            {section === "pages"         && <PagesSection/>}
            {section === "people"        && <PeopleSection members={members}/>}
            {section === "assignments"   && <AssignmentsSection/>}
            {section === "discussions"   && <DiscussionsSection/>}
            {section === "files"         && <FilesSection groupName={groupName}/>}
          </div>
        </div>

        {/* Right panel — home only */}
        {section === "home" && (
          <div className="w-56 border-l border-gray-200 px-4 py-5 shrink-0 overflow-y-auto">
            <button className="w-full flex items-center justify-center gap-1.5 border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors mb-5">
              <Plus className="w-3.5 h-3.5"/> Announcement
            </button>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-800">Coming Up</p>
                <button className="flex items-center gap-1 text-xs text-[#0770a2] hover:underline">
                  <Calendar className="w-3 h-3"/> View Calendar
                </button>
              </div>
              <p className="text-xs text-gray-400">Nothing for the next week</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}