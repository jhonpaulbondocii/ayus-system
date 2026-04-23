"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";

const MAROON = "#7b1113";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "FILL_BLANK" | "MATCHING" | "ESSAY" | "FILE_UPLOAD";

interface QuizAnswer { id?: string; text: string; correct: boolean; order?: number; }
interface QuizMatchPair { id?: string; left: string; right: string; order?: number; }
interface QuizQuestion {
  id: string; type: QuestionType; question: string; description?: string;
  points: number; required: boolean; image?: string;
  answers?: QuizAnswer[]; correctAnswer?: string; matchPairs?: QuizMatchPair[]; order?: number;
}
interface Quiz {
  id: string; title: string; description: string | null; points: number; published: boolean;
  questions: QuizQuestion[]; dueDate?: string | null; availableFrom?: string | null;
  availableUntil?: string | null; accessCode?: string | null;
  allowMultipleAttempts: boolean; showResultsToRespondents: boolean;
  submitted?: boolean; score?: number; attempts?: number; attemptCount?: number;
  authorId?: string | null; authorName?: string; authorRole?: string; authorImage?: string | null;
  createdByUserId?: string | null; assignTo?: string[]; quizType?: string;
  shuffleAnswers?: boolean; timeLimit?: number | null; attemptLimit?: number | null;
  showCorrectAnswers?: boolean; showOneAtATime?: boolean;
  lockQuestionsAfterAnswering?: boolean; assignmentGroup?: string;
}
type Answers = Record<string, string | string[] | Record<string, string>>;

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function isOverdue(dueDate?: string | null) { if (!dueDate) return false; return new Date(dueDate) < new Date(); }
function isAvailable(from?: string | null, until?: string | null) {
  const now = new Date();
  if (from && new Date(from) > now) return false;
  if (until && new Date(until) < now) return false;
  return true;
}
function getQuizStatusBadge(quiz: Quiz) {
  if (!quiz.published) return { label: "Unpublished", color: "#6b7280", bg: "#f9fafb" };
  if (quiz.submitted) return { label: "Submitted", color: "#16a34a", bg: "#f0fdf4" };
  if (quiz.dueDate && isOverdue(quiz.dueDate)) return { label: "Overdue", color: "#dc2626", bg: "#fef2f2" };
  if (!isAvailable(quiz.availableFrom, quiz.availableUntil)) return { label: "Locked", color: "#6b7280", bg: "#f9fafb" };
  return { label: "Open", color: "#2563eb", bg: "#eff6ff" };
}
function getRoleBadge(authorRole?: string) {
  if (!authorRole) return null;
  const r = authorRole.toLowerCase();
  if (r === "admin") return { label: "Admin", color: "#7c3aed", bg: "#ede9fe" };
  if (r === "head") return { label: "Head", color: MAROON, bg: "#fef3f2" };
  return { label: authorRole, color: "#374151", bg: "#f3f4f6" };
}
function buildTimes() {
  const list: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 30) { const hh = ((h + 11) % 12) + 1; list.push(`${hh}:${m.toString().padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`); }
  return list;
}
const TIME_OPTIONS = buildTimes();
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "TRUE_FALSE", label: "True / False" },
  { value: "FILL_BLANK", label: "Fill in the Blank" },
  { value: "ESSAY", label: "Essay" },
  { value: "MATCHING", label: "Matching" },
  { value: "FILE_UPLOAD", label: "File Upload" },
];

