"use client";

// src/components/ui/ForgotPasswordPage.tsx

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Eye, EyeOff, Mail, ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck, KeyRound } from "lucide-react";

type Step = "identify" | "otp" | "reset" | "done";

/* ─────────────────────────────────────────────
   PAGE SHELL
───────────────────────────────────────────── */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fp-root">
      {/* ── Login-page-style background ── */}
      <div className="fp-bg"        aria-hidden="true" />
      <div className="fp-grain"     aria-hidden="true" />
      <div className="fp-orb fp-orb--1" aria-hidden="true" />
      <div className="fp-orb fp-orb--2" aria-hidden="true" />
      <div className="fp-orb fp-orb--3" aria-hidden="true" />
      <div className="fp-lines"     aria-hidden="true">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"
          fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="-100" y1="900" x2="700"  y2="-100" stroke="white" strokeWidth="1"/>
          <line x1="100"  y1="900" x2="900"  y2="-100" stroke="white" strokeWidth=".5"/>
          <line x1="500"  y1="900" x2="1300" y2="-100" stroke="white" strokeWidth=".8"/>
          <line x1="700"  y1="900" x2="1500" y2="-100" stroke="white" strokeWidth=".4"/>
        </svg>
      </div>

      {/* card */}
      <main className="fp-card" role="main">
        {children}
      </main>

      <style>{CSS}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────────── */
const STEPS = [
  { label: "Identify", short: "1" },
  { label: "Verify",   short: "2" },
  { label: "Reset",    short: "3" },
];

