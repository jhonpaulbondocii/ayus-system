"use client";

// src/components/layout/CourseFormAnswer.tsx
// Full form-answering UI for staff and head submitters.
// Renders every question type, validates required fields,
// POSTs to /api/courses/[courseId]/forms/[formId]/responses,
// then shows the confirmation screen.

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif";

// ── Types (mirrors CourseFormsPage) ──────────────────────────────────────────
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
  points: number;
  required: boolean;
  options?: string[];
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
  points: number;
  questions: FormQuestion[];
  confirmationMessage?: string;
  allowMultipleResponses?: boolean;
  dueDate?: string;
  dueTime?: string;
  availableFrom?: string;
  availableFromTime?: string;
  availableUntil?: string;
  availableUntilTime?: string;
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherId?: string | null;
}

// Answers map: questionId → value
type AnswerValue = string | string[] | Record<string, string>;
type Answers = Record<string, AnswerValue>;

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  "Survey / Feedback": "#3b82f6",
  "Evaluation": "#8b5cf6",
  "Registration Form": "#16a34a",
  "Graded Assessment": MAROON,
};

function buildLocalDate(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
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

function fmtDue(date?: string | null, time?: string | null): string {
  if (!date) return "";
  const d = buildLocalDate(date, time ?? "12:00 AM");
  if (!d) return "";
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  );
}

