"use client";

// src/components/ui/LoginPage.tsx

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  PENDING_APPROVAL:  "Your account is pending admin approval. Please wait.",
  REJECTED:          "Your account has been rejected. Contact the administrator.",
  ACCESS_DENIED:     "Access denied. Contact the administrator.",
  CredentialsSignin: "Invalid email or password.",
  default:           "Something went wrong. Please try again.",
};

const styles = `
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
    --font:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  }

  html, body { height: 100%; background: var(--bg); }

  /* ── entrance keyframes ── */
  @keyframes lp-fade-down {
    from { opacity: 0; transform: translateY(-14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-fade-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes lp-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes lp-shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }

  /* ── root ── */
  .lp {
    font-family: var(--font);
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }

  .lp-wrap {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  /* ── hero ── */
  .lp-hero {
    background: var(--maroon);
    padding: 56px 28px 72px;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }

  /* subtle diagonal texture */
  .lp-hero::before {
    content: '';
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

  /* wave cutout */
  .lp-hero::after {
    content: '';
    position: absolute;
    bottom: -56px;
    left: -5%;
    width: 110%;
    height: 80px;
    background: var(--bg);
    border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  }

  .lp-hero-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    animation: lp-fade-down 0.55s var(--ease-out) both;
  }

  .lp-logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.28));
  }

  .lp-hero-title {
    font-size: 28px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.03em;
    text-align: center;
    line-height: 1.1;
  }

  .lp-hero-sub {
    font-size: 13px;
    font-weight: 400;
    color: rgba(255,255,255,0.55);
    text-align: center;
    letter-spacing: 0.015em;
  }



  /* ── sheet ── */
  .lp-sheet {
    flex: 1;
    background: var(--bg);
    padding: 56px 24px 44px;
    display: flex;
    flex-direction: column;
    animation: lp-fade-up 0.55s 0.1s var(--ease-out) both;
  }

  /* ── error ── */
  .lp-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--error-bg);
    border-left: 3px solid var(--maroon);
    border-radius: 0 8px 8px 0;
    padding: 12px 14px;
    margin-bottom: 24px;
    font-size: 13.5px;
    font-weight: 450;
    color: var(--error-text);
    line-height: 1.5;
    animation: lp-shake 0.4s var(--ease-out), lp-fade-in 0.25s ease;
  }
  .lp-error svg { flex-shrink: 0; margin-top: 2px; }

  /* ── fields ── */
  .lp-field { margin-bottom: 22px; }

  .lp-label {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--ink-2);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .lp-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .lp-label-row .lp-label { margin-bottom: 0; }

  .lp-forgot {
    font-size: 12px;
    font-weight: 500;
    color: var(--maroon);
    text-decoration: none;
    letter-spacing: 0;
    text-transform: none;
    opacity: 0.85;
    transition: opacity .15s ease;
  }
  .lp-forgot:hover { opacity: 1; text-decoration: underline; }

  /* ── inputs ── */
  .lp-input-wrap { position: relative; }

  .lp-input {
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
  .lp-input::placeholder { color: var(--ink-3); }
  .lp-input:focus {
    border-color: var(--maroon);
    box-shadow: 0 0 0 3px rgba(123,29,46,0.10);
  }
  .lp-input-pw { padding-right: 52px; }

  .lp-eye {
    position: absolute;
    right: 0; top: 0;
    width: 52px; height: 52px;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer;
    color: var(--ink-3);
    -webkit-tap-highlight-color: transparent;
    transition: color .15s ease;
  }
  .lp-eye:hover { color: var(--ink-2); }

  /* ── submit ── */
  .lp-submit {
    width: 100%;
    height: 54px;
    background: var(--maroon);
    border: none;
    border-radius: 12px;
    color: #fff;
    font-family: var(--font);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.01em;
    cursor: pointer;
    margin-top: 6px;
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background .15s ease, transform .12s ease, box-shadow .15s ease;
  }
  .lp-submit:hover:not(:disabled) {
    background: var(--maroon-deep);
    box-shadow: 0 4px 16px rgba(123,29,46,0.30);
  }
  .lp-submit:active:not(:disabled) { transform: scale(0.985); }
  .lp-submit:disabled { opacity: .5; cursor: not-allowed; }

  /* spinner */
  .lp-spin {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: lp-spin .7s linear infinite;
    flex-shrink: 0;
  }

  /* ── divider ── */
  .lp-divider {
    display: flex;
    align-items: center;
    gap: 14px;
    margin: 28px 0 20px;
  }
  .lp-divider-line { flex: 1; height: 1px; background: var(--line); }
  .lp-divider-text {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-3);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  /* ── admin link ── */
  .lp-admin {
    display: block;
    text-align: center;
    font-family: var(--font);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    text-decoration: none;
    padding: 8px 0;
    -webkit-tap-highlight-color: transparent;
    transition: color .15s ease;
    letter-spacing: 0.01em;
  }
  .lp-admin:hover { color: var(--maroon); }

  /* ── gold foot bar — mobile ── */
  .lp-foot {
    flex-shrink: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--maroon), var(--gold));
  }

  /* ── desktop ── */
  @media (min-width: 560px) {
    .lp {
      align-items: center;
      justify-content: center;
      padding: 40px 16px;
      min-height: 100dvh;
      background: #e9e8e3;
    }

    .lp-wrap {
      width: 100%;
      max-width: 420px;
      border-radius: 20px;
      overflow: hidden;
      box-shadow:
        0 1px 2px rgba(0,0,0,.06),
        0 8px 24px rgba(0,0,0,.09),
        0 24px 56px rgba(0,0,0,.08);
      animation: lp-fade-up 0.5s var(--ease-out) both;
    }

    .lp-hero { padding: 44px 40px 64px; }
    .lp-sheet { padding: 52px 40px 40px; }
    .lp-foot  { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lp-hero-inner,
    .lp-sheet,
    .lp-wrap,
    .lp-error { animation: none; }
    .lp-spin  { animation: none; }
  }
`;

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");

  const passwordRef = useRef<HTMLInputElement>(null);
  const handlePasswordFocus = () => {
    setTimeout(() => {
      passwordRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

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

      router.push(role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      <div className="lp">
        <div className="lp-wrap">

          {/* ── Hero ── */}
          <header className="lp-hero">
            <div className="lp-hero-inner">
              <div className="lp-logo-wrap">
                <Image
                  src="/psu-logo.png"
                  alt="PSU Logo"
                  width={68}
                  height={68}
                  priority
                  style={{ objectFit: "contain" }}
                />
              </div>
              <h1 className="lp-hero-title">Welcome to AYUS</h1>
              <p className="lp-hero-sub">Integrated Campus Operations Platform</p>
            </div>
          </header>

          {/* ── Form sheet ── */}
          <main className="lp-sheet" role="main">

            {error && (
              <div className="lp-error" role="alert" key={error}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>

              {/* Email */}
              <div className="lp-field">
                <label className="lp-label" htmlFor="email">Email</label>
                <div className="lp-input-wrap">
                  <input
                    suppressHydrationWarning
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="lp-input"
                    aria-required="true"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="lp-field">
                <div className="lp-label-row">
                  <label className="lp-label" htmlFor="password">Password</label>
                  <Link href="/forgot-password" className="lp-forgot" tabIndex={0}>
                    Forgot password?
                  </Link>
                </div>
                <div className="lp-input-wrap">
                  <input
                    suppressHydrationWarning
                    ref={passwordRef}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={handlePasswordFocus}
                    className="lp-input lp-input-pw"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(v => !v)}
                    className="lp-eye"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                suppressHydrationWarning
                type="submit"
                disabled={loading}
                className="lp-submit"
                aria-busy={loading}
              >
                {loading && <span className="lp-spin" aria-hidden="true" />}
                {loading ? "Logging in…" : "Log In"}
              </button>

            </form>

            <div className="lp-divider" aria-hidden="true">
              <div className="lp-divider-line" />
              <span className="lp-divider-text">or</span>
              <div className="lp-divider-line" />
            </div>

            <Link href="/admin/login" className="lp-admin">
              Log in as Administrator
            </Link>

          </main>

          <div className="lp-foot" aria-hidden="true" />

        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}