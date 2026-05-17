"use client";

// src/components/ui/AdminLoginPage.tsx

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  PENDING_APPROVAL:  "This account is not an admin account.",
  REJECTED:          "Access denied. Contact the system administrator.",
  ACCESS_DENIED:     "Access denied. Admins only.",
  CredentialsSignin: "Invalid email or password.",
  default:           "Something went wrong. Please try again.",
};

/* ─── shared design system — identical tokens to LoginPage ─── */
const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --maroon:       #7b1113;
    --maroon-dark:  #5a0d0f;
    --maroon-deep:  #3d0809;
    --maroon-light: #f9ecec;
    --maroon-mid:   #c0393c;
    --accent:       #e85d26;
    --text-primary: #1a1a2e;
    --text-secondary: #64657a;
    --text-muted:   #9899a8;
    --border:       #e8e8f0;
    --surface:      #ffffff;
    --bg-soft:      #f7f7fb;
    --shadow-card:  0 2px 4px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.08), 0 24px 56px rgba(123,17,19,.12);
    --radius-card:  20px;
    --radius-input: 10px;
    --radius-btn:   10px;
    --transition:   all .22s cubic-bezier(.4,0,.2,1);
    --font-body:    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  html, body { height: 100%; }

  .ayus-root {
    font-family: var(--font-body);
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    padding: 16px;
    background: #0f0304;
  }

  /* ── animated gradient background ── */
  .ayus-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 90% 70% at 15% 20%, rgba(123,17,19,.85) 0%, transparent 60%),
      radial-gradient(ellipse 80% 60% at 85% 80%, rgba(58,6,8,.9) 0%, transparent 55%),
      radial-gradient(ellipse 60% 50% at 50% 50%, rgba(35,3,4,1) 0%, transparent 80%),
      #0f0304;
    animation: bgPulse 8s ease-in-out infinite alternate;
  }

  @keyframes bgPulse {
    0%   { filter: brightness(1); }
    100% { filter: brightness(1.12); }
  }

  /* ── noise grain texture ── */
  .ayus-grain {
    position: absolute;
    inset: 0;
    opacity: .035;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 180px;
    pointer-events: none;
  }

  /* ── floating orbs ── */
  .ayus-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(70px);
  }
  .ayus-orb-1 {
    width: clamp(200px, 40vw, 480px);
    height: clamp(200px, 40vw, 480px);
    top: -15%;
    left: -10%;
    background: radial-gradient(circle, rgba(200,40,44,.5) 0%, transparent 70%);
    animation: orbDrift1 12s ease-in-out infinite alternate;
  }
  .ayus-orb-2 {
    width: clamp(180px, 35vw, 400px);
    height: clamp(180px, 35vw, 400px);
    bottom: -10%;
    right: -8%;
    background: radial-gradient(circle, rgba(232,93,38,.35) 0%, transparent 70%);
    animation: orbDrift2 15s ease-in-out infinite alternate;
  }
  .ayus-orb-3 {
    width: clamp(100px, 20vw, 240px);
    height: clamp(100px, 20vw, 240px);
    top: 50%;
    right: 20%;
    background: radial-gradient(circle, rgba(160,20,22,.3) 0%, transparent 70%);
    animation: orbDrift1 18s ease-in-out infinite alternate-reverse;
  }

  @keyframes orbDrift1 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(6%, 8%) scale(1.08); }
  }
  @keyframes orbDrift2 {
    0%   { transform: translate(0, 0) scale(1); }
    100% { transform: translate(-5%, -6%) scale(1.1); }
  }

  /* ── decorative lines ── */
  .ayus-lines {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    opacity: .06;
  }
  .ayus-lines svg { width: 100%; height: 100%; }

  /* ── admin badge pill ── */
  .ayus-admin-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: linear-gradient(135deg, rgba(123,17,19,.12), rgba(90,13,15,.08));
    border: 1px solid rgba(123,17,19,.2);
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 700;
    color: var(--maroon);
    letter-spacing: .06em;
    text-transform: uppercase;
    margin-bottom: 20px;
  }
  .ayus-admin-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--maroon);
    animation: pulseDot 2s ease-in-out infinite;
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: .5; transform: scale(.7); }
  }

  /* ── card ── */
  .ayus-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 420px;
    background: var(--surface);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: clamp(28px, 6vw, 44px) clamp(24px, 6vw, 40px);
    animation: cardIn .55s cubic-bezier(.22,1,.36,1) both;
    border: 1px solid rgba(255,255,255,.08);
  }

  @keyframes cardIn {
    0%   { opacity: 0; transform: translateY(28px) scale(.97); }
    100% { opacity: 1; transform: translateY(0)    scale(1); }
  }

  /* ── logo badge ── */
  .ayus-logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    animation: cardIn .55s .05s cubic-bezier(.22,1,.36,1) both;
  }
  .ayus-logo-ring {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(145deg, var(--maroon), var(--maroon-dark));
    box-shadow: 0 4px 20px rgba(123,17,19,.35), inset 0 1px 0 rgba(255,255,255,.15);
    position: relative;
  }
  .ayus-logo-ring::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1.5px solid rgba(123,17,19,.2);
  }

  /* ── header text ── */
  .ayus-title {
    font-family: var(--font-body);
    font-size: clamp(20px, 4vw, 24px);
    font-weight: 700;
    color: var(--text-primary);
    text-align: center;
    letter-spacing: -.01em;
    line-height: 1.2;
    animation: cardIn .55s .08s cubic-bezier(.22,1,.36,1) both;
    margin-bottom: 4px;
  }
  .ayus-subtitle {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    margin-bottom: 24px;
    font-weight: 400;
    animation: cardIn .55s .1s cubic-bezier(.22,1,.36,1) both;
    letter-spacing: .01em;
  }

  /* ── divider ── */
  .ayus-divider-top {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border), transparent);
    margin-bottom: 24px;
  }

  /* ── error banner ── */
  .ayus-error {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: #fff5f5;
    border: 1px solid #fecaca;
    border-left: 3px solid #ef4444;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 18px;
    font-size: 13px;
    color: #c0392b;
    line-height: 1.45;
    animation: slideDown .25s cubic-bezier(.22,1,.36,1);
  }

  @keyframes slideDown {
    0%   { opacity: 0; transform: translateY(-8px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* ── form fields ── */
  .ayus-field { margin-bottom: 16px; animation: cardIn .55s .12s cubic-bezier(.22,1,.36,1) both; }
  .ayus-field:last-of-type { animation-delay: .14s; }

  .ayus-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 6px;
    letter-spacing: .01em;
  }

  .ayus-input-wrap { position: relative; }

  .ayus-input {
    width: 100%;
    height: 46px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-input);
    padding: 0 14px;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text-primary);
    background: var(--bg-soft);
    transition: var(--transition);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }
  .ayus-input::placeholder { color: var(--text-muted); }
  .ayus-input:focus {
    border-color: var(--maroon);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(123,17,19,.1);
  }
  .ayus-input-pw { padding-right: 44px; }

  .ayus-eye-btn {
    position: absolute;
    right: 0;
    top: 0;
    height: 46px;
    width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    transition: color .18s;
    border-radius: 0 var(--radius-input) var(--radius-input) 0;
    -webkit-tap-highlight-color: transparent;
  }
  .ayus-eye-btn:hover { color: var(--maroon); }

  /* ── submit button ── */
  .ayus-btn-primary {
    width: 100%;
    height: 48px;
    border: none;
    border-radius: var(--radius-btn);
    background: linear-gradient(135deg, var(--maroon) 0%, var(--maroon-dark) 100%);
    color: #fff;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: .03em;
    cursor: pointer;
    transition: var(--transition);
    position: relative;
    overflow: hidden;
    margin-top: 8px;
    box-shadow: 0 4px 14px rgba(123,17,19,.35);
    -webkit-tap-highlight-color: transparent;
    animation: cardIn .55s .16s cubic-bezier(.22,1,.36,1) both;
  }
  .ayus-btn-primary::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,.12) 0%, transparent 60%);
    opacity: 0;
    transition: opacity .2s;
  }
  .ayus-btn-primary:hover:not(:disabled)::before { opacity: 1; }
  .ayus-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(123,17,19,.4);
  }
  .ayus-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .ayus-btn-primary:disabled { opacity: .65; cursor: not-allowed; }

  /* spinner inside button */
  .ayus-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin .7s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── or divider ── */
  .ayus-or {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 18px 0;
    animation: cardIn .55s .18s cubic-bezier(.22,1,.36,1) both;
  }
  .ayus-or-line { flex: 1; height: 1px; background: var(--border); }
  .ayus-or-text { font-size: 12px; color: var(--text-muted); font-weight: 500; }

  /* ── secondary button ── */
  .ayus-btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 46px;
    border: 1.5px solid var(--border);
    border-radius: var(--radius-btn);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    transition: var(--transition);
    -webkit-tap-highlight-color: transparent;
    animation: cardIn .55s .2s cubic-bezier(.22,1,.36,1) both;
  }
  .ayus-btn-secondary:hover {
    border-color: var(--maroon);
    color: var(--maroon);
    background: var(--maroon-light);
  }

  /* ── header center flex ── */
  .ayus-header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ── responsive tweaks ── */
  @media (max-width: 400px) {
    .ayus-card { border-radius: 16px; }
    .ayus-logo-ring { width: 60px; height: 60px; }
  }

  @media (min-width: 768px) {
    .ayus-root { padding: 32px; }
  }

  /* ── reduced motion ── */
  @media (prefers-reduced-motion: reduce) {
    .ayus-bg, .ayus-orb-1, .ayus-orb-2, .ayus-orb-3 { animation: none; }
    .ayus-card, .ayus-logo-wrap, .ayus-title, .ayus-subtitle,
    .ayus-field, .ayus-btn-primary, .ayus-or, .ayus-btn-secondary {
      animation: none;
    }
    .ayus-admin-badge-dot { animation: none; }
  }
