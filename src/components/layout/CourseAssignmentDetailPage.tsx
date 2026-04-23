"use client";

// src/components/layout/CourseAssignmentDetailPage.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Constants ─────────────────────────────────────────────────────────────────
const MAROON      = "#7b1113";
const MAROON_DARK = "#5a0d0f";
const MAROON_SOFT = "#fdf8f8";
const MAROON_SOFT_BORDER = "#f0e4e4";
const FONT = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SubmissionEntry {
  id:       string;
  label:    string;
  required: boolean;
  type:     string;   // "File Upload" | "Text Entry" | "Website URL" | "Media Recording"
}

interface Assignment {
  id:                 string;
  title:              string;
  description:        string | null;
  dueDate:            string | null;
  availableFrom:      string | null;
  availableUntil:     string | null;
  points:             number;
  status:             string;
  submissionType:     string;
  assignmentGroup:    string;
  onlineEntryOptions: string[];
  submissionEntries?: SubmissionEntry[];
  allowedAttempts:    number | null;
  submissionAttempts: string;
  submissions: {
    id:          string;
    status:      string;
    grade:       number | null;
    submittedAt: string | null;
    fileUrl:     string | null;
    feedback:    string | null;
    textEntry?:  string | null;
    websiteUrl?: string | null;
    comments?:   string | null;
  }[];
}

// Per-entry state held in the form
interface EntryState {
  entryId:   string;
  label:     string;
  type:      string;
  required:  boolean;
  file:      File | null;       // for File Upload / Media Recording
  fileUrl:   string | null;     // after upload
  fileName:  string | null;
  textEntry: string;
  websiteUrl:string;
  uploading: boolean;
  uploaded:  boolean;
  error:     string;
}

// Parsed multi-entry stored value
interface StoredEntry {
  entryId:    string;
  label:      string;
  type:       string;
  fileUrl:    string | null;
  fileName:   string | null;
  textEntry:  string | null;
  websiteUrl: string | null;
  required:   boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null, style: "short" | "long" = "short") {
  if (!iso) return "";
  const d = new Date(iso);
  if (style === "long") {
    return (
      d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) +
      " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
    );
  }
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function fmtDue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-US", { weekday: "short" }) +
    " by " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

function diffHours(from: string, until: string) {
  const diff = Math.round(
    (new Date(until).getTime() - new Date(from).getTime()) / (1000 * 60 * 60)
  );
  return diff > 0 ? `${diff} hours` : "";
}

function normalizeOpt(opt: string): string {
  const o = opt.toLowerCase().replace(/\s+/g, "_");
  if (o.includes("text"))                         return "online_text_entry";
  if (o.includes("file"))                         return "file_upload";
  if (o.includes("url") || o.includes("website")) return "online_url";
  if (o.includes("media"))                        return "media_recording";
  if (o.includes("annotation"))                   return "student_annotation";
  return o;
}

function entryTypeToTab(type: string): string {
  return normalizeOpt(type);
}

const TAB_LABELS: Record<string, string> = {
  file_upload:        "File Upload",
  online_text_entry:  "Text Entry",
  online_url:         "Website URL",
  media_recording:    "Media Recordings",
  student_annotation: "Student Annotation",
};

// Parse stored fileUrl — may be JSON v2 or plain URL
function parseStoredFileUrl(raw: string | null): {
  isMulti: boolean;
  entries: StoredEntry[];
  fileUrl: string | null;
} {
  if (!raw) return { isMulti: false, entries: [], fileUrl: null };
  if (raw.trimStart().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { version?: number; entries?: StoredEntry[] };
      if (parsed.version === 2 && Array.isArray(parsed.entries)) {
        return { isMulti: true, entries: parsed.entries, fileUrl: null };
      }
    } catch { /* not JSON */ }
  }
  return { isMulti: false, entries: [], fileUrl: raw };
}

// ── RocketIllustration ────────────────────────────────────────────────────────
function RocketIllustration() {
  return (
    <svg viewBox="0 0 120 120" className="w-20 h-20 mx-auto" fill="none">
      <rect x="35" y="88" width="50" height="8" rx="2" fill="#e5e7eb"/>
      <rect x="30" y="92" width="60" height="4" rx="2" fill="#d1d5db"/>
      <path d="M48 88 L40 100" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round"/>
      <path d="M72 88 L80 100" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round"/>
      <rect x="46" y="40" width="28" height="50" rx="4" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.5"/>
      <path d="M46 40 Q60 10 74 40" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5"/>
      <circle cx="60" cy="55" r="8" fill="white" stroke="#93c5fd" strokeWidth="2"/>
      <circle cx="60" cy="55" r="5" fill="#bfdbfe"/>
      <path d="M46 75 L34 90 L46 85" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1"/>
      <path d="M74 75 L86 90 L74 85" fill="#d1d5db" stroke="#9ca3af" strokeWidth="1"/>
      <path d="M54 90 Q57 105 60 108 Q63 105 66 90" fill="#fde68a" opacity="0.8"/>
      <path d="M56 90 Q58 100 60 103 Q62 100 64 90" fill="#fbbf24"/>
    </svg>
  );
}

