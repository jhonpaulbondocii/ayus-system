"use client";

// src/app/sign/[token]/page.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Stethoscope, PenLine, Upload, RefreshCw,
  Check, X, AlertTriangle, Pill,
} from "lucide-react";

const MAROON = "#7b1113";
const FONT   = "system-ui, -apple-system, sans-serif";

const ACTION_LABELS: Record<string, string> = {
  GIVEN_MEDICINE:    "Given Medicine Only",
  SENT_HOME:         "Sent Home",
  FOR_OBSERVATION:   "For Observation",
  REFERRED_HOSPITAL: "Referred to Hospital",
  REFERRED_GUIDANCE: "Referred to Guidance",
};

interface VisitInfo {
  id:            string;
  complaint:     string;
  temperature:   number | null;
  bloodPressure: string | null;
  pulseRate:     number | null;
  weight:        number | null;
  diagnosis:     string | null;
  medicine:      string | null;
  action:        string;
  notes:         string | null;
  visitDate:     string;
  student:       { name: string; studentNumber: string };
  medicineUsages: { medicineName: string; quantityUsed: number; unit: string }[];
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   SIGNATURE CANVAS (drawing pad)
───────────────────────────────────────────────────────────────────────────── */
function SignaturePad({
  onChange,
}: {
  onChange: (hasDrawn: boolean) => void;
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const isDrawing   = useRef(false);
  const lastPos     = useRef<{ x: number; y: number } | null>(null);

  // Set up canvas pixel resolution once (CSS scales it visually)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = 600;
    canvas.height = 220;
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const point  = "touches" in e ? e.touches[0] : e;
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (point.clientX - rect.left) * scaleX,
      y: (point.clientY - rect.top)  * scaleY,
    };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    const pos    = getPos(e);

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
    onChange(true);
  };

