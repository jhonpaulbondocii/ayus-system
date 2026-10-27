"use client";
import { useEffect, useState, use } from "react";

// ⚠️ PALITAN ng eksaktong tanong ng papel na CSM form. Panatilihing q1..q5 (o i-update ang KEYS sa API).
const QUESTIONS: { key: string; text: string }[] = [
  { key: "q1", text: "The reservation process was easy and clear." },
  { key: "q2", text: "The librarian/library staff were courteous and helpful." },
  { key: "q3", text: "The facility was clean and ready for use." },
  { key: "q4", text: "The facility met the needs of our activity." },
  { key: "q5", text: "Overall, I am satisfied with the service." },
];
const SCALE = [
  [5, "Strongly agree"], [4, "Agree"], [3, "Neutral"], [2, "Disagree"], [1, "Strongly disagree"],
] as const;

type Info = { name: string; activityType: string; startAt: string; submitted: boolean };

export default function CsmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/public/csm/${token}`).then(async r => {
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Form not found.");
      setInfo(d);
    }).catch(e => setError(e.message));
  }, [token]);

  const submit = async () => {
    if (QUESTIONS.some(q => !answers[q.key])) return setError("Please answer all questions.");
    setBusy(true); setError("");
    const res = await fetch(`/api/public/csm/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, comment }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error ?? "Couldn’t submit."); else setDone(true);
    setBusy(false);
  };

  if (error && !info) return <main className="min-h-screen flex items-center justify-center text-sm text-red-600">{error}</main>;
  if (!info) return <main className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading…</main>;
  if (done || info.submitted) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
        <h1 className="text-lg font-bold text-gray-900">Thank you!</h1>
        <p className="text-sm text-gray-600 mt-2">Your feedback has been recorded.</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 text-white" style={{ background: "#7b1113" }}>
          <p className="text-xs opacity-80">Pampanga State University · Library Services Office</p>
          <h1 className="text-lg font-bold">Client Satisfaction Measurement</h1>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-xs text-gray-600">{info.name} · {info.activityType}</p>
          {QUESTIONS.map(q => (
            <fieldset key={q.key}>
              <legend className="text-sm font-semibold text-gray-800 mb-2">{q.text}</legend>
              <div className="grid grid-cols-5 gap-1.5">
                {SCALE.map(([v, l]) => (
                  <button key={v} type="button" onClick={() => { setAnswers(p => ({ ...p, [q.key]: v })); setError(""); }}
                    aria-pressed={answers[q.key] === v}
                    className="rounded-lg border px-1 py-2 text-[10px] font-semibold leading-tight"
                    style={answers[q.key] === v ? { background: "#7b1113", color: "#fff", borderColor: "#7b1113" } : { borderColor: "#e5e7eb", color: "#374151" }}>
                    <span className="block text-sm">{v}</span>{l}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Comments or suggestions (optional)</label>
            <textarea rows={3} maxLength={1000} value={comment} onChange={e => setComment(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#7b1113]" />
          </div>
          {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
          <button onClick={submit} disabled={busy}
            className="w-full h-11 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: "#7b1113" }}>
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </main>
  );
}