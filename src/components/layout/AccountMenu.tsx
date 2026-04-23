"use client";

// src/components/layout/AccountMenu.tsx

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

const MAROON = "#7b1113";

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

export default function AccountMenu() {
  const { data: session } = useSession();
  const [open,         setOpen]         = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const name  = session?.user?.name  ?? "User";
  const email = session?.user?.email ?? "";
  const image = (session?.user as { image?: string | null } | undefined)?.image ?? null;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // ✅ 5 links lang
  const menuLinks = [
    { label: "Notifications",  href: "/notifications" },
    { label: "Profile",        href: "/profile"        },
    { label: "Files",          href: "/files"           },
    { label: "Settings",       href: "/settings"        },
    { label: "Shared Content", href: "/shared"          },
  ];

  const font = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

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
          : <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: font }}>
              {name?.[0]?.toUpperCase() ?? "U"}
            </span>
        }
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-190" onClick={() => setOpen(false)}/>

          <div
            ref={panelRef}
            style={{
              position: "fixed", top: 0, left: 64, height: "100%", width: 236,
              background: "#fff", zIndex: 195,
              boxShadow: "2px 0 24px rgba(123,17,19,.08)",
              borderRight: "1px solid #f0e4e4",
              display: "flex", flexDirection: "column",
              fontFamily: font,
            }}
          >
            {/* Maroon header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", background: MAROON,
              borderBottom: "1px solid rgba(255,255,255,.1)",
            }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(255,255,255,.65)", margin: 0 }}>
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

            {/* User info */}
            <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ marginBottom: 12 }}>
                <Avatar name={name} image={image} size={52}/>
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.3 }}>{name}</p>
              {email && <p style={{ fontSize: 11, color: "#9ca3af", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</p>}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                style={{
                  marginTop: 12, padding: "6px 14px", fontSize: 11, fontWeight: 700,
                  border: "1px solid #e5e7eb", borderRadius: 8,
                  background: "#fff", color: "#4b5563",
                  cursor: "pointer", fontFamily: font, transition: "all .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#4b5563"; }}
              >
                Log out
              </button>
            </div>

            {/* Menu links */}
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {menuLinks.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)}
                  style={{
                    display: "block", fontSize: 12, fontWeight: 600,
                    color: "#374151", padding: "8px 10px",
                    borderRadius: 8, textDecoration: "none",
                    transition: "all .12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#fef2f2"; (e.currentTarget as HTMLElement).style.color = MAROON; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#374151"; }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #f0e4e4", margin: "0 16px" }}/>

            {/* Accessibility */}
            <div style={{ padding: "16px 20px 20px" }}>
              <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: MAROON, margin: "0 0 12px" }}>
                Accessibility
              </p>

              {[
                {
                  val: highContrast, set: () => setHighContrast(v => !v),
                  label: "Use High Contrast UI", hint: "Increases contrast for better visibility",
                  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20" strokeLinecap="round"/></svg>,
                },
                {
                  val: dyslexiaFont, set: () => setDyslexiaFont(v => !v),
                  label: "Dyslexia Friendly Font", hint: "Uses OpenDyslexic font",
                  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 6h16M4 12h10M4 18h12" strokeLinecap="round"/></svg>,
                },
              ].map(row => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <button
                    onClick={row.set}
                    style={{
                      width: 30, height: 30, borderRadius: "50%", border: "2px solid",
                      borderColor: row.val ? MAROON : "#e5e7eb",
                      background: row.val ? MAROON : "#fff",
                      color: row.val ? "#fff" : "#9ca3af",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "all .15s",
                    }}>
                    {row.icon}
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#4b5563", flex: 1 }}>{row.label}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af", cursor: "help" }} title={row.hint}>ⓘ</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}