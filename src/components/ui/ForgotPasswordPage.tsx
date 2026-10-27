"use client";

// src/components/ui/ForgotPasswordPage.tsx

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Mail, ArrowLeft, CheckCircle2, RefreshCw, ShieldCheck, KeyRound } from "lucide-react";

type Step = "identify" | "otp" | "reset" | "done";

/* ─────────────────────────────────────────────
   PAGE SHELL — mobile stacked, desktop split screen
───────────────────────────────────────────── */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{CSS}</style>
      <div className="fp">

        {/* ── Left (desktop) / Top (mobile): system info ── */}
        <header className="fp-hero">
          <Image
            src="/psu-logo.png"
            alt=""
            aria-hidden="true"
            width={560}
            height={560}
            className="fp-watermark"
          />

          <div className="fp-hero-top">
            <Image
              src="/psu-logo.png"
              alt="PSU Logo"
              width={88}
              height={88}
              priority
              className="fp-logo"
              style={{ objectFit: "contain" }}
            />
          </div>

          <div className="fp-hero-inner">
            <p className="fp-brand">AYUS</p>
            <div className="fp-rule" aria-hidden="true" />
            <p className="fp-brand-full">
              Toward a Campus Governance Platform for Integrated Operations,
              Compliance, and Records Management in a State University
            </p>
          </div>
        </header>

        {/* ── Right (desktop) / Bottom (mobile): content ── */}
        <main className="fp-sheet">
          <div className="fp-box">
            {children}
          </div>
          <p className="fp-foot-note">© {new Date().getFullYear()} AYUS</p>
        </main>

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
      <h1 className="fp-title">Forgot password?</h1>
      <div className="fp-title-bar" aria-hidden="true" />
      <p className="fp-sub">Enter your registered email and we&apos;ll send you a 6-digit reset code.</p>

      <StepIndicator active={0} />
      <ErrorBanner msg={error} />

      <div className="fp-field">
        <label className="fp-label" htmlFor="fp-email">
          Email address <span className="fp-label-req">*</span>
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
        {loading ? <><span className="fp-spin" />Sending…</> : <>Send reset code</>}
      </button>

      <Link href="/login" className="fp-back">
        <ArrowLeft size={14} /> Back to login
      </Link>
    </PageShell>
  );

  /* ── Step 2: OTP ── */
  if (step === "otp") return (
    <PageShell>
      <div className="fp-icon-wrap">
        <div className="fp-icon fp-icon--amber"><KeyRound size={22} strokeWidth={1.5} /></div>
      </div>
      <h1 className="fp-title">Enter reset code</h1>
      <div className="fp-title-bar" aria-hidden="true" />
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
        {loading ? <><span className="fp-spin" />Verifying…</> : <>Verify code</>}
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
      <h1 className="fp-title">Set new password</h1>
      <div className="fp-title-bar" aria-hidden="true" />
      <p className="fp-sub">Choose a strong password to protect your account.</p>

      <StepIndicator active={2} />
      <ErrorBanner msg={error} />

      <div className="fp-field">
        <label className="fp-label" htmlFor="fp-pass">
          New password <span className="fp-label-req">*</span>
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
          Confirm password <span className="fp-label-req">*</span>
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
        {loading ? <><span className="fp-spin" />Saving…</> : <>Reset password</>}
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
        <h2 className="fp-done-title">Password reset</h2>
        <p className="fp-done-sub">
          Your password has been updated. You can now sign in with your new credentials.
        </p>
        <Link href="/login" className="fp-btn" style={{ textDecoration: "none" }}>
          Go to login
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
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --maroon:      #7b1d2e;
    --maroon-deep: #5c1421;
    --maroon-dark: #451019;
    --gold:        #c9993a;
    --surface:     #ffffff;
    --bg:          #faf9f7;
    --ink:         #14110f;
    --ink-2:       #57534e;
    --ink-3:       #8f8a84;
    --line:        #e7e5e0;
    --line-mid:    #cfccc5;
    --error-bg:    #fff1f2;
    --error-text:  #8b1a28;
    --green:       #16a34a;
    --amber:       #d97706;
    --font:        'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  }

  html, body { height: 100%; background: var(--bg); }

  @keyframes fp-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fp-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fp-shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }
  @keyframes fp-spin { to { transform: rotate(360deg); } }

  /* ── root: stacked on mobile, split on desktop ── */
  .fp {
    font-family: var(--font);
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }

  /* ── LEFT / TOP: brand panel ── */
  .fp-hero {
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 14px;
    background:
      radial-gradient(120% 90% at 0% 0%, var(--maroon) 0%, var(--maroon-deep) 60%, var(--maroon-dark) 100%);
    color: #fff;
    padding: 32px 24px 76px;
  }

  .fp-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent, transparent 28px,
      rgba(255,255,255,0.025) 28px, rgba(255,255,255,0.025) 29px
    );
    pointer-events: none;
  }

  .fp-hero::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: -5%;
    width: 110%;
    height: 56px;
    background: var(--bg);
    border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  }

  .fp-watermark { display: none; }

  .fp-hero-top,
  .fp-hero-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .fp-logo {
    width: 72px;
    height: 72px;
    filter: drop-shadow(0 4px 14px rgba(0,0,0,0.35));
  }

  .fp-hero-inner { gap: 12px; }

  .fp-brand {
    font-size: 44px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.04em;
  }

  .fp-rule {
    width: 48px;
    height: 3px;
    border-radius: 2px;
    background: var(--gold);
  }

  /* full system name is hidden on mobile to keep the form close to the top */
  .fp-brand-full { display: none; }

  /* ── RIGHT / BOTTOM: content ── */
  .fp-sheet {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    background: var(--bg);
    padding: 8px 24px 40px;
    animation: fp-fade-up 0.6s 0.05s var(--ease-out) both;
  }

  .fp-box { width: 100%; max-width: 400px; margin: 0 auto; }

  .fp-foot-note {
    margin-top: auto;
    padding-top: 32px;
    text-align: center;
    font-size: 12px;
    color: var(--ink-3);
  }

  /* ── icon ── */
  .fp-icon-wrap { display: flex; margin-bottom: 16px; }
  .fp-icon {
    width: 52px; height: 52px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  .fp-icon--red   { background: #fef1f2; border: 1.5px solid #fecdd3; color: var(--maroon); }
  .fp-icon--amber { background: #fffbeb; border: 1.5px solid #fde68a; color: var(--amber);  }
  .fp-icon--green { background: #f0fdf4; border: 1.5px solid #bbf7d0; color: var(--green);  }

  /* ── headings ── */
  .fp-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .fp-title-bar {
    width: 56px; height: 3px;
    background: var(--maroon);
    border-radius: 2px;
    margin: 12px 0 10px;
  }
  .fp-sub {
    font-size: 14px;
    color: var(--ink-2);
    line-height: 1.55;
    margin-bottom: 24px;
    overflow-wrap: anywhere;
  }
  .fp-sub-em { color: var(--ink); font-weight: 600; }

  /* ── step indicator ── */
  .fp-steps { display: flex; align-items: center; margin-bottom: 24px; }
  .fp-steps-item { display: flex; align-items: center; gap: 6px; flex: 1; }
  .fp-steps-item:last-child { flex: 0 0 auto; }
  .fp-steps-bubble {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: 1.5px solid var(--line-mid);
    background: var(--bg);
    color: var(--ink-3);
    font-size: 11px;
    font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: all .3s ease;
  }
  .fp-steps-item.is-done .fp-steps-bubble   { border-color: var(--maroon); background: var(--maroon); color: #fff; }
  .fp-steps-item.is-active .fp-steps-bubble { border-color: var(--maroon); background: #fef1f2; color: var(--maroon); }
  .fp-steps-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-3);
    white-space: nowrap;
    transition: color .3s;
  }
  .fp-steps-item.is-done .fp-steps-label,
  .fp-steps-item.is-active .fp-steps-label { color: var(--maroon); }
  .fp-steps-line {
    height: 1px; flex: 1;
    background: var(--line-mid);
    border-radius: 1px;
    margin: 0 4px;
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
    font-weight: 500;
    color: var(--error-text);
    line-height: 1.5;
    animation: fp-shake 0.4s var(--ease-out), fp-fade-in 0.25s ease;
  }

  /* ── fields ── */
  .fp-field { margin-bottom: 20px; }
  .fp-label {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink);
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
    color: var(--ink);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    transition: border-color .18s ease, box-shadow .18s ease;
  }
  .fp-input::placeholder { color: var(--ink-3); }
  .fp-input:focus {
    border-color: var(--maroon);
    box-shadow: 0 0 0 3px rgba(123,29,46,0.12);
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
    border-radius: 0 12px 12px 0;
    cursor: pointer; color: var(--ink-3);
    display: flex; align-items: center; justify-content: center;
    transition: color .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .fp-eye:hover { color: var(--ink-2); }
  .fp-eye:focus-visible { outline: 2px solid var(--maroon); outline-offset: -2px; }

  .fp-hint { font-size: 12.5px; color: var(--ink-3); margin-top: 6px; line-height: 1.4; }
  .fp-hint--err { color: #ef4444; }

  /* ── password strength ── */
  .fp-strength { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
  .fp-strength-bars { display: flex; gap: 4px; flex: 1; }
  .fp-strength-bar {
    flex: 1; height: 3px; border-radius: 2px;
    background: var(--line);
    transition: background .3s;
  }
  .fp-strength-label { font-size: 12px; font-weight: 600; min-width: 72px; text-align: right; }

  /* ── OTP ── */
  .fp-otp-wrap {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
  }
  .fp-otp-box {
    flex: 1;
    min-width: 0;
    max-width: 56px;
    height: 56px;
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
    box-shadow: 0 0 0 3px rgba(123,29,46,0.12);
  }
  .fp-otp-box.is-error  { border-color: #f87171 !important; box-shadow: none !important; }

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
    cursor: pointer;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s ease, transform .12s ease, box-shadow .15s ease;
  }
  .fp-btn:hover:not(:disabled) {
    background: var(--maroon-deep);
    box-shadow: 0 6px 18px rgba(123,29,46,0.30);
  }
  .fp-btn:active:not(:disabled) { transform: scale(0.985); }
  .fp-btn:focus-visible { outline: 3px solid rgba(123,29,46,0.35); outline-offset: 2px; }
  .fp-btn:disabled { opacity: .55; cursor: not-allowed; }

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
    font-size: 13.5px;
    color: var(--ink-2);
    margin-top: 16px;
  }
  .fp-resend-btn {
    background: none; border: none; cursor: pointer;
    color: var(--maroon); font-size: 13.5px; font-weight: 600;
    font-family: var(--font);
    display: inline-flex; align-items: center; gap: 4px;
    text-decoration: underline; text-underline-offset: 2px;
    -webkit-tap-highlight-color: transparent;
    transition: opacity .15s;
    padding: 0;
  }
  .fp-resend-btn.is-disabled { opacity: .45; cursor: not-allowed; text-decoration: none; }
  .fp-resend-icon { animation: fp-spin .8s linear infinite; }

  /* ── back link ── */
  .fp-back {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-family: var(--font);
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
    text-decoration: none;
    background: none; border: none; cursor: pointer;
    width: 100%;
    margin-top: 22px;
    padding: 8px 0;
    -webkit-tap-highlight-color: transparent;
    transition: color .15s;
  }
  .fp-back:hover { color: var(--maroon); text-decoration: underline; }

  /* ── done ── */
  .fp-done {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
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
    font-size: 28px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.02em;
    margin-bottom: 10px;
  }
  .fp-done-sub {
    font-size: 14px;
    color: var(--ink-2);
    line-height: 1.6;
    margin-bottom: 28px;
  }
  .fp-done-note {
    font-size: 12.5px;
    color: var(--ink-3);
    margin-top: 14px;
    align-self: center;
  }

  /* ── desktop: true split screen ── */
  @media (min-width: 900px) {
    .fp {
      flex-direction: row;
      align-items: stretch;
    }

    .fp-hero {
      flex: 1 1 52%;
      align-items: flex-start;
      justify-content: space-between;
      text-align: left;
      gap: 0;
      padding: 56px 64px;
    }
    .fp-hero::after { display: none; }

    .fp-watermark {
      display: block;
      position: absolute;
      right: -140px;
      bottom: -140px;
      width: 560px;
      height: 560px;
      opacity: 0.07;
      pointer-events: none;
      filter: grayscale(1) brightness(2);
    }

    .fp-hero-top,
    .fp-hero-inner { align-items: flex-start; }

    .fp-logo { width: 96px; height: 96px; }

    .fp-hero-inner { gap: 22px; max-width: 520px; }
    .fp-brand { font-size: 104px; letter-spacing: 0.02em; }
    .fp-rule { width: 72px; height: 4px; }
    .fp-brand-full {
      display: block;
      max-width: 480px;
      font-size: 18px;
      line-height: 1.6;
      color: rgba(255,255,255,0.85);
    }

    .fp-sheet {
      flex: 1 1 48%;
      justify-content: center;
      padding: 48px 64px;
      background: var(--surface);
    }
    .fp-title, .fp-done-title { font-size: 34px; }
    .fp-foot-note { margin-top: 0; padding-top: 40px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .fp-sheet, .fp-done, .fp-error { animation: none; }
    .fp-spin, .fp-resend-icon { animation: none; }
  }
`;