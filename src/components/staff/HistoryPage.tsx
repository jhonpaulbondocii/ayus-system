"use client";

import { useState } from "react";
import Link from "next/link";

const historyItems = [
  { id: 1, icon: "📝", title: "Syllabus & Lesson Plan Consolidation", subtitle: "Computing Studies", time: "5 minutes ago", href: "/groups/syllabus-consolidation" },
  { id: 2, icon: "📧", title: "Inbox - Syllabus Messages",             subtitle: "Dr. Vicky P. Vital", time: "2 hours ago",  href: "/inbox" },
  { id: 3, icon: "📅", title: "Calendar",                              subtitle: "Due Feb 28, 2026",   time: "1 day ago",   href: "/calendar" },
];

export default function HistoryPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Slide-out panel */}
      {open && (
        <div className="w-60 border-r border-gray-100 bg-white flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Recent History</h2>
            <button onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-100 text-xs">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {historyItems.map((item) => (
              <div key={item.id} className="flex items-start gap-2">
                <span className="text-gray-400 text-sm shrink-0 mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <Link href={item.href}
                    className="text-xs text-blue-600 hover:underline font-medium leading-snug block truncate">
                    {item.title}
                  </Link>
                  <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                  <p className="text-xs text-gray-300">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
        {!open && (
          <button onClick={() => setOpen(true)}
            className="mb-3 px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-500 hover:bg-gray-50">
            Show History
          </button>
        )}
        <p className="text-xs">Select an item from your recent history.</p>
      </div>
    </div>
  );
}