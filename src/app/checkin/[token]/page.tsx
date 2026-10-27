"use client";
import { useEffect, useState, use } from "react";

type Result = {
  ok: boolean; already: boolean; name: string; activityType: string; startAt: string; endAt: string;
  facilityType: string | null; facilityNo: string | null; facilityOther: string | null; arrivedAt: string | null;
};
const tm = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

export default function CheckinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [res, setRes] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(0);

  useEffect(() => {
    fetch(`/api/checkin/${token}`, { method: "POST" }).then(async r => {
      const d = await r.json().catch(() => ({}));
      setStatus(r.status);
      if (!r.ok) setError(d.error ?? "Couldn’t check in.");
      else setRes(d);
    }).catch(() => setError("Couldn’t reach the server."));
  }, [token]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center space-y-2">
        {!res && !error && <p className="text-sm text-gray-500">Checking in…</p>}
        {error && (
          <>
            <p className="text-sm font-semibold text-red-600">{error}</p>
            {status === 401 && (
              <a className="inline-block text-sm font-bold underline" style={{ color: "#7b1113" }}
                href={`/login?callbackUrl=${encodeURIComponent(`/checkin/${token}`)}`}>Log in as library staff</a>
            )}
          </>
        )}
        {res && (
          <>
            <p className="text-3xl">✓</p>
            <h1 className="text-lg font-bold text-gray-900">{res.already ? "Already checked in" : "Checked in"}</h1>
            <p className="text-sm font-semibold">{res.name}</p>
            <p className="text-xs text-gray-600">{res.activityType}</p>
            <p className="text-xs text-gray-600">{tm(res.startAt)} – {tm(res.endAt)}</p>
            {res.arrivedAt && <p className="text-xs text-gray-500">Arrived {tm(res.arrivedAt)}</p>}
          </>
        )}
      </div>
    </main>
  );
}