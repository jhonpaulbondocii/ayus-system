"use client";
import { useState } from "react";

interface Discussion {
  id: number;
  title: string;
  author: string;
  lastActivity: string;
  replies: number;
  pinned: boolean;
  closed: boolean;
}

export default function CourseDiscussionsPage() {
  const [filter,   setFilter]   = useState("All");
  const [search,   setSearch]   = useState("");
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [modal,    setModal]    = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const addDiscussion = () => {
    if (!newTitle.trim()) return;
    setDiscussions(prev => [...prev, {
      id: Date.now(), title: newTitle, author: "Admin",
      lastActivity: "Just now", replies: 0, pinned: false, closed: false,
    }]);
    setNewTitle(""); setModal(false);
  };

  const pinned  = discussions.filter(d => d.pinned);
  const active  = discussions.filter(d => !d.pinned && !d.closed);
  const closed  = discussions.filter(d => d.closed);

  return (
    <div className="px-8 py-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-xs bg-white focus:outline-none pr-7 appearance-none">
            {["All","Unread","Subscribed"].map(f => <option key={f}>{f}</option>)}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title or author..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"/>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors">
            + Add Discussion
          </button>
          <button className="flex items-center gap-1.5 text-xs border border-gray-200 px-3 py-1.5 rounded hover:bg-gray-50 text-gray-600">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Settings
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 border border-gray-200 rounded">⋮</button>
        </div>
      </div>

      {/* Pinned Discussions */}
      <Section title="Pinned Discussions" items={pinned} onAdd={() => setModal(true)}
        emptyIcon="pin"
        emptyMsg="You currently have no pinned discussions"
        emptyHint="To pin a discussion to the top of the page, drag a discussion here, or select Pin from the discussion settings menu."
        setDiscussions={setDiscussions}/>

      {/* Discussions */}
      <Section title="Discussions" items={active} onAdd={() => setModal(true)}
        emptyIcon="chat"
        emptyMsg="There are no discussions to show in this section"
        emptyHint={undefined}
        emptyLink="Click here to add a discussion"
        setDiscussions={setDiscussions}/>

      {/* Closed for Comments */}
      <Section title="Closed for Comments" items={closed} onAdd={() => setModal(true)}
        emptyIcon="lock"
        emptyMsg="You currently have no discussions with closed comments"
        emptyHint="To close comments on a discussion, drag a discussion here, or select Close for Comments from the discussion settings menu."
        setDiscussions={setDiscussions}/>

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-[440px] p-6">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Add Discussion</h2>
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="Discussion title"
              onKeyDown={e => e.key === "Enter" && addDiscussion()}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-blue-400"/>
            <div className="flex gap-2">
              <button onClick={() => { setModal(false); setNewTitle(""); }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={addDiscussion}
                className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, msg, hint, link, onLink }: {
  icon: string; msg: string; hint?: string; link?: string; onLink?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {icon === "pin" && (
        <div className="w-24 h-24 mb-4 opacity-30">
          <svg viewBox="0 0 96 96" fill="none" className="w-full h-full">
            <rect x="20" y="30" width="56" height="36" rx="4" fill="#93c5fd"/>
            <rect x="28" y="38" width="40" height="6" rx="2" fill="white" opacity=".7"/>
            <rect x="28" y="50" width="28" height="6" rx="2" fill="white" opacity=".7"/>
            <rect x="60" y="20" width="16" height="16" rx="3" fill="#60a5fa" transform="rotate(15 60 20)"/>
          </svg>
        </div>
      )}
      {icon === "chat" && (
        <div className="w-24 h-24 mb-4 opacity-30">
          <svg viewBox="0 0 96 96" fill="none" className="w-full h-full">
            <rect x="10" y="20" width="50" height="35" rx="6" fill="#93c5fd"/>
            <rect x="36" y="40" width="50" height="35" rx="6" fill="#bfdbfe"/>
            <circle cx="26" cy="37" r="3" fill="white"/>
            <circle cx="36" cy="37" r="3" fill="white"/>
            <circle cx="46" cy="37" r="3" fill="white"/>
          </svg>
        </div>
      )}
      {icon === "lock" && (
        <div className="w-24 h-24 mb-4 opacity-30">
          <svg viewBox="0 0 96 96" fill="none" className="w-full h-full">
            <rect x="20" y="30" width="40" height="30" rx="4" fill="#93c5fd"/>
            <rect x="60" y="30" width="16" height="30" rx="4" fill="#bfdbfe"/>
            <rect x="65" y="20" width="6" height="16" rx="2" fill="#60a5fa"/>
            <circle cx="63" cy="46" r="3" fill="white"/>
          </svg>
        </div>
      )}
      <p className="text-sm font-medium text-gray-500 mb-1">{msg}</p>
      {hint && <p className="text-xs text-gray-400 max-w-md">{hint}</p>}
      {link && <button onClick={onLink} className="text-xs text-blue-500 hover:underline mt-1">{link}</button>}
    </div>
  );
}

function Section({ title, items, onAdd, emptyIcon, emptyMsg, emptyHint, emptyLink, setDiscussions }: {
  title: string;
  items: { id: number; title: string; author: string; lastActivity: string; replies: number }[];
  onAdd: () => void;
  emptyIcon: string;
  emptyMsg: string;
  emptyHint?: string;
  emptyLink?: string;
  setDiscussions: React.Dispatch<React.SetStateAction<Discussion[]>>;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-6 border border-gray-100 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <svg className={`w-3 h-3 transition-transform ${open?"rotate-0":"-rotate-90"}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
          {title}
        </button>
        {title === "Discussions" && (
          <span className="text-xs text-gray-400">Ordered by Recent Activity</span>
        )}
        {title === "Closed for Comments" && (
          <span className="text-xs text-gray-400">Ordered by Recent Activity</span>
        )}
      </div>
      {open && (
        items.length === 0 ? (
          <EmptyState icon={emptyIcon} msg={emptyMsg} hint={emptyHint} link={emptyLink} onLink={onAdd}/>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(d => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-xs font-medium text-blue-600 hover:underline cursor-pointer">{d.title}</p>
                  <p className="text-xs text-gray-400">{d.author} · {d.lastActivity} · {d.replies} replies</p>
                </div>
                <button onClick={() => setDiscussions(prev => prev.filter(x => x.id !== d.id))}
                  className="text-gray-300 hover:text-red-500 text-sm">✕</button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}