"use client";

// src/components/ui/ForgotPasswordPage.tsx

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  const firstOtpRef    = useRef<HTMLInputElement>(null);
const router         = useRouter();
  const emailRef       = useRef<HTMLInputElement>(null);
  const passRef        = useRef<HTMLInputElement>(null);
  const confirmRef     = useRef<HTMLInputElement>(null);

  const scrollToField = (ref: React.RefObject<HTMLInputElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => router.push("/login"), 4000);
    return () => clearTimeout(t);
  }, [step, router]);
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
            ref={emailRef}
            id="fp-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={identifier}
            onChange={e => { setIdentifier(e.target.value); setError(""); }}
            onFocus={() => scrollToField(emailRef)}
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
            ref={passRef}
            id="fp-pass"
            type={showPass ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onFocus={() => scrollToField(passRef)}
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
            ref={confirmRef}
            id="fp-confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(""); }}
            onFocus={() => scrollToField(confirmRef)}
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
  --red:       #8b2635;
  --red-dk:    #6f1e2b;
  --red-light: #f7ecec;
  --amber:     #d97706;
  --green:     #16a34a;
  --text:      #18181b;
  --sub:       #71717a;
  --border:    #e4e4e7;
  --bg-input:  #f4f4f5;
  --card-bg:   #ffffff;
  --shadow:    0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.08);

  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: #f4f4f5;
}

/* ── Card ── */
.fp-card {
  position: relative;
  z-index: 10;
  background: var(--card-bg);
  border-radius: 12px;
  padding: clamp(24px, 5vw, 36px) clamp(20px, 5vw, 32px);
  width: 100%;
  max-width: 380px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.fp-card__icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}
.fp-card__icon {
  width: 52px; height: 52px;
  background: var(--red-light);
  border: 1px solid #f0c8cc;
  border-radius: 50%;
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
  font-size: clamp(18px, 4vw, 20px);
  font-weight: 600;
  color: var(--text);
  text-align: center;
  margin-bottom: 4px;
  letter-spacing: -0.01em;
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
  border: 1px solid var(--border);
  background: #f4f4f5;
  color: #a1a1aa;
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
  color: #a1a1aa;
  white-space: nowrap;
  transition: color .3s;
}
.fp-steps__item--done   .fp-steps__label,
.fp-steps__item--active .fp-steps__label { color: var(--red); }

.fp-steps__line {
  height: 1px;
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
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: #b91c1c;
  margin-bottom: 14px;
  line-height: 1.45;
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
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}
.fp-label__req { color: var(--red); }

.fp-input-wrap { position: relative; }

.fp-input {
  width: 100%;
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text);
  font-size: 14px;
  padding: 0 12px;
  transition: border-color .15s;
  outline: none;
  -webkit-appearance: none;
  font-family: inherit;
}
.fp-input::placeholder { color: #a1a1aa; }
.fp-input:focus { border-color: var(--red); }
.fp-input--icon-left  { padding-left: 38px; }
.fp-input--icon-right { padding-right: 42px; }
.fp-input--error { border-color: #f87171 !important; }

.fp-input__icon {
  position: absolute;
  left: 12px; top: 50%;
  transform: translateY(-50%);
  color: #a1a1aa;
  pointer-events: none;
}
.fp-input__toggle {
  position: absolute;
  right: 0; top: 0;
  width: 42px; height: 42px;
  background: none;
  border: none;
  cursor: pointer;
  color: #a1a1aa;
  display: flex; align-items: center; justify-content: center;
  transition: color .15s;
  -webkit-tap-highlight-color: transparent;
}
.fp-input__toggle:hover { color: var(--sub); }

.fp-hint {
  font-size: 11.5px;
  color: #a1a1aa;
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
  height: 3px;
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
  gap: clamp(6px, 2vw, 10px);
  margin-bottom: 20px;
}
.fp-otp-box {
  width: clamp(40px, 12vw, 48px);
  height: clamp(46px, 13vw, 54px);
  text-align: center;
  font-size: clamp(18px, 5vw, 22px);
  font-weight: 700;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  outline: none;
  caret-color: var(--red);
  transition: border-color .15s;
  -webkit-appearance: none;
  font-family: inherit;
}
.fp-otp-box:focus { border-color: var(--red); }
.fp-otp-box--filled { border-color: #d4d4d8; }
.fp-otp-box--error  { border-color: #f87171 !important; }
.fp-otp-box::-webkit-outer-spin-button,
.fp-otp-box::-webkit-inner-spin-button { -webkit-appearance: none; }

/* ── Primary Button ── */
.fp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background .15s;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  font-family: inherit;
}
.fp-btn--primary {
  background: var(--red);
  color: #fff;
}
.fp-btn--primary:hover:not(:disabled) { background: var(--red-dk); }
.fp-btn:disabled { opacity: .6; cursor: not-allowed; }
.fp-btn--block   { display: flex; }

.fp-btn__arrow { opacity: .8; }

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
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  -webkit-tap-highlight-color: transparent;
  transition: opacity .15s;
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
  transition: color .15s;
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
  width: 64px; height: 64px;
  border-radius: 50%;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
}
.fp-done__icon  { color: var(--green); }
.fp-done__title {
  font-size: clamp(18px, 5vw, 20px);
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
  letter-spacing: -0.01em;
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
  color: #a1a1aa;
  margin-top: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .fp-btn__spinner, .fp-resend__icon { animation: none !important; }
}
`;