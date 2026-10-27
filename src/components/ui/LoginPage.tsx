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
    --font:        'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  }

  html, body { height: 100%; background: var(--bg); }

  @keyframes lp-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes lp-spin { to { transform: rotate(360deg); } }
  @keyframes lp-shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-6px); }
    40%     { transform: translateX(6px); }
    60%     { transform: translateX(-4px); }
    80%     { transform: translateX(4px); }
  }

  /* ── root: stacked on mobile, split on desktop ── */
  .lp {
    font-family: var(--font);
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }

  /* ── LEFT / TOP: brand panel ── */
  .lp-hero {
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 18px;
    background:
      radial-gradient(120% 90% at 0% 0%, var(--maroon) 0%, var(--maroon-deep) 60%, var(--maroon-dark) 100%);
    color: #fff;
    padding: 40px 24px 84px;
  }

  .lp-hero::before {
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

  .lp-hero::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: -5%;
    width: 110%;
    height: 56px;
    background: var(--bg);
    border-radius: 50% 50% 0 0 / 100% 100% 0 0;
  }

  .lp-watermark { display: none; }

  .lp-hero-top,
  .lp-hero-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: lp-fade-up 0.6s var(--ease-out) both;
  }

  .lp-logo {
    width: 88px;
    height: 88px;
    filter: drop-shadow(0 4px 14px rgba(0,0,0,0.35));
  }

  .lp-hero-inner { gap: 14px; }

  .lp-brand {
    font-size: 56px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: 0.04em;
  }

  .lp-rule {
    width: 48px;
    height: 3px;
    border-radius: 2px;
    background: var(--gold);
  }

  .lp-brand-full {
    max-width: 440px;
    font-size: 13.5px;
    font-weight: 400;
    line-height: 1.65;
    color: rgba(255,255,255,0.75);
  }

  /* ── RIGHT / BOTTOM: form ── */
  .lp-sheet {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    background: var(--bg);
    padding: 8px 24px 40px;
    animation: lp-fade-up 0.6s 0.08s var(--ease-out) both;
  }

  .lp-form-box { width: 100%; max-width: 400px; margin: 0 auto; }

  .lp-title {
    font-size: 30px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .lp-title-bar {
    width: 56px; height: 3px;
    background: var(--maroon);
    border-radius: 2px;
    margin: 12px 0 10px;
  }
  .lp-sub {
    font-size: 14px;
    color: var(--ink-2);
    margin-bottom: 28px;
    line-height: 1.5;
  }

  /* error */
  .lp-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: var(--error-bg);
    border-left: 3px solid var(--maroon);
    border-radius: 0 8px 8px 0;
    padding: 12px 14px;
    margin-bottom: 22px;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--error-text);
    line-height: 1.5;
    animation: lp-shake 0.4s var(--ease-out), lp-fade-in 0.25s ease;
  }
  .lp-error svg { flex-shrink: 0; margin-top: 2px; }

  /* fields */
  .lp-field { margin-bottom: 20px; }

  .lp-label {
    display: block;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink);
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
    font-size: 13px;
    font-weight: 600;
    color: var(--maroon);
    text-decoration: none;
    transition: color .15s ease;
  }
  .lp-forgot:hover { color: var(--maroon-deep); text-decoration: underline; }

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
    color: var(--ink);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    transition: border-color .18s ease, box-shadow .18s ease;
  }
  .lp-input::placeholder { color: var(--ink-3); }
  .lp-input:focus {
    border-color: var(--maroon);
    box-shadow: 0 0 0 3px rgba(123,29,46,0.12);
  }
  .lp-input-pw { padding-right: 52px; }

  .lp-eye {
    position: absolute;
    right: 0; top: 0;
    width: 52px; height: 52px;
    display: flex; align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer;
    color: var(--ink-3);
    border-radius: 0 12px 12px 0;
    -webkit-tap-highlight-color: transparent;
    transition: color .15s ease;
  }
  .lp-eye:hover { color: var(--ink-2); }
  .lp-eye:focus-visible { outline: 2px solid var(--maroon); outline-offset: -2px; }

  /* submit */
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
    cursor: pointer;
    margin-top: 6px;
    -webkit-tap-highlight-color: transparent;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background .15s ease, transform .12s ease, box-shadow .15s ease;
  }
  .lp-submit:hover:not(:disabled) {
    background: var(--maroon-deep);
    box-shadow: 0 6px 18px rgba(123,29,46,0.30);
  }
  .lp-submit:active:not(:disabled) { transform: scale(0.985); }
  .lp-submit:focus-visible { outline: 3px solid rgba(123,29,46,0.35); outline-offset: 2px; }
  .lp-submit:disabled { opacity: .55; cursor: not-allowed; }

  .lp-spin {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: lp-spin .7s linear infinite;
    flex-shrink: 0;
  }

  .lp-admin {
    display: block;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
    text-decoration: none;
    margin-top: 26px;
    padding: 8px 0;
    -webkit-tap-highlight-color: transparent;
    transition: color .15s ease;
  }
  .lp-admin:hover { color: var(--maroon); text-decoration: underline; }

  .lp-foot-note {
    margin-top: auto;
    padding-top: 32px;
    text-align: center;
    font-size: 12px;
    color: var(--ink-3);
  }

  /* ── desktop: true split screen ── */
  @media (min-width: 900px) {
    .lp {
      flex-direction: row;
      align-items: stretch;
    }

    .lp-hero {
      flex: 1 1 52%;
      align-items: flex-start;
      justify-content: space-between;
      text-align: left;
      gap: 0;
      padding: 56px 64px;
    }
    .lp-hero::after { display: none; }

    .lp-watermark {
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

    .lp-hero-top,
    .lp-hero-inner { align-items: flex-start; }

    .lp-logo { width: 96px; height: 96px; }

    .lp-hero-inner { gap: 22px; max-width: 520px; }
    .lp-brand { font-size: 104px; letter-spacing: 0.02em; }
    .lp-rule { width: 72px; height: 4px; }
    .lp-brand-full {
      max-width: 480px;
      font-size: 18px;
      line-height: 1.6;
      color: rgba(255,255,255,0.85);
    }

    .lp-sheet {
      flex: 1 1 48%;
      justify-content: center;
      padding: 48px 64px;
      background: var(--surface);
    }
    .lp-title { font-size: 34px; }
    .lp-foot-note { margin-top: 0; padding-top: 40px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lp-hero-top, .lp-hero-inner, .lp-sheet, .lp-error { animation: none; }
    .lp-spin { animation: none; }
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

        {/* ── Left (desktop) / Top (mobile): system info ── */}
        <header className="lp-hero">
          <Image
            src="/psu-logo.png"
            alt=""
            aria-hidden="true"
            width={560}
            height={560}
            className="lp-watermark"
          />

          <div className="lp-hero-top">
            <Image
              src="/psu-logo.png"
              alt="PSU Logo"
              width={88}
              height={88}
              priority
              className="lp-logo"
              style={{ objectFit: "contain" }}
            />
          </div>

          <div className="lp-hero-inner">
            <h1 className="lp-brand">AYUS</h1>
            <div className="lp-rule" aria-hidden="true" />
            <p className="lp-brand-full">
              Toward a Campus Governance Platform for Integrated Operations,
              Compliance, and Records Management in a State University
            </p>
          </div>
        </header>

        {/* ── Right (desktop) / Bottom (mobile): login ── */}
        <main className="lp-sheet">
          <div className="lp-form-box">

            <h2 className="lp-title">Sign in</h2>
            <div className="lp-title-bar" aria-hidden="true" />
            <p className="lp-sub">Log in with your account to continue.</p>

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

              <div className="lp-field">
                <div className="lp-label-row">
                  <label className="lp-label" htmlFor="password">Password</label>
                  <Link href="/forgot-password" className="lp-forgot">
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={handlePasswordFocus}
                    className="lp-input lp-input-pw"
                    aria-required="true"
                  />
                  <button
                    type="button"
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
                {loading ? "Logging in…" : "Log in"}
              </button>

            </form>

            <Link href="/admin/login" className="lp-admin">
              Log in as administrator
            </Link>

          </div>

          <p className="lp-foot-note">© {new Date().getFullYear()} AYUS</p>
        </main>

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