"use client";

// src/components/staff/FilesPage.tsx

import { useState } from "react";
import AccountSidebar from "@/components/layout/AccountSidebar";

const MAROON = "#7b1113";
const FONT   = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

type FileType = "folder" | "pdf" | "doc" | "img" | "other";

interface FileItem {
  id:       number;
  name:     string;
  type:     FileType;
  size?:    string;
  modified: string;
}

interface FolderNode {
  id:        string;
  name:      string;
  children?: FolderNode[];
  files?:    FileItem[];
}

const TREE: FolderNode[] = [
  {
    id: "my-files",
    name: "My Files",
    files: [
      { id:1, name:"Q1 Accomplishment Report.docx", type:"doc", size:"245 KB", modified:"Feb 20, 2026" },
      { id:2, name:"Training Attendance Sheet.pdf",  type:"pdf", size:"1.2 MB", modified:"Feb 10, 2026" },
      { id:3, name:"Semestral Self-Evaluation.pdf",  type:"pdf", size:"890 KB", modified:"Feb 18, 2026" },
    ],
  },
  {
    id: "computing-studies",
    name: "Computing Studies",
    files: [],
  },
  {
    id: "syllabus-lp-group",
    name: "Syllabus & Lesson Plan Consolidation",
    files: [],
  },
];

function FolderIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: "#f59e0b" }}>
      <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
    </svg>
  );
}

function FileIcon({ type }: { type: FileType }) {
  const color = type === "pdf" ? "#ef4444" : type === "doc" ? "#3b82f6" : "#9ca3af";
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  );
}

function FileTable({ files }: { files: FileItem[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedFile = files.find(f => f.id === selected);

  if (files.length === 0) {
    return (
      <div className="rounded-xl py-10 text-center border-2 border-dashed" style={{ borderColor: "#f0e4e4" }}>
        <p className="text-xs text-gray-400 mb-2">This folder is empty.</p>
        <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:underline" style={{ color: MAROON }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          Upload a file
          <input type="file" className="hidden" />
        </label>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#f0e4e4" }}>
        <div className="grid grid-cols-12 px-4 py-2.5 border-b text-[10px] font-black uppercase tracking-widest"
          style={{ background: "#fdf8f8", borderColor: "#f0e4e4", color: MAROON }}>
          <div className="col-span-6">Name</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-4">Modified</div>
        </div>
        {files.map(f => (
          <div key={f.id}
            onClick={() => setSelected(selected === f.id ? null : f.id)}
            className="grid grid-cols-12 items-center px-4 py-2.5 border-b last:border-0 cursor-pointer transition-colors"
            style={{
              borderColor: "#f9f0f0",
              background: selected === f.id ? "#fef2f2" : "white",
            }}
            onMouseEnter={e => { if (selected !== f.id) e.currentTarget.style.background = "#fdf8f8"; }}
            onMouseLeave={e => { if (selected !== f.id) e.currentTarget.style.background = "white"; }}
          >
            <div className="col-span-6 flex items-center gap-2.5 min-w-0">
              <FileIcon type={f.type} />
              <span className="text-xs text-gray-700 truncate font-medium">{f.name}</span>
            </div>
            <div className="col-span-2 text-xs text-gray-400">{f.size ?? "—"}</div>
            <div className="col-span-4 text-xs text-gray-400">{f.modified}</div>
          </div>
        ))}
      </div>

      {selectedFile && (
        <div className="flex items-center gap-3 mt-2.5 px-4 py-2.5 bg-white border rounded-xl shadow-sm" style={{ borderColor: "#f0e4e4" }}>
          <FileIcon type={selectedFile.type} />
          <span className="text-xs font-medium text-gray-700 flex-1 truncate">{selectedFile.name}</span>
          <span className="text-gray-200">|</span>
          <button className="text-xs font-semibold hover:underline" style={{ color: MAROON }}>Download</button>
          <button className="text-xs font-semibold text-red-400 hover:text-red-600 hover:underline">Delete</button>
        </div>
      )}
    </div>
  );
}

export default function FilesPage() {
  const [path, setPath] = useState<string[]>([]);

  const resolvePath = () => {
    let current: FolderNode | null = null;
    const breadcrumbs: { id: string; name: string }[] = [];
    for (const id of path) {
      const list: FolderNode[] = current ? (current.children ?? []) : TREE;
      const found = list.find(n => n.id === id) ?? null;
      if (!found) break;
      current = found;
      breadcrumbs.push({ id: found.id, name: found.name });
    }
    return { node: current, breadcrumbs };
  };

  const { node, breadcrumbs } = resolvePath();
  const currentList  = node ? (node.children ?? []) : TREE;
  const currentFiles = node ? (node.files ?? [])    : [];
  const isRoot       = path.length === 0;

  const navigateTo           = (id: string) => setPath(prev => [...prev, id]);
  const navigateToBreadcrumb = (idx: number) => {
    if (idx < 0) setPath([]);
    else setPath(prev => prev.slice(0, idx + 1));
  };

  return (
    <div className="flex h-full" style={{ fontFamily: FONT }}>
      <AccountSidebar />

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Breadcrumb */}
        <p className="text-[11px] text-gray-400 mb-4 font-medium">
          Account <span className="mx-1">›</span> Files
        </p>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-base font-black text-gray-900">All My Files</h1>
          {!isRoot && (
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-white text-xs font-black rounded-lg cursor-pointer transition-all"
              style={{ background: MAROON }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              Upload File
              <input type="file" className="hidden" />
            </label>
          )}
        </div>

        {/* Path breadcrumbs */}
        <div className="flex items-center gap-1.5 mb-4 text-xs">
          <button onClick={() => navigateToBreadcrumb(-1)}
            className="font-semibold transition-colors"
            style={{ color: isRoot ? MAROON : "#6b7280" }}
            onMouseEnter={e => { if (!isRoot) e.currentTarget.style.color = MAROON; }}
            onMouseLeave={e => { if (!isRoot) e.currentTarget.style.color = "#6b7280"; }}>
            All My Files
          </button>
          {breadcrumbs.map((b, i) => (
            <span key={b.id} className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className="font-semibold transition-colors"
                style={{ color: i === breadcrumbs.length - 1 ? MAROON : "#6b7280" }}
                onMouseEnter={e => { e.currentTarget.style.color = MAROON; }}
                onMouseLeave={e => { if (i !== breadcrumbs.length - 1) e.currentTarget.style.color = "#6b7280"; }}
              >
                {b.name}
              </button>
            </span>
          ))}
        </div>

        {/* Folder list */}
        {currentList.length > 0 && (
          <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "#f0e4e4" }}>
            <div className="px-4 py-2.5 border-b text-[10px] font-black uppercase tracking-widest"
              style={{ background: "#fdf8f8", borderColor: "#f0e4e4", color: MAROON }}>
              Folders
            </div>
            {currentList.map(folder => (
              <button key={folder.id} onClick={() => navigateTo(folder.id)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-0 transition-colors text-left group bg-white"
                style={{ borderColor: "#f9f0f0" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#fdf8f8")}
                onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                <FolderIcon />
                <span className="text-xs text-gray-700 flex-1 font-medium group-hover:underline" style={{ color: MAROON }}>{folder.name}</span>
                <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* File table */}
        {!isRoot && <FileTable files={currentFiles} />}
      </div>
    </div>
  );
}