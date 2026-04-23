"use client";

// src/components/layout/groups-panel.tsx

import { useState, createContext, useContext, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface GroupItem {
  id:         string;
  name:       string;
  courseName: string;
  courseId:   string;
  term:       string | null;
}

interface GroupsContextType {
  isOpen:     boolean;
  isActive:   boolean;
  open:       () => void;
  close:      () => void;
  closePanel: () => void;
}

const GroupsContext = createContext<GroupsContextType>({
  isOpen: false, isActive: false,
  open: () => {}, close: () => {}, closePanel: () => {},
});

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [isActive, setIsActive] = useState(false);

  const open       = () => { setIsOpen(true);  setIsActive(true);  };
  const close      = () => { setIsOpen(false); setIsActive(false); };
  const closePanel = () => { setIsOpen(false); };

  return (
    <GroupsContext.Provider value={{ isOpen, isActive, open, close, closePanel }}>
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() { return useContext(GroupsContext); }

export default function GroupsPanel() {
  const { isOpen, isActive, close } = useGroups();
  const router = useRouter();

  const [groups,  setGroups]  = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition]   = useTransition();

  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    startTransition(() => setLoading(true));
    fetch("/api/groups")
      .then(r => r.json())
      .then(d => {
        if (!cancelled) startTransition(() => {
          setGroups(d.groups ?? []);
          setLoading(false);
        });
      })
      .catch(() => {
        if (!cancelled) startTransition(() => {
          setGroups([]);
          setLoading(false);
        });
      });
    return () => { cancelled = true; };
  }, [isActive]);

  if (!isActive) return null;

  const handleGroupClick = (g: GroupItem) => {
    close();
    router.push(`/courses/${g.courseId}/groups/${g.id}`);
  };

  // Group entries by courseName — mirrors AdminGroupsPanel
  const grouped = groups.reduce<Record<string, GroupItem[]>>((acc, g) => {
    if (!acc[g.courseName]) acc[g.courseName] = [];
    acc[g.courseName].push(g);
    return acc;
  }, {});

  const courseNames = Object.keys(grouped);

  return (
    <>
      {isOpen && (
        <div
          className="fixed top-0 left-16 h-full w-72 bg-white border-r border-gray-200 shadow-xl z-[110] flex flex-col"
          style={{ fontFamily: "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 shrink-0 border-b border-[#f0e4e4]">
            <h1 style={{ fontSize: 15, fontWeight: 800, color: "#111827", margin: 0 }}>
              Groups
            </h1>
            <button
              onClick={close}
              className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 transition-colors"
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "#7b1113";
                e.currentTarget.style.color = "#7b1113";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.color = "#9ca3af";
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* "My Groups" quick link — mirrors AdminGroupsPanel's "All Groups" */}
          <div className="px-4 py-3 shrink-0 border-b border-gray-100">
            <button
              onClick={() => { close(); router.push("/groups"); }}
              style={{
                fontSize: 12, fontWeight: 600, color: "#7b1113",
                background: "none", border: "none", cursor: "pointer",
                padding: 0, fontFamily: "inherit",
              }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              My Groups
            </button>
          </div>

          {/* Grouped list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p style={{ fontSize: 12, color: "#9ca3af", padding: "12px 16px" }}>
                Loading...
              </p>
            ) : courseNames.length === 0 ? (
              <p style={{ fontSize: 12, color: "#9ca3af", padding: "12px 16px" }}>
                No groups assigned yet.
              </p>
            ) : (
              courseNames.map(courseName => (
                <div key={courseName} style={{ padding: "12px 16px 6px" }}>
                  {/* Course label */}
                  <p style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.08em", color: "#9ca3af", marginBottom: 6,
                  }}>
                    {courseName}
                  </p>

                  {/* Groups under this course */}
                  {grouped[courseName].map((g, i) => (
                    <button
                      key={g.id}
                      onClick={() => handleGroupClick(g)}
                      style={{
                        background: "none", border: "none",
                        borderBottom: i < grouped[courseName].length - 1
                          ? "1px solid #f9fafb"
                          : "none",
                        cursor: "pointer", display: "flex", alignItems: "center",
                        gap: 8, padding: "6px 0", width: "100%", textAlign: "left",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
                      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                    >
                      {/* Dot indicator */}
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: "#7b1113", flexShrink: 0, display: "inline-block",
                      }} />

                      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#7b1113", lineHeight: 1.3 }}>
                          {g.name}
                        </span>
                        {g.term && (
                          <span style={{ fontSize: 10, color: "#d1d5db", fontWeight: 500 }}>
                            {g.term}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}

                  {/* Section divider */}
                  <div style={{ borderTop: "1px solid #f0e4e4", marginTop: 8 }} />
                </div>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 pt-3 pb-4 border-t border-gray-100 shrink-0">
            <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.6 }}>
              Click a group name to view and participate.
            </p>
          </div>
        </div>
      )}
    </>
  );
}