function useOnClickOutside<T extends HTMLElement>(ref: React.RefObject<T | null>, handler: () => void) {
  useEffect(() => {
    function listener(e: MouseEvent) { if (!ref.current || ref.current.contains(e.target as Node)) return; handler(); }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ─── AuthorLabel ──────────────────────────────────────────────────────────────
function AuthorLabel({ authorName, authorRole, authorImage }: { authorName?: string; authorRole?: string; authorImage?: string | null; }) {
  if (!authorName) return null;
  const badge = getRoleBadge(authorRole);
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      {authorImage ? (
        <img src={authorImage} alt={authorName} className="w-4 h-4 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-white text-[8px] font-bold"
          style={{ background: badge?.color ?? "#6b7280" }}>
          {authorName.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-xs text-gray-500">Published by <span className="font-medium text-gray-700">{authorName}</span></span>
      {badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>}
    </div>
  );
}

// ─── AccessCodeModal ──────────────────────────────────────────────────────────
function AccessCodeModal({ onSubmit, onCancel }: { onSubmit: (code: string) => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-2xl w-80 border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Access Code Required</h3>
          <p className="text-xs text-gray-500 mt-1">Enter the access code provided by your instructor.</p>
        </div>
        <div className="px-6 py-4">
          <input autoFocus type="text" value={code} onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSubmit(code)} placeholder="Enter access code..."
            className="w-full h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#7b1113] tracking-widest text-center font-mono" />
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onCancel} className="h-8 px-4 border border-gray-300 rounded-lg text-xs text-gray-700 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSubmit(code)} className="h-8 px-4 rounded-lg text-xs text-white hover:opacity-90" style={{ background: MAROON }}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

// ─── QuizConfirmationScreen ───────────────────────────────────────────────────
function QuizConfirmationScreen({ quiz, score, total, onBack }: { quiz: Quiz; score?: number; total: number; onBack: () => void; }) {
  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center max-w-md w-full">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#f0fdf4" }}>
          <svg width="32" height="32" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Quiz Submitted!</h2>
        <p className="text-sm text-gray-500 mb-5">Your response has been recorded.</p>
        {quiz.showResultsToRespondents && score !== undefined && (
          <div className="rounded-lg p-4 mb-5" style={{ background: "#fef3f2" }}>
            <p className="text-xs text-gray-500 mb-1">Your Score</p>
            <p className="text-3xl font-bold" style={{ color: MAROON }}>{score} <span className="text-base font-normal text-gray-400">/ {total}</span></p>
          </div>
        )}
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-medium text-white hover:opacity-90" style={{ background: MAROON }}>← Back to Quizzes</button>
      </div>
    </div>
  );
}

// ─── QuizQuestionView ─────────────────────────────────────────────────────────
function QuizQuestionView({ question, index, answer, onChange, locked }: {
  question: QuizQuestion; index: number;
  answer: string | string[] | Record<string, string> | undefined;
  onChange: (val: string | string[] | Record<string, string>) => void; locked: boolean;
}) {
  const strAnswer = typeof answer === "string" ? answer : "";
  const gridAnswer = (answer && !Array.isArray(answer) && typeof answer === "object") ? answer as Record<string, string> : {};
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: MAROON }} />
        <div className="flex-1 px-6 pt-5 pb-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <p className="text-sm font-medium text-gray-800 flex-1"><span className="text-gray-400 mr-1.5">{index}.</span>{question.question}{question.required && <span className="ml-1 text-red-500">*</span>}</p>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: "#fef3f2", color: MAROON }}>{question.points} pt{question.points !== 1 ? "s" : ""}</span>
          </div>
          {question.image && <Image src={question.image} alt="" width={400} height={160} className="rounded-md max-h-40 object-cover mb-3 border border-gray-100" />}
          {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && (
            <div className="space-y-2 mt-2">
              {(question.answers ?? []).map((opt, i) => (
                <label key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${strAnswer === opt.text ? "border-[#7b1113] bg-[#fef3f2]" : "border-gray-200 hover:bg-gray-50"} ${locked ? "cursor-not-allowed opacity-70" : ""}`}>
                  <input type="radio" name={question.id} value={opt.text} checked={strAnswer === opt.text} onChange={() => !locked && onChange(opt.text)} disabled={locked} style={{ accentColor: MAROON }} />
                  <span className="text-sm text-gray-700">{opt.text}</span>
                </label>
              ))}
            </div>
          )}
          {question.type === "FILL_BLANK" && <input type="text" value={strAnswer} onChange={e => !locked && onChange(e.target.value)} disabled={locked} placeholder="Your answer" className="mt-2 w-full max-w-md h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#7b1113] disabled:bg-gray-50" />}
          {question.type === "ESSAY" && <textarea value={strAnswer} onChange={e => !locked && onChange(e.target.value)} disabled={locked} placeholder="Your answer" rows={4} className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7b1113] resize-none disabled:bg-gray-50" />}
          {question.type === "MATCHING" && (
            <div className="mt-3 space-y-2">
              {(question.matchPairs ?? []).map((pair, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-gray-700">{pair.left}</div>
                  <input type="text" value={gridAnswer[pair.left] ?? ""} onChange={e => !locked && onChange({ ...gridAnswer, [pair.left]: e.target.value })} disabled={locked} placeholder="Match with..." className="flex-1 h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#7b1113] disabled:bg-gray-50" />
                </div>
              ))}
            </div>
          )}
          {question.type === "FILE_UPLOAD" && (
            <div className="mt-2">
              <label className={`inline-flex items-center gap-2 h-9 px-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#7b1113] cursor-pointer ${locked ? "opacity-50 pointer-events-none" : ""}`}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" /><polyline points="17 8 12 3 7 8" strokeLinecap="round" /><line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" /></svg>
                {strAnswer ? strAnswer : "Choose file..."}
                <input type="file" className="hidden" disabled={locked} onChange={e => !locked && onChange(e.target.files?.[0]?.name ?? "")} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QuizTakingView ───────────────────────────────────────────────────────────
function QuizTakingView({ courseId, quiz, onBack, onSubmit }: { courseId: string; quiz: Quiz; onBack: () => void; onSubmit: (answers: Answers, score: number) => void; }) {
  const questions = quiz.questions ?? [];
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validateAndSubmit = async () => {
    const errors: string[] = [];
    for (const q of questions) { if (!q.required) continue; const ans = answers[q.id]; if (!ans || (Array.isArray(ans) && ans.length === 0) || ans === "") errors.push(q.id); }
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/quizzes/${quiz.id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, durationSeconds: 0 }) });
      const data = await res.json() as { score?: number; error?: string };
      if (res.ok) { setScore(data.score ?? 0); setSubmitted(true); onSubmit(answers, data.score ?? 0); }
      else alert(data.error || "Failed to submit quiz");
    } catch { alert("Failed to submit quiz"); } finally { setIsSubmitting(false); }
  };
  const totalPts = questions.reduce((s, q) => s + (q.points || 0), 0);
  const answeredCount = questions.filter(q => { const a = answers[q.id]; return a !== undefined && a !== "" && !(Array.isArray(a) && a.length === 0); }).length;
  if (submitted) return <QuizConfirmationScreen quiz={quiz} score={quiz.showResultsToRespondents ? score : undefined} total={totalPts} onBack={onBack} />;
  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" strokeLinecap="round" /></svg>Back to Quizzes</button>
        <div className="flex-1" />
        <div className="text-xs text-gray-500"><span className="font-semibold text-gray-800">{answeredCount}</span>/{questions.length} answered</div>
      </div>
      <div className="h-1 bg-gray-100"><div className="h-full transition-all" style={{ background: MAROON, width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%` }} /></div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border-t-4 px-6 py-5 mb-5" style={{ borderTopColor: MAROON }}>
            <h1 className="text-xl font-semibold text-gray-800 mb-2">{quiz.title}</h1>
            {quiz.description && <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: quiz.description }} />}
            {quiz.authorName && <div className="mt-3 pt-3 border-t border-gray-100"><AuthorLabel authorName={quiz.authorName} authorRole={quiz.authorRole} authorImage={quiz.authorImage} /></div>}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span><strong className="text-gray-700">{totalPts}</strong> pts total</span>
              {quiz.dueDate && <span>Due <strong className="text-gray-700">{formatDate(quiz.dueDate)}</strong></span>}
            </div>
          </div>
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} id={`q-${q.id}`}>
                <QuizQuestionView question={q} index={idx + 1} answer={answers[q.id]} onChange={val => setAnswers(prev => ({ ...prev, [q.id]: val }))} locked={false} />
                {validationErrors.includes(q.id) && <p className="text-xs text-red-600 mt-1.5 ml-1">⚠ This question is required.</p>}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={validateAndSubmit} disabled={isSubmitting} className="h-10 px-8 rounded-lg text-sm font-semibold text-white hover:opacity-90 shadow-sm disabled:opacity-50" style={{ background: MAROON }}>{isSubmitting ? "Submitting..." : "Submit Quiz"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QuizDetailView ───────────────────────────────────────────────────────────
function QuizDetailView({ quiz, onBack, onStart }: { quiz: Quiz; onBack: () => void; onStart: () => void; }) {
  const status = getQuizStatusBadge(quiz);
  const available = isAvailable(quiz.availableFrom, quiz.availableUntil) && quiz.published;
  const questionCount = quiz.questions?.length ?? 0;
  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" strokeLinecap="round" /></svg>Quizzes</button>
        <span className="text-gray-300 text-xs">/</span>
        <span className="text-xs text-gray-700 font-medium truncate">{quiz.title}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border-t-4 mb-4" style={{ borderTopColor: MAROON }}>
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">{quiz.title}</h1>
                  <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: status.bg, color: status.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />{status.label}</span>
                  {quiz.authorName && <div className="mt-2"><AuthorLabel authorName={quiz.authorName} authorRole={quiz.authorRole} authorImage={quiz.authorImage} /></div>}
                </div>
                <div className="text-right shrink-0"><p className="text-3xl font-bold" style={{ color: MAROON }}>{quiz.points}</p><p className="text-xs text-gray-500">points</p></div>
              </div>
              {quiz.description && <div className="text-sm text-gray-600 leading-relaxed mb-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: quiz.description }} />}
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                {questionCount > 0 && <span><strong className="text-gray-700">{questionCount}</strong> question{questionCount !== 1 ? "s" : ""}</span>}
                {quiz.dueDate && <><span>•</span><span>Due <strong className={isOverdue(quiz.dueDate) ? "text-red-600" : "text-gray-700"}>{formatDate(quiz.dueDate)}</strong></span></>}
                {quiz.allowMultipleAttempts && <><span>•</span><span>Multiple attempts allowed</span></>}
              </div>
            </div>
          </div>
          {quiz.submitted && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#dcfce7" }}><svg width="20" height="20" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
              <div className="flex-1"><p className="text-sm font-semibold text-gray-900">Quiz Submitted</p>{quiz.score !== undefined && <p className="text-xs text-gray-600 mt-0.5">Score: <strong className="text-green-700">{quiz.score} / {quiz.points}</strong></p>}</div>
            </div>
          )}
          {(!quiz.submitted || quiz.allowMultipleAttempts) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-5">
              {available ? (
                <button onClick={onStart} className="w-full h-10 rounded-lg text-sm font-semibold text-white hover:opacity-90" style={{ background: MAROON }}>{quiz.submitted ? "Submit Another Response" : "Take Quiz"}</button>
              ) : (
                <div className="w-full h-10 rounded-lg text-sm font-medium text-gray-400 bg-gray-100 flex items-center justify-center"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" className="mr-2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" /></svg>Not Available</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── QuizRowMenu ──────────────────────────────────────────────────────────────
function QuizRowMenu({ onEdit, onDelete, onTogglePublish, published }: { onEdit: () => void; onDelete: () => void; onTogglePublish: () => void; published: boolean; }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400" style={{ fontSize: 18 }}>⋮</button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[160px] overflow-hidden">
          <button type="button" onClick={() => { setOpen(false); onTogglePublish(); }} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50" style={{ color: published ? "#6b7280" : "#16a34a" }}>
            {published ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><line x1="6" y1="18" x2="18" y2="6" strokeLinecap="round" /></svg> : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {published ? "Unpublish" : "Publish"}
          </button>
          <button type="button" onClick={() => { setOpen(false); onEdit(); }} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-gray-50 text-gray-700">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" /></svg>Edit
          </button>
          <div className="border-t border-gray-100" />
          <button type="button" onClick={() => { setOpen(false); onDelete(); }} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 hover:bg-red-50 text-red-600">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" /></svg>Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── QuizListView ─────────────────────────────────────────────────────────────
function QuizListView({ quizzes, search, setSearch, onSelect, onRefresh, canManage, onCreateQuiz, onEditQuiz, onDeleteQuiz, onTogglePublish, currentUserId }: {
  quizzes: Quiz[]; search: string; setSearch: (v: string) => void; onSelect: (quiz: Quiz) => void; onRefresh: () => void;
  canManage: boolean; onCreateQuiz: () => void; onEditQuiz: (quiz: Quiz) => void;
  onDeleteQuiz: (quiz: Quiz) => void; onTogglePublish: (quiz: Quiz) => void; currentUserId?: string;
}) {
  const filtered = quizzes.filter(q => q.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="px-6 py-6">
      {canManage && (
        <div className="rounded-lg border px-4 py-3 mb-5 bg-[#fdf8f8]" style={{ borderColor: "#f0e4e4" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#111827" }}>Head Controls</p>
              <p className="text-xs text-gray-500">You can create and manage quizzes. You can only edit or delete quizzes you created.</p>
            </div>
            <button onClick={onCreateQuiz} className="text-sm text-white rounded px-4 py-2 hover:opacity-90 shrink-0" style={{ background: MAROON }}>+ Create Quiz</button>
          </div>
        </div>
      )}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..." className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-1 focus:border-[#7b1113]" />
        </div>
        <button onClick={onRefresh} title="Refresh" className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-600">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" strokeLinecap="round" /><polyline points="1 20 1 14 7 14" strokeLinecap="round" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36" strokeLinecap="round" /></svg>
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-lg bg-white">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-sm text-gray-400">No quizzes found</p>
          {canManage && <button onClick={onCreateQuiz} className="mt-3 text-sm font-medium hover:underline" style={{ color: MAROON }}>Create your first quiz</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((quiz) => {
            const status = getQuizStatusBadge(quiz);
            const isOwner = canManage && (quiz.createdByUserId === currentUserId || quiz.authorId === currentUserId);
            const questionCount = quiz.questions?.length ?? 0;
            return (
              <div key={quiz.id} className="w-full bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef3f2" }}>
                    {quiz.submitted ? <svg width="16" height="16" fill="none" stroke="#16a34a" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      : <svg width="16" height="16" fill="none" stroke={MAROON} strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(quiz)}>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold hover:underline truncate" style={{ color: MAROON }}>{quiz.title}</span>
                      {isOwner && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium shrink-0">My Quiz</span>}
                    </div>
                    {/* Published by label */}
                    {quiz.authorName && <AuthorLabel authorName={quiz.authorName} authorRole={quiz.authorRole} authorImage={quiz.authorImage} />}
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-0.5">
                      {quiz.points > 0 && <span>{quiz.points} pts</span>}
                      {questionCount > 0 && <><span>•</span><span>{questionCount} question{questionCount !== 1 ? "s" : ""}</span></>}
                      {quiz.dueDate && <><span>•</span><span className={isOverdue(quiz.dueDate) && !quiz.submitted ? "text-red-600 font-medium" : ""}>Due {formatDate(quiz.dueDate)}</span></>}
                      {quiz.submitted && quiz.score !== undefined && <><span>•</span><span className="text-green-700 font-medium">Score: {quiz.score}/{quiz.points}</span></>}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: status.bg, color: status.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />{status.label}
                  </span>
                  {isOwner ? (
                    <QuizRowMenu published={quiz.published} onEdit={() => onEditQuiz(quiz)} onDelete={() => onDeleteQuiz(quiz)} onTogglePublish={() => onTogglePublish(quiz)} />
                  ) : (
                    <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth={2} viewBox="0 0 24 24" className="shrink-0 cursor-pointer" onClick={() => onSelect(quiz)}><polyline points="9 18 15 12 9 6" strokeLinecap="round" /></svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── QuizQuestionEditor ───────────────────────────────────────────────────────
function QuizQuestionEditor({ question, index, onChange, onDelete, onMoveUp, onMoveDown }: {
  question: QuizQuestion; index: number; onChange: (q: QuizQuestion) => void;
  onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [isActive, setIsActive] = useState(false);
  const updateAnswer = (i: number, field: keyof QuizAnswer, val: string | boolean) => {
    const updated = [...(question.answers ?? [])]; updated[i] = { ...updated[i], [field]: val }; onChange({ ...question, answers: updated });
  };
  return (
    <div className={`bg-white rounded-lg shadow-sm transition-all ${isActive ? "shadow-md" : "cursor-pointer hover:shadow-md"}`}
      style={{ border: "1px solid #e5e7eb", borderLeft: isActive ? `3px solid ${MAROON}` : "1px solid #e5e7eb" }}
      onClick={() => !isActive && setIsActive(true)}>
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-xs text-gray-400 font-medium mt-2 shrink-0">{index}.</span>
          <div className="flex-1">
            {isActive ? (
              <input value={question.question} onChange={e => onChange({ ...question, question: e.target.value })} placeholder="Question text"
                className="w-full text-sm bg-gray-50 border-0 border-b-2 px-2 py-1.5 outline-none rounded-t" style={{ borderBottomColor: MAROON }} />
            ) : (
              <p className="text-sm font-medium text-gray-800">{question.question || <span className="text-gray-400 italic">Question text</span>}</p>
            )}
          </div>
          {isActive ? (
            <select value={question.type} onChange={e => {
              const t = e.target.value as QuestionType;
              const defaults: Partial<QuizQuestion> = {};
              if (t === "MULTIPLE_CHOICE") defaults.answers = [{ text: "Option A", correct: true }, { text: "Option B", correct: false }];
              if (t === "TRUE_FALSE") defaults.answers = [{ text: "True", correct: true }, { text: "False", correct: false }];
              if (t === "MATCHING") defaults.matchPairs = [{ left: "Item 1", right: "Match 1" }, { left: "Item 2", right: "Match 2" }];
              onChange({ ...question, type: t, ...defaults });
            }} className="h-7 border border-gray-300 rounded px-2 text-xs bg-white outline-none shrink-0">
              {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          ) : (
            <span className="text-[10px] text-gray-400 shrink-0">{QUESTION_TYPES.find(t => t.value === question.type)?.label}</span>
          )}
        </div>
        {(question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") && (
          <div className="space-y-2 ml-5">
            {(question.answers ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" checked={opt.correct} onChange={() => { const updated = (question.answers ?? []).map((a, idx) => ({ ...a, correct: idx === i })); onChange({ ...question, answers: updated }); }} style={{ accentColor: MAROON }} disabled={!isActive} />
                {isActive ? (
                  <>
                    <input value={opt.text} onChange={e => updateAnswer(i, "text", e.target.value)} className="flex-1 text-sm border-0 border-b border-gray-200 pb-0.5 outline-none bg-transparent" onFocus={e => e.target.style.borderBottomColor = MAROON} onBlur={e => e.target.style.borderBottomColor = "#e5e7eb"} />
                    {question.type === "MULTIPLE_CHOICE" && <button type="button" onClick={() => onChange({ ...question, answers: (question.answers ?? []).filter((_, idx) => idx !== i) })} className="text-gray-300 hover:text-gray-500 text-sm w-5">×</button>}
                  </>
                ) : (
                  <span className="text-sm" style={{ color: opt.correct ? "#16a34a" : "#374151", fontWeight: opt.correct ? 600 : 400 }}>{opt.text}{opt.correct ? " ✓" : ""}</span>
                )}
              </div>
            ))}
            {isActive && question.type === "MULTIPLE_CHOICE" && <button type="button" onClick={() => onChange({ ...question, answers: [...(question.answers ?? []), { text: `Option ${(question.answers?.length ?? 0) + 1}`, correct: false }] })} className="ml-6 text-xs text-gray-400 hover:text-gray-600">+ Add option</button>}
          </div>
        )}
        {(question.type === "FILL_BLANK" || question.type === "ESSAY") && (
          <div className="ml-5">
            {isActive ? (
              <div><p className="text-xs text-gray-500 mb-1">Correct Answer {question.type === "ESSAY" ? "(for reference)" : ""}</p><input value={question.correctAnswer ?? ""} onChange={e => onChange({ ...question, correctAnswer: e.target.value })} placeholder="Enter correct answer..." className="w-full h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" /></div>
            ) : <div className="border-b border-dashed border-gray-300 py-1"><span className="text-sm text-gray-300">{question.type === "FILL_BLANK" ? "Short answer text" : "Essay response"}</span></div>}
          </div>
        )}
        {question.type === "MATCHING" && (
          <div className="ml-5 space-y-2">
            {(question.matchPairs ?? []).map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                {isActive ? (<><input value={pair.left} onChange={e => { const u = [...(question.matchPairs ?? [])]; u[i] = { ...u[i], left: e.target.value }; onChange({ ...question, matchPairs: u }); }} placeholder="Left item" className="flex-1 h-7 border border-gray-200 rounded px-2 text-xs outline-none focus:border-[#7b1113]" /><span className="text-gray-400 text-xs">⇄</span><input value={pair.right} onChange={e => { const u = [...(question.matchPairs ?? [])]; u[i] = { ...u[i], right: e.target.value }; onChange({ ...question, matchPairs: u }); }} placeholder="Right item" className="flex-1 h-7 border border-gray-200 rounded px-2 text-xs outline-none focus:border-[#7b1113]" /></>)
                  : <span className="text-sm text-gray-600">{pair.left} ⇄ {pair.right}</span>}
              </div>
            ))}
            {isActive && <button type="button" onClick={() => onChange({ ...question, matchPairs: [...(question.matchPairs ?? []), { left: "", right: "" }] })} className="text-xs text-gray-400 hover:text-gray-600">+ Add pair</button>}
          </div>
        )}
        {question.type === "FILE_UPLOAD" && <div className="ml-5 border-2 border-dashed border-gray-200 rounded p-3 text-center"><span className="text-xs text-gray-400">File Upload Response</span></div>}
      </div>
      {isActive && (
        <div className="flex items-center justify-end gap-1 px-5 py-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 mr-auto">
            <input type="number" min={0} value={question.points} onChange={e => onChange({ ...question, points: parseFloat(e.target.value) || 0 })} className="w-14 h-7 border border-gray-300 rounded px-2 text-xs text-center outline-none focus:border-[#7b1113]" />
            <span className="text-xs text-gray-500">pts</span>
          </div>
          <button type="button" onClick={onMoveUp} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-xs">↑</button>
          <button type="button" onClick={onMoveDown} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 text-xs">↓</button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button type="button" onClick={() => setIsActive(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100">Done</button>
          <button type="button" onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6" strokeLinecap="round" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" strokeLinecap="round" /></svg></button>
        </div>
      )}
    </div>
  );
}

// ─── HeadCreateEditQuizModal ──────────────────────────────────────────────────
type QuizModalTab = "details" | "questions" | "options" | "assign";

function HeadCreateEditQuizModal({ open, quiz, courseId, onClose, onSaved }: {
  open: boolean; quiz?: Quiz; courseId: string; onClose: () => void; onSaved: (quiz: Quiz, isNew: boolean) => void;
}) {
  const isEdit = !!quiz;
  const [tab, setTab] = useState<QuizModalTab>("details");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idCounter = useRef(1000);
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [quizType, setQuizType] = useState(quiz?.quizType ?? "GRADED_QUIZ");
  const [assignmentGroup, setAssignmentGroup] = useState(quiz?.assignmentGroup ?? "Assignments");
  const [points, setPoints] = useState(String(quiz?.points ?? 0));
  const [shuffleAnswers, setShuffleAnswers] = useState(quiz?.shuffleAnswers ?? false);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(quiz?.allowMultipleAttempts ?? false);
  const [attemptLimit, setAttemptLimit] = useState(String(quiz?.attemptLimit ?? 1));
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(quiz?.showCorrectAnswers ?? true);
  const [showOneAtATime, setShowOneAtATime] = useState(quiz?.showOneAtATime ?? false);
  const [lockQuestionsAfterAnswering, setLockQuestionsAfterAnswering] = useState(quiz?.lockQuestionsAfterAnswering ?? false);
  const [accessCodeEnabled, setAccessCodeEnabled] = useState(!!(quiz?.accessCode));
  const [accessCode, setAccessCode] = useState(quiz?.accessCode ?? "");
  const [assignTo, setAssignTo] = useState<string[]>(quiz?.assignTo ?? ["Everyone"]);
  const [dueDate, setDueDate] = useState(quiz?.dueDate ? new Date(quiz.dueDate).toISOString().split("T")[0] : "");
  const [dueTime, setDueTime] = useState("");
  const [availableFrom, setAvailableFrom] = useState(quiz?.availableFrom ? new Date(quiz.availableFrom).toISOString().split("T")[0] : "");
  const [availableFromTime, setAvailableFromTime] = useState("");
  const [availableUntil, setAvailableUntil] = useState(quiz?.availableUntil ? new Date(quiz.availableUntil).toISOString().split("T")[0] : "");
  const [availableUntilTime, setAvailableUntilTime] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>(quiz?.questions ?? []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const computedPoints = questions.reduce((s, q) => s + (q.points || 0), 0);
  const displayPoints = questions.length > 0 ? computedPoints : (parseFloat(points) || 0);

  const addQuestion = () => {
    const id = `new_${idCounter.current++}`;
    setQuestions(prev => [...prev, { id, type: "MULTIPLE_CHOICE", question: "", points: 1, required: true, answers: [{ text: "Option A", correct: true }, { text: "Option B", correct: false }] }]);
    setTab("questions");
  };

  const handleSave = async (publish: boolean) => {
    setError(null);
    if (!title.trim()) { setError("Quiz title is required."); setTab("details"); return; }
    setSaving(true);
    try {
      const toDate = (date: string, time: string) => { if (!date) return null; return new Date(`${date} ${time || "11:59 PM"}`).toISOString(); };
      const payload = {
        title: title.trim(), description, quizType, assignmentGroup, points: displayPoints,
        shuffleAnswers, allowMultipleAttempts, attemptLimit: allowMultipleAttempts ? (parseInt(attemptLimit) || null) : null,
        showCorrectAnswers, showOneAtATime, lockQuestionsAfterAnswering,
        accessCode: accessCodeEnabled ? accessCode : null, assignTo, published: publish,
        dueDate: toDate(dueDate, dueTime), availableFrom: toDate(availableFrom, availableFromTime), availableUntil: toDate(availableUntil, availableUntilTime),
        questions: questions.map((q, idx) => ({
          type: q.type, question: q.question, points: q.points, correctAnswer: q.correctAnswer ?? null, order: idx,
          answers: (q.answers ?? []).map((a, ai) => ({ text: a.text, correct: a.correct, order: ai })),
          matchPairs: (q.matchPairs ?? []).map((mp, mi) => ({ left: mp.left, right: mp.right, order: mi })),
        })),
      };
      const url = isEdit ? `/api/admin/courses/${courseId}/quizzes/${quiz!.id}` : `/api/admin/courses/${courseId}/quizzes`;
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json() as { quiz?: Quiz; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to save quiz."); return; }
      onSaved(data.quiz ?? { id: String(Date.now()), title: title.trim(), description, points: displayPoints, published: publish, questions, allowMultipleAttempts, showResultsToRespondents: showCorrectAnswers, dueDate: toDate(dueDate, dueTime), availableFrom: toDate(availableFrom, availableFromTime), availableUntil: toDate(availableUntil, availableUntilTime), accessCode: accessCodeEnabled ? accessCode : null, assignTo, quizType, assignmentGroup, shuffleAnswers, showOneAtATime, lockQuestionsAfterAnswering }, !isEdit);
      onClose();
    } catch { setError("Network error. Please try again."); } finally { setSaving(false); }
  };

  const TABS: { key: QuizModalTab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "questions", label: `Questions${questions.length > 0 ? ` (${questions.length})` : ""}` },
    { key: "options", label: "Options" },
    { key: "assign", label: "Assign" },
  ];

  return (
    <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-[1100px] max-w-[98vw] h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div><div className="text-base font-semibold text-gray-900">{isEdit ? "Edit Quiz" : "Create Quiz"}</div><div className="text-xs text-gray-500 mt-0.5">{isEdit ? `Editing: ${quiz!.title}` : "New quiz for this course"}</div></div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded text-gray-500 hover:bg-gray-50">✕</button>
        </div>
        <div className="flex items-center justify-end px-6 py-2 border-b border-gray-200 bg-white shrink-0 text-xs text-gray-500">Points: <strong className="text-gray-800 ml-1">{displayPoints}</strong></div>
        <div className="flex items-end border-b border-gray-200 px-6 bg-white shrink-0">
          {TABS.map(t => <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-xs border border-b-0 -mb-px mr-0.5 rounded-t transition-colors ${tab === t.key ? "bg-white border-gray-200 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{t.label}</button>)}
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {tab === "details" && (
            <div className="space-y-5 max-w-2xl">
              <div><label className="text-xs text-gray-500 block mb-1">Quiz Title <span className="text-red-500">*</span></label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title" className="w-full h-9 border rounded-sm px-3 text-sm outline-none focus:ring-1" style={{ borderColor: MAROON }} /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Description</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Quiz instructions or description..." className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm outline-none focus:border-[#7b1113] resize-none" /></div>
              <div className="grid grid-cols-[180px_1fr] items-center gap-y-4 gap-x-4">
                <label className="text-xs text-gray-700 text-right">Quiz Type</label>
                <select value={quizType} onChange={e => setQuizType(e.target.value)} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-72 bg-white outline-none focus:border-[#7b1113]">
                  <option value="GRADED_QUIZ">Graded Quiz</option><option value="PRACTICE_QUIZ">Practice Quiz</option><option value="GRADED_SURVEY">Graded Survey</option><option value="UNGRADED_SURVEY">Ungraded Survey</option>
                </select>
                <label className="text-xs text-gray-700 text-right">Assignment Group</label>
                <input value={assignmentGroup} onChange={e => setAssignmentGroup(e.target.value)} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-72 outline-none focus:border-[#7b1113]" />
                <label className="text-xs text-gray-700 text-right">Points</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} value={questions.length > 0 ? computedPoints : points} onChange={e => setPoints(e.target.value)} readOnly={questions.length > 0} className="h-8 border border-gray-300 rounded-sm px-3 text-xs w-32 outline-none focus:border-[#7b1113]" style={questions.length > 0 ? { background: "#f9fafb", color: "#6b7280" } : {}} />
                  {questions.length > 0 && <span className="text-xs text-gray-400">(calculated from questions)</span>}
                </div>
              </div>
            </div>
          )}
          {tab === "questions" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-gray-700">{questions.length} question{questions.length !== 1 ? "s" : ""} · {computedPoints} pts total</p>
                <button type="button" onClick={addQuestion} className="h-8 px-4 text-xs font-medium text-white rounded-lg hover:opacity-90" style={{ background: MAROON }}>+ Add Question</button>
              </div>
              {questions.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-200 rounded-lg bg-white"><div className="text-3xl mb-3">📝</div><p className="text-sm text-gray-400 mb-3">No questions yet</p><button type="button" onClick={addQuestion} className="h-8 px-4 text-xs font-medium text-white rounded-lg hover:opacity-90" style={{ background: MAROON }}>Add First Question</button></div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, idx) => (
                    <QuizQuestionEditor key={q.id} question={q} index={idx + 1}
                      onChange={updated => { const u = [...questions]; u[idx] = updated; setQuestions(u); }}
                      onDelete={() => setQuestions(prev => prev.filter((_, i) => i !== idx))}
                      onMoveUp={() => { if (idx === 0) return; const u = [...questions]; [u[idx - 1], u[idx]] = [u[idx], u[idx - 1]]; setQuestions(u); }}
                      onMoveDown={() => { if (idx === questions.length - 1) return; const u = [...questions]; [u[idx], u[idx + 1]] = [u[idx + 1], u[idx]]; setQuestions(u); }}
                    />
                  ))}
                  <button type="button" onClick={addQuestion} className="w-full h-10 border border-dashed border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors">+ Add Another Question</button>
                </div>
              )}
            </div>
          )}
          {tab === "options" && (
            <div className="max-w-lg space-y-5">
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Quiz Behavior</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={shuffleAnswers} onChange={e => setShuffleAnswers(e.target.checked)} style={{ accentColor: MAROON }} />Shuffle Answers</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={showCorrectAnswers} onChange={e => setShowCorrectAnswers(e.target.checked)} style={{ accentColor: MAROON }} />Show Correct Answers After Submission</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={showOneAtATime} onChange={e => setShowOneAtATime(e.target.checked)} style={{ accentColor: MAROON }} />Show One Question at a Time</label>
                {showOneAtATime && <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer pl-5"><input type="checkbox" checked={lockQuestionsAfterAnswering} onChange={e => setLockQuestionsAfterAnswering(e.target.checked)} style={{ accentColor: MAROON }} />Lock Questions After Answering</label>}
              </div>
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Attempts</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={allowMultipleAttempts} onChange={e => setAllowMultipleAttempts(e.target.checked)} style={{ accentColor: MAROON }} />Allow Multiple Attempts</label>
                {allowMultipleAttempts && <div className="pl-5 flex items-center gap-2"><span className="text-sm text-gray-600">Attempt Limit</span><input type="number" min={1} value={attemptLimit} onChange={e => setAttemptLimit(e.target.value)} className="w-20 h-7 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" /></div>}
              </div>
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Access</p>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"><input type="checkbox" checked={accessCodeEnabled} onChange={e => setAccessCodeEnabled(e.target.checked)} style={{ accentColor: MAROON }} />Require Access Code</label>
                {accessCodeEnabled && <input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="Enter access code" className="w-full h-8 border border-gray-300 rounded px-2 text-sm outline-none focus:border-[#7b1113]" />}
              </div>
            </div>
          )}
          {tab === "assign" && (
            <div className="max-w-lg space-y-4">
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Assign To</p>
                  <div className="flex flex-wrap gap-2 mb-2">{assignTo.map(a => <span key={a} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white" style={{ background: MAROON }}>{a}<button type="button" onClick={() => setAssignTo(prev => prev.filter(x => x !== a))} className="opacity-70 hover:opacity-100">×</button></span>)}</div>
                  <div className="flex gap-2">
                    <input placeholder="Add assignee or 'Everyone'" className="flex-1 h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" onKeyDown={e => { if (e.key === "Enter") { const val = (e.target as HTMLInputElement).value.trim(); if (val && !assignTo.includes(val)) setAssignTo(prev => [...prev, val]); (e.target as HTMLInputElement).value = ""; } }} />
                    <button type="button" onClick={() => setAssignTo(["Everyone"])} className="h-8 px-3 text-xs border border-gray-300 rounded hover:bg-gray-50">Everyone</button>
                  </div>
                </div>
                {([["Due Date", dueDate, setDueDate, dueTime, setDueTime], ["Available From", availableFrom, setAvailableFrom, availableFromTime, setAvailableFromTime], ["Until", availableUntil, setAvailableUntil, availableUntilTime, setAvailableUntilTime]] as const).map(([label, dateVal, setDate, timeVal, setTime]) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
                    <div className="flex gap-2">
                      <input type="date" value={dateVal} onChange={e => setDate(e.target.value)} className="flex-1 h-8 border border-gray-300 rounded px-2 text-xs outline-none focus:border-[#7b1113]" />
                      <select value={timeVal} onChange={e => setTime(e.target.value)} className="h-8 border border-gray-300 rounded px-2 text-xs bg-white outline-none focus:border-[#7b1113] w-28"><option value="">Time</option>{TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}</select>
                      <button type="button" onClick={() => { setDate(""); setTime(""); }} className="text-xs hover:underline" style={{ color: MAROON }}>Clear</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="shrink-0 border-t border-gray-200 bg-white px-8 py-3 flex items-center justify-between">
          <div>{error && <span className="text-xs text-red-600 font-medium">⚠ {error}</span>}</div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={saving} className="h-8 px-5 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            {tab !== "details" && <button type="button" onClick={() => setTab(tab === "questions" ? "details" : tab === "options" ? "questions" : "options")} className="h-8 px-4 border border-gray-300 bg-white text-xs text-gray-700 rounded hover:bg-gray-50">← Back</button>}
            {tab !== "assign" && <button type="button" onClick={() => setTab(tab === "details" ? "questions" : tab === "questions" ? "options" : "assign")} className="h-8 px-4 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100">Next →</button>}
            {tab === "assign" && (<><button onClick={() => handleSave(true)} disabled={saving} className="h-8 px-5 border border-gray-300 bg-gray-50 text-xs text-gray-700 rounded hover:bg-gray-100 disabled:opacity-50">{saving ? "Saving..." : "Save & Publish"}</button><button onClick={() => handleSave(false)} disabled={saving} style={{ background: MAROON }} className="h-8 px-5 text-white text-xs rounded hover:opacity-90 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button></>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface CourseQuizzesPageProps { courseId: string; canManage?: boolean; currentUserId?: string; }
type ViewMode = "list" | "detail" | "taking";

export default function CourseQuizzesPage({ courseId, canManage = false, currentUserId }: CourseQuizzesPageProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const url = canManage ? `/api/admin/courses/${courseId}/quizzes` : `/api/courses/${courseId}/quizzes?assigned=true&published=true`;
      const res = await fetch(url);
      const data = await res.json() as { quizzes?: Quiz[] };
      if (res.ok) setQuizzes(data.quizzes ?? []);
    } catch (e) { console.error("Failed to load quizzes:", e); } finally { setLoading(false); }
  }, [courseId, canManage]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDeleteQuiz = async (quiz: Quiz) => {
    if (!confirm(`Delete "${quiz.title}"? This cannot be undone.`)) return;
    setQuizzes(prev => prev.filter(q => q.id !== quiz.id));
    try { await fetch(`/api/admin/courses/${courseId}/quizzes/${quiz.id}`, { method: "DELETE" }); } catch { /* optimistic */ }
  };

  const handleTogglePublish = async (quiz: Quiz) => {
    const newPublished = !quiz.published;
    setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, published: newPublished } : q));
    try { await fetch(`/api/admin/courses/${courseId}/quizzes/${quiz.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: newPublished }) }); } catch { /* optimistic */ }
  };

  const handleQuizSubmit = (_answers: Answers, score: number) => {
    if (!selectedQuiz) return;
    setQuizzes(prev => prev.map(q => q.id === selectedQuiz.id ? { ...q, submitted: true, score, attempts: (q.attempts ?? 0) + 1 } : q));
    setSelectedQuiz(prev => prev ? { ...prev, submitted: true, score } : prev);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 bg-gray-50"><div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: `${MAROON} transparent ${MAROON} transparent` }} /></div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {view === "list" && <div className="bg-white border-b border-gray-200 px-6 py-3 shrink-0"><h1 className="text-base font-semibold text-gray-800">Quizzes</h1></div>}
      {view === "list" && (
        <div className="flex-1 overflow-y-auto">
          <QuizListView quizzes={quizzes} search={search} setSearch={setSearch} onSelect={q => { setSelectedQuiz(q); setView("detail"); }} onRefresh={loadData}
            canManage={canManage} currentUserId={currentUserId}
            onCreateQuiz={() => { setEditingQuiz(undefined); setShowCreateModal(true); }}
            onEditQuiz={q => { setEditingQuiz(q); setShowCreateModal(true); }}
            onDeleteQuiz={handleDeleteQuiz} onTogglePublish={handleTogglePublish}
          />
        </div>
      )}
      {view === "detail" && selectedQuiz && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <QuizDetailView quiz={selectedQuiz} onBack={() => { setView("list"); setSelectedQuiz(null); }} onStart={() => { if (!selectedQuiz) return; if (selectedQuiz.accessCode) setShowAccessCode(true); else setView("taking"); }} />
        </div>
      )}
      {view === "taking" && selectedQuiz && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <QuizTakingView courseId={courseId} quiz={selectedQuiz} onBack={() => setView("detail")} onSubmit={handleQuizSubmit} />
        </div>
      )}
      {showAccessCode && <AccessCodeModal onSubmit={code => { if (selectedQuiz && code === selectedQuiz.accessCode) { setShowAccessCode(false); setView("taking"); } else alert("Incorrect access code."); }} onCancel={() => setShowAccessCode(false)} />}
      <HeadCreateEditQuizModal open={showCreateModal} quiz={editingQuiz} courseId={courseId}
        onClose={() => { setShowCreateModal(false); setEditingQuiz(undefined); }}
        onSaved={(saved, isNew) => { if (isNew) setQuizzes(prev => [saved, ...prev]); else setQuizzes(prev => prev.map(q => q.id === saved.id ? saved : q)); setEditingQuiz(undefined); }}
      />
    </div>
  );
}