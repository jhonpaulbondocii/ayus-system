"use client";

// CourseFormAnswer.tsx
// User-facing form answer page. UI mirrors the admin form detail/response pages:
// gradient hero, stat tiles, maroon branding, mobile-first responsive design.

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FileText, ChevronLeft, CheckCircle } from "lucide-react";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
type QuestionType =
  | "multiple_choice" | "checkboxes" | "dropdown"
  | "short_answer" | "paragraph" | "linear_scale"
  | "mc_grid" | "checkbox_grid" | "date" | "time"
  | "file_upload" | "section";

interface FormQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  points?: number;
  required: boolean;
  image?: string;
  options?: string[];
  correctAnswer?: string | string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  rows?: string[];
  columns?: string[];
  sectionTitle?: string;
  sectionDescription?: string;
}

interface Form {
  id: string | number;
  title: string;
  description?: string;
  formType: "Survey / Feedback" | "Evaluation" | "Registration Form" | "Graded Assessment";
  assignmentGroup?: string;
  allowMultipleResponses?: boolean;
  confirmationMessage?: string;
  showOneAtATime?: boolean;
  lockQuestionsAfterAnswering?: boolean;
  accessCode?: string;
  anonymousResponses?: boolean;
  questions: FormQuestion[];
  dueDate?: string;
  dueTime?: string;
  availableFrom?: string;
  availableFromTime?: string;
  availableUntil?: string;
  availableUntilTime?: string;
  published?: boolean;
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherId?: string | null;
}

type AnswerValue = string | string[] | Record<string, string | string[]> | null;