// ── Media Recording ───────────────────────────────────────────────────────────
function MediaRecordingTab({ onMediaReady }: { onMediaReady?: (file: File) => void }) {
  const [open,          setOpen]          = useState(false);
  const [studioTab,     setStudioTab]     = useState<"record" | "upload">("record");
  const [recording,     setRecording]     = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob,  setRecordedBlob]  = useState<Blob | null>(null);
  const [recordedUrl,   setRecordedUrl]   = useState<string | null>(null);
  const [permError,     setPermError]     = useState<string | null>(null);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const streamRef   = useRef<MediaStream | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const startPreview = useCallback(async () => {
    setPermError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name === "NotAllowedError") setPermError("Camera/microphone access denied.");
      else if (e.name === "NotFoundError") setPermError("No camera or microphone found.");
      else setPermError("Could not access camera/microphone.");
    }
  }, []);

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (open && studioTab === "record") startPreview();
    else stopPreview();
    return () => stopPreview();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studioTab]);

  const startRecording = () => {
    if (!streamRef.current) { startPreview(); return; }
    setRecordedBlob(null); setRecordedUrl(null); chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4";
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecRef.current = mr;
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };
    mr.start(100);
    setRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleUseRecording = () => {
    if (!recordedBlob) return;
    const ext  = recordedBlob.type.includes("mp4") ? "mp4" : "webm";
    const file = new File([recordedBlob], `recording.${ext}`, { type: recordedBlob.type });
    onMediaReady?.(file);
    handleClose();
  };

  const handleFileUpload = (file: File) => { onMediaReady?.(file); handleClose(); };

  const handleClose = () => {
    stopRecording(); stopPreview(); setOpen(false);
    setRecordedBlob(null); setRecordedUrl(null); setRecording(false); setRecordingTime(0);
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">Record or upload your media submission.</p>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors"
        style={{ background: MAROON }}
        onMouseEnter={e => (e.currentTarget.style.background = MAROON_DARK)}
        onMouseLeave={e => (e.currentTarget.style.background = MAROON)}>
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" strokeLinecap="round"/>
        </svg>
        Record / Upload Media
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-[380px] overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-bold text-gray-800" style={{ fontFamily: FONT }}>Studio Capture</span>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="flex border-b border-gray-200">
              {(["record", "upload"] as const).map(t => (
                <button key={t} onClick={() => setStudioTab(t)}
                  className={`px-4 py-2 text-sm transition-colors flex-1 font-medium ${studioTab === t ? "border-b-2" : "text-gray-500 hover:bg-gray-50"}`}
                  style={studioTab === t ? { borderColor: MAROON, color: MAROON } : {}}>
                  {t === "record" ? "Record Media" : "Upload Media"}
                </button>
              ))}
            </div>
            {studioTab === "record" && (
              <div>
                <div className="relative bg-black" style={{ height: 200 }}>
                  {permError ? (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <p className="text-xs text-red-400 text-center">{permError}</p>
                    </div>
                  ) : recordedUrl ? (
                    <video src={recordedUrl} controls className="w-full h-full object-contain"/>
                  ) : (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover"/>
                  )}
                  {recording && (
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600 text-white text-xs px-2 py-1 rounded">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                      {fmtTime(recordingTime)}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-3 px-3 py-2.5 bg-gray-50 border-t border-gray-100">
                  {recordedUrl ? (
                    <>
                      <button onClick={() => { setRecordedUrl(null); setRecordedBlob(null); startPreview(); }}
                        className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50">Re-record</button>
                      <button onClick={handleUseRecording}
                        className="px-4 py-1.5 text-white text-xs font-semibold rounded-lg"
                        style={{ background: MAROON }}>Use Recording</button>
                    </>
                  ) : recording ? (
                    <button onClick={stopRecording}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg">
                      <span className="w-2 h-2 rounded-sm bg-white"/>Stop
                    </button>
                  ) : (
                    <button onClick={startRecording} disabled={!!permError}
                      className="px-4 py-1.5 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
                      style={{ background: MAROON }}>Start Recording</button>
                  )}
                </div>
              </div>
            )}
            {studioTab === "upload" && (
              <div className="p-4 space-y-3">
                <p className="text-xs text-gray-500">Select an audio or video file.</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => audioFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-50">
                    🎵 Select Audio
                  </button>
                  <button onClick={() => videoFileRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs"
                    style={{ borderColor: MAROON, color: MAROON, background: MAROON_SOFT }}>
                    🎥 Select Video
                  </button>
                </div>
                <input ref={audioFileRef} type="file" accept="audio/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}/>
                <input ref={videoFileRef} type="file" accept="video/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}/>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single Entry Form ─────────────────────────────────────────────────────────
function EntryForm({
  state,
  onChange,
}: {
  state:    EntryState;
  onChange: (patch: Partial<EntryState>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const tab = entryTypeToTab(state.type);

  const uploadFile = async (file: File) => {
    onChange({ file, uploading: true, error: "" });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { fileUrl?: string; error?: string };
      if (!res.ok) {
        onChange({ uploading: false, error: data.error ?? "Upload failed." });
        return;
      }
      onChange({ uploading: false, uploaded: true, fileUrl: data.fileUrl ?? null, fileName: file.name });
    } catch {
      onChange({ uploading: false, error: "Network error during upload." });
    }
  };

  return (
    <div className="space-y-2">
      {/* Label + required */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-bold text-gray-800">
          {state.label || TAB_LABELS[tab] || state.type}
        </p>
        {state.required
          ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: MAROON }}>Required</span>
          : <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">Optional</span>
        }
      </div>

      {/* File Upload */}
      {(tab === "file_upload" || tab === "media_recording") && (
        <div>
          {tab === "media_recording" ? (
            <div>
              <MediaRecordingTab onMediaReady={file => uploadFile(file)}/>
              {state.uploaded && state.fileName && (
                <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-green-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" strokeLinecap="round"/></svg>
                  <span className="text-xs text-green-700 font-medium truncate">{state.fileName}</span>
                  <button onClick={() => onChange({ file: null, fileUrl: null, fileName: null, uploaded: false })}
                    className="text-green-400 hover:text-red-500 ml-auto shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div
                className={`border-2 border-dashed rounded-xl transition-colors ${dragOver ? "border-[#7b1113] bg-[#fdf8f8]" : "border-gray-200"}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
              >
                {state.uploaded && state.fileName ? (
                  <div className="p-3 flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-0">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round"/>
                      </svg>
                      <span className="text-xs text-gray-700 truncate">{state.fileName}</span>
                    </div>
                    <button onClick={() => onChange({ file: null, fileUrl: null, fileName: null, uploaded: false })}
                      className="text-gray-400 hover:text-red-500 shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                ) : state.uploading ? (
                  <div className="flex items-center justify-center p-6 gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full animate-spin" style={{ borderTopColor: MAROON }}/>
                    <span className="text-sm text-gray-500">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-5 gap-2">
                    <RocketIllustration/>
                    <p className="text-sm text-gray-500">Drag a file here, or</p>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-semibold hover:underline" style={{ color: MAROON }}>
                      Choose a file to upload
                    </button>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}/>
            </div>
          )}
          {state.error && <p className="text-xs text-red-500 mt-1">{state.error}</p>}
        </div>
      )}

      {/* Text Entry */}
      {tab === "online_text_entry" && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-2 py-1 text-xs text-gray-400 flex gap-3">
            {["Edit","Insert","Format"].map(m => (
              <span key={m} className="cursor-pointer hover:text-gray-600">{m}</span>
            ))}
          </div>
          <textarea
            value={state.textEntry}
            onChange={e => onChange({ textEntry: e.target.value })}
            rows={8}
            placeholder="Type your response here..."
            className="w-full p-4 text-sm text-gray-700 focus:outline-none resize-none bg-white"
            style={{ fontFamily: FONT }}
          />
          <div className="bg-gray-50 border-t border-gray-100 px-3 py-1 flex justify-end text-xs text-gray-400">
            {state.textEntry.split(/\s+/).filter(Boolean).length} words
          </div>
        </div>
      )}

      {/* Website URL */}
      {tab === "online_url" && (
        <input
          type="url"
          value={state.websiteUrl}
          onChange={e => onChange({ websiteUrl: e.target.value })}
          placeholder="https://"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ fontFamily: FONT }}
          onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
          onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")}
        />
      )}
    </div>
  );
}

// ── Submission Entries Panel (before starting) ────────────────────────────────
function SubmissionEntriesPanel({ entries }: { entries: SubmissionEntry[] }) {
  if (!entries || entries.length === 0) return null;
  const typeIcon: Record<string, string> = {
    "File Upload":     "📎",
    "Text Entry":      "✏️",
    "Website URL":     "🔗",
    "Media Recording": "🎥",
  };
  return (
    <div className="rounded-xl border p-4 mb-5" style={{ borderColor: MAROON_SOFT_BORDER, background: MAROON_SOFT }}>
      <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: MAROON }}>
        Submission Requirements
      </p>
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div key={entry.id}
            className="flex items-center justify-between bg-white rounded-lg border px-3 py-2"
            style={{ borderColor: MAROON_SOFT_BORDER }}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{typeIcon[entry.type] ?? "📄"}</span>
              <div>
                <span className="text-xs font-bold text-gray-800">{entry.label || `Submission ${idx + 1}`}</span>
                <span className="text-[11px] text-gray-400 ml-1.5">— {entry.type}</span>
              </div>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white ml-3 shrink-0"
              style={{ background: entry.required ? MAROON : "#9ca3af" }}>
              {entry.required ? "Required" : "Optional"}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mt-2.5">
        {entries.filter(e => e.required).length} required · {entries.filter(e => !e.required).length} optional
      </p>
    </div>
  );
}

// ── Submitted Entries View ────────────────────────────────────────────────────
function SubmittedEntriesView({ fileUrl, textEntry, websiteUrl }: {
  fileUrl:    string | null;
  textEntry:  string | null | undefined;
  websiteUrl: string | null | undefined;
}) {
  const parsed = parseStoredFileUrl(fileUrl);

  if (parsed.isMulti) {
    return (
      <div className="space-y-3">
        {parsed.entries.map((entry, idx) => (
          <div key={entry.entryId ?? idx}
            className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: MAROON }}>
                {entry.label || entry.type || `Entry ${idx + 1}`}
              </span>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: entry.required ? MAROON : "#9ca3af" }}>
                {entry.required ? "Required" : "Optional"}
              </span>
            </div>
            {entry.fileUrl ? (
              <a href={entry.fileUrl} download target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold hover:underline"
                style={{ color: MAROON }}>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round"/>
                </svg>
                {entry.fileName ?? entry.fileUrl.split("/").pop() ?? "Download file"}
              </a>
            ) : entry.textEntry ? (
              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3"
                dangerouslySetInnerHTML={{ __html: entry.textEntry }}/>
            ) : entry.websiteUrl ? (
              <a href={entry.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm hover:underline" style={{ color: MAROON }}>
                {entry.websiteUrl}
              </a>
            ) : (
              <p className="text-xs text-gray-400 italic">No content submitted for this entry.</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Legacy single submission
  return (
    <div className="space-y-2">
      {parsed.fileUrl && (
        <a href={parsed.fileUrl} download target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-semibold hover:underline" style={{ color: MAROON }}>
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round"/>
          </svg>
          {parsed.fileUrl.split("/").pop() ?? "Download submission"}
        </a>
      )}
      {textEntry && (
        <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3"
          dangerouslySetInnerHTML={{ __html: textEntry }}/>
      )}
      {websiteUrl && (
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
          className="text-sm hover:underline" style={{ color: MAROON }}>
          {websiteUrl}
        </a>
      )}
      {!parsed.fileUrl && !textEntry && !websiteUrl && (
        <p className="text-sm text-gray-400 italic">No submission content.</p>
      )}
    </div>
  );
}

// ── Submission Details View ───────────────────────────────────────────────────
function SubmissionDetailsView({
  assignment, submission, courseName, courseId,
  onBack, onResubmit, isAvailable, attemptsLeft, router,
}: {
  assignment:   Assignment;
  submission:   Assignment["submissions"][0];
  courseName:   string;
  courseId:     string;
  onBack:       () => void;
  onResubmit:   () => void;
  isAvailable:  boolean;
  attemptsLeft: number | null;
  router:       ReturnType<typeof useRouter>;
}) {
  const [comment,       setComment]       = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [savedComment,  setSavedComment]  = useState(false);
  const isGraded = submission.status === "GRADED";
  const SIDEBAR_TABS = ["Home","Assignments","Discussions","Grades","People","Files","Syllabus","Collaborations"];

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    setSavingComment(true);
    await new Promise(r => setTimeout(r, 600));
    setSavingComment(false);
    setSavedComment(true);
    setComment("");
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-200 shrink-0 text-sm">
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={() => router.push(`/courses/${courseId}`)} className="hover:underline font-semibold" style={{ color: MAROON }}>{courseName}</button>
        <span className="text-gray-400">›</span>
        <button onClick={() => router.push(`/courses/${courseId}?tab=Assignments`)} className="hover:underline" style={{ color: MAROON }}>Assignments</button>
        <span className="text-gray-400">›</span>
        <button onClick={onBack} className="hover:underline truncate max-w-xs" style={{ color: MAROON }}>{assignment.title}</button>
        <span className="text-gray-400">›</span>
        <span className="text-gray-700">Submission Details</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 border-r border-gray-200 bg-white shrink-0 pt-2 pb-6 overflow-y-auto">
          {SIDEBAR_TABS.map(tab => (
            <button key={tab}
              onClick={() => router.push(
                tab === "Assignments" ? `/courses/${courseId}?tab=Assignments` :
                tab === "Home"        ? `/courses/${courseId}` :
                `/courses/${courseId}?tab=${tab}`
              )}
              className="w-full text-left py-2 text-sm transition-colors leading-snug"
              style={{
                paddingLeft:  tab === "Assignments" ? 13 : 20,
                paddingRight: 12,
                color:        tab === "Assignments" ? "#111827" : MAROON,
                fontWeight:   tab === "Assignments" ? 700 : 500,
                background:   tab === "Assignments" ? MAROON_SOFT : "transparent",
                borderLeft:   tab === "Assignments" ? `3px solid ${MAROON}` : "3px solid transparent",
              }}>
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-gray-800" style={{ fontFamily: FONT }}>Submission Details</h1>
              <h2 className="text-base text-gray-600 mt-0.5">{assignment.title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Submitted {fmtDate(submission.submittedAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <span className="text-sm text-gray-600">
                Grade:{" "}
                <span className="font-black" style={{ color: MAROON }}>
                  {isGraded && submission.grade != null
                    ? `${submission.grade} / ${assignment.points}`
                    : `— / ${assignment.points}`}
                </span>
              </span>
              <button
                onClick={onResubmit}
                disabled={!isAvailable || (attemptsLeft != null && attemptsLeft <= 0)}
                className="px-4 py-1.5 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40"
                style={{ background: MAROON }}
                onMouseEnter={e => (e.currentTarget.style.background = MAROON_DARK)}
                onMouseLeave={e => (e.currentTarget.style.background = MAROON)}>
                Re-submit Assignment
              </button>
            </div>
          </div>

          <div className="flex gap-5">
            <div className="flex-1 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
              <div className="flex justify-end px-3 py-2 border-b border-gray-200 bg-white">
                <select className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none">
                  <option>Paper View</option><option>Preview</option>
                </select>
              </div>
              <div className="p-6 min-h-48">
                <SubmittedEntriesView
                  fileUrl={submission.fileUrl}
                  textEntry={submission.textEntry}
                  websiteUrl={submission.websiteUrl}
                />
              </div>
            </div>

            <div className="w-52 shrink-0">
              <p className="text-sm font-black text-gray-700 mb-2">Add a Comment:</p>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none resize-none mb-2"
                style={{ fontFamily: FONT }}
                onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")}/>
              <button
                onClick={handleSaveComment}
                disabled={savingComment || !comment.trim()}
                className="px-4 py-1.5 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: MAROON }}
                onMouseEnter={e => (e.currentTarget.style.background = MAROON_DARK)}
                onMouseLeave={e => (e.currentTarget.style.background = MAROON)}>
                {savingComment ? "Saving..." : "Save"}
              </button>
              {savedComment && <p className="text-xs text-green-600 mt-1.5">Comment saved.</p>}
              {isGraded && submission.feedback && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="text-xs font-black text-gray-600 mb-1">Instructor Feedback:</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{submission.feedback}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CourseAssignmentDetailPage({
  courseId,
  assignmentId,
}: { courseId: string; assignmentId: string }) {
  const router = useRouter();

  const [assignment,    setAssignment]    = useState<Assignment | null>(null);
  const [attemptCount,  setAttemptCount]  = useState(0);
  const [courseName,    setCourseName]    = useState("");
  const [loading,       setLoading]       = useState(true);
  const [started,       setStarted]       = useState(false);
  const [showDetails,   setShowDetails]   = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [comments,      setComments]      = useState("");

  // Per-entry states — one per submission entry configured by admin
  const [entryStates, setEntryStates] = useState<EntryState[]>([]);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/courses/${courseId}/assignments/${assignmentId}`)
      .then(r => r.json())
      .then(d => {
        const a: Assignment = d.assignment ?? null;
        setAssignment(a);
        setAttemptCount(d.attemptCount ?? 0);
        setLoading(false);

        // Build initial entry states from submissionEntries
        const entries: SubmissionEntry[] = a?.submissionEntries ?? [];
        if (entries.length > 0) {
          setEntryStates(entries.map(e => ({
            entryId:   e.id,
            label:     e.label,
            type:      e.type,
            required:  e.required,
            file:      null,
            fileUrl:   null,
            fileName:  null,
            textEntry: "",
            websiteUrl:"",
            uploading: false,
            uploaded:  false,
            error:     "",
          })));
        } else {
          // Legacy: build from onlineEntryOptions
          const opts = a?.onlineEntryOptions ?? [];
          setEntryStates(opts.map((opt, idx) => ({
            entryId:   `entry-${idx}`,
            label:     TAB_LABELS[normalizeOpt(opt)] ?? opt,
            type:      opt,
            required:  false,
            file:      null,
            fileUrl:   null,
            fileName:  null,
            textEntry: "",
            websiteUrl:"",
            uploading: false,
            uploaded:  false,
            error:     "",
          })));
        }
      })
      .catch(() => setLoading(false));

    fetch(`/api/courses/${courseId}`)
      .then(r => r.json())
      .then(d => setCourseName(d.course?.name ?? ""))
      .catch(() => {});
  }, [courseId, assignmentId]);

  const updateEntry = (idx: number, patch: Partial<EntryState>) => {
    setEntryStates(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");

    // Validate required entries
    for (const entry of entryStates) {
      if (!entry.required) continue;
      const tab = entryTypeToTab(entry.type);
      const hasValue =
        (tab === "file_upload" || tab === "media_recording") ? entry.uploaded :
        tab === "online_text_entry" ? entry.textEntry.trim().length > 0 :
        tab === "online_url"        ? entry.websiteUrl.trim().length > 0 :
        false;
      if (!hasValue) {
        setSubmitError(`"${entry.label || entry.type}" is required but was not filled in.`);
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch(
        `/api/courses/${courseId}/assignments/${assignmentId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comments,
            entries: entryStates.map(e => ({
              entryId:    e.entryId,
              label:      e.label,
              type:       e.type,
              required:   e.required,
              fileUrl:    e.fileUrl   ?? undefined,
              fileName:   e.fileName  ?? undefined,
              textEntry:  e.textEntry  || undefined,
              websiteUrl: e.websiteUrl || undefined,
            })),
          }),
        }
      );
      const data = await res.json() as { submission?: unknown; error?: string };
      if (!res.ok) { setSubmitError(data.error ?? "Submission failed."); return; }

      setSubmitSuccess(true);
      setStarted(false);

      // Refresh assignment data
      const r2 = await fetch(`/api/courses/${courseId}/assignments/${assignmentId}`);
      const d2 = await r2.json() as { assignment?: Assignment; attemptCount?: number };
      setAssignment(d2.assignment ?? null);
      setAttemptCount(d2.attemptCount ?? 0);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStarted(false);
    setSubmitError("");
    setComments("");
    setEntryStates(prev => prev.map(e => ({
      ...e,
      file: null, fileUrl: null, fileName: null,
      textEntry: "", websiteUrl: "", uploading: false, uploaded: false, error: "",
    })));
  };

  // ── Loading / not found ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400" style={{ fontFamily: FONT }}>
      Loading...
    </div>
  );
  if (!assignment) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3" style={{ fontFamily: FONT }}>
      <p className="text-sm text-gray-500">Assignment not found.</p>
      <button onClick={() => router.back()} className="text-sm hover:underline" style={{ color: MAROON }}>← Go back</button>
    </div>
  );

  // ── Derived state ───────────────────────────────────────────────────────────
  const now          = new Date();
  const isLocked     = assignment.availableFrom  && now < new Date(assignment.availableFrom);
  const isClosed     = assignment.availableUntil && now > new Date(assignment.availableUntil);
  const isAvailable  = !isLocked && !isClosed;
  const submission   = assignment.submissions[0];
  const isSubmitted  = submission?.status === "SUBMITTED";
  const isGraded     = submission?.status === "GRADED";
  const maxAttempts  = assignment.allowedAttempts;
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptCount : null;

  const entries: SubmissionEntry[] = assignment.submissionEntries ?? [];
  const submittingLabel = entryStates.length > 0
    ? [...new Set(entryStates.map(e => TAB_LABELS[entryTypeToTab(e.type)] ?? e.type))].join(", ")
    : assignment.submissionType;

  const SIDEBAR_TABS = ["Home","Assignments","Discussions","Grades","People","Files","Syllabus","Collaborations"];

  if (showDetails && submission) {
    return (
      <SubmissionDetailsView
        assignment={assignment}
        submission={submission}
        courseName={courseName}
        courseId={courseId}
        onBack={() => setShowDetails(false)}
        onResubmit={() => { setShowDetails(false); setStarted(true); setSubmitSuccess(false); }}
        isAvailable={!!isAvailable}
        attemptsLeft={attemptsLeft}
        router={router}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-200 shrink-0 text-sm">
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round"/>
          </svg>
        </button>
        <button onClick={() => router.push(`/courses/${courseId}`)} className="hover:underline font-bold" style={{ color: MAROON }}>{courseName}</button>
        <span className="text-gray-400">›</span>
        <button onClick={() => router.push(`/courses/${courseId}?tab=Assignments`)} className="hover:underline" style={{ color: MAROON }}>Assignments</button>
        <span className="text-gray-400">›</span>
        <span className="text-gray-700 truncate max-w-xs">{assignment.title}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <nav className="w-48 border-r border-gray-200 bg-white shrink-0 pt-2 pb-6 overflow-y-auto">
          {SIDEBAR_TABS.map(tab => (
            <button key={tab}
              onClick={() => router.push(
                tab === "Assignments" ? `/courses/${courseId}?tab=Assignments` :
                tab === "Home"        ? `/courses/${courseId}` :
                `/courses/${courseId}?tab=${tab}`
              )}
              className="w-full text-left py-2 text-sm transition-colors leading-snug"
              style={{
                paddingLeft:  tab === "Assignments" ? 13 : 20,
                paddingRight: 12,
                color:        tab === "Assignments" ? "#111827" : MAROON,
                fontWeight:   tab === "Assignments" ? 700 : 500,
                background:   tab === "Assignments" ? MAROON_SOFT : "transparent",
                borderLeft:   tab === "Assignments" ? `3px solid ${MAROON}` : "3px solid transparent",
              }}>
              {tab}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-10 py-8">

          {/* Title + Start */}
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl font-black text-gray-900 leading-tight pr-4" style={{ fontFamily: FONT }}>
              {assignment.title}
            </h1>
            {isAvailable && !started && !isSubmitted && !isGraded && (attemptsLeft == null || attemptsLeft > 0) && (
              <button
                onClick={() => setStarted(true)}
                className="shrink-0 px-5 py-2 text-white text-sm font-black rounded-xl transition-colors"
                style={{ background: MAROON }}
                onMouseEnter={e => (e.currentTarget.style.background = MAROON_DARK)}
                onMouseLeave={e => (e.currentTarget.style.background = MAROON)}>
                Start Assignment
              </button>
            )}
          </div>

          {/* Info strip */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 py-3 border-t border-b mb-5 text-sm text-gray-700"
            style={{ borderColor: MAROON_SOFT_BORDER }}>
            {assignment.dueDate && (
              <div><span className="font-black" style={{ color: MAROON }}>Due</span> {fmtDue(assignment.dueDate)}</div>
            )}
            <div><span className="font-black" style={{ color: MAROON }}>Points</span> {assignment.points}</div>
            <div><span className="font-black" style={{ color: MAROON }}>Submitting</span> {submittingLabel}</div>
            <div><span className="font-black" style={{ color: MAROON }}>Attempts</span> {attemptCount}</div>
            {maxAttempts != null && (
              <div><span className="font-black" style={{ color: MAROON }}>Allowed</span> {maxAttempts}</div>
            )}
            {assignment.availableFrom && assignment.availableUntil && (
              <div>
                <span className="font-black" style={{ color: MAROON }}>Available</span>{" "}
                {fmtDate(assignment.availableFrom)} – {fmtDate(assignment.availableUntil)}{" "}
                <span className="text-gray-400 text-xs">
                  {diffHours(assignment.availableFrom, assignment.availableUntil)}
                </span>
              </div>
            )}
          </div>

          {/* Status messages */}
          {isLocked && (
            <p className="text-sm text-gray-600 italic mb-4">
              This assignment is locked until {fmtDate(assignment.availableFrom, "long")}.
            </p>
          )}
          {isClosed && !isSubmitted && !isGraded && (
            <p className="text-sm text-gray-600 italic mb-4">
              This assignment is no longer available for submission.
            </p>
          )}

          {/* Description */}
          {!isLocked && assignment.description && (
            <div
              className="text-sm text-gray-700 leading-relaxed mb-6 max-w-3xl prose prose-sm"
              dangerouslySetInnerHTML={{ __html: assignment.description }}
            />
          )}

          {/* Grade banner */}
          {isGraded && submission && (
            <div className="rounded-xl border p-4 mb-6 max-w-xl"
              style={{ background: MAROON_SOFT, borderColor: MAROON_SOFT_BORDER }}>
              <p className="text-sm font-black mb-1" style={{ color: MAROON }}>
                Grade: {submission.grade} / {assignment.points}
              </p>
              {submission.feedback && (
                <p className="text-sm text-gray-700">{submission.feedback}</p>
              )}
            </div>
          )}

          {/* Submission requirements (before starting) */}
          {!started && entries.length > 0 && <SubmissionEntriesPanel entries={entries}/>}

          {/* ── Submission Form ── */}
          {started && isAvailable && (
            <div className="border rounded-2xl max-w-3xl overflow-hidden" style={{ borderColor: MAROON_SOFT_BORDER }}>

              {/* Header */}
              <div className="px-5 py-3 border-b" style={{ background: MAROON_SOFT, borderColor: MAROON_SOFT_BORDER }}>
                <p className="text-xs font-black uppercase tracking-widest" style={{ color: MAROON }}>
                  Submit Your Work
                </p>
                {entryStates.length > 0 && (
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {entryStates.filter(e => e.required).length} required ·{" "}
                    {entryStates.filter(e => !e.required).length} optional
                  </p>
                )}
              </div>

              {/* Each entry as its own section */}
              <div className="divide-y divide-gray-100">
                {entryStates.length > 0 ? (
                  entryStates.map((entry, idx) => (
                    <div key={entry.entryId} className="px-5 py-5">
                      <EntryForm
                        state={entry}
                        onChange={patch => updateEntry(idx, patch)}
                      />
                    </div>
                  ))
                ) : (
                  // Fallback: no entries configured
                  <div className="px-5 py-5">
                    <p className="text-sm text-gray-500">No submission entries configured for this assignment.</p>
                  </div>
                )}
              </div>

              {/* Comments + Submit */}
              <div className="px-5 py-4 border-t" style={{ borderColor: MAROON_SOFT_BORDER, background: "#fafafa" }}>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Comments (optional)..."
                    className="flex-1 max-w-sm border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-700 focus:outline-none"
                    style={{ fontFamily: FONT }}
                    onFocus={e => (e.currentTarget.style.borderColor = MAROON)}
                    onBlur={e  => (e.currentTarget.style.borderColor = "#e5e7eb")}
                  />
                </div>

                {submitError && <p className="text-xs text-red-500 mb-2">{submitError}</p>}
                {submitSuccess && <p className="text-xs text-green-600 mb-2">Submitted successfully!</p>}

                <div className="flex items-center gap-3">
                  <button onClick={resetForm}
                    className="px-4 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || entryStates.some(e => e.uploading)}
                    className="px-5 py-1.5 text-sm text-white font-black rounded-xl disabled:opacity-60 transition-colors"
                    style={{ background: MAROON }}
                    onMouseEnter={e => !submitting && (e.currentTarget.style.background = MAROON_DARK)}
                    onMouseLeave={e => (e.currentTarget.style.background = MAROON)}>
                    {submitting ? "Submitting..." : "Submit Assignment"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar — after submission */}
        {(isSubmitted || isGraded) && submission && (
          <div className="w-56 border-l border-gray-200 shrink-0 px-5 py-6 text-sm overflow-y-auto" style={{ fontFamily: FONT }}>
            <p className="font-black text-gray-800 mb-3">Submission</p>

            <div className="flex items-center gap-1.5 font-black text-sm mb-0.5"
              style={{ color: isGraded ? MAROON : "#15803d" }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isGraded ? "Graded" : "Submitted!"}
            </div>

            <p className="text-xs text-gray-500 mb-2">{fmtDate(submission.submittedAt, "short")}</p>

            {isGraded && (
              <p className="text-sm font-black mb-2" style={{ color: MAROON }}>
                Grade: {submission.grade} / {assignment.points}
              </p>
            )}

            {/* Show submitted files summary */}
            {(() => {
              const parsed = parseStoredFileUrl(submission.fileUrl);
              if (parsed.isMulti) {
                const fileEntries = parsed.entries.filter(e => e.fileUrl);
                return fileEntries.length > 0 ? (
                  <div className="mb-3 space-y-1">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Files</p>
                    {fileEntries.map((e, idx) => (
                      <a key={idx} href={e.fileUrl!} download target="_blank" rel="noopener noreferrer"
                        className="block text-xs hover:underline truncate max-w-[180px]"
                        style={{ color: MAROON }}>
                        {e.fileName ?? e.fileUrl!.split("/").pop() ?? "File"}
                      </a>
                    ))}
                  </div>
                ) : null;
              }
              return submission.fileUrl ? (
                <a href={submission.fileUrl} download
                  className="block text-xs hover:underline truncate max-w-[180px] mb-3"
                  style={{ color: MAROON }}>
                  {submission.fileUrl.split("/").pop() ?? "Download"}
                </a>
              ) : null;
            })()}

            <button onClick={() => setShowDetails(true)}
              className="text-xs hover:underline block mb-1 font-bold" style={{ color: MAROON }}>
              Submission Details
            </button>

            <button
              onClick={() => { setStarted(true); setSubmitSuccess(false); }}
              disabled={!isAvailable || (attemptsLeft != null && attemptsLeft <= 0)}
              className="w-full mt-2 px-3 py-1.5 border rounded-xl text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              style={{ borderColor: MAROON_SOFT_BORDER }}>
              New Attempt
            </button>

            <div className="border-t border-gray-100 pt-4 mt-4">
              <p className="font-black text-gray-700 mb-1 text-xs">Peer Reviews</p>
              <p className="text-xs text-gray-400">None Assigned</p>
            </div>
            <div className="border-t border-gray-100 pt-4 mt-3">
              <p className="font-black text-gray-700 mb-1 text-xs">Comments:</p>
              <p className="text-xs text-gray-400">{submission.comments ?? "No Comments"}</p>
            </div>
            {isGraded && submission.feedback && (
              <div className="border-t border-gray-100 pt-4 mt-3">
                <p className="font-black text-gray-700 mb-1 text-xs">Feedback:</p>
                <p className="text-xs text-gray-600">{submission.feedback}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}