function StepIndicator({ active }: { active: number }) {
  return (
    <div className="fp-steps" role="progressbar" aria-valuenow={active + 1} aria-valuemin={1} aria-valuemax={3}>
      {STEPS.map((s, i) => (
        <div key={s.label} className={`fp-steps__item ${i <= active ? "fp-steps__item--done" : ""} ${i === active ? "fp-steps__item--active" : ""}`}>
          <div className="fp-steps__bubble">
            {i < active ? <CheckCircle2 size={12} strokeWidth={2.5} /> : <span>{i + 1}</span>}
          </div>
          <span className="fp-steps__label">{s.label}</span>
          {i < 2 && <div className={`fp-steps__line ${i < active ? "fp-steps__line--filled" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ERROR BANNER
───────────────────────────────────────────── */
function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="fp-error" role="alert">
      <span className="fp-error__dot" />
      {msg}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PASSWORD STRENGTH
───────────────────────────────────────────── */
function PasswordStrength({ value }: { value: string }) {
  const score = (() => {
    if (!value) return 0;
    let s = 0;
    if (value.length >= 8)          s++;
    if (value.length >= 12)         s++;
    if (/[A-Z]/.test(value))        s++;
    if (/[0-9]/.test(value))        s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return s;
  })();
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];
  if (!value) return null;
  return (
    <div className="fp-strength">
      <div className="fp-strength__bars">
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className="fp-strength__bar"
            style={{ background: n <= score ? colors[score] : "" }} />
        ))}
      </div>
      <span className="fp-strength__label" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
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
  const [mounted,      setMounted]      = useState(false);
  const firstOtpRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (step === "otp") firstOtpRef.current?.focus(); }, [step]);

  const startResendTimer = () => {
    setResendTimer(60);
    const t = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  /* ── Step 1: Send OTP ── */
  const handleSend = async () => {
    setError("");
    if (!identifier.trim()) { setError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) { setError("Enter a valid email address."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/forgot-password/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send code."); return; }
      setStep("otp"); startResendTimer();
    } catch { setError("Network error. Please try again."); }
    finally   { setLoading(false); }
  };

  /* ── OTP handlers ── */
  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next); setError("");
    if (val && i < 5)
      (document.getElementById(`fp-otp-${i + 1}`) as HTMLInputElement)?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      (document.getElementById(`fp-otp-${i - 1}`) as HTMLInputElement)?.focus();
    if (e.key === "ArrowLeft"  && i > 0)
      (document.getElementById(`fp-otp-${i - 1}`) as HTMLInputElement)?.focus();
    if (e.key === "ArrowRight" && i < 5)
      (document.getElementById(`fp-otp-${i + 1}`) as HTMLInputElement)?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...otp];
    pasted.split("").forEach((c, i) => { if (i < 6) next[i] = c; });
    setOtp(next);
    const last = Math.min(pasted.length, 5);
    (document.getElementById(`fp-otp-${last}`) as HTMLInputElement)?.focus();
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerify = async () => {
    setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the complete 6-digit code."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/forgot-password/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), via: "email", otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Invalid code."); return; }
      setResetTokenId(data.resetTokenId); setStep("reset");
    } catch { setError("Network error. Please try again."); }
    finally   { setLoading(false); }
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(""); setOtp(["", "", "", "", "", ""]);
    setLoading(true);
    try {
      await fetch("/api/forgot-password/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      startResendTimer(); firstOtpRef.current?.focus();
    } catch { setError("Failed to resend. Try again."); }
    finally  { setLoading(false); }
  };

  /* ── Step 3: Reset Password ── */
  const handleReset = async () => {
    setError("");
    if (!password)            { setError("Please enter a new password."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)  { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/forgot-password/reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetTokenId, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to reset password."); return; }
      setStep("done");
    } catch { setError("Network error. Please try again."); }
    finally   { setLoading(false); }
  };

  if (!mounted) return null;

  /* ══════════════════════════════════════════
     STEP 1 — IDENTIFY
  ══════════════════════════════════════════ */
  if (step === "identify") return (
    <PageShell>
      <div className="fp-card__icon-wrap">
        <div className="fp-card__icon"><Mail size={22} strokeWidth={1.5} /></div>
      </div>
      <h1 className="fp-card__title">Forgot Password?</h1>
      <p className="fp-card__sub">Enter your registered email and we&apos;ll send you a 6-digit reset code.</p>

      <StepIndicator active={0} />
      <ErrorBanner msg={error} />

      <div className="fp-field">
        <label className="fp-label" htmlFor="fp-email">
          Email Address <span className="fp-label__req">*</span>
        </label>
        <div className="fp-input-wrap">
          <Mail className="fp-input__icon" size={16} />
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={identifier}
            onChange={e => { setIdentifier(e.target.value); setError(""); }}
            placeholder="yourname@school.edu"
            className="fp-input fp-input--icon-left"
            onKeyDown={e => e.key === "Enter" && void handleSend()}
            aria-describedby="fp-email-hint"
          />
        </div>
        <p id="fp-email-hint" className="fp-hint">A verification code will be sent to this address.</p>
      </div>

      <button className="fp-btn fp-btn--primary" onClick={() => void handleSend()} disabled={loading}>
        {loading
          ? <><span className="fp-btn__spinner" /> Sending…</>
          : <>Send Reset Code <span className="fp-btn__arrow">→</span></>
        }
      </button>

      <div className="fp-divider" />

      <Link href="/login" className="fp-back-link">
        <ArrowLeft size={14} /> Back to Login
      </Link>
    </PageShell>
  );

  /* ══════════════════════════════════════════
     STEP 2 — OTP
  ══════════════════════════════════════════ */
  if (step === "otp") return (
    <PageShell>
      <div className="fp-card__icon-wrap">
        <div className="fp-card__icon fp-card__icon--amber"><KeyRound size={22} strokeWidth={1.5} /></div>
      </div>
      <h1 className="fp-card__title">Enter Reset Code</h1>
      <p className="fp-card__sub">
        A 6-digit code was sent to{" "}
        <strong className="fp-card__sub-em">{identifier}</strong>
      </p>

      <StepIndicator active={1} />
      <ErrorBanner msg={error} />

      <div className="fp-otp-wrap" role="group" aria-label="One-time password input">
        {otp.map((d, i) => (
          <input
            key={i}
            id={`fp-otp-${i}`}
            ref={i === 0 ? firstOtpRef : undefined}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleOtpChange(i, e.target.value)}
            onKeyDown={e => handleOtpKey(i, e)}
            onPaste={i === 0 ? handleOtpPaste : undefined}
            className={`fp-otp-box ${error ? "fp-otp-box--error" : ""} ${d ? "fp-otp-box--filled" : ""}`}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <button
        className="fp-btn fp-btn--primary"
        onClick={() => void handleVerify()}
        disabled={loading || otp.join("").length < 6}
      >
        {loading
          ? <><span className="fp-btn__spinner" /> Verifying…</>
          : <>Verify Code <span className="fp-btn__arrow">→</span></>
        }
      </button>

      <p className="fp-resend">
        Didn&apos;t receive it?{" "}
        <button
          className={`fp-resend__btn ${resendTimer > 0 || loading ? "fp-resend__btn--disabled" : ""}`}
          onClick={() => void handleResend()}
          disabled={resendTimer > 0 || loading}
        >
          {resendTimer > 0
            ? <><RefreshCw size={12} className="fp-resend__icon" />Resend in {resendTimer}s</>
            : <>Resend code</>
          }
        </button>
      </p>

      <div className="fp-divider" />

      <button className="fp-back-link"
        onClick={() => { setStep("identify"); setOtp(["", "", "", "", "", ""]); setError(""); }}>
        <ArrowLeft size={14} /> Change email
      </button>
    </PageShell>
  );

  /* ══════════════════════════════════════════
     STEP 3 — RESET PASSWORD
  ══════════════════════════════════════════ */
  if (step === "reset") return (
    <PageShell>
      <div className="fp-card__icon-wrap">
        <div className="fp-card__icon fp-card__icon--green"><ShieldCheck size={22} strokeWidth={1.5} /></div>
      </div>
      <h1 className="fp-card__title">Set New Password</h1>
      <p className="fp-card__sub">Choose a strong password to protect your account.</p>

      <StepIndicator active={2} />
      <ErrorBanner msg={error} />

      <div className="fp-field">
        <label className="fp-label" htmlFor="fp-pass">
          New Password <span className="fp-label__req">*</span>
        </label>
        <div className="fp-input-wrap">
          <input
            id="fp-pass"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            placeholder="Min. 8 characters"
            className="fp-input fp-input--icon-right"
          />
          <button type="button" className="fp-input__toggle"
            onClick={() => setShowPass(v => !v)}
            aria-label={showPass ? "Hide password" : "Show password"}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <PasswordStrength value={password} />
      </div>

      <div className="fp-field">
        <label className="fp-label" htmlFor="fp-confirm">
          Confirm Password <span className="fp-label__req">*</span>
        </label>
        <div className="fp-input-wrap">
          <input
            id="fp-confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(""); }}
            placeholder="Re-enter password"
            className={`fp-input fp-input--icon-right ${confirm && password !== confirm ? "fp-input--error" : ""}`}
            onKeyDown={e => e.key === "Enter" && void handleReset()}
          />
          <button type="button" className="fp-input__toggle"
            onClick={() => setShowConfirm(v => !v)}
            aria-label={showConfirm ? "Hide password" : "Show password"}>
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirm && password !== confirm && (
          <p className="fp-hint fp-hint--error">Passwords do not match.</p>
        )}
      </div>

      <button className="fp-btn fp-btn--primary" onClick={() => void handleReset()} disabled={loading}>
        {loading
          ? <><span className="fp-btn__spinner" /> Saving…</>
          : <>Reset Password <span className="fp-btn__arrow">→</span></>
        }
      </button>
    </PageShell>
  );

  /* ══════════════════════════════════════════
     DONE
  ══════════════════════════════════════════ */
  return (
    <PageShell>
      <div className="fp-done">
        <div className="fp-done__ring">
          <div className="fp-done__icon">
            <CheckCircle2 size={36} strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="fp-done__title">Password Reset!</h2>
        <p className="fp-done__sub">
          Your password has been updated. You can now sign in with your new credentials.
        </p>
        <Link href="/login" className="fp-btn fp-btn--primary fp-btn--block">
          Go to Login <span className="fp-btn__arrow">→</span>
        </Link>
        <p className="fp-done__note">Redirecting automatically in a few seconds…</p>
      </div>
    </PageShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════ */
const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.fp-root {
  --red:       #7b1113;
  --red-dk:    #5a0d0f;
  --red-light: #fef2f2;
  --amber:     #d97706;
  --green:     #16a34a;
  --text:      #1e293b;
  --sub:       #64748b;
  --border:    #e2e8f0;
  --bg-input:  #f8fafc;
  --card-bg:   #ffffff;
  --shadow:    0 2px 4px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.1), 0 24px 56px rgba(90,13,15,.18);

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: relative;
  overflow: hidden;
  background: #0f0304;
}

/* ── Background — same as login page ── */
.fp-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 90% 70% at 15% 20%, rgba(123,17,19,.85) 0%, transparent 60%),
    radial-gradient(ellipse 80% 60% at 85% 80%, rgba(58,6,8,.9)    0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 50% 50%, rgba(35,3,4,1)      0%, transparent 80%),
    #0f0304;
  z-index: 0;
  animation: bgPulse 8s ease-in-out infinite alternate;
}
@keyframes bgPulse {
  0%   { filter: brightness(1); }
  100% { filter: brightness(1.12); }
}

/* ── Grain texture ── */
.fp-grain {
  position: fixed;
  inset: 0;
  z-index: 1;
  opacity: .035;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px;
  pointer-events: none;
}

/* ── Floating orbs ── */
.fp-orb {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
}
.fp-orb--1 {
  width: clamp(200px, 40vw, 480px);
  height: clamp(200px, 40vw, 480px);
  top: -15%; left: -10%;
  background: radial-gradient(circle, rgba(200,40,44,.5) 0%, transparent 70%);
  filter: blur(70px);
  animation: orbDrift1 12s ease-in-out infinite alternate;
}
.fp-orb--2 {
  width: clamp(180px, 35vw, 400px);
  height: clamp(180px, 35vw, 400px);
  bottom: -10%; right: -8%;
  background: radial-gradient(circle, rgba(232,93,38,.35) 0%, transparent 70%);
  filter: blur(70px);
  animation: orbDrift2 15s ease-in-out infinite alternate;
}
.fp-orb--3 {
  width: clamp(100px, 20vw, 240px);
  height: clamp(100px, 20vw, 240px);
  top: 50%; right: 20%;
  background: radial-gradient(circle, rgba(160,20,22,.3) 0%, transparent 70%);
  filter: blur(70px);
  animation: orbDrift1 18s ease-in-out infinite alternate-reverse;
}
@keyframes orbDrift1 {
  0%   { transform: translate(0,0) scale(1); }
  100% { transform: translate(6%,8%) scale(1.08); }
}
@keyframes orbDrift2 {
  0%   { transform: translate(0,0) scale(1); }
  100% { transform: translate(-5%,-6%) scale(1.1); }
}

/* ── Diagonal lines ── */
.fp-lines {
  position: fixed;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
  opacity: .06;
}
.fp-lines svg { width: 100%; height: 100%; }

/* ── Card ── */
.fp-card {
  position: relative;
  z-index: 10;
  background: var(--card-bg);
  border-radius: 20px;
  padding: clamp(24px, 5vw, 40px) clamp(20px, 5vw, 40px);
  width: 100%;
  max-width: 440px;
  box-shadow: var(--shadow);
  animation: cardIn .45s cubic-bezier(.22,1,.36,1) both;
  border: 1px solid rgba(255,255,255,.06);
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(24px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.fp-card__icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.fp-card__icon {
  width: 52px; height: 52px;
  background: var(--red-light);
  border: 2px solid #fecaca;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: var(--red);
}
.fp-card__icon--amber {
  background: #fffbeb;
  border-color: #fde68a;
  color: var(--amber);
}
.fp-card__icon--green {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: var(--green);
}

.fp-card__title {
  font-size: clamp(18px, 4vw, 22px);
  font-weight: 700;
  color: var(--text);
  text-align: center;
  margin-bottom: 6px;
  line-height: 1.25;
}
.fp-card__sub {
  font-size: 13px;
  color: var(--sub);
  text-align: center;
  line-height: 1.5;
  margin-bottom: 20px;
}
.fp-card__sub-em {
  color: var(--text);
  font-weight: 600;
}

/* ── Steps ── */
.fp-steps {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}
.fp-steps__item {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.fp-steps__bubble {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: #f1f5f9;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all .3s;
}
.fp-steps__item--done   .fp-steps__bubble { border-color: var(--red); background: var(--red); color: #fff; }
.fp-steps__item--active .fp-steps__bubble { border-color: var(--red); background: var(--red-light); color: var(--red); }

.fp-steps__label {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  white-space: nowrap;
  transition: color .3s;
}
.fp-steps__item--done   .fp-steps__label,
.fp-steps__item--active .fp-steps__label { color: var(--red); }

.fp-steps__line {
  height: 2px;
  flex: 1;
  background: var(--border);
  border-radius: 1px;
  transition: background .3s;
}
.fp-steps__line--filled { background: var(--red); }

/* ── Error Banner ── */
.fp-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: #b91c1c;
  margin-bottom: 14px;
  animation: slideIn .2s ease;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fp-error__dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ef4444;
  flex-shrink: 0;
  margin-top: 4px;
}

/* ── Fields ── */
.fp-field { margin-bottom: 16px; }
.fp-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}
.fp-label__req { color: var(--red); }

.fp-input-wrap { position: relative; }

.fp-input {
  width: 100%;
  height: 46px;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--bg-input);
  color: var(--text);
  font-size: 14px;
  padding: 0 14px;
  transition: border-color .2s, background .2s, box-shadow .2s;
  outline: none;
  -webkit-appearance: none;
  font-family: inherit;
}
.fp-input:hover  { border-color: #cbd5e1; }
.fp-input:focus  {
  border-color: var(--red);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(123,17,19,.1);
}
.fp-input--icon-left  { padding-left: 40px; }
.fp-input--icon-right { padding-right: 44px; }
.fp-input--error {
  border-color: #f87171 !important;
  background: #fff5f5;
}
.fp-input::placeholder { color: #94a3b8; }

.fp-input__icon {
  position: absolute;
  left: 12px; top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}
.fp-input__toggle {
  position: absolute;
  right: 12px; top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: color .2s;
  -webkit-tap-highlight-color: transparent;
}
.fp-input__toggle:hover { color: var(--text); }

.fp-hint {
  font-size: 11.5px;
  color: #94a3b8;
  margin-top: 5px;
  line-height: 1.4;
}
.fp-hint--error { color: #ef4444; }

/* ── Password Strength ── */
.fp-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.fp-strength__bars {
  display: flex;
  gap: 4px;
  flex: 1;
}
.fp-strength__bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  transition: background .3s;
}
.fp-strength__label {
  font-size: 11px;
  font-weight: 600;
  min-width: 56px;
  text-align: right;
}

/* ── OTP ── */
.fp-otp-wrap {
  display: flex;
  justify-content: center;
  gap: clamp(6px, 2vw, 12px);
  margin-bottom: 20px;
}
.fp-otp-box {
  width: clamp(40px, 12vw, 52px);
  height: clamp(48px, 14vw, 58px);
  text-align: center;
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 700;
  color: var(--text);
  border: 2px solid var(--border);
  border-radius: 12px;
  background: var(--bg-input);
  outline: none;
  caret-color: var(--red);
  transition: all .2s;
  -webkit-appearance: none;
  font-family: inherit;
}
.fp-otp-box:focus {
  border-color: var(--red);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(123,17,19,.1);
  transform: scale(1.05);
}
.fp-otp-box--filled { border-color: #cbd5e1; background: #fff; }
.fp-otp-box--error  { border-color: #f87171 !important; background: #fff5f5; }
.fp-otp-box::-webkit-outer-spin-button,
.fp-otp-box::-webkit-inner-spin-button { -webkit-appearance: none; }

/* ── Primary Button ── */
.fp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .02em;
  transition: opacity .2s, transform .15s, box-shadow .2s;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
}
.fp-btn--primary {
  background: linear-gradient(135deg, #8b1416 0%, #5a0d0f 100%);
  color: #fff;
  box-shadow: 0 4px 20px rgba(123,17,19,.35);
}
.fp-btn--primary:hover:not(:disabled) {
  box-shadow: 0 6px 28px rgba(123,17,19,.45);
  transform: translateY(-1px);
}
.fp-btn--primary:active:not(:disabled) { transform: translateY(0); }
.fp-btn:disabled { opacity: .6; cursor: not-allowed; }
.fp-btn--block   { display: flex; }

.fp-btn__arrow {
  opacity: .8;
  transition: transform .2s;
}
.fp-btn:hover:not(:disabled) .fp-btn__arrow { transform: translateX(3px); }

.fp-btn__spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Resend ── */
.fp-resend {
  text-align: center;
  font-size: 13px;
  color: var(--sub);
  margin-top: 14px;
}
.fp-resend__btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--red);
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  -webkit-tap-highlight-color: transparent;
  transition: opacity .2s;
  font-family: inherit;
}
.fp-resend__btn--disabled { opacity: .5; cursor: not-allowed; text-decoration: none; }
.fp-resend__icon { animation: spin .7s linear infinite; }

/* ── Divider ── */
.fp-divider {
  height: 1px;
  background: var(--border);
  margin: 18px 0;
}

/* ── Back link ── */
.fp-back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--sub);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  width: 100%;
  padding: 0;
  transition: color .2s;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
}
.fp-back-link:hover { color: var(--text); }

/* ── Done screen ── */
.fp-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 8px 0;
}
.fp-done__ring {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: #f0fdf4;
  border: 3px solid #bbf7d0;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 18px;
  animation: popIn .5s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes popIn {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.fp-done__icon  { color: var(--green); }
.fp-done__title {
  font-size: clamp(20px, 5vw, 24px);
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}
.fp-done__sub {
  font-size: 13px;
  color: var(--sub);
  line-height: 1.55;
  margin-bottom: 24px;
  max-width: 280px;
}
.fp-done__note {
  font-size: 11.5px;
  color: #94a3b8;
  margin-top: 12px;
}

/* ── Tablet & above ── */
@media (min-width: 480px) {
  .fp-card    { padding: 40px; }
  .fp-otp-box { width: 52px; height: 58px; }
}
@media (min-width: 768px) {
  .fp-root { padding: 32px; }
}

/* ── iPhone notch / safe-areas ── */
@supports (padding: max(0px)) {
  .fp-root {
    padding-top:    max(16px, env(safe-area-inset-top));
    padding-bottom: max(16px, env(safe-area-inset-bottom));
    padding-left:   max(16px, env(safe-area-inset-left));
    padding-right:  max(16px, env(safe-area-inset-right));
  }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .fp-bg, .fp-orb--1, .fp-orb--2, .fp-orb--3 { animation: none !important; }
  .fp-card, .fp-done__ring { animation: none; }
  .fp-btn__spinner, .fp-resend__icon { animation: none !important; }
  .fp-otp-box:focus { transform: none; }
}
`;