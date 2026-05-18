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

// ─── Layout detection ─────────────────────────────────────────────────────────
// The core rule: if the iconbar is rendered at the BOTTOM of the screen
// (i.e. viewport width < your layout's breakpoint), the panel opens as a
// bottom sheet. If the iconbar is on the side, the panel opens as a side panel.
//
// Change BOTTOM_NAV_BREAKPOINT to match exactly where your layout switches.
const BOTTOM_NAV_BREAKPOINT = 768; // px — same breakpoint your iconbar uses

type NavLayout = "bottom-nav" | "side-nav";

function useNavLayout(): NavLayout {
  const [layout, setLayout] = useState<NavLayout>("side-nav");

  useEffect(() => {
    const check = () =>
      setLayout(window.innerWidth < BOTTOM_NAV_BREAKPOINT ? "bottom-nav" : "side-nav");
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return layout;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const FONT        = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";
const MAROON      = "#7b1113";
const BORDER_SOFT = "#f0e4e4";
const BORDER_MID  = "#e8d5d5";

// ─── Sub-component: individual group button ───────────────────────────────────
function GroupEntry({
  g,
  isLast,
  onClick,
  compact,
}: {
  g:        GroupItem;
  isLast:   boolean;
  onClick:  () => void;
  compact:  boolean; // true = side-nav (smaller targets), false = bottom-nav (larger targets)
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          10,
        width:        "100%",
        textAlign:    "left",
        background:   hovered ? "#fdf8f8" : "none",
        border:       "none",
        borderBottom: !isLast ? "1px solid #f3f4f6" : "none",
        cursor:       "pointer",
        padding:      compact ? "7px 4px" : "11px 4px",
        borderRadius: 4,
        fontFamily:   FONT,
        transition:   "background 0.1s",
      }}
    >
      {/* Dot indicator */}
      <span
        style={{
          width:        6,
          height:       6,
          borderRadius: "50%",
          background:   MAROON,
          flexShrink:   0,
          display:      "inline-block",
        }}
      />

      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <span
          style={{
            fontSize:   compact ? 12 : 14,
            fontWeight: 600,
            color:      MAROON,
            lineHeight: 1.3,
          }}
        >
          {g.name}
        </span>
        {g.term && (
          <span
            style={{
              fontSize:   compact ? 10 : 11,
              color:      "#9ca3af",
              fontWeight: 500,
            }}
          >
            {g.term}
          </span>
        )}
      </span>
    </button>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function GroupsPanel() {
  const { isOpen, isActive, close } = useGroups();
  const router    = useRouter();
  const navLayout = useNavLayout();

  const [groups,  setGroups]  = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition]   = useTransition();

  const isBottomNav = navLayout === "bottom-nav";

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

  const handleMyGroupsClick = () => {
    close();
    router.push("/groups");
  };

  // Group entries by courseName
  const grouped = groups.reduce<Record<string, GroupItem[]>>((acc, g) => {
    if (!acc[g.courseName]) acc[g.courseName] = [];
    acc[g.courseName].push(g);
    return acc;
  }, {});

  const courseNames = Object.keys(grouped);

  // ── Panel geometry based on where the iconbar lives ──────────────────────────
  //
  //  bottom-nav  →  bottom sheet  (full width, 75vh, rounded top corners)
  //  side-nav    →  side panel    (288px wide, pinned left of sidebar)
  //
  const panelStyle: React.CSSProperties = isBottomNav
    ? {
        bottom:       0,
        left:         0,
        right:        0,
        height:       "75vh",
        borderRadius: "16px 16px 0 0",
        borderTop:    `1px solid ${BORDER_MID}`,
        boxShadow:    "0 -4px 20px rgba(123,17,19,0.08)",
      }
    : {
        top:         0,
        left:        64, // width of your side iconbar
        height:      "100%",
        width:       288,
        borderRight: `1px solid ${BORDER_MID}`,
        boxShadow:   "2px 0 10px rgba(123,17,19,0.06)",
      };

  return (
    <>
      {/* Dim backdrop — only for bottom sheet so it feels like a modal */}
      {isOpen && isBottomNav && (
        <div
          onClick={close}
          style={{
            position:   "fixed",
            inset:      0,
            background: "rgba(0,0,0,0.25)",
            zIndex:     109,
          }}
        />
      )}

      {isOpen && (
        <div
          style={{
            position:      "fixed",
            fontFamily:    FONT,
            background:    "#fff",
            zIndex:        110,
            display:       "flex",
            flexDirection: "column",
            ...panelStyle,
          }}
        >
          {/* ── Drag handle — bottom sheet only ── */}
          {isBottomNav && (
            <div
              style={{
                display:        "flex",
                justifyContent: "center",
                paddingTop:     12,
                paddingBottom:  4,
                flexShrink:     0,
              }}
            >
              <div
                style={{
                  width:        40,
                  height:       4,
                  borderRadius: 9999,
                  background:   "#e5e7eb",
                }}
              />
            </div>
          )}

          {/* ── Header ── */}
          <div
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        isBottomNav ? "10px 16px" : "14px 16px 12px",
              borderBottom:   `1px solid ${BORDER_SOFT}`,
              flexShrink:     0,
            }}
          >
            <h1
              style={{
                fontSize:   15,
                fontWeight: 800,
                color:      "#111827",
                margin:     0,
              }}
            >
              Groups
            </h1>
            <button
              onClick={close}
              style={{
                width:          26,
                height:         26,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                border:         "1px solid #e5e7eb",
                borderRadius:   6,
                background:     "none",
                cursor:         "pointer",
                color:          "#9ca3af",
                transition:     "all 0.12s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = MAROON;
                e.currentTarget.style.color       = MAROON;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.color       = "#9ca3af";
              }}
            >
              <X size={12} />
            </button>
          </div>

          {/* ── "My Groups" quick link ── */}
          <div
            style={{
              padding:      "10px 16px",
              borderBottom: `1px solid ${BORDER_SOFT}`,
              flexShrink:   0,
            }}
          >
            <button
              onClick={handleMyGroupsClick}
              style={{
                background: "none",
                border:     "none",
                cursor:     "pointer",
                padding:    0,
                fontSize:   isBottomNav ? 14 : 13,
                fontWeight: 700,
                color:      MAROON,
                fontFamily: FONT,
              }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              My Groups
            </button>
          </div>

          <div
            style={{
              height:     1,
              background: BORDER_MID,
              margin:     "0 16px",
              flexShrink: 0,
            }}
          />

          {/* ── Grouped list ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
            {loading ? (
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                Loading...
              </p>
            ) : courseNames.length === 0 ? (
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                No groups assigned yet.
              </p>
            ) : (
              courseNames.map(courseName => (
                <div key={courseName} style={{ marginBottom: 4 }}>
                  {/* Course label */}
                  <p
                    style={{
                      fontSize:      10,
                      fontWeight:    700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color:         "#9ca3af",
                      margin:        "12px 0 6px",
                    }}
                  >
                    {courseName}
                  </p>

                  {/* Groups under this course */}
                  {grouped[courseName].map((g, i) => (
                    <GroupEntry
                      key={g.id}
                      g={g}
                      isLast={i === grouped[courseName].length - 1}
                      onClick={() => handleGroupClick(g)}
                      compact={!isBottomNav}
                    />
                  ))}

                  {/* Section divider */}
                  <div style={{ borderTop: `1px solid ${BORDER_SOFT}`, marginTop: 8 }} />
                </div>
              ))
            )}
          </div>

          {/* ── Footer hint ── */}
          {/* Extra bottom padding on bottom-nav for device safe area / home indicator */}
          <div
            style={{
              padding:    isBottomNav ? "12px 16px 28px" : "12px 16px 16px",
              borderTop:  `1px solid ${BORDER_SOFT}`,
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontSize:   11,
                color:      "#9ca3af",
                lineHeight: 1.6,
                margin:     0,
              }}
            >
              Click a group name to view and participate.
            </p>
          </div>
        </div>
      )}
    </>
  );
}