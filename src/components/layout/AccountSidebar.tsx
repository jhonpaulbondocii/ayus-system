"use client";

// src/components/layout/AccountSidebar.tsx

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAROON = "#7b1113";

const accountLinks = [
  { label: "Notifications",  href: "/notifications" },
  { label: "Profile",        href: "/profile"        },
  { label: "Files",          href: "/files"           },
  { label: "Settings",       href: "/settings"        },
  { label: "Shared Content", href: "/shared"          },
];

export default function AccountSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-44 border-r pt-4 px-3 shrink-0" style={{ borderColor: "#f0e4e4" }}>
      {accountLinks.map(l => {
        const isActive = pathname === l.href;
        return (
          <Link
            key={l.label}
            href={l.href}
            className="block text-xs py-1.5 px-2 rounded-lg mb-0.5 font-semibold transition-colors"
            style={isActive
              ? { color: MAROON, background: "#fef2f2", borderLeft: `3px solid ${MAROON}`, borderRadius: 0, paddingLeft: 9 }
              : { color: "#374151" }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "#374151"; }}
          >
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}