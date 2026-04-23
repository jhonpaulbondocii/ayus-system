"use client";

// src/components/admin/ModulesPage.tsx

import { useState, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ModuleFile {
  id:          string;
  name:        string;
  size:        number;
  type:        string;
  availability: "publish" | "unpublish" | "link_only" | "scheduled";
  visibility:  string;
  previewUrl?: string;
}

interface Module {
  id:        string;
  name:      string;
  published: boolean;
  collapsed: boolean;
  files:     ModuleFile[];
  lockUntil?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
let _id = 0;
function uid() { return String(++_id); }

function formatSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3
      bg-[#1e7e34] text-white text-sm px-4 py-2.5 rounded shadow-lg min-w-[360px] max-w-xl">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 shrink-0">
        <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
          <polyline points="1.5,5 4,8 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none ml-2">✕</button>
    </div>
  );
}

// ── Add Module Panel ───────────────────────────────────────────────────────────
function AddModulePanel({ onClose, onAdd }: {
  onClose: () => void;
  onAdd:   (name: string, lockUntil?: string) => void;
}) {
  const [moduleName, setModuleName] = useState("");
  const [lockUntil,  setLockUntil]  = useState(false);
  const [lockDate,   setLockDate]   = useState("");

  const handleAdd = () => {
    if (!moduleName.trim()) return;
    onAdd(moduleName.trim(), lockUntil ? lockDate : undefined);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col"
        style={{ width: 320, borderLeft: "1px solid #e5e7eb" }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
            </svg>
            <h2 className="text-lg font-normal text-gray-800">Add Module</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="border-t border-gray-200" />
        <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Module Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={moduleName} onChange={e => setModuleName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="w-full border border-[#1b7cbc] rounded px-3 py-1.5 text-sm text-gray-700 outline-none focus:ring-1 focus:ring-[#1b7cbc]"
              autoFocus />
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={lockUntil} onChange={e => setLockUntil(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Lock Until</span>
            </label>
            {lockUntil && (
              <input type="datetime-local" value={lockDate} onChange={e => setLockDate(e.target.value)}
                className="mt-2 w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-[#1b7cbc] focus:ring-1 focus:ring-[#1b7cbc]" />
            )}
          </div>
        </div>
        <div className="border-t border-gray-200" />
        <div className="flex items-center justify-end gap-3 px-5 py-4">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50 bg-white">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!moduleName.trim()}
            className="px-4 py-1.5 text-sm text-white rounded font-medium bg-[#1b7cbc] hover:bg-[#1669a1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Add Module
          </button>
        </div>
      </div>
    </>
  );
}

// ── Edit Permissions Modal (Image 3) ───────────────────────────────────────────
function EditPermissionsModal({ file, onClose, onUpdate }: {
  file:     ModuleFile;
  onClose:  () => void;
  onUpdate: (availability: ModuleFile["availability"], visibility: string) => void;
}) {
  const [availability, setAvailability] = useState<ModuleFile["availability"]>(file.availability);
  const [visibility,   setVisibility]   = useState(file.visibility);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30">
      <div className="bg-white rounded shadow-xl w-[540px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm text-gray-700">Editing permissions for: <strong>{file.name}</strong></span>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center border border-gray-400 rounded text-gray-500 hover:bg-gray-100 text-xs font-bold">
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="flex gap-5 px-5 py-5">
          {/* Preview thumbnail */}
          <div className="w-24 h-24 rounded border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center bg-gray-50">
            {file.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            )}
          </div>

          {/* Options */}
          <div className="flex-1 space-y-4">
            {/* Availability */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Availability:</p>
              <div className="space-y-2">
                {([
                  { value: "publish",   label: "Publish",                icon: "green-check"  },
                  { value: "unpublish", label: "Unpublish",              icon: "gray-slash"   },
                  { value: "link_only", label: "Only available with link", icon: "gray-link"  },
                  { value: "scheduled", label: "Schedule availability",  icon: "gray-cal"     },
                ] as const).map(opt => (
                  <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" name="availability" value={opt.value}
                      checked={availability === opt.value}
                      onChange={() => setAvailability(opt.value)}
                      className="w-4 h-4 accent-[#1b7cbc]" />
                    {/* Icon */}
                    {opt.value === "publish" && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                          <polyline points="1.5,5 4,8 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                    {opt.value === "unpublish" && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border-2 border-gray-400">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                          <line x1="2" y1="2" x2="8" y2="8" stroke="#999" strokeWidth="1.8" strokeLinecap="round"/>
                          <line x1="8" y1="2" x2="2" y2="8" stroke="#999" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </span>
                    )}
                    {opt.value === "link_only" && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border-2 border-gray-400">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="#999" strokeWidth="1.5">
                          <path d="M4 6.5s-.5-1 .5-2l1.5-1.5a1.5 1.5 0 012 2L7 6"/>
                          <path d="M6 3.5s.5 1-.5 2L4 7a1.5 1.5 0 01-2-2L3 4"/>
                        </svg>
                      </span>
                    )}
                    {opt.value === "scheduled" && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border-2 border-gray-400">
                        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none" stroke="#999" strokeWidth="1.3">
                          <rect x="1" y="2" width="8" height="7" rx="1"/>
                          <line x1="3" y1="1" x2="3" y2="3"/><line x1="7" y1="1" x2="7" y2="3"/>
                          <line x1="1" y1="5" x2="9" y2="5"/>
                        </svg>
                      </span>
                    )}
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">Visibility:</p>
              <select value={visibility} onChange={e => setVisibility(e.target.value)}
                className="w-48 border border-gray-300 rounded px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-[#1b7cbc]">
                <option value="inherit">Inherit from Course</option>
                <option value="everyone">Everyone</option>
                <option value="institution">Institution</option>
                <option value="course">Course Members</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 bg-[#f5f5f5] border-t border-gray-200">
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button onClick={() => { onUpdate(availability, visibility); onClose(); }}
            className="px-4 py-1.5 text-sm text-white rounded bg-[#1b7cbc] hover:bg-[#1669a1] font-medium">
            Update
          </button>
        </div>
      </div>
    </div>
  );
}

// ── File Upload Progress Row (Image 1) ─────────────────────────────────────────
function UploadProgressRow({ fileName, onDone }: { fileName: string; onDone: () => void }) {
  const [progress, setProgress] = useState(0);

  // Simulate upload progress
  useState(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); setTimeout(onDone, 300); return 100; }
        return p + Math.random() * 25;
      });
    }, 120);
    return () => clearInterval(interval);
  });

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5A.75.75 0 0121 3.75v13.5a.75.75 0 01-.75.75H3.75A.75.75 0 013 17.25V3.75A.75.75 0 013.75 3z"/>
      </svg>
      <span className="text-sm text-gray-700 w-48 truncate shrink-0">{fileName}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-green-600 rounded-full transition-all duration-150"
          style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>
      <button className="text-gray-400 hover:text-gray-600 text-sm ml-2 shrink-0">✕</button>
    </div>
  );
}

