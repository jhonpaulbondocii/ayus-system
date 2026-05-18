"use client";

// src/components/layout/AccountMenu.tsx

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ─── Nav layout detection ─────────────────────────────────────────────────────
// Mirrors groups-panel.tsx: < 768px → bottom nav → bottom sheet
//                           ≥ 768px → side nav   → side panel
const BOTTOM_NAV_BREAKPOINT = 768;

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

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = 40 }: {
  name: string; image?: string | null; size?: number;
}) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={`${name} avatar`} width={size} height={size}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }}/>;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "#f0e4e4", color: MAROON,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 800,
    }}>
      {name?.[0]?.toUpperCase() ?? "U"}
    </div>
  );
}

// ─── AccountMenu ──────────────────────────────────────────────────────────────
export default function AccountMenu() {
  const { data: session } = useSession();
  const [open, setOpen]   = useState(false);
  const panelRef          = useRef<HTMLDivElement>(null);
  const navLayout         = useNavLayout();

  const name  = session?.user?.name  ?? "User";
  const email = session?.user?.email ?? "";
  const image = (session?.user as { image?: string | null } | undefined)?.image ?? null;

  const isBottomNav = navLayout === "bottom-nav";

  // Close on outside click (desktop side-panel only; bottom sheet uses backdrop tap)
  useEffect(() => {
    if (isBottomNav) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, isBottomNav]);

  const menuLinks = [
    { label: "Profile", href: "/profile" },
  ];

  // ── Panel geometry ──────────────────────────────────────────────────────────
  //
  //  bottom-nav  →  bottom sheet  (full width, auto height, slides up)
  //  side-nav    →  side panel    (236px, pinned left of sidebar)
  //
  const panelStyle: React.CSSProperties = isBottomNav
    ? {
        bottom:       0,
        left:         0,
        right:        0,
        borderRadius: "16px 16px 0 0",
        borderTop:    "1px solid #e8d5d5",
        boxShadow:    "0 -4px 20px rgba(123,17,19,0.08)",
        maxHeight:    "85vh",
        overflowY:    "auto",
      }
    : {
        top:         0,
        left:        64,
        height:      "100%",
        width:       236,
        borderRight: "1px solid #f0e4e4",
        boxShadow:   "2px 0 24px rgba(123,17,19,0.08)",
      };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Account"
        aria-label="Open account menu"
        style={{
          width: 40, height: 40, borderRadius: "50%", overflow: "hidden",
          border: "2px solid rgba(255,255,255,.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,.1)", cursor: "pointer",
          transition: "border-color .15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,.7)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,.3)")}
      >
        {image
          ? <Image src={image} alt={name} width={40} height={40} className="rounded-full object-cover"/>
          : <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: FONT }}>
              {name?.[0]?.toUpperCase() ?? "U"}
            </span>
        }
      </button>

      {open && (
        <>
          {/* Backdrop — dims content behind the panel on both layouts */}
          <div
            style={{
              position:   "fixed",
              inset:      0,
              zIndex:     190,
              background: isBottomNav ? "rgba(0,0,0,0.25)" : "transparent",
            }}
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            style={{
              position:      "fixed",
              fontFamily:    FONT,
              background:    "#fff",
              zIndex:        195,
              display:       "flex",
              flexDirection: "column",
              ...panelStyle,
            }}
          >
            {/* ── Drag handle — bottom sheet only ── */}
            {isBottomNav && (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 9999, background: "#e5e7eb" }} />
              </div>
            )}

            {/* ── Maroon header ── */}
            <div style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              padding:        isBottomNav ? "10px 16px" : "12px 16px",
              background:     MAROON,
              borderBottom:   "1px solid rgba(255,255,255,.1)",
              flexShrink:     0,
            }}>
              <p style={{
                fontSize: 10, fontWeight: 800, textTransform: "uppercase",
                letterSpacing: "0.12em", color: "rgba(255,255,255,.65)", margin: 0,
              }}>
                Account
              </p>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 24, height: 24, borderRadius: 6, border: "none",
                  background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, transition: "background .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.25)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,.1)")}
              >
                ✕
              </button>
            </div>

            {/* ── User info ── */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              <div style={{ marginBottom: 12 }}>
                <Avatar name={name} image={image} size={isBottomNav ? 56 : 52}/>
              </div>
              <p style={{ fontSize: isBottomNav ? 15 : 13, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.3 }}>
                {name}
              </p>
              {email && (
                <p style={{
                  fontSize: isBottomNav ? 12 : 11,
                  color: "#9ca3af", margin: "3px 0 0",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {email}
                </p>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  marginTop: 12, padding: isBottomNav ? "8px 16px" : "6px 14px",
                  fontSize: isBottomNav ? 12 : 11, fontWeight: 700,
                  border: "1px solid #e5e7eb", borderRadius: 8,
                  background: "#fff", color: "#4b5563",
                  cursor: "pointer", fontFamily: FONT, transition: "all .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#4b5563"; }}
              >
                Log out
              </button>
            </div>

            {/* ── Menu links ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {menuLinks.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    fontSize: isBottomNav ? 14 : 12,
                    fontWeight: 600,
                    color: "#374151",
                    padding: isBottomNav ? "12px 10px" : "8px 10px",
                    borderRadius: 8,
                    textDecoration: "none",
                    transition: "all .12s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "#fef2f2";
                    (e.currentTarget as HTMLElement).style.color = MAROON;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "#374151";
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Safe-area spacer on bottom sheet */}
            {isBottomNav && (
              <div style={{ height: 20, flexShrink: 0 }} />
            )}
          </div>
        </>
      )}
    </>
  );
}