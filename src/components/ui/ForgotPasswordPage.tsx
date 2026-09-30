"use client";

// src/components/ui/ForgotPasswordPage.tsx

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck, KeyRound } from "lucide-react";

type Step = "identify" | "otp" | "reset" | "done";

/* ─────────────────────────────────────────────
   PAGE SHELL — mobile full-screen, desktop card
───────────────────────────────────────────── */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="fp">
        <div className="fp-wrap">

          {/* hero strip */}
          <div className="fp-hero" aria-hidden="true">
            <div className="fp-hero-texture" />
            <div className="fp-hero-wave" />
          </div>

          {/* form sheet */}
          <main className="fp-sheet" role="main">
            {children}
          </main>

          <div className="fp-foot" aria-hidden="true" />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   STEP INDICATOR
───────────────────────────────────────────── */
const STEPS = ["Identify", "Verify", "Reset"];

function StepIndicator({ active }: { active: number }) {
  return (
    <div className="fp-steps" role="progressbar" aria-valuenow={active + 1} aria-valuemin={1} aria-valuemax={3}>
      {STEPS.map((label, i) => (
        <div key={label} className={`fp-steps-item ${i <= active ? "is-done" : ""} ${i === active ? "is-active" : ""}`}>
          <div className="fp-steps-bubble">
            {i < active
              ? <CheckCircle2 size={11} strokeWidth={2.5} />
              : <span>{i + 1}</span>
            }
          </div>
          <span className="fp-steps-label">{label}</span>
          {i < 2 && <div className={`fp-steps-line ${i < active ? "is-filled" : ""}`} />}
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
    <div className="fp-error" role="alert" key={msg}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 2 }}>
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{msg}</span>
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
      <div className="fp-strength-bars">
        {[1,2,3,4,5].map(n => (
          <div key={n} className="fp-strength-bar"
            style={{ background: n <= score ? colors[score] : "" }} />
        ))}
      </div>
      <span className="fp-strength-label" style={{ color: colors[score] }}>{labels[score]}</span>
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
  const router      = useRouter();
  const emailRef    = useRef<HTMLInputElement>(null);
  const passRef     = useRef<HTMLInputElement>(null);
  const confirmRef  = useRef<HTMLInputElement>(null);

  const scrollToField = (ref: React.RefObject<HTMLInputElement | null>) => {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
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
      setResendTimer(prev => { if (prev <= 1) { clearInterval(t); return 0; } return prev - 1; });
    }, 1000);
  };

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

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next); setError("");
    if (val && i < 5) (document.getElementById(`fp-otp-${i + 1}`) as HTMLInputElement)?.focus();
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
    (document.getElementById(`fp-otp-${Math.min(pasted.length, 5)}`) as HTMLInputElement)?.focus();
  };

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

  const handleReset = async () => {
    setError("");
    if (!password)           { setError("Please enter a new password."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
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

  /* ── Step 1: Identify ── */
  if (step === "identify") return (
    <PageShell>
      <div className="fp-icon-wrap">
        <div className="fp-icon fp-icon--red"><Mail size={22} strokeWidth={1.5} /></div>
      </div>
      <h1 className="fp-title">Forgot Password?</h1>
      <p className="fp-sub">Enter your registered email and we&apos;ll send you a 6-digit reset code.</p>

      <StepIndicator active={0} />
      <ErrorBanner msg={error} />

      <div className="fp-field">
        <label className="fp-label" htmlFor="fp-email">
          Email Address <span className="fp-label-req">*</span>
        </label>
        <div className="fp-input-wrap">
          <Mail className="fp-input-icon" size={16} />
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
            className="fp-input fp-input--left"
            onKeyDown={e => e.key === "Enter" && void handleSend()}
          />
        </div>
        <p className="fp-hint">A verification code will be sent to this address.</p>
      </div>

      <button className="fp-btn" onClick={() => void handleSend()} disabled={loading}>
        {loading ? <><span className="fp-spin" />Sending…</> : <>Send Reset Code <span className="fp-arrow">→</span></>}
      </button>

      <div className="fp-divider" />
      <Link href="/login" className="fp-back">
        <ArrowLeft size={14} /> Back to Login
      </Link>
    </PageShell>
  );

  /* ── Step 2: OTP ── */
  if (step === "otp") return (
    <PageShell>
      <div className="fp-icon-wrap">
        <div className="fp-icon fp-icon--amber"><KeyRound size={22} strokeWidth={1.5} /></div>
      </div>
      <h1 className="fp-title">Enter Reset Code</h1>
      <p className="fp-sub">
        A 6-digit code was sent to{" "}
        <strong className="fp-sub-em">{identifier}</strong>
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
            className={`fp-otp-box ${error ? "is-error" : ""} ${d ? "is-filled" : ""}`}
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      <button className="fp-btn" onClick={() => void handleVerify()} disabled={loading || otp.join("").length < 6}>
        {loading ? <><span className="fp-spin" />Verifying…</> : <>Verify Code <span className="fp-arrow">→</span></>}
      </button>

      <p className="fp-resend-row">
        Didn&apos;t receive it?{" "}
        <button
          className={`fp-resend-btn ${resendTimer > 0 || loading ? "is-disabled" : ""}`}
          onClick={() => void handleResend()}
          disabled={resendTimer > 0 || loading}
        >
          {resendTimer > 0
            ? <><RefreshCw size={12} className="fp-resend-icon" />Resend in {resendTimer}s</>
            : <>Resend code</>
          }
        </button>
      </p>

      <div className="fp-divider" />
      <button className="fp-back" onClick={() => { setStep("identify"); setOtp(["","","","","",""]); setError(""); }}>
        <ArrowLeft size={14} /> Change email
      </button>
    </PageShell>
  );

  /* ── Step 3: Reset ── */
  if (step === "reset") return (
    <PageShell>
      <div className="fp-icon-wrap">
        <div className="fp-icon fp-icon--green"><ShieldCheck size={22} strokeWidth={1.5} /></div>
      </div>
      <h1 className="fp-title">Set New Password</h1>
      <p className="fp-sub">Choose a strong password to protect your account.</p>

      <StepIndicator active={2} />
      <ErrorBanner msg={error} />

      <div className="fp-field">
        <label className="fp-label" htmlFor="fp-pass">
          New Password <span className="fp-label-req">*</span>
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
            className="fp-input fp-input--right"
          />
          <button type="button" className="fp-eye"
            onClick={() => setShowPass(v => !v)}
            aria-label={showPass ? "Hide password" : "Show password"}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <PasswordStrength value={password} />
      </div>

      <div className="fp-field">
        <label className="fp-label" htmlFor="fp-confirm">
          Confirm Password <span className="fp-label-req">*</span>
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
            className={`fp-input fp-input--right ${confirm && password !== confirm ? "is-error" : ""}`}
            onKeyDown={e => e.key === "Enter" && void handleReset()}
          />
          <button type="button" className="fp-eye"
            onClick={() => setShowConfirm(v => !v)}
            aria-label={showConfirm ? "Hide password" : "Show password"}>
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {confirm && password !== confirm && (
          <p className="fp-hint fp-hint--err">Passwords do not match.</p>
        )}
      </div>

      <button className="fp-btn" onClick={() => void handleReset()} disabled={loading}>
        {loading ? <><span className="fp-spin" />Saving…</> : <>Reset Password <span className="fp-arrow">→</span></>}
      </button>
    </PageShell>
  );

  /* ── Done ── */
  return (
    <PageShell>
      <div className="fp-done">
        <div className="fp-done-ring">
          <CheckCircle2 size={36} strokeWidth={1.5} color="#16a34a" />
        </div>
        <h2 className="fp-done-title">Password Reset!</h2>
        <p className="fp-done-sub">
          Your password has been updated. You can now sign in with your new credentials.
        </p>
        <Link href="/login" className="fp-btn" style={{ textDecoration: "none" }}>
          Go to Login <span className="fp-arrow">→</span>
        </Link>
        <p className="fp-done-note">Redirecting automatically in a few seconds…</p>
      </div>
    </PageShell>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --maroon:      #7b1d2e;
    --maroon-deep: #5c1421;
    --gold:        #c9993a;
    --surface:     #ffffff;
    --bg:          #f4f3ef;
    --ink:         #111111;
    --ink-2:       #555555;
    --ink-3:       #999999;
    --line:        #e5e4df;
    --line-mid:    #ccccc4;
    --error-bg:    #fff1f2;
    --error-text:  #8b1a28;
    --green:       #16a34a;
    --amber:       #d97706;
    --font:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  }

  html, body { height: 100%; background: var(--bg); }

  @keyframes fp-fade-down {
    from { opacity: 0; transform: translateY(-14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fp-fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fp-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes fp-shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }
  @keyframes fp-spin { to { transform: rotate(360deg); } }

  /* ── root ── */
  .fp {
    font-family: var(--font);
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }

  .fp-wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  /* ── hero strip ── */
  .fp-hero {
    background: var(--maroon);
    height: 140px;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }

  .fp-hero-texture {
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 28px,
      rgba(255,255,255,0.022) 28px,
      rgba(255,255,255,0.022) 29px
    );
    pointer-events: none;
  }

  .fp-hero-wave {
    position: absolute;
    bottom: -56px;
    left: -5%;
    width: 110%;
    height: 80px;
    background: var(--bg);
    border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  }

  /* ── sheet ── */
  .fp-sheet {
    flex: 1;
    background: var(--bg);
    padding: 40px 24px 44px;
    display: flex;
    flex-direction: column;
    animation: fp-fade-up 0.55s 0.05s var(--ease-out) both;
  }

  /* ── foot bar ── */
  .fp-foot {
    flex-shrink: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--maroon), var(--gold));
  }

  /* ── icon ── */
  .fp-icon-wrap {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
    animation: fp-fade-down 0.5s var(--ease-out) both;
  }
  .fp-icon {
    width: 56px; height: 56px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .fp-icon--red   { background: #fef1f2; border: 1.5px solid #fecdd3; color: var(--maroon); }
  .fp-icon--amber { background: #fffbeb; border: 1.5px solid #fde68a; color: var(--amber);  }
  .fp-icon--green { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: var(--green);  }

  /* ── headings ── */
  .fp-title {
    font-size: 22px;
    font-weight: 700;
    color: var(--ink);
    text-align: center;
    letter-spacing: -0.025em;
    line-height: 1.2;
    margin-bottom: 6px;
    animation: fp-fade-down 0.5s 0.05s var(--ease-out) both;
  }
  .fp-sub {
    font-size: 13px;
    font-weight: 400;
    color: var(--ink-2);
    text-align: center;
    line-height: 1.55;
    margin-bottom: 24px;
    animation: fp-fade-down 0.5s 0.08s var(--ease-out) both;
  }
  .fp-sub-em { color: var(--ink); font-weight: 600; }

  /* ── step indicator ── */
  .fp-steps {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
  }
  .fp-steps-item {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
  }
  .fp-steps-bubble {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--line-mid);
    background: var(--bg);
    color: var(--ink-3);
    font-size: 10px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all .3s ease;
  }
  .fp-steps-item.is-done .fp-steps-bubble   { border-color: var(--maroon); background: var(--maroon); color: #fff; }
  .fp-steps-item.is-active .fp-steps-bubble { border-color: var(--maroon); background: #fef1f2; color: var(--maroon); }
  .fp-steps-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-3);
    white-space: nowrap;
    transition: color .3s;
  }
  .fp-steps-item.is-done .fp-steps-label,
  .fp-steps-item.is-active .fp-steps-label { color: var(--maroon); }
  .fp-steps-line {
    height: 1px; flex: 1;
    background: var(--line);
    border-radius: 1px;
    transition: background .3s;
  }
  .fp-steps-line.is-filled { background: var(--maroon); }

  /* ── error ── */
  .fp-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--error-bg);
    border-left: 3px solid var(--maroon);
    border-radius: 0 8px 8px 0;
    padding: 12px 14px;
    margin-bottom: 20px;
    font-size: 13.5px;
    color: var(--error-text);
    line-height: 1.5;
    animation: fp-shake 0.4s var(--ease-out), fp-fade-in 0.25s ease;
  }

  /* ── fields ── */
  .fp-field { margin-bottom: 20px; }
  .fp-label {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-2);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .fp-label-req { color: var(--maroon); }

  .fp-input-wrap { position: relative; }

  .fp-input {
    width: 100%;
    height: 52px;
    background: var(--surface);
    border: 1.5px solid var(--line-mid);
    border-radius: 12px;
    padding: 0 16px;
    font-family: var(--font);
    font-size: 15px;
    font-weight: 400;
    color: var(--ink);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    transition: border-color .18s ease, box-shadow .18s ease;
  }
  .fp-input::placeholder { color: var(--ink-3); }
  .fp-input:focus {
    border-color: var(--maroon);
    box-shadow: 0 0 0 3px rgba(123,29,46,0.10);
  }
  .fp-input.is-error { border-color: #f87171 !important; box-shadow: none !important; }
  .fp-input--left  { padding-left: 42px; }
  .fp-input--right { padding-right: 52px; }

  .fp-input-icon {
    position: absolute;
    left: 14px; top: 50%;
    transform: translateY(-50%);
    color: var(--ink-3);
    pointer-events: none;
  }
  .fp-eye {
    position: absolute;
    right: 0; top: 0;
    width: 52px; height: 52px;
    background: none; border: none;
    cursor: pointer; color: var(--ink-3);
    display: flex; align-items: center; justify-content: center;
    transition: color .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .fp-eye:hover { color: var(--ink-2); }

  .fp-hint { font-size: 12px; color: var(--ink-3); margin-top: 6px; line-height: 1.4; }
  .fp-hint--err { color: #ef4444; }

  /* ── password strength ── */
  .fp-strength { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .fp-strength-bars { display: flex; gap: 4px; flex: 1; }
  .fp-strength-bar {
    flex: 1; height: 3px; border-radius: 2px;
    background: var(--line);
    transition: background .3s;
  }
  .fp-strength-label { font-size: 11px; font-weight: 600; min-width: 60px; text-align: right; }

  /* ── OTP ── */
  .fp-otp-wrap {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 24px;
  }
  .fp-otp-box {
    width: 46px; height: 54px;
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    color: var(--ink);
    background: var(--surface);
    border: 1.5px solid var(--line-mid);
    border-radius: 12px;
    outline: none;
    caret-color: var(--maroon);
    transition: border-color .15s ease, box-shadow .15s ease;
    -webkit-appearance: none;
    font-family: var(--font);
  }
  .fp-otp-box:focus {
    border-color: var(--maroon);
    box-shadow: 0 0 0 3px rgba(123,29,46,0.10);
  }
  .fp-otp-box.is-filled { border-color: var(--line-mid); }
  .fp-otp-box.is-error  { border-color: #f87171 !important; box-shadow: none !important; }
  .fp-otp-box::-webkit-outer-spin-button,
  .fp-otp-box::-webkit-inner-spin-button { -webkit-appearance: none; }

  /* ── button ── */
  .fp-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 54px;
    background: var(--maroon);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-family: var(--font);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s ease, transform .12s ease, box-shadow .15s ease;
  }
  .fp-btn:hover:not(:disabled) {
    background: var(--maroon-deep);
    box-shadow: 0 4px 16px rgba(123,29,46,0.28);
  }
  .fp-btn:active:not(:disabled) { transform: scale(0.985); }
  .fp-btn:disabled { opacity: .5; cursor: not-allowed; }

  .fp-arrow { opacity: 0.8; }

  .fp-spin {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: fp-spin .7s linear infinite;
    flex-shrink: 0;
  }

  /* ── resend ── */
  .fp-resend-row {
    text-align: center;
    font-size: 13px;
    color: var(--ink-2);
    margin-top: 16px;
  }
  .fp-resend-btn {
    background: none; border: none; cursor: pointer;
    color: var(--maroon); font-size: 13px; font-weight: 500;
    font-family: var(--font);
    display: inline-flex; align-items: center; gap: 4px;
    text-decoration: underline; text-underline-offset: 2px;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .15s;
    padding: 0;
  }
  .fp-resend-btn.is-disabled { opacity: .45; cursor: not-allowed; text-decoration: none; }
  .fp-resend-icon { animation: fp-spin .8s linear infinite; }

  /* ── divider ── */
  .fp-divider { height: 1px; background: var(--line); margin: 24px 0 16px; }

  /* ── back link ── */
  .fp-back {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: var(--font);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    text-decoration: none;
    background: none; border: none; cursor: pointer;
    width: 100%; padding: 4px 0;
    -webkit-tap-highlight-color: transparent;
    transition: color .15s;
    letter-spacing: 0.01em;
  }
  .fp-back:hover { color: var(--maroon); }

  /* ── done ── */
  .fp-done {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    animation: fp-fade-up 0.5s var(--ease-out) both;
  }
  .fp-done-ring {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: #f0fdf4;
    border: 1.5px solid #bbf7d0;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px;
  }
  .fp-done-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.025em;
    margin-bottom: 10px;
  }
  .fp-done-sub {
    font-size: 13.5px;
    color: var(--ink-2);
    line-height: 1.6;
    margin-bottom: 28px;
    max-width: 280px;
  }
  .fp-done-note {
    font-size: 12px;
    color: var(--ink-3);
    margin-top: 14px;
  }

  /* ── desktop ── */
  @media (min-width: 560px) {
    .fp {
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      background: #e9e8e3;
    }
    .fp-wrap {
      width: 100%;
      max-width: 420px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow:
        0 1px 2px rgba(0,0,0,.06),
        0 8px 24px rgba(0,0,0,.09),
        0 24px 56px rgba(0,0,0,.08);
      animation: fp-fade-up 0.5s var(--ease-out) both;
    }
    .fp-hero  { height: 120px; }
    .fp-sheet { padding: 40px 40px 40px; }
    .fp-foot  { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .fp-icon-wrap, .fp-title, .fp-sub,
    .fp-sheet, .fp-wrap, .fp-done,
    .fp-error { animation: none; }
    .fp-spin, .fp-resend-icon { animation: none; }
  }
`;