// ── File Drop Zone ─────────────────────────────────────────────────────────────
function FileDropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`mx-3 my-3 rounded border-2 border-dashed transition-colors flex flex-col items-center justify-center py-10 cursor-pointer
        ${dragging ? "border-[#1b7cbc] bg-blue-50" : "border-[#aac8e0] bg-white"}`}>
      <svg className="w-10 h-10 text-gray-700 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4"/>
        <path strokeLinecap="round" d="M4 18h16" strokeWidth="1.5"/>
      </svg>
      <p className="text-sm text-gray-700 font-medium">Drop files here to add to module</p>
      <p className="text-sm text-[#1b7cbc] mt-1 hover:underline">or choose files</p>
      <input ref={inputRef} type="file" multiple className="hidden" onChange={e => {
        const files = Array.from(e.target.files ?? []);
        if (files.length) onFiles(files);
        e.target.value = "";
      }} />
    </div>
  );
}

// ── File Row (Image 2 — after upload) ─────────────────────────────────────────
function FileRow({ file, onEdit, onRemove }: {
  file:     ModuleFile;
  onEdit:   () => void;
  onRemove: () => void;
}) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [isHovered,   setIsHovered]   = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex items-center gap-2 px-3 py-2 border-b border-dashed border-gray-200 transition-colors relative
        ${isHovered ? "bg-[#e8f4fb]" : "bg-white"}`}
      style={{ borderLeft: isHovered ? "3px solid #1b7cbc" : "3px solid transparent" }}
    >
      {/* Drag handle (⋮⋮) */}
      <span className="text-gray-300 text-xs shrink-0 cursor-grab select-none" style={{ letterSpacing: -2 }}>⋮⋮</span>

      {/* Paperclip icon */}
      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"/>
      </svg>

      {/* File name */}
      <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>

      {/* Right side controls — visible on hover */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Green published check — clicking opens Edit Permissions */}
        <button onClick={onEdit}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 hover:bg-green-600 transition-colors">
          <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none">
            <polyline points="1.5,5 4,8 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* ⋮ kebab menu */}
        <div className="relative">
          <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 text-lg leading-none">
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-20 w-44 py-0.5">
                {/* Edit — blue header item */}
                <button onClick={() => { onEdit(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white bg-[#1b7cbc] hover:bg-[#1669a1]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                  </svg>
                  Edit
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V7.5M3 7.5h18M3 7.5l2.25-3h13.5L21 7.5"/>
                  </svg>
                  Move to...
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"/>
                  </svg>
                  Increase indent
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 9l3.75 6"/>
                  </svg>
                  Share to Commons
                </button>
                <div className="border-t border-gray-100 my-0.5"/>
                <button onClick={() => { onRemove(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                  </svg>
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Module Card ────────────────────────────────────────────────────────────────
function ModuleCard({ module, onToggleCollapse, onTogglePublish, onAddFiles, onDelete, onDuplicate, onUpdateFile, onRemoveFile }: {
  module:           Module;
  onToggleCollapse: () => void;
  onTogglePublish:  () => void;
  onAddFiles:       (files: File[]) => void;
  onDelete:         () => void;
  onDuplicate:      () => void;
  onUpdateFile:     (fileId: string, changes: Partial<ModuleFile>) => void;
  onRemoveFile:     (fileId: string) => void;
}) {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string }[]>([]);
  const [editingFile,  setEditingFile]  = useState<ModuleFile | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: File[]) => {
    const uploading = files.map(f => ({ id: uid(), name: f.name }));
    setUploadingFiles(prev => [...prev, ...uploading]);
    onAddFiles(files);
  };

  const finishUpload = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(u => u.id !== uploadId));
  };

  return (
    <div className="mb-3 border border-gray-200 rounded overflow-visible">
      {/* Module header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#f5f5f5] border-b border-gray-200">
        <button onClick={onToggleCollapse}
          className="text-gray-500 w-4 flex items-center justify-center transition-transform shrink-0"
          style={{ transform: module.collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z"/></svg>
        </button>
        <span className="flex-1 text-sm font-semibold text-gray-800">{module.name}</span>

        {/* Publish toggle (unpublished = gray circle/slash icon) */}
        <button onClick={onTogglePublish}
          className="flex items-center border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white hover:bg-gray-50 gap-0.5">
          {module.published ? (
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#22c55e" strokeWidth="1.5"/>
              <polyline points="3,7 5.5,10 11,4" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none">
              <circle cx="7" cy="7" r="6" stroke="#aaa" strokeWidth="1.5"/>
              <line x1="4" y1="4" x2="10" y2="10" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          <svg className="w-2 h-2 text-gray-400" fill="currentColor" viewBox="0 0 8 6"><path d="M0 0l4 6 4-6z"/></svg>
        </button>

        {/* + add item */}
        <button onClick={() => fileRef.current?.click()}
          className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded text-xl leading-none font-light">
          +
        </button>
        <input ref={fileRef} type="file" multiple className="hidden"
          onChange={e => { const f = Array.from(e.target.files ?? []); if (f.length) handleFiles(f); e.target.value = ""; }} />

        {/* ⋮ module kebab — Image 4 menu */}
        <div className="relative">
          <button onClick={() => setMenuOpen(o => !o)}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-200 rounded text-lg leading-none">
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-20 w-44 py-0.5">
                {/* Edit — blue */}
                <button onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white bg-[#1b7cbc] hover:bg-[#1669a1]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"/>
                  </svg>
                  Edit
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V7.5M3 7.5h18"/>
                  </svg>
                  Move Module...
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                  </svg>
                  Assign To...
                </button>
                <button onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
                  </svg>
                  Delete
                </button>
                <button onClick={() => { onDuplicate(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"/>
                  </svg>
                  Duplicate
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                  </svg>
                  Send To...
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 4.5h-1.5a2.251 2.251 0 00-2.15 1.586"/>
                  </svg>
                  Copy To...
                </button>
                <div className="border-t border-gray-100 my-0.5"/>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M8 12h8M12 8v8"/>
                  </svg>
                  Share to Commons
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                  <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"/>
                  </svg>
                  Commons Favorites
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Module body */}
      {!module.collapsed && (
        <div>
          {/* Upload progress rows */}
          {uploadingFiles.map(u => (
            <UploadProgressRow key={u.id} fileName={u.name} onDone={() => finishUpload(u.id)} />
          ))}
          {/* File rows */}
          {module.files.map(f => (
            <FileRow key={f.id} file={f}
              onEdit={() => setEditingFile(f)}
              onRemove={() => onRemoveFile(f.id)} />
          ))}
          {/* Always show drop zone at bottom */}
          <FileDropZone onFiles={handleFiles} />
        </div>
      )}

      {/* Edit Permissions Modal */}
      {editingFile && (
        <EditPermissionsModal
          file={editingFile}
          onClose={() => setEditingFile(null)}
          onUpdate={(availability, visibility) => {
            onUpdateFile(editingFile.id, { availability, visibility });
            setEditingFile(null);
          }}
        />
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ModulesPage() {
  const [publishAll,          setPublishAll]          = useState(true);
  const [publishDropdownOpen, setPublishDropdownOpen] = useState(false);
  const [showAddModule,       setShowAddModule]       = useState(false);
  const [modules,             setModules]             = useState<Module[]>([]);
  const [toast,               setToast]               = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleAddModule = (name: string, lockUntil?: string) => {
    setModules(prev => [...prev, { id: uid(), name, published: false, collapsed: false, files: [], lockUntil }]);
    showToast(`${name} created successfully.`);
  };

  const handleAddFiles = (moduleId: string, files: File[]) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m;
      const newFiles: ModuleFile[] = files.map(f => ({
        id: uid(), name: f.name, size: f.size, type: f.type,
        availability: "publish", visibility: "inherit",
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      }));
      return { ...m, files: [...m.files, ...newFiles] };
    }));
  };

  const handleUpdateFile = (moduleId: string, fileId: string, changes: Partial<ModuleFile>) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m;
      return { ...m, files: m.files.map(f => f.id === fileId ? { ...f, ...changes } : f) };
    }));
  };

  const handleRemoveFile = (moduleId: string, fileId: string) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m;
      return { ...m, files: m.files.filter(f => f.id !== fileId) };
    }));
  };

  const toggleCollapse = (id: string) => setModules(prev => prev.map(m => m.id === id ? { ...m, collapsed: !m.collapsed } : m));
  const togglePublish  = (id: string) => setModules(prev => prev.map(m => m.id === id ? { ...m, published: !m.published } : m));
  const deleteModule   = (id: string) => setModules(prev => prev.filter(m => m.id !== id));
  const duplicateModule = (id: string) => {
    const mod = modules.find(m => m.id === id);
    if (!mod) return;
    setModules(prev => [...prev, { ...mod, id: uid(), name: `${mod.name} Copy` }]);
  };
  // All collapsed = show "Expand All", otherwise show "Collapse All"
  const allCollapsed = modules.length > 0 && modules.every(m => m.collapsed);
  const toggleCollapseAll = () => {
    if (allCollapsed) {
      setModules(prev => prev.map(m => ({ ...m, collapsed: false })));
    } else {
      setModules(prev => prev.map(m => ({ ...m, collapsed: true })));
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ── Top action bar ── */}
      <div className="flex items-center justify-end gap-2 px-6 py-3 shrink-0">

        {/* Collapse All / Expand All toggle */}
        {modules.length > 0 && (
          <button onClick={toggleCollapseAll}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 bg-white">
            {allCollapsed ? "Expand All" : "Collapse All"}
          </button>
        )}

        <button className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50 bg-white">
          View Progress
        </button>

        {/* Publish All button + dropdown */}
        <div className="relative">
          <button
            onClick={() => setPublishDropdownOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
            {publishAll && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 shrink-0">
                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" fill="none">
                  <polyline points="1.5,5 4,8 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
            <span>Publish All</span>
            <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 10 6"><path d="M0 0l5 6 5-6z"/></svg>
          </button>
          {publishDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPublishDropdownOpen(false)} />
              <div className="absolute top-full right-0 mt-0.5 bg-white border border-gray-200 rounded shadow-lg z-20 w-56 py-1">
                {/* Active item — blue bg */}
                <button onClick={() => { setPublishAll(true); setPublishDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm bg-[#1b7cbc] text-white">
                  <span className="w-3.5 h-3.5 rounded-full bg-green-400 inline-flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none"><polyline points="1.5,5 4,8 8.5,2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  Publish all modules and items
                </button>
                <button onClick={() => { setPublishAll(true); setPublishDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="w-3.5 h-3.5 rounded-full bg-green-500 inline-flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none"><polyline points="1.5,5 4,8 8.5,2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  Publish modules only
                </button>
                <button onClick={() => { setPublishAll(false); setPublishDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-400 inline-flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none"><line x1="2" y1="2" x2="8" y2="8" stroke="#999" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="#999" strokeWidth="2" strokeLinecap="round"/></svg>
                  </span>
                  Unpublish all modules and items
                </button>
                <button onClick={() => { setPublishAll(false); setPublishDropdownOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-400 inline-flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 10 10" className="w-2 h-2" fill="none"><line x1="2" y1="2" x2="8" y2="8" stroke="#999" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="#999" strokeWidth="2" strokeLinecap="round"/></svg>
                  </span>
                  Unpublish modules only
                </button>
              </div>
            </>
          )}
        </div>

        {/* + Module */}
        <button onClick={() => setShowAddModule(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-[#1b7cbc] text-white rounded hover:bg-[#1669a1] font-medium">
          <span className="text-base leading-none font-light">+</span>
          <span>Module</span>
        </button>

        {/* ⋮ kebab */}
        <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-50 bg-white text-lg leading-none">⋮</button>
      </div>

      {/* ── Module list / empty state ── */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full pb-20">
            <div className="mb-3" style={{ opacity: 0.18 }}>
              <svg width="110" height="100" viewBox="0 0 110 100" fill="none">
                <rect x="38" y="0"  width="34" height="34" rx="3" fill="#64748b"/>
                <rect x="0"  y="54" width="40" height="40" rx="3" fill="#64748b"/>
                <rect x="70" y="54" width="40" height="40" rx="3" fill="#64748b"/>
                <rect x="53" y="34" width="4"  height="14" fill="#64748b"/>
                <rect x="10" y="48" width="4"  height="12" rx="1" fill="#64748b"/>
                <rect x="96" y="48" width="4"  height="12" rx="1" fill="#64748b"/>
                <rect x="10" y="48" width="90" height="4"  fill="#64748b"/>
              </svg>
            </div>
            <button onClick={() => setShowAddModule(true)} className="text-[#1b7cbc] text-sm hover:underline">
              Create a new Module
            </button>
          </div>
        ) : (
          modules.map(mod => (
            <ModuleCard key={mod.id} module={mod}
              onToggleCollapse={() => toggleCollapse(mod.id)}
              onTogglePublish={() => togglePublish(mod.id)}
              onAddFiles={files => handleAddFiles(mod.id, files)}
              onDelete={() => deleteModule(mod.id)}
              onDuplicate={() => duplicateModule(mod.id)}
              onUpdateFile={(fileId, changes) => handleUpdateFile(mod.id, fileId, changes)}
              onRemoveFile={fileId => handleRemoveFile(mod.id, fileId)}
            />
          ))
        )}
      </div>

      {showAddModule && (
        <AddModulePanel onClose={() => setShowAddModule(false)} onAdd={handleAddModule} />
      )}
    </div>
  );
}