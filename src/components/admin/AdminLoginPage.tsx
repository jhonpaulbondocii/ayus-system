"use client";

// src/components/ui/AdminLoginPage.tsx

import { useState, useEffect, useRef, Suspense } from "react";
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
    --bg:             #f4f4f5;
    --surface:        #ffffff;
    --text-primary:   #18181b;
    --text-secondary: #71717a;
    --text-muted:     #a1a1aa;
    --border:         #e4e4e7;
    --accent:         #8b2635;
    --accent-hover:   #6f1e2b;
    --accent-soft:    #f7ecec;
    --error-bg:       #fef2f2;
    --error-border:   #fecaca;
    --error-text:     #b91c1c;
    --radius-card:    12px;
    --radius-input:   8px;
    --radius-btn:     8px;
    --font-body:      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }

  html, body { height: 100%; }

  .ayus-root {
    font-family: var(--font-body);
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
    padding: 24px;
  }

  /* ── admin badge ── */
  .ayus-admin-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: var(--accent-soft);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: .04em;
    text-transform: uppercase;
    margin-bottom: 18px;
  }
  .ayus-admin-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
  }

  /* ── card ── */
  .ayus-card {
    width: 100%;
    max-width: 380px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 36px 32px;
  }

  /* ── logo ── */
  .ayus-logo-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }
  .ayus-logo-ring {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface);
    border: 1px solid var(--border);
    overflow: hidden;
  }

  /* ── header ── */
  .ayus-header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .ayus-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    letter-spacing: -0.01em;
    margin-bottom: 4px;
  }
  .ayus-subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    text-align: center;
    margin-bottom: 28px;
  }

  /* ── error banner ── */
  .ayus-error {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 18px;
    font-size: 13px;
    color: var(--error-text);
    line-height: 1.45;
  }

  /* ── form fields ── */
  .ayus-field { margin-bottom: 16px; }

  .ayus-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 6px;
  }

  .ayus-input-wrap { position: relative; }

  .ayus-input {
    width: 100%;
    height: 42px;
    border: 1px solid var(--border);
    border-radius: var(--radius-input);
    padding: 0 12px;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text-primary);
    background: var(--surface);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    transition: border-color .15s ease;
  }
  .ayus-input::placeholder { color: var(--text-muted); }
  .ayus-input:focus {
    border-color: var(--accent);
  }
  .ayus-input-pw { padding-right: 42px; }

  .ayus-eye-btn {
    position: absolute;
    right: 0;
    top: 0;
    height: 42px;
    width: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    -webkit-tap-highlight-color: transparent;
  }
  .ayus-eye-btn:hover { color: var(--text-secondary); }

  /* ── submit button ── */
  .ayus-btn-primary {
    width: 100%;
    height: 44px;
    border: none;
    border-radius: var(--radius-btn);
    background: var(--accent);
    color: #fff;
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 6px;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s ease;
  }
  .ayus-btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
  .ayus-btn-primary:disabled { opacity: .6; cursor: not-allowed; }

  /* spinner inside button */
  .ayus-spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,.4);
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
    margin: 20px 0;
  }
  .ayus-or-line { flex: 1; height: 1px; background: var(--border); }
  .ayus-or-text { font-size: 12px; color: var(--text-muted); }

  /* ── secondary button ── */
  .ayus-btn-secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    height: 42px;
    border: 1px solid var(--border);
    border-radius: var(--radius-btn);
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
    transition: border-color .15s ease, color .15s ease, background .15s ease;
  }
  .ayus-btn-secondary:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-soft);
  }

  @media (prefers-reduced-motion: reduce) {
    .ayus-spinner { animation: none; }
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
        {/* ── Card ── */}
        <main className="ayus-card" role="main">

          {/* Logo */}
          <div className="ayus-logo-wrap">
            <div className="ayus-logo-ring">
              <Image
                src="/psu-logo.png"
                alt="PSU Logo"
                width={36}
                height={36}
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
                  ref={passwordRef}
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={handlePasswordFocus}
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