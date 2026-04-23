"use client";

// src/components/staff/SharedContent.tsx

import { useState } from "react";
import AccountSidebar from "@/components/layout/AccountSidebar";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

const mockShared = [
  { id:1, name:"CS101 Module 1 Notes.pdf",    sharedBy:"Prof. Santos",  course:"CS101",  date:"Mar 22, 2026", type:"pdf" },
  { id:2, name:"Group Project Template.docx", sharedBy:"Dela Cruz, M.", course:"IT301",  date:"Mar 20, 2026", type:"doc" },
  { id:3, name:"Lab Activity Guide.pdf",      sharedBy:"Prof. Reyes",   course:"CCS401", date:"Mar 18, 2026", type:"pdf" },
  { id:4, name:"Sample Code - Sorting.zip",   sharedBy:"Prof. Santos",  course:"CS101",  date:"Mar 15, 2026", type:"zip" },
  { id:5, name:"Midterm Reviewer.pptx",       sharedBy:"Prof. Lim",     course:"IT201",  date:"Mar 10, 2026", type:"ppt" },
];

const typeIcon:  Record<string, string> = { pdf:"📄", doc:"📝", zip:"🗜️", ppt:"📊" };
const typeColor: Record<string, string> = { pdf:"#ef4444", doc:"#3b82f6", zip:"#f59e0b", ppt:"#8b5cf6" };

export default function SharedContent() {
  const [search, setSearch] = useState("");

  const filtered = mockShared.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.sharedBy.toLowerCase().includes(search.toLowerCase()) ||
    f.course.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full" style={{ fontFamily: FONT }}>
      <AccountSidebar />

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Breadcrumb */}
        <p className="text-[11px] text-gray-400 mb-4 font-medium">
          Account <span className="mx-1">›</span> Shared Content
        </p>

        <h1 className="text-base font-black text-gray-900 mb-1">Shared Content</h1>
        <p className="text-xs text-gray-400 mb-4">Files and materials shared with you by instructors and classmates.</p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by name, course, or sender..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-full max-w-sm outline-none bg-white text-gray-900 mb-4 transition-all"
          onFocus={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.boxShadow = `0 0 0 2px ${MAROON}18`; }}
          onBlur={e =>  { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
        />

        {/* Table */}
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#f0e4e4" }}>
          <div className="grid items-center px-4 py-2.5 border-b text-[10px] font-black uppercase tracking-widest"
            style={{ gridTemplateColumns: "1fr 110px 75px 95px 70px", background: "#fdf8f8", borderColor: "#f0e4e4", color: MAROON }}>
            <span>Name</span>
            <span>Shared By</span>
            <span>Course</span>
            <span>Date</span>
            <span></span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8 bg-white">No shared content found.</p>
          ) : filtered.map((item) => (
            <div key={item.id}
              className="grid items-center px-4 py-2.5 bg-white transition-colors cursor-pointer border-b last:border-0"
              style={{ gridTemplateColumns: "1fr 110px 75px 95px 70px", borderColor: "#f9f0f0" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fdf8f8")}
              onMouseLeave={e => (e.currentTarget.style.background = "white")}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ color: typeColor[item.type] }}>{typeIcon[item.type]}</span>
                <span className="text-xs text-gray-800 font-medium truncate">{item.name}</span>
              </div>
              <span className="text-xs text-gray-500 truncate">{item.sharedBy}</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full w-fit" style={{ background: "#fef2f2", color: MAROON }}>
                {item.course}
              </span>
              <span className="text-xs text-gray-400">{item.date}</span>
              <button className="text-xs font-bold hover:underline" style={{ color: MAROON }}>Download</button>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-gray-400 mt-3">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}