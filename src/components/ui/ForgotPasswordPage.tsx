"use client";

// src/components/ui/ForgotPasswordPage.tsx

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail } from "lucide-react";

type Step = "identify" | "otp" | "reset" | "done";

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #7b1113 0%, #4a0a0b 50%, #1a0304 100%)" }}
    >
      {/* Dot pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* Decorative blobs */}
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10"
        style={{ background: "#ff4444", filter: "blur(80px)", transform: "translate(-30%, -30%)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
        style={{ background: "#ff8800", filter: "blur(80px)", transform: "translate(30%, 30%)" }}
      />

      {/* Card */}
      <div
        className="relative z-10 bg-white rounded-2xl px-10 py-10 w-full max-w-sm mx-4"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}
      >
        {children}
      </div>
    </div>
  );
}

function CardHeader({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">{title}</h1>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

const STEPS = ["Identify", "Verify OTP", "Reset Password"];
function StepIndicator({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div
            className={[
              "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
              i <= active ? "bg-[#7b1113] text-white" : "bg-gray-100 text-gray-400",
            ].join(" ")}
          >
            {i < active ? "✓" : i + 1}
          </div>
          <span
            className={[
              "text-[10px] font-medium whitespace-nowrap",
              i <= active ? "text-[#7b1113]" : "text-gray-300",
            ].join(" ")}
          >
            {s}
          </span>
          {i < 2 && <div className="h-px flex-1 bg-gray-100" />}
        </div>
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [step,         setStep]         = useState<Step>("identify");
  const [identifier,   setIdentifier]   = useState("");
  const [otp,          setOtp]          = useState(["", "", "", "", "", ""]);
  const [resetTokenId, setResetTokenId] = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [resendTimer,  setResendTimer]  = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const t = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 1: Send OTP ──
  const handleSend = async () => {
    setError("");
    if (!identifier.trim()) { setError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) { setError("Enter a valid email address."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send code."); return; }
      setStep("otp");
      startResendTimer();
    } catch { setError("Network error. Please try again."); }
    finally  { setLoading(false); }
  };

  // ── OTP input handlers ──
  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) document.getElementById(`fp-otp-${i + 1}`)?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) document.getElementById(`fp-otp-${i - 1}`)?.focus();
  };

  // ── Step 2: Verify OTP ──
  const handleVerify = async () => {
    setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the complete 6-digit code."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: identifier.trim(), via: "email", otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid code."); return; }
      setResetTokenId(data.resetTokenId);
      setStep("reset");
    } catch { setError("Network error. Please try again."); }
    finally  { setLoading(false); }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(""); setOtp(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      await fetch("/api/forgot-password/send", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ identifier: identifier.trim() }),
      });
      startResendTimer();
    } catch { setError("Failed to resend. Try again."); }
    finally  { setLoading(false); }
  };

  // ── Step 3: Reset Password ──
  const handleReset = async () => {
    setError("");
    if (!password) { setError("Please enter a new password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/reset", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ resetTokenId, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to reset password."); return; }
      setStep("done");
    } catch { setError("Network error. Please try again."); }
    finally  { setLoading(false); }
  };

  const inputCls = (err = false) =>
    `w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1113]/30 focus:border-[#7b1113] transition-colors bg-gray-50 focus:bg-white ${
      err ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300"
    }`;

  // ── STEP 1: Identify ──
  if (step === "identify") return (
    <PageShell>
      <CardHeader title="Forgot Password" sub="Enter your email to receive a reset code" />
      <StepIndicator active={0} />

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="email"
            value={identifier}
            onChange={e => { setIdentifier(e.target.value); setError(""); }}
            placeholder="yourname@email.com"
            className={`${inputCls(!!error)} pl-9`}
            onKeyDown={e => e.key === "Enter" && void handleSend()}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          We&apos;ll send a 6-digit code to this email address.
        </p>
      </div>

      <button
        onClick={() => void handleSend()}
        disabled={loading}
        className="w-full disabled:opacity-70 text-white font-bold py-3 rounded-lg transition-all text-sm"
        style={{ background: "linear-gradient(135deg, #7b1113, #5a0d0f)" }}
      >
        {loading ? "Sending…" : "Send Reset Code →"}
      </button>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-gray-400 hover:text-gray-600 hover:underline">
          ← Back to Login
        </Link>
      </div>
    </PageShell>
  );

  // ── STEP 2: OTP ──
  if (step === "otp") return (
    <PageShell>
      <CardHeader
        title="Enter Reset Code"
        sub={<>Code sent to <span className="font-medium text-gray-700">{identifier}</span></>}
      />
      <StepIndicator active={1} />

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-center gap-2 mb-4">
        {otp.map((d, i) => (
          <input
            key={i}
            id={`fp-otp-${i}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => { handleOtpChange(i, e.target.value); setError(""); }}
            onKeyDown={e => handleOtpKey(i, e)}
            className={[
              "w-11 h-12 text-center text-lg font-bold border rounded-lg bg-gray-50",
              "focus:outline-none focus:ring-2 focus:ring-[#7b1113]/30 focus:border-[#7b1113] focus:bg-white transition-all",
              error ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300",
            ].join(" ")}
          />
        ))}
      </div>

      <button
        onClick={() => void handleVerify()}
        disabled={loading || otp.join("").length < 6}
        className="w-full disabled:opacity-70 text-white font-bold py-3 rounded-lg transition-all text-sm mb-3"
        style={{ background: "linear-gradient(135deg, #7b1113, #5a0d0f)" }}
      >
        {loading ? "Verifying…" : "Verify Code →"}
      </button>

      <p className="text-sm text-center text-gray-400">
        Didn&apos;t receive it?{" "}
        <button
          onClick={() => void handleResend()}
          disabled={resendTimer > 0 || loading}
          className="text-[#7b1113] hover:underline font-medium disabled:opacity-50 disabled:no-underline"
        >
          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
        </button>
      </p>
      <p className="text-sm text-center text-gray-300 mt-2">
        <button
          onClick={() => { setStep("identify"); setOtp(["", "", "", "", "", ""]); setError(""); }}
          className="hover:text-gray-500 hover:underline"
        >
          ← Change email
        </button>
      </p>
    </PageShell>
  );

  // ── STEP 3: New Password ──
  if (step === "reset") return (
    <PageShell>
      <CardHeader title="Set New Password" sub="Choose a strong password for your account" />
      <StepIndicator active={2} />

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="Min. 8 characters"
              className={`${inputCls()} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(""); }}
              placeholder="Re-enter password"
              className={`${inputCls(!!confirm && password !== confirm)} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm && password !== confirm && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
          )}
        </div>
      </div>

      <button
        onClick={() => void handleReset()}
        disabled={loading}
        className="w-full disabled:opacity-70 text-white font-bold py-3 rounded-lg transition-all text-sm"
        style={{ background: "linear-gradient(135deg, #7b1113, #5a0d0f)" }}
      >
        {loading ? "Saving…" : "Reset Password →"}
      </button>
    </PageShell>
  );

  // ── DONE ──
  return (
    <PageShell>
      <div className="text-center py-2">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-100">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Reset!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your password has been updated successfully. You can now log in with your new password.
        </p>
        <Link
          href="/login"
          className="block w-full py-3 text-white text-sm font-bold rounded-lg transition-all"
          style={{ background: "linear-gradient(135deg, #7b1113, #5a0d0f)" }}
        >
          Go to Login →
        </Link>
      </div>
    </PageShell>
  );
}