`;

function AdminLoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(ERROR_MESSAGES[err] ?? ERROR_MESSAGES.default);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.default);
        return;
      }

      const res  = await fetch("/api/auth/session");
      const data = await res.json();
      const role = data?.user?.role;

      if (role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        setError("Access denied. This login is for administrators only.");
      }

    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Inject styles */}
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="ayus-root">
        {/* Background layers */}
        <div className="ayus-bg" />
        <div className="ayus-grain" />
        <div className="ayus-orb ayus-orb-1" />
        <div className="ayus-orb ayus-orb-2" />
        <div className="ayus-orb ayus-orb-3" />

        {/* Decorative diagonal lines */}
        <div className="ayus-lines" aria-hidden="true">
          <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <line x1="-100" y1="900" x2="700"  y2="-100" stroke="white" strokeWidth="1"/>
            <line x1="100"  y1="900" x2="900"  y2="-100" stroke="white" strokeWidth=".5"/>
            <line x1="500"  y1="900" x2="1300" y2="-100" stroke="white" strokeWidth=".8"/>
            <line x1="700"  y1="900" x2="1500" y2="-100" stroke="white" strokeWidth=".4"/>
          </svg>
        </div>

        {/* ── Card ── */}
        <main className="ayus-card" role="main">

          {/* Logo */}
          <div className="ayus-logo-wrap">
            <div className="ayus-logo-ring">
              <Image
                src="/psu-logo.png"
                alt="PSU Logo"
                width={44}
                height={44}
                priority
                style={{ borderRadius: "50%", objectFit: "cover" }}
              />
            </div>
          </div>

          {/* Heading */}
          <div className="ayus-header-center">
            <div className="ayus-admin-badge" aria-label="Administrator access">
              <span className="ayus-admin-badge-dot" aria-hidden="true" />
              Administrator Access
            </div>
          </div>

          <h1 className="ayus-title">Welcome to AYUS</h1>
          <p className="ayus-subtitle">Admin Portal — Authorized Personnel Only</p>

          <div className="ayus-divider-top" />

          {/* Error */}
          {error && (
            <div className="ayus-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="ayus-field">
              <label className="ayus-label" htmlFor="admin-email">Email</label>
              <div className="ayus-input-wrap">
                <input
                  suppressHydrationWarning
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Enter admin email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="ayus-input"
                  aria-required="true"
                />
              </div>
            </div>

            {/* Password */}
            <div className="ayus-field">
              <label className="ayus-label" htmlFor="admin-password">Password</label>
              <div className="ayus-input-wrap">
                <input
                  suppressHydrationWarning
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="ayus-input ayus-input-pw"
                  aria-required="true"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(v => !v)}
                  className="ayus-eye-btn"
                >
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              suppressHydrationWarning
              type="submit"
              disabled={loading}
              className="ayus-btn-primary"
              aria-busy={loading}
            >
              {loading && <span className="ayus-spinner" aria-hidden="true" />}
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>

          {/* OR divider */}
          <div className="ayus-or" aria-hidden="true">
            <div className="ayus-or-line" />
            <span className="ayus-or-text">or</span>
            <div className="ayus-or-line" />
          </div>

          {/* Back to user login */}
          <Link href="/login" className="ayus-btn-secondary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to User Login
          </Link>

        </main>
      </div>
    </>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}