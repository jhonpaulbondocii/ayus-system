"use client";
import { useEffect, useRef, useState, use } from "react";

type Slot = { startAt: string; endAt: string; status: string };
type Type = "STUDENT" | "EMPLOYEE" | "COMMUNITY";

type Participant = { name: string; sex: "M" | "F" };
const joinName = (...parts: string[]) => parts.map(p => p.trim()).filter(Boolean).join(" ");
const today = () => new Date().toLocaleDateString("en-CA");
const tm = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA");

const input = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#7b1113]";
const label = "block text-xs font-semibold text-gray-600 mb-1";

function SignaturePad({ onChange }: { onChange: (v: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const pos = (e: React.PointerEvent) => {
    const c = ref.current!, r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const down = (e: React.PointerEvent) => {
    const c = ref.current!, ctx = c.getContext("2d")!;
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
    drawing.current = true;
    const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    c.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!, p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); onChange("");
  };

  return (
    <div>
      <canvas ref={ref} width={600} height={200}
        className="w-full h-32 border border-gray-300 rounded-lg bg-white" style={{ touchAction: "none" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <button type="button" onClick={clear} className="mt-1 text-xs font-semibold underline text-gray-600">Clear signature</button>
    </div>
  );
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<"loading" | "ok" | "gone">("loading");
  const [goneMsg, setGoneMsg] = useState("");
  const [lockedType, setLockedType] = useState<Type | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [f, setF] = useState({
     requestorType: "STUDENT" as Type, firstName: "", middleName: "", lastName: "", sex: "", collegeDept: "", courseYearSection: "", email: "", contactNo: "",
    activityType: "", date: today(), start: "09:00", end: "11:00", consent: false,
  });
  const [participants, setParticipants] = useState<Participant[]>([{ name: "", sex: "M" }]);
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean) => { setF(p => ({ ...p, [k]: v })); setError(""); };
  const printedName = joinName(f.firstName, f.middleName, f.lastName);
  const filledParticipants = participants.filter(p => p.name.trim());
  const updateParticipant = (i: number, patch: Partial<Participant>) => {
    setParticipants(prev => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    setError("");
  };
  const addParticipant = () => setParticipants(prev => [...prev, { name: "", sex: "M" }]);
  const removeParticipant = (i: number) =>
    setParticipants(prev => (prev.length === 1 ? [{ name: "", sex: "M" }] : prev.filter((_, idx) => idx !== i)));

  useEffect(() => {
    fetch(`/api/public/library-facilities/invite/${token}`).then(async r => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setGoneMsg(d.error ?? "Invalid link."); setState("gone"); return; }
      setSlots(d.slots ?? []);
      if (d.requestorType) { setLockedType(d.requestorType); setF(p => ({ ...p, requestorType: d.requestorType })); }
      setState("ok");
    }).catch(() => { setGoneMsg("Couldn’t load the form. Check your connection."); setState("gone"); });
  }, [token]);

  const daySlots = slots.filter(s => dayKey(s.startAt) === f.date);

  const submit = async () => {
    const startAt = new Date(`${f.date}T${f.start}`), endAt = new Date(`${f.date}T${f.end}`);
    if (!f.firstName.trim() || !f.lastName.trim()) return setError("Enter your first name and last name.");
    if (!signature) return setError("Please sign the form.");
    setBusy(true);
    try {
      const res = await fetch(`/api/public/library-facilities/invite/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f, name: printedName, participants: filledParticipants, signature,
          startAt: isNaN(startAt.getTime()) ? "" : startAt.toISOString(),
          endAt: isNaN(endAt.getTime()) ? "" : endAt.toISOString(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setError(d.error ?? "Couldn’t submit your request.");
      setDone(true);
    } catch { setError("Couldn’t submit. Check your connection."); }
    finally { setBusy(false); }
  };

  if (state === "loading") return <main className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading…</main>;
  if (state === "gone") return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
        <h1 className="text-lg font-bold text-gray-900">Link not available</h1>
        <p className="text-sm text-gray-600 mt-2">{goneMsg}</p>
      </div>
    </main>
  );
  if (done) return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
        <h1 className="text-lg font-bold text-gray-900">Form submitted</h1>
        <p className="text-sm text-gray-600 mt-2">
          We sent a confirmation to <b>{f.email}</b>. The librarian will review your request. You will get an email
          once your form is approved and ready to claim.
        </p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-6 py-4 text-white" style={{ background: "#7b1113" }}>
          <p className="text-xs opacity-80">Pampanga State University · Library Services Office</p>
          <h1 className="text-lg font-bold">Library Facilities Reservation Form</h1>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className={label}>Requestor *</label>
            <div className="grid grid-cols-3 gap-2">
              {([["EMPLOYEE", "Employee"], ["STUDENT", "Student"], ["COMMUNITY", "Community"]] as const).map(([v, l]) => (
                <button key={v} type="button" disabled={!!lockedType && lockedType !== v} onClick={() => set("requestorType", v)}
                  className="h-9 rounded-lg border text-xs font-semibold disabled:opacity-40"
                  style={f.requestorType === v ? { background: "#7b1113", color: "#fff", borderColor: "#7b1113" } : { borderColor: "#e5e7eb", color: "#374151" }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className={label}>First name *</label>
              <input className={input} autoComplete="given-name" value={f.firstName} onChange={e => set("firstName", e.target.value)} /></div>
            <div><label className={label}>Middle name</label>
              <input className={input} autoComplete="additional-name" value={f.middleName} onChange={e => set("middleName", e.target.value)} /></div>
            <div><label className={label}>Last name *</label>
              <input className={input} autoComplete="family-name" value={f.lastName} onChange={e => set("lastName", e.target.value)} /></div>
          </div>

          <div className="w-40">
            <label className={label}>Sex</label>
            <select className={input} value={f.sex} onChange={e => set("sex", e.target.value)}>
              <option value="">—</option><option value="M">Male</option><option value="F">Female</option>
            </select>
          </div>

          <div className={`grid gap-3 ${f.requestorType === "STUDENT" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div><label className={label}>College / Department / Organization / Agency</label>
              <input className={input} value={f.collegeDept} onChange={e => set("collegeDept", e.target.value)} /></div>
            {f.requestorType === "STUDENT" && (
              <div><label className={label}>Course, Year &amp; Section</label>
                <input className={input} value={f.courseYearSection} onChange={e => set("courseYearSection", e.target.value)} placeholder="e.g. BSIT 3-A" /></div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Email *</label><input type="email" className={input} value={f.email} onChange={e => set("email", e.target.value)} /></div>
            <div><label className={label}>Contact no.</label><input className={input} value={f.contactNo} onChange={e => set("contactNo", e.target.value)} /></div>
          </div>

          <div><label className={label}>Type of Activity *</label>
            <input className={input} value={f.activityType} onChange={e => set("activityType", e.target.value)}
              placeholder="e.g. Group discussion, film viewing, presentation" /></div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className={label}>Date of Activity</label><input type="date" min={today()} className={input} value={f.date} onChange={e => set("date", e.target.value)} /></div>
            <div><label className={label}>Time started</label><input type="time" className={input} value={f.start} onChange={e => set("start", e.target.value)} /></div>
            <div><label className={label}>Time finished</label><input type="time" className={input} value={f.end} onChange={e => set("end", e.target.value)} /></div>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600">
            <p className="font-semibold mb-1">Already requested on this date</p>
            {daySlots.length === 0
              ? <p>No reservations yet. First come, first served.</p>
              : <ul className="space-y-0.5">{daySlots.map((s, i) => (
                  <li key={i}>{tm(s.startAt)} – {tm(s.endAt)} · {s.status === "APPROVED" ? "Approved" : "Pending"}</li>
                ))}</ul>}
          </div>

          <div>
            <label className={label}>List of Participants · {filledParticipants.length} listed</label>
            <div className="space-y-2">
              {participants.map((p, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_36px] gap-2 items-center">
                  <input className={input} placeholder={`Participant ${i + 1} full name`} value={p.name}
                    onChange={e => updateParticipant(i, { name: e.target.value })} />
                  <select className={input} aria-label={`Sex of participant ${i + 1}`} value={p.sex}
                    onChange={e => updateParticipant(i, { sex: e.target.value as "M" | "F" })}>
                    <option value="M">Male</option><option value="F">Female</option>
                  </select>
                  <button type="button" onClick={() => removeParticipant(i)} aria-label={`Remove participant ${i + 1}`}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50">
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addParticipant}
              className="mt-2 h-9 px-3 rounded-lg border text-xs font-semibold" style={{ borderColor: "#7b1113", color: "#7b1113" }}>
              + Add participant
            </button>
            <p className="text-[11px] text-gray-500 mt-1">Recommended: 10–20 participants for discussion rooms, 50–80 for the Audio-Visual Room. You may still submit with fewer. Maximum of 4 hours.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Guidelines</p>
            <ol className="text-[11px] text-gray-600 list-decimal pl-4 space-y-0.5">
              <li>Participants may present themselves for inspection.</li>
              <li>Come on time. The librarian/library staff may cancel the reservation after 15 minutes of grace period.</li>
              <li>Recommended 10–20 participants for Discussion Room/s and other facilities; 50–80 for the Audio-Visual Room. Fewer participants are still allowed.</li>
              <li>A maximum of 4 hours is allowed per requestor.</li>
              <li>Foods/drinks are discouraged inside the library facilities.</li>
              <li>Requestors and participants are held liable for any losses or damages.</li>
            </ol>
          </div>

          <div>
            <label className={label}>Signature (Requested by) *</label>
            <SignaturePad onChange={v => { setSignature(v); setError(""); }} />
            <div className="mt-2 border-t border-gray-400 pt-1 text-center">
              <p className="text-sm font-semibold text-gray-900 min-h-5">{printedName || "\u00A0"}</p>
              <p className="text-[11px] text-gray-500">Signature over printed name</p>
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-700">
            <input type="checkbox" className="mt-0.5 w-4 h-4" checked={f.consent} onChange={e => set("consent", e.target.checked)} />
            <span><b>Data Privacy Consent.</b> By signing this form, I give my consent to Pampanga State University to collect and process my personal data. My email is used only to send updates about this reservation.</span>
          </label>

          {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}

          <button onClick={submit} disabled={busy || !f.consent}
            className="w-full h-11 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ background: "#7b1113" }}>
            {busy ? "Submitting…" : "Submit form"}
          </button>
        </div>
      </div>
    </main>
  );
}