  const end = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(false);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full h-44 sm:h-52 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 cursor-crosshair"
        style={{ touchAction: "none" }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-gray-400">Sign using your mouse or finger above</p>
        <button
          type="button"
          onClick={clear}
          className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <X size={11} /> Clear
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function SignPage() {
  const params = useParams();
  const token  = params.token as string;

  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState("");
  const [visit,      setVisit]      = useState<VisitInfo | null>(null);

  const [activeTab,    setActiveTab]    = useState<"draw" | "upload">("draw");
  const [hasDrawn,      setHasDrawn]      = useState(false);
  const [uploadPreview,  setUploadPreview]  = useState<string | null>(null);
  const [uploadError,    setUploadError]    = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [signed,      setSigned]      = useState(false);

  const canvasDataRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/sign/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) { setLoadError(data.error ?? "This link is invalid."); return; }
        setVisit(data.visit);
      })
      .catch(() => setLoadError("Network error. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.");
      return;
    }
    if (file.size > 1_500_000) {
      setUploadError("Image is too large. Please use a file under 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.onerror = () => setUploadError("Failed to read file. Please try again.");
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = async () => {
    setSubmitError("");

    let signatureDataUrl: string | null = null;

    if (activeTab === "draw") {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
      if (!hasDrawn || !canvas) {
        setSubmitError("Please draw your signature first.");
        return;
      }
      signatureDataUrl = canvas.toDataURL("image/png");
    } else {
      if (!uploadPreview) {
        setSubmitError("Please upload your signature image first.");
        return;
      }
      signatureDataUrl = uploadPreview;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/sign/${token}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl,
          method: activeTab === "upload" ? "uploaded" : "drawn",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to submit signature.");
        setSubmitting(false);
        return;
      }
      setSigned(true);
    } catch {
      setSubmitError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  /* ── LOADING ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ fontFamily: FONT }}>
        <div className="flex flex-col items-center gap-3 text-gray-300">
          <RefreshCw size={20} className="animate-spin" />
          <span className="text-sm font-medium">Loading visit record...</span>
        </div>
      </div>
    );
  }

  /* ── ERROR (invalid / expired / already signed) ── */
  if (loadError || !visit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" style={{ fontFamily: FONT }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-sm font-bold text-gray-800 mb-1.5">Unable to load this link</p>
          <p className="text-xs text-gray-500 leading-relaxed">{loadError}</p>
        </div>
      </div>
    );
  }

  /* ── SUCCESS ── */
  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" style={{ fontFamily: FONT }}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full p-6 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdf4" }}>
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-sm font-bold text-gray-800 mb-1.5">Signature submitted</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Thank you, {visit.student.name.split(" ")[0]}. Your visit record has been confirmed and signed.
          </p>
        </div>
      </div>
    );
  }

  const medicinesStr = visit.medicineUsages.length > 0
    ? visit.medicineUsages.map(m => `${m.medicineName} × ${m.quantityUsed} ${m.unit}`).join(", ")
    : visit.medicine;

  /* ── MAIN FORM ── */
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8" style={{ fontFamily: FONT }}>
      <div className="max-w-md mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: MAROON }}>
            <Stethoscope size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">University Clinic</p>
            <p className="text-base font-black text-gray-900">Confirm Visit Record</p>
          </div>
        </div>

        {/* Visit details card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-gray-100" style={{ background: "#fef2f2" }}>
            <p className="text-sm font-bold" style={{ color: MAROON }}>{visit.student.name}</p>
            <p className="text-[11px] text-gray-400 font-mono">{visit.student.studentNumber}</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Visit Date</p>
              <p className="text-sm font-semibold text-gray-800">{fmtDate(visit.visitDate)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Chief Complaint</p>
              <p className="text-sm text-gray-700 leading-snug">{visit.complaint}</p>
            </div>
            {visit.diagnosis && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Diagnosis</p>
                <p className="text-sm text-gray-700 leading-snug">{visit.diagnosis}</p>
              </div>
            )}
            {medicinesStr && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5 flex items-center gap-1">
                  <Pill size={9} /> Medicine Given
                </p>
                <p className="text-sm text-gray-700 leading-snug">{medicinesStr}</p>
              </div>
            )}
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Action Taken</p>
              <p className="text-sm font-semibold" style={{ color: MAROON }}>
                {ACTION_LABELS[visit.action] ?? visit.action}
              </p>
            </div>
            {visit.notes && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Notes</p>
                <p className="text-sm text-gray-700 leading-snug">{visit.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Signature card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">E-Signature</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Please sign to confirm you received this visit record.</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-5 pt-4">
            {[
              { key: "draw" as const,   label: "Draw",   icon: PenLine },
              { key: "upload" as const, label: "Upload", icon: Upload  },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
                style={activeTab === key
                  ? { background: MAROON, color: "#fff" }
                  : { background: "#f3f4f6", color: "#6b7280" }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <div className="px-5 py-4">
            {activeTab === "draw" ? (
              <SignaturePad onChange={setHasDrawn} />
            ) : (
              <div>
                {uploadPreview ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center gap-3">
                    <img src={uploadPreview} alt="Signature preview" className="h-16 bg-white rounded-lg border border-gray-200 px-2" />
                    <button
                      type="button"
                      onClick={() => setUploadPreview(null)}
                      className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 ml-auto shrink-0"
                    >
                      <X size={11} /> Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-44 sm:h-52 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors">
                    <Upload size={20} className="text-gray-300 mb-2" />
                    <span className="text-xs font-semibold text-gray-500">Tap to upload signature image</span>
                    <span className="text-[10px] text-gray-400 mt-1">PNG or JPG, max 1.5MB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                )}
                {uploadError && (
                  <p className="text-xs text-red-500 mt-2 font-medium">{uploadError}</p>
                )}
              </div>
            )}
          </div>

          {submitError && (
            <div className="px-5 pb-1">
              <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {submitError}
              </div>
            </div>
          )}

          <div className="px-5 py-4">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-11 rounded-xl text-sm font-black text-white transition-all disabled:opacity-60 flex items-center justify-center gap-1.5"
              style={{ background: MAROON }}
            >
              {submitting
                ? <><RefreshCw size={14} className="animate-spin" /> Submitting...</>
                : <><Check size={14} /> Submit Signature</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}