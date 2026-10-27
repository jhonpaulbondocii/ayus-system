"use client";
import { useEffect, useState, use } from "react";
import QRCode from "qrcode";

type R = {
  name: string; activityType: string; startAt: string; endAt: string; status: string;
  facilityType: string | null; facilityNo: string | null; facilityOther: string | null;
  disapprovalReason: string | null; arrivedAt: string | null; participantCount: number;
};

const dt = (iso: string) => new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
const tm = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const facility = (r: R) =>
  r.facilityType === "DISCUSSION" ? `Discussion Room ${r.facilityNo ?? ""}`.trim()
  : r.facilityType === "OTHER" ? r.facilityOther ?? "Other facility"
  : r.facilityType === "AUDIO_VISUAL" ? "Audio-Visual Room" : "To be assigned";
const LABEL: Record<string, string> = {
  PENDING: "Pending review", APPROVED: "Approved", DISAPPROVED: "Disapproved",
  CANCELLED: "Cancelled", NO_SHOW: "No-show", COMPLETED: "Completed",
};

export default function SlipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [r, setR] = useState<R | null>(null);
  const [qr, setQr] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    fetch(`/api/public/reservation-slip/${token}`).then(async res => {
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Not found.");
      setR(d.reservation);
    }).catch(e => setError(e.message));

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/checkin/${token}`, { width: 240, margin: 1 }).then(setQr).catch(() => {});
  }, [token]);

  const cancel = async () => {
    if (!window.confirm("Cancel this reservation?")) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/public/reservation-slip/${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel" }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) setError(d.error ?? "Couldn’t cancel."); else await load();
    setBusy(false);
  };

  if (error && !r) return <main className="min-h-screen flex items-center justify-center text-sm text-red-600">{error}</main>;
  if (!r) return <main className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading…</main>;

  const canCancel = (r.status === "PENDING" || r.status === "APPROVED") && new Date(r.startAt) > new Date();

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-sm mx-auto bg-white rounded-2xl shadow overflow-hidden">
        <div className="px-5 py-4 text-white" style={{ background: "#7b1113" }}>
          <p className="text-xs opacity-80">Pampanga State University · Library Services Office</p>
          <h1 className="text-lg font-bold">Reservation slip</h1>
        </div>
        <div className="p-5 space-y-3 text-sm text-gray-800">
          <p className="inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100">{LABEL[r.status] ?? r.status}</p>
          <div>
            <p className="font-bold">{r.name}</p>
            <p className="text-gray-600">{r.activityType}</p>
          </div>
          <div className="text-gray-700">
            <p>{dt(r.startAt)} – {tm(r.endAt)}</p>
            <p>{facility(r)} · {r.participantCount} participants</p>
          </div>

          {r.status === "APPROVED" && (
            <div className="text-center pt-2">
              {qr && /* eslint-disable-next-line @next/next/no-img-element */ <img src={qr} alt="Check-in QR code" className="mx-auto" width={220} height={220} />}
              <p className="text-xs text-gray-500 mt-1">
                {r.arrivedAt ? `Checked in at ${tm(r.arrivedAt)}` : "Show this QR code to the librarian when you arrive. Come on time: the reservation may be cancelled after 15 minutes."}
              </p>
            </div>
          )}
          {r.status === "DISAPPROVED" && <p className="text-red-700 text-xs">Reason: {r.disapprovalReason}</p>}
          {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
          {canCancel && (
            <button onClick={cancel} disabled={busy}
              className="w-full h-10 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60">
              {busy ? "Please wait…" : "Cancel reservation"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}