// ── CSS ───────────────────────────────────────────────────────────────────────
const ANSWER_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  @media (max-width: 767px) { input, textarea, select { font-size: 16px !important; } }
  button, [role="button"] { -webkit-tap-highlight-color: transparent; }

  .cfa-hero {
    background: linear-gradient(135deg, ${MAROON} 0%, #5a0d0f 100%);
    border-radius: 12px;
    padding: 14px 16px;
    margin: 16px 16px 12px;
    position: relative;
    overflow: hidden;
  }
  .cfa-hero::before {
    content: '';
    position: absolute;
    top: -30px; right: -30px;
    width: 100px; height: 100px;
    border-radius: 50%;
    background: rgba(255,255,255,0.06);
    pointer-events: none;
  }
  .cfa-hero-row { display: flex; align-items: center; gap: 10px; position: relative; flex-wrap: wrap; }
  .cfa-hero-icon {
    width: 36px; height: 36px; border-radius: 9px;
    background: rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .cfa-hero-title { font-size: 15px; font-weight: 900; color: #fff; margin: 0; letter-spacing: -0.01em; line-height: 1.25; word-break: break-word; }
  .cfa-hero-sub { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.75); margin-top: 3px; }
  .cfa-hero-badge {
    display: flex; align-items: center; gap: 4px;
    background: rgba(255,255,255,0.12); border-radius: 20px;
    padding: 4px 9px; flex-shrink: 0;
  }
  .cfa-hero-badge-dot { width: 6px; height: 6px; border-radius: 50%; }
  .cfa-hero-badge-text { font-size: 10px; font-weight: 800; color: #fff; white-space: nowrap; }

  .cfa-stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 16px 12px; }
  .cfa-stat-box { border-radius: 9px; padding: 8px 4px; text-align: center; overflow: hidden; border: 1px solid; }
  .cfa-stat-value { font-size: clamp(13px, 2.5vw, 17px); font-weight: 900; margin: 0; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cfa-stat-label { font-size: clamp(7.5px, 1.2vw, 10px); font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin: 3px 0 0; }

  .cfa-progress-bar { height: 3px; background: #e5e7eb; border-radius: 99px; overflow: hidden; margin: 0 16px 12px; }
  .cfa-progress-fill { height: 100%; border-radius: 99px; transition: width 0.3s ease; background: ${MAROON}; }

  .cfa-desc { font-size: 13px; color: #374151; line-height: 1.75; }
  .cfa-desc p { margin: 0 0 6px; }
  .cfa-desc strong, .cfa-desc b { font-weight: 700; color: #111827; }
  .cfa-desc a { color: ${MAROON}; text-decoration: underline; }
  .cfa-desc ul, .cfa-desc ol { padding-left: 18px; margin: 0 0 6px; }

  .cfa-question-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    margin: 0 16px 10px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: box-shadow 0.15s;
  }
  .cfa-question-card.required-error { border-color: #fca5a5; box-shadow: 0 0 0 2px rgba(239,68,68,0.12); }
  .cfa-question-card-body { padding: 16px 16px 14px; }
  .cfa-question-number { font-size: 10px; font-weight: 800; color: ${MAROON}; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; }
  .cfa-question-text { font-size: 14px; font-weight: 600; color: #111827; line-height: 1.45; word-break: break-word; }
  .cfa-question-desc { font-size: 12px; color: #6b7280; margin-top: 4px; line-height: 1.5; }
  .cfa-required-star { color: #ef4444; margin-left: 3px; }
  .cfa-points-badge {
    display: inline-flex; align-items: center;
    font-size: 10px; font-weight: 700; padding: 2px 7px;
    border-radius: 20px; background: #fef2f2; color: ${MAROON};
    margin-left: 8px; vertical-align: middle; flex-shrink: 0;
  }

  .cfa-section-divider {
    border-top: 3px solid ${MAROON};
    border-radius: 0;
    margin: 20px 16px 6px;
    padding: 14px 16px 10px;
    background: linear-gradient(90deg, #fef2f2, #fff);
    border-left: none; border-right: none; border-bottom: none;
  }
  .cfa-section-title { font-size: 15px; font-weight: 700; color: #111827; margin: 0 0 4px; }
  .cfa-section-desc { font-size: 12px; color: #6b7280; margin: 0; }

  /* Input styles */
  .cfa-input {
    width: 100%; border: 1.5px solid #e5e7eb; border-radius: 8px;
    padding: 9px 12px; font-size: 13px; color: #111827;
    outline: none; background: #fff; transition: border-color 0.15s;
    font-family: ${FONT};
  }
  .cfa-input:focus { border-color: ${MAROON}; }
  .cfa-input.error { border-color: #fca5a5; }
  .cfa-textarea {
    width: 100%; border: 1.5px solid #e5e7eb; border-radius: 8px;
    padding: 9px 12px; font-size: 13px; color: #111827;
    outline: none; background: #fff; transition: border-color 0.15s;
    resize: vertical; min-height: 80px; font-family: ${FONT};
  }
  .cfa-textarea:focus { border-color: ${MAROON}; }

  /* Option / checkbox / radio */
  .cfa-option { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: background 0.1s; border: 1.5px solid #e5e7eb; margin-bottom: 6px; }
  .cfa-option:hover { background: #fdf8f8; border-color: #f0c0c0; }
  .cfa-option.selected { background: #fef2f2; border-color: ${MAROON}; }
  .cfa-option-radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: border-color 0.15s; }
  .cfa-option-radio.checked { border-color: ${MAROON}; }
  .cfa-option-radio.checked::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: ${MAROON}; }
  .cfa-option-checkbox { width: 16px; height: 16px; border-radius: 4px; border: 2px solid #d1d5db; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
  .cfa-option-checkbox.checked { border-color: ${MAROON}; background: ${MAROON}; }
  .cfa-option-label { font-size: 13px; color: #374151; flex: 1; min-width: 0; word-break: break-word; }

  /* Linear scale */
  .cfa-scale-wrap { display: flex; align-items: flex-end; gap: 0; overflow-x: auto; padding-bottom: 4px; }
  .cfa-scale-item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; min-width: 36px; cursor: pointer; padding: 6px 2px; border-radius: 8px; transition: background 0.1s; }
  .cfa-scale-item:hover { background: #fdf8f8; }
  .cfa-scale-item.selected { background: #fef2f2; }
  .cfa-scale-num { font-size: 12px; font-weight: 600; color: #374151; }
  .cfa-scale-circle { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #d1d5db; transition: all 0.15s; }
  .cfa-scale-item.selected .cfa-scale-circle { border-color: ${MAROON}; background: ${MAROON}; }
  .cfa-scale-labels { display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; margin-top: 2px; font-weight: 600; }

  /* Grid */
  .cfa-grid-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .cfa-grid-table th { padding: 6px 8px; text-align: center; color: #6b7280; font-weight: 700; font-size: 11px; }
  .cfa-grid-table td { padding: 6px 8px; border-top: 1px solid #f3f4f6; }
  .cfa-grid-table tr:hover td { background: #fdf8f8; }
  .cfa-grid-row-label { font-size: 12px; color: #374151; font-weight: 500; text-align: left; }
  .cfa-grid-cell { text-align: center; }

  /* File upload */
  .cfa-file-zone {
    border: 2px dashed #e5e7eb; border-radius: 10px;
    padding: 20px; text-align: center; cursor: pointer;
    transition: all 0.15s; background: #fafafa;
  }
  .cfa-file-zone:hover { border-color: ${MAROON}; background: #fef2f2; }
  .cfa-file-zone.has-file { border-color: #16a34a; background: #f0fdf4; }

  /* Nav footer */
  .cfa-footer {
    position: sticky; bottom: 0; left: 0; right: 0;
    background: #fff; border-top: 1px solid #e5e7eb;
    padding: 12px 16px; display: flex; align-items: center;
    justify-content: space-between; gap: 8px; flex-wrap: wrap;
    flex-shrink: 0; z-index: 20;
  }

  /* Topbar */
  .cfa-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; border-bottom: 1px solid #e5e7eb;
    background: #fff; flex-shrink: 0; flex-wrap: wrap; gap: 8px;
  }

  /* Submit success */
  .cfa-success-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; }
  .cfa-success-icon { width: 64px; height: 64px; border-radius: 50%; background: #f0fdf4; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .cfa-success-title { font-size: 17px; font-weight: 900; color: #111827; margin: 0 0 8px; text-align: center; }
  .cfa-success-msg { font-size: 13px; color: #6b7280; text-align: center; line-height: 1.6; max-width: 320px; margin: 0 auto; }

  /* Availability banner */
  .cfa-avail-banner {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 10px 16px; font-size: 12px; font-weight: 500;
    flex-shrink: 0; border-bottom: 1px solid;
  }

  @media (max-width: 640px) {
    .cfa-hero { margin: 10px 10px 10px; padding: 12px 14px; }
    .cfa-stats-row { grid-template-columns: repeat(3, 1fr); margin: 0 10px 10px; gap: 6px; }
    .cfa-question-card { margin: 0 10px 8px; border-radius: 10px; }
    .cfa-progress-bar { margin: 0 10px 10px; }
    .cfa-section-divider { margin: 16px 10px 4px; padding: 12px 10px 8px; }
    .cfa-footer { padding: 10px 12px; }
    .cfa-topbar { padding: 10px 12px; }
  }
  @media (max-width: 400px) {
    .cfa-stats-row { grid-template-columns: repeat(3, 1fr); gap: 4px; }
    .cfa-stat-box { padding: 6px 2px; }
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  "Survey / Feedback": "#3b82f6",
  "Evaluation": "#8b5cf6",
  "Registration Form": "#16a34a",
  "Graded Assessment": MAROON,
};

function buildLocalDate(date?: string | null, time?: string | null): Date | null {
  if (!date) return null;
  const timeStr = time || "12:00 AM";
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let hours = 0, minutes = 0;
  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(`${date}T${pad(hours)}:${pad(minutes)}`);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDateTime(date?: string | null, time?: string | null): string {
  const d = buildLocalDate(date, time);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function getAvailability(form: Form): { canRespond: boolean; status: "open" | "upcoming" | "closed" | "unpublished"; label: string; color: string } {
  const now = new Date();
  if (!form.published) return { canRespond: false, status: "unpublished", label: "Not Published", color: "#9ca3af" };
  const from = buildLocalDate(form.availableFrom, form.availableFromTime);
  const until = buildLocalDate(form.availableUntil, form.availableUntilTime);
  if (from && now < from) return { canRespond: false, status: "upcoming", label: `Opens ${fmtDateTime(form.availableFrom, form.availableFromTime)}`, color: "#f59e0b" };
  if (until && now > until) return { canRespond: false, status: "closed", label: "Closed", color: "#ef4444" };
  return { canRespond: true, status: "open", label: "Open for responses", color: "#22c55e" };
}

// ── Publisher Chip ────────────────────────────────────────────────────────────
function PublisherChip({ name, image }: { name?: string | null; image?: string | null }) {
  if (!name) return null;
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.8)" }}>
      <span className="w-4 h-4 rounded-full overflow-hidden border border-white/30 bg-white/10 flex items-center justify-center shrink-0">
        {image
          ? <Image src={image} alt={name} width={16} height={16} className="w-full h-full object-cover" />
          : <span className="text-[8px] font-bold text-white">{name.charAt(0).toUpperCase()}</span>}
      </span>
      <span className="truncate max-w-28">{name}</span>
    </span>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────
function SectionDivider({ q }: { q: FormQuestion }) {
  return (
    <div className="cfa-section-divider">
      <p className="cfa-section-title">{q.sectionTitle || "Section"}</p>
      {q.sectionDescription && <p className="cfa-section-desc">{q.sectionDescription}</p>}
    </div>
  );
}

// ── Individual Question Answerer ──────────────────────────────────────────────
function QuestionAnswerer({
  question,
  index,
  answer,
  onChange,
  hasError,
  isGraded,
}: {
  question: FormQuestion;
  index: number;
  answer: AnswerValue;
  onChange: (val: AnswerValue) => void;
  hasError: boolean;
  isGraded: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const renderInput = () => {
    const { type } = question;

    // Multiple choice
    if (type === "multiple_choice") {
      const selected = (answer as string) || "";
      return (
        <div className="mt-3 space-y-1">
          {(question.options ?? []).map((opt, i) => (
            <div
              key={i}
              className={`cfa-option${selected === opt ? " selected" : ""}`}
              onClick={() => onChange(opt)}
            >
              <div className={`cfa-option-radio${selected === opt ? " checked" : ""}`} />
              <span className="cfa-option-label">{opt}</span>
            </div>
          ))}
        </div>
      );
    }

    // Checkboxes
    if (type === "checkboxes") {
      const selected = (answer as string[]) || [];
      return (
        <div className="mt-3 space-y-1">
          {(question.options ?? []).map((opt, i) => {
            const isChecked = selected.includes(opt);
            return (
              <div
                key={i}
                className={`cfa-option${isChecked ? " selected" : ""}`}
                onClick={() => {
                  const next = isChecked ? selected.filter(x => x !== opt) : [...selected, opt];
                  onChange(next);
                }}
              >
                <div className={`cfa-option-checkbox${isChecked ? " checked" : ""}`}>
                  {isChecked && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="cfa-option-label">{opt}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Dropdown
    if (type === "dropdown") {
      return (
        <select
          value={(answer as string) || ""}
          onChange={e => onChange(e.target.value)}
          className={`cfa-input mt-3${hasError ? " error" : ""}`}
        >
          <option value="">Select an option</option>
          {(question.options ?? []).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    // Short answer
    if (type === "short_answer") {
      return (
        <input
          type="text"
          className={`cfa-input mt-3${hasError ? " error" : ""}`}
          placeholder="Your answer"
          value={(answer as string) || ""}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    // Paragraph
    if (type === "paragraph") {
      return (
        <textarea
          className={`cfa-textarea mt-3${hasError ? " error" : ""}`}
          placeholder="Your answer"
          value={(answer as string) || ""}
          onChange={e => onChange(e.target.value)}
          rows={4}
        />
      );
    }

    // Linear scale
    if (type === "linear_scale") {
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 5;
      const selected = answer as string;
      const nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
      return (
        <div className="mt-3">
          <div className="cfa-scale-wrap">
            {nums.map(n => (
              <div
                key={n}
                className={`cfa-scale-item${String(n) === selected ? " selected" : ""}`}
                onClick={() => onChange(String(n))}
              >
                <span className="cfa-scale-num">{n}</span>
                <div className="cfa-scale-circle" />
              </div>
            ))}
          </div>
          {(question.scaleMinLabel || question.scaleMaxLabel) && (
            <div className="cfa-scale-labels">
              <span>{question.scaleMinLabel || ""}</span>
              <span>{question.scaleMaxLabel || ""}</span>
            </div>
          )}
        </div>
      );
    }

    // MC Grid
    if (type === "mc_grid") {
      const gridAnswer = (answer as Record<string, string>) || {};
      return (
        <div className="mt-3 overflow-x-auto -mx-2">
          <table className="cfa-grid-table min-w-max">
            <thead>
              <tr>
                <th className="cfa-grid-row-label w-28" />
                {(question.columns ?? []).map((col, ci) => (
                  <th key={ci} className="min-w-16">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(question.rows ?? []).map((row, ri) => (
                <tr key={ri}>
                  <td className="cfa-grid-row-label p-2">{row}</td>
                  {(question.columns ?? []).map((col, ci) => (
                    <td key={ci} className="cfa-grid-cell p-2">
                      <div
                        className={`cfa-option-radio mx-auto${gridAnswer[row] === col ? " checked" : ""}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => onChange({ ...gridAnswer, [row]: col })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Checkbox Grid
    if (type === "checkbox_grid") {
      const gridAnswer = (answer as Record<string, string[]>) || {};
      return (
        <div className="mt-3 overflow-x-auto -mx-2">
          <table className="cfa-grid-table min-w-max">
            <thead>
              <tr>
                <th className="cfa-grid-row-label w-28" />
                {(question.columns ?? []).map((col, ci) => (
                  <th key={ci} className="min-w-16">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(question.rows ?? []).map((row, ri) => (
                <tr key={ri}>
                  <td className="cfa-grid-row-label p-2">{row}</td>
                  {(question.columns ?? []).map((col, ci) => {
                    const isChecked = (gridAnswer[row] ?? []).includes(col);
                    return (
                      <td key={ci} className="cfa-grid-cell p-2">
                        <div
                          className={`cfa-option-checkbox mx-auto${isChecked ? " checked" : ""}`}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            const curr = gridAnswer[row] ?? [];
                            const next = isChecked ? curr.filter(x => x !== col) : [...curr, col];
                            onChange({ ...gridAnswer, [row]: next });
                          }}
                        >
                          {isChecked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Date
    if (type === "date") {
      return (
        <input
          type="date"
          className={`cfa-input mt-3${hasError ? " error" : ""}`}
          value={(answer as string) || ""}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    // Time
    if (type === "time") {
      return (
        <input
          type="time"
          className={`cfa-input mt-3${hasError ? " error" : ""}`}
          value={(answer as string) || ""}
          onChange={e => onChange(e.target.value)}
        />
      );
    }

    // File upload
    if (type === "file_upload") {
      const fileName = answer as string;
      return (
        <div className="mt-3">
          <input ref={fileRef} type="file" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if (f) onChange(f.name);
          }} />
          <div
            className={`cfa-file-zone${fileName ? " has-file" : ""}`}
            onClick={() => fileRef.current?.click()}
          >
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth={2} viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs font-semibold text-green-700 truncate max-w-xs">{fileName}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onChange(null); }}
                  className="text-green-500 hover:text-red-500 ml-1 shrink-0"
                >×</button>
              </div>
            ) : (
              <>
                <svg width="22" height="22" fill="none" stroke="#9ca3af" strokeWidth={1.5} viewBox="0 0 24 24" className="mx-auto mb-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                </svg>
                <p className="text-xs font-semibold text-gray-400">Tap to upload file</p>
              </>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`cfa-question-card${hasError ? " required-error" : ""}`}>
      <div className="cfa-question-card-body">
        <div className="cfa-question-number">
          Question {index}
          {isGraded && question.points !== undefined && question.points > 0 && (
            <span className="cfa-points-badge">{question.points} pt{question.points !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="cfa-question-text">
          {question.question || <em className="text-gray-400 font-normal">No question text</em>}
          {question.required && <span className="cfa-required-star">*</span>}
        </div>
        {question.description && <p className="cfa-question-desc">{question.description}</p>}
        {question.image && (
          <div className="mt-3 rounded-lg overflow-hidden border border-gray-100">
            <Image src={question.image} alt="Question image" width={600} height={300} className="w-full object-contain max-h-64" />
          </div>
        )}
        {renderInput()}
        {hasError && (
          <p className="text-xs text-red-500 font-semibold mt-2 flex items-center gap-1">
            <span>⚠</span> This question is required.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Availability Banner ───────────────────────────────────────────────────────
function AvailabilityBanner({ form }: { form: Form }) {
  const avail = getAvailability(form);
  if (avail.status === "open") return null;

  const configs = {
    unpublished: { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280", icon: "🔒", msg: "This form is not published yet." },
    upcoming: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "🕐", msg: avail.label },
    closed: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "🔒", msg: `This form is closed. ${avail.label}` },
  };
  const cfg = configs[avail.status as "unpublished" | "upcoming" | "closed"];

  return (
    <div className="cfa-avail-banner" style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}>
      <span className="shrink-0">{cfg.icon}</span>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 500 }}>{cfg.msg}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
interface CourseFormAnswerProps {
  courseId: string;
  form: Form;
  currentUserId?: string | null;
  onBack: () => void;
}

export default function CourseFormAnswer({ courseId, form, currentUserId, onBack }: CourseFormAnswerProps) {
  const availability = getAvailability(form);
  const isGraded = form.formType === "Graded Assessment";

  // Filter out section questions for count/index
  const realQuestions = form.questions.filter(q => q.type !== "section");
  const qCount = realQuestions.length;

  // Answers keyed by question id
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // One-at-a-time mode
  const showOneAtATime = form.showOneAtATime ?? false;
  const [currentQIndex, setCurrentQIndex] = useState(0); // index within realQuestions

  const answered = Object.values(answers).filter(v => {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return String(v).trim().length > 0;
  }).length;

  const progressPct = qCount > 0 ? Math.round((answered / qCount) * 100) : 0;

  const setAnswer = (id: string, val: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }));
  };

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    let valid = true;
    for (const q of realQuestions) {
      if (!q.required) continue;
      const val = answers[q.id];
      let empty = true;
      if (val !== null && val !== undefined) {
        if (Array.isArray(val)) empty = val.length === 0;
        else if (typeof val === "object") empty = Object.keys(val).length === 0;
        else empty = String(val).trim().length === 0;
      }
      if (empty) { newErrors[q.id] = true; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Scroll to first error
      const firstError = document.querySelector(".required-error");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        userId: currentUserId,
        answers: realQuestions.map(q => ({
          questionId: q.id,
          question: q.question,
          type: q.type,
          answer: answers[q.id] ?? null,
        })),
      };
      const res = await fetch(`/api/courses/${courseId}/forms/${form.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error((d as { error?: string })?.error ?? `Error ${res.status}`);
      }
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submitted screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>
        <style>{ANSWER_CSS}</style>
        <div className="cfa-topbar">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold hover:underline" style={{ color: MAROON }}>
            <ChevronLeft size={14} /> Back
          </button>
          <span className="text-xs text-gray-400 truncate max-w-48">{form.title}</span>
        </div>
        <div className="cfa-success-wrap">
          <div className="cfa-success-icon">
            <CheckCircle size={30} color="#16a34a" />
          </div>
          <h2 className="cfa-success-title">Response Submitted!</h2>
          <p className="cfa-success-msg">{form.confirmationMessage || "Thank you for completing this form."}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            {form.allowMultipleResponses && (
              <button
                onClick={() => { setAnswers({}); setErrors({}); setSubmitted(false); setCurrentQIndex(0); }}
                className="h-10 px-5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Submit another response
              </button>
            )}
            <button
              onClick={onBack}
              className="h-10 px-5 rounded-xl text-sm font-bold text-white transition-colors"
              style={{ background: MAROON }}
            >
              Back to Forms
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Build the rendered list (questions + section dividers) ──────────────────
  let qIdx = 0;
  const renderItems = form.questions.map(q => {
    if (q.type === "section") return { q, kind: "section" as const, index: 0 };
    qIdx++;
    return { q, kind: "question" as const, index: qIdx };
  });

  // One at a time mode — show current real question + sections before it
  const renderItemsFiltered = showOneAtATime
    ? (() => {
        const targetQ = realQuestions[currentQIndex];
        if (!targetQ) return renderItems;
        const targetGlobalIdx = form.questions.findIndex(q => q.id === targetQ.id);
        // Show sections immediately before this question
        const out = [];
        for (let i = 0; i <= targetGlobalIdx; i++) {
          if (form.questions[i].type === "section") out.push(renderItems[i]);
          if (form.questions[i].id === targetQ.id) out.push(renderItems[i]);
        }
        return out;
      })()
    : renderItems;

  return (
    <div className="flex flex-col h-full bg-white" style={{ fontFamily: FONT }}>
      <style>{ANSWER_CSS}</style>

      {/* Topbar */}
      <div className="cfa-topbar">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold hover:underline shrink-0" style={{ color: MAROON }}>
          <ChevronLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Due date chip */}
          {form.dueDate && (
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              Due {fmtDateTime(form.dueDate, form.dueTime)}
            </span>
          )}
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full text-white"
            style={{ background: TYPE_COLORS[form.formType] ?? MAROON }}
          >
            {form.formType}
          </span>
        </div>
      </div>

      {/* Availability banner */}
      <AvailabilityBanner form={form} />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-4" style={{ background: "#f9fafb" }}>

        {/* Hero */}
        <div className="cfa-hero">
          <div className="cfa-hero-row">
            <div className="cfa-hero-icon">
              <FileText size={16} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="cfa-hero-title">{form.title}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                {form._publisherName && <PublisherChip name={form._publisherName} image={form._publisherImage} />}
              </div>
            </div>
            <div className="cfa-hero-badge">
              <div className="cfa-hero-badge-dot" style={{ background: availability.color }} />
              <span className="cfa-hero-badge-text">{availability.status === "open" ? "Open" : availability.status === "upcoming" ? "Upcoming" : "Closed"}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="cfa-stats-row">
          <div className="cfa-stat-box" style={{ color: "#1d4ed8", background: "#eff6ff", borderColor: "#bfdbfe" }}>
            <p className="cfa-stat-value">{qCount}</p>
            <p className="cfa-stat-label">Questions</p>
          </div>
          <div className="cfa-stat-box" style={{ color: answered > 0 ? "#15803d" : "#9ca3af", background: answered > 0 ? "#f0fdf4" : "#f9fafb", borderColor: answered > 0 ? "#bbf7d0" : "#e5e7eb" }}>
            <p className="cfa-stat-value">{answered}</p>
            <p className="cfa-stat-label">Answered</p>
          </div>
          <div className="cfa-stat-box" style={{ color: MAROON, background: "#fef2f2", borderColor: "#f0c0c0" }}>
            <p className="cfa-stat-value">{progressPct}%</p>
            <p className="cfa-stat-label">Done</p>
          </div>
        </div>

        {/* Progress bar */}
        {qCount > 0 && (
          <div className="cfa-progress-bar">
            <div className="cfa-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {/* Description */}
        {form.description && (
          <div
            className="mx-4 mb-3 rounded-xl border p-4"
            style={{ background: "#fff", borderColor: "#e5e7eb", borderLeft: `3px solid ${TYPE_COLORS[form.formType] ?? MAROON}` }}
          >
            <p style={{ fontSize: 9, fontWeight: 800, color: MAROON, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>Description</p>
            <div className="cfa-desc" dangerouslySetInnerHTML={{ __html: form.description }} />
          </div>
        )}

        {/* Cannot respond state */}
        {!availability.canRespond && (
          <div className="mx-4 rounded-xl border p-6 text-center" style={{ background: "#fff", borderColor: "#e5e7eb" }}>
            <div className="text-3xl mb-3">{availability.status === "upcoming" ? "🕐" : "🔒"}</div>
            <p className="text-sm font-bold text-gray-700 mb-1">{availability.label}</p>
            <p className="text-xs text-gray-400">You cannot submit responses at this time.</p>
          </div>
        )}

        {/* Questions */}
        {availability.canRespond && (
          <>
            {renderItemsFiltered.map(({ q, kind, index }) => {
              if (kind === "section") return <SectionDivider key={q.id} q={q} />;
              return (
                <QuestionAnswerer
                  key={q.id}
                  question={q}
                  index={index}
                  answer={answers[q.id] ?? null}
                  onChange={val => setAnswer(q.id, val)}
                  hasError={!!errors[q.id]}
                  isGraded={isGraded}
                />
              );
            })}

            {/* One-at-a-time navigation */}
            {showOneAtATime && qCount > 1 && (
              <div className="flex items-center justify-between px-4 pb-2 mt-2">
                <button
                  onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
                  disabled={currentQIndex === 0}
                  className="h-9 px-4 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-400 font-semibold">{currentQIndex + 1} / {qCount}</span>
                <button
                  onClick={() => setCurrentQIndex(i => Math.min(qCount - 1, i + 1))}
                  disabled={currentQIndex === qCount - 1}
                  className="h-9 px-4 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-colors"
                  style={{ background: MAROON }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer — only if can respond */}
      {availability.canRespond && (
        <div className="cfa-footer">
          <div style={{ minWidth: 0, flex: 1 }}>
            {submitError && (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                <span>⚠</span> <span className="truncate">{submitError}</span>
              </p>
            )}
            {Object.values(errors).some(Boolean) && !submitError && (
              <p className="text-xs text-red-500 font-semibold">Please answer all required questions.</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onBack}
              disabled={submitting}
              className="h-9 px-4 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            {/* In one-at-a-time mode, only show submit on last question */}
            {(!showOneAtATime || currentQIndex === qCount - 1) && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="h-9 px-5 rounded-xl text-xs font-bold text-white disabled:opacity-60 transition-colors"
                style={{ background: MAROON }}
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}