// ── Publisher Bar ─────────────────────────────────────────────────────────────
function PublisherBar({
  name, image, publisherId, currentUserId,
}: {
  name?: string | null; image?: string | null;
  publisherId?: string | null; currentUserId?: string | null;
}) {
  if (!name) return null;
  if (publisherId && currentUserId && publisherId === currentUserId) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 20px", borderBottom: "1px solid #e5e7eb",
      background: "#fafafa", flexShrink: 0,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", overflow: "hidden",
        border: "1px solid #e5e7eb", background: "#f3f4f6",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {image
          ? <Image src={image} alt={name} width={28} height={28} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 11, fontWeight: 700, color: "#6b7280" }}>{name.charAt(0).toUpperCase()}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
        <span style={{ fontWeight: 600, color: "#1f2937" }}>{name}</span>
        <span style={{
          padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
          background: "#fef2f2", color: MAROON, border: "1px solid #f0c0c0",
        }}>Head</span>
        <span style={{ color: "#9ca3af" }}>· Published this form</span>
      </div>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ answered, total }: { answered: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((answered / total) * 100);
  return (
    <div style={{ padding: "8px 0 0", marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6b7280", marginBottom: 4 }}>
        <span>{answered} of {total} answered</span>
        <span style={{ fontWeight: 700, color: pct === 100 ? "#16a34a" : MAROON }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99, transition: "width .3s ease",
          width: `${pct}%`,
          background: pct === 100
            ? "linear-gradient(90deg,#16a34a,#22c55e)"
            : `linear-gradient(90deg,${MAROON},#b91c1c)`,
        }} />
      </div>
    </div>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────
function SectionDivider({ q }: { q: FormQuestion }) {
  return (
    <div style={{
      borderTop: `4px solid ${MAROON}`, borderRadius: 8,
      background: "#fff", padding: "18px 24px",
      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
        {q.sectionTitle || "Section"}
      </div>
      {q.sectionDescription && (
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{q.sectionDescription}</div>
      )}
    </div>
  );
}

// ── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({
  question, answer, onChange, error, qIndex,
}: {
  question: FormQuestion;
  answer: AnswerValue;
  onChange: (val: AnswerValue) => void;
  error: boolean;
  qIndex: number;
}) {
  const strAnswer = typeof answer === "string" ? answer : "";
  const arrAnswer = Array.isArray(answer) ? answer : [];
  const gridAnswer = (typeof answer === "object" && !Array.isArray(answer)) ? answer as Record<string, string> : {};

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #d1d5db", borderRadius: 6,
    padding: "8px 12px", fontSize: 13, outline: "none",
    fontFamily: FONT, color: "#111827", background: "#fff",
    transition: "border-color .15s",
  };

  const renderInput = () => {
    switch (question.type) {
      case "short_answer":
        return (
          <input
            type="text"
            value={strAnswer}
            onChange={e => onChange(e.target.value)}
            placeholder="Your answer"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = MAROON)}
            onBlur={e => (e.target.style.borderColor = "#d1d5db")}
          />
        );

      case "paragraph":
        return (
          <textarea
            value={strAnswer}
            onChange={e => onChange(e.target.value)}
            placeholder="Your answer"
            rows={4}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            onFocus={e => (e.target.style.borderColor = MAROON)}
            onBlur={e => (e.target.style.borderColor = "#d1d5db")}
          />
        );

      case "multiple_choice":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(question.options ?? []).map((opt, i) => {
              const checked = strAnswer === opt;
              return (
                <label key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", padding: "8px 12px", borderRadius: 6,
                  border: `1px solid ${checked ? MAROON : "#e5e7eb"}`,
                  background: checked ? "#fef2f2" : "#fff",
                  transition: "all .15s",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: `2px solid ${checked ? MAROON : "#d1d5db"}`,
                    background: checked ? MAROON : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all .15s",
                  }}>
                    {checked && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff" }} />}
                  </div>
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    value={opt}
                    checked={checked}
                    onChange={() => onChange(opt)}
                    style={{ display: "none" }}
                  />
                  <span style={{ fontSize: 13, color: "#111827" }}>{opt}</span>
                </label>
              );
            })}
          </div>
        );

      case "checkboxes":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(question.options ?? []).map((opt, i) => {
              const checked = arrAnswer.includes(opt);
              return (
                <label key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", padding: "8px 12px", borderRadius: 6,
                  border: `1px solid ${checked ? MAROON : "#e5e7eb"}`,
                  background: checked ? "#fef2f2" : "#fff",
                  transition: "all .15s",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${checked ? MAROON : "#d1d5db"}`,
                    background: checked ? MAROON : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, transition: "all .15s",
                  }}>
                    {checked && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? arrAnswer.filter(v => v !== opt)
                        : [...arrAnswer, opt];
                      onChange(next);
                    }}
                    style={{ display: "none" }}
                  />
                  <span style={{ fontSize: 13, color: "#111827" }}>{opt}</span>
                </label>
              );
            })}
          </div>
        );

      case "dropdown":
        return (
          <select
            value={strAnswer}
            onChange={e => onChange(e.target.value)}
            style={{
              ...inputStyle, width: "auto", minWidth: 220,
              appearance: "none", cursor: "pointer",
              background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 10px center #fff`,
              paddingRight: 32,
            }}
          >
            <option value="">Choose...</option>
            {(question.options ?? []).map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case "linear_scale": {
        const min = question.scaleMin ?? 1;
        const max = question.scaleMax ?? 5;
        const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
              {question.scaleMinLabel && (
                <span style={{ fontSize: 11, color: "#6b7280", marginRight: 8 }}>{question.scaleMinLabel}</span>
              )}
              {range.map(n => {
                const sel = strAnswer === String(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onChange(String(n))}
                    style={{
                      width: 40, height: 40, borderRadius: "50%",
                      border: `2px solid ${sel ? MAROON : "#d1d5db"}`,
                      background: sel ? MAROON : "#fff",
                      color: sel ? "#fff" : "#374151",
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      transition: "all .15s", margin: "0 3px",
                    }}
                  >{n}</button>
                );
              })}
              {question.scaleMaxLabel && (
                <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{question.scaleMaxLabel}</span>
              )}
            </div>
          </div>
        );
      }

      case "mc_grid":
      case "checkbox_grid": {
        const rows = question.rows ?? [];
        const cols = question.columns ?? [];
        const isMulti = question.type === "checkbox_grid";
        return (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 13, minWidth: 300 }}>
              <thead>
                <tr>
                  <th style={{ padding: "6px 12px", textAlign: "left", width: 120 }} />
                  {cols.map((col, ci) => (
                    <th key={ci} style={{
                      padding: "6px 16px", textAlign: "center",
                      fontSize: 12, color: "#6b7280", fontWeight: 600,
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 12px", fontSize: 13, color: "#374151", fontWeight: 500 }}>{row}</td>
                    {cols.map((col, ci) => {
                      const cellKey = `${ri}`;
                      const colKey = `${ci}`;
                      const cellVal = gridAnswer[cellKey];
                      const checked = isMulti
                        ? (cellVal ?? "").split(",").includes(colKey)
                        : cellVal === colKey;
                      return (
                        <td key={ci} style={{ padding: "8px 16px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => {
                              const next = { ...gridAnswer };
                              if (isMulti) {
                                const vals = (next[cellKey] ?? "").split(",").filter(Boolean);
                                if (checked) {
                                  next[cellKey] = vals.filter(v => v !== colKey).join(",");
                                } else {
                                  next[cellKey] = [...vals, colKey].join(",");
                                }
                              } else {
                                next[cellKey] = colKey;
                              }
                              onChange(next);
                            }}
                            style={{
                              width: 20, height: 20,
                              borderRadius: isMulti ? 4 : "50%",
                              border: `2px solid ${checked ? MAROON : "#d1d5db"}`,
                              background: checked ? MAROON : "#fff",
                              cursor: "pointer", transition: "all .15s",
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            {checked && (
                              isMulti
                                ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />
                            )}
                          </button>
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

      case "date":
        return (
          <input
            type="date"
            value={strAnswer}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 180 }}
            onFocus={e => (e.target.style.borderColor = MAROON)}
            onBlur={e => (e.target.style.borderColor = "#d1d5db")}
          />
        );

      case "time":
        return (
          <input
            type="time"
            value={strAnswer}
            onChange={e => onChange(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 140 }}
            onFocus={e => (e.target.style.borderColor = MAROON)}
            onBlur={e => (e.target.style.borderColor = "#d1d5db")}
          />
        );

      case "file_upload":
        return (
          <div>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 6, cursor: "pointer",
              border: `1px dashed ${MAROON}`, color: MAROON,
              fontSize: 13, fontWeight: 600, background: "#fef2f2",
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
              </svg>
              {strAnswer ? "File selected" : "Choose file"}
              <input type="file" style={{ display: "none" }} onChange={e => {
                const file = e.target.files?.[0];
                if (file) onChange(file.name);
              }} />
            </label>
            {strAnswer && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                ✓ {strAnswer}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 8, padding: "20px 24px",
      border: `1px solid ${error ? "#fca5a5" : "#e5e7eb"}`,
      boxShadow: error ? "0 0 0 2px #fee2e2" : "0 1px 3px rgba(0,0,0,.05)",
      transition: "border-color .2s, box-shadow .2s",
    }}>
      {/* Question header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{
            minWidth: 22, height: 22, borderRadius: "50%",
            background: MAROON, color: "#fff",
            fontSize: 11, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1,
          }}>{qIndex}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", lineHeight: 1.4 }}>
              {question.question || <em style={{ color: "#9ca3af" }}>Untitled question</em>}
              {question.required && (
                <span style={{ color: MAROON, marginLeft: 4, fontWeight: 900 }}>*</span>
              )}
            </div>
            {question.description && (
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }}>
                {question.description}
              </div>
            )}
          </div>
          {question.points > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: "#6b7280",
              background: "#f9fafb", border: "1px solid #e5e7eb",
              borderRadius: 99, padding: "2px 8px", flexShrink: 0,
            }}>{question.points} pt{question.points !== 1 ? "s" : ""}</span>
          )}
        </div>
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            marginTop: 8, padding: "6px 10px", borderRadius: 6,
            background: "#fef2f2", border: "1px solid #fca5a5",
            fontSize: 12, color: "#b91c1c", fontWeight: 600,
          }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            This question is required.
          </div>
        )}
      </div>
      {/* Answer input */}
      {renderInput()}
    </div>
  );
}

// ── Confirmation Screen ───────────────────────────────────────────────────────
function ConfirmationScreen({
  message, allowMultiple, onSubmitAnother, onBack,
}: {
  message?: string; allowMultiple?: boolean;
  onSubmitAnother: () => void; onBack: () => void;
}) {
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 32,
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
        boxShadow: "0 4px 24px rgba(0,0,0,.08)",
        padding: "40px 36px", textAlign: "center", maxWidth: 420, width: "100%",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "#f0fdf4", border: "2px solid #bbf7d0",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="30" height="30" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111827", marginBottom: 10 }}>
          Response Recorded
        </h2>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6, marginBottom: 24 }}>
          {message || "Thank you for completing this form."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {allowMultiple && (
            <button
              type="button"
              onClick={onSubmitAnother}
              style={{
                padding: "10px 24px", borderRadius: 8, border: `2px solid ${MAROON}`,
                color: MAROON, background: "#fff", fontSize: 13, fontWeight: 700,
                cursor: "pointer", width: "100%",
              }}
            >Submit another response</button>
          )}
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              color: "#fff", background: MAROON, fontSize: 13, fontWeight: 700,
              cursor: "pointer", width: "100%",
            }}
          >Back to Forms</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
interface CourseFormAnswerProps {
  courseId: string;
  form: Form;
  currentUserId?: string | null;
  onBack: () => void;
}

export default function CourseFormAnswer({
  courseId, form, currentUserId, onBack,
}: CourseFormAnswerProps) {
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Only non-section questions are answerable
  const answerableQuestions = form.questions.filter(q => q.type !== "section");

  // Count answered (non-empty)
  const answeredCount = answerableQuestions.filter(q => {
    const val = answers[q.id];
    if (val === undefined || val === null) return false;
    if (typeof val === "string") return val.trim() !== "";
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === "object") return Object.keys(val).length > 0;
    return false;
  }).length;

  const setAnswer = (id: string, val: AnswerValue) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
    setErrors(prev => { const next = new Set(prev); next.delete(id); return next; });
  };

  const validate = (): boolean => {
    const errs = new Set<string>();
    for (const q of answerableQuestions) {
      if (!q.required) continue;
      const val = answers[q.id];
      if (val === undefined || val === null) { errs.add(q.id); continue; }
      if (typeof val === "string" && val.trim() === "") { errs.add(q.id); continue; }
      if (Array.isArray(val) && val.length === 0) { errs.add(q.id); continue; }
    }
    setErrors(errs);
    return errs.size === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Scroll to first error
      const firstErr = answerableQuestions.find(q => errors.has(q.id));
      if (firstErr) {
        document.getElementById(`q-${firstErr.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Build structured answers array for the API
      const answersPayload = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value: typeof value === "object" ? JSON.stringify(value) : value,
      }));

      // WITH THIS:
      const res = await fetch(`/api/courses/${courseId}/forms/${form.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          answers: answersPayload,
        }),
      });
      if (res.status === 409) {
        setSubmitError("You have already submitted a response to this form.");
        return;
      }
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setSubmitError("Failed to submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setAnswers({});
    setErrors(new Set());
    setSubmitted(false);
    setSubmitError(null);
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Validate on submit re-run after errors set
  useEffect(() => {
    if (errors.size > 0) {
      const firstErrId = answerableQuestions.find(q => errors.has(q.id))?.id;
      if (firstErrId) {
        document.getElementById(`q-${firstErrId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  const now = new Date();
  const availableUntilDate = buildLocalDate(form.availableUntil, form.availableUntilTime);
  const isClosed = !!availableUntilDate && now > availableUntilDate;

  return (
    <div ref={topRef} style={{
      display: "flex", flexDirection: "column", height: "100%",
      background: "#f9fafb", fontFamily: FONT,
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", borderBottom: "1px solid #e5e7eb",
        background: "#fff", flexShrink: 0, flexWrap: "wrap", gap: 8,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: MAROON, fontSize: 14, fontWeight: 700, padding: 0,
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Forms &amp; Quizzes
        </button>
        {!submitted && !isClosed && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: submitting ? "#9ca3af" : MAROON,
              color: "#fff", fontSize: 13, fontWeight: 800,
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        )}
      </div>

      {/* Publisher bar */}
      <PublisherBar
        name={form._publisherName}
        image={form._publisherImage}
        publisherId={form._publisherId}
        currentUserId={currentUserId}
      />

      {submitted ? (
        <ConfirmationScreen
          message={form.confirmationMessage}
          allowMultiple={form.allowMultipleResponses}
          onSubmitAnother={handleSubmitAnother}
          onBack={onBack}
        />
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 720, width: "100%", margin: "0 auto", padding: "28px 20px 80px" }}>

            {/* Form header card */}
            <div style={{
              background: "#fff", borderRadius: 8, marginBottom: 20,
              borderTop: `6px solid ${MAROON}`,
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 4px rgba(0,0,0,.06)",
              overflow: "hidden",
            }}>
              <div style={{ padding: "20px 24px" }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: "#111827", marginBottom: 10 }}>
                  {form.title}
                </h1>
                {/* Meta row */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: form.description ? 14 : 0 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                    color: "#fff", background: TYPE_COLORS[form.formType] ?? MAROON,
                  }}>{form.formType}</span>
                  {form.formType === "Graded Assessment" && (
                    <span style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 3 }}>
                      <strong>{form.points}</strong> points
                    </span>
                  )}
                  {answerableQuestions.length > 0 && (
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {answerableQuestions.length} question{answerableQuestions.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {form.dueDate && (
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      Due <strong style={{ color: "#374151" }}>{fmtDue(form.dueDate, form.dueTime)}</strong>
                    </span>
                  )}
                </div>
                {form.description && (
                  <div
                    style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: form.description }}
                  />
                )}
              </div>
              {/* Progress */}
              {answerableQuestions.length > 0 && (
                <div style={{ padding: "0 24px 16px" }}>
                  <ProgressBar answered={answeredCount} total={answerableQuestions.length} />
                </div>
              )}
            </div>

            {/* Closed banner */}
            {isClosed && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "12px 16px", borderRadius: 8, marginBottom: 16,
                background: "#f3f4f6", border: "1px solid #d1d5db",
                fontSize: 13, fontWeight: 600, color: "#6b7280",
              }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                This form is closed. Submissions are no longer accepted.
              </div>
            )}

            {/* Submit error */}
            {submitError && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                background: "#fef2f2", border: "1px solid #fca5a5",
                fontSize: 13, fontWeight: 600, color: "#b91c1c",
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {submitError}
              </div>
            )}

            {/* Required note */}
            {answerableQuestions.some(q => q.required) && (
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
                <span style={{ color: MAROON, fontWeight: 900 }}>*</span> Required
              </p>
            )}

            {/* No questions fallback */}
            {form.questions.length === 0 && (
              <div style={{
                background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb",
                padding: "48px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <p style={{ fontSize: 14, color: "#9ca3af" }}>This form has no questions yet.</p>
              </div>
            )}

            {/* Questions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {(() => {
                let qIndex = 0;
                return form.questions.map(q => {
                  if (q.type === "section") {
                    return <SectionDivider key={q.id} q={q} />;
                  }
                  qIndex += 1;
                  const idx = qIndex;
                  return (
                    <div key={q.id} id={`q-${q.id}`}>
                      <QuestionCard
                        question={q}
                        answer={answers[q.id] ?? ""}
                        onChange={val => setAnswer(q.id, val)}
                        error={errors.has(q.id)}
                        qIndex={idx}
                      />
                    </div>
                  );
                });
              })()}
            </div>

            {/* Bottom submit button */}
            {!isClosed && form.questions.length > 0 && (
              <div style={{ marginTop: 28, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    padding: "11px 32px", borderRadius: 8, border: "none",
                    background: submitting ? "#9ca3af" : MAROON,
                    color: "#fff", fontSize: 14, fontWeight: 800,
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(123,17,19,.25)",
                    transition: "background .15s",
                  }}
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}