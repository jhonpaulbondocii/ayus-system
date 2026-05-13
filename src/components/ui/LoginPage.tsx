"use client";

// src/components/ui/LoginPage.tsx

import { useState, useEffect, Suspense } from "react";
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

function LoginForm() {
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

      router.push(role === "ADMIN" ? "/admin/dashboard" : "/dashboard");

    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(135deg, #7b1113 0%, #4a0a0b 50%, #1a0304 100%)" }}>

      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px"
        }}/>

      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-10"
        style={{ background: "#ff4444", filter: "blur(80px)", transform: "translate(-30%, -30%)" }}/>
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10"
        style={{ background: "#ff8800", filter: "blur(80px)", transform: "translate(30%, 30%)" }}/>

      {/* Card */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl px-10 py-10 w-full max-w-sm mx-4"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.4)" }}>

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/psu-logo.png"
            alt="PSU Logo"
            width={64}
            height={64}
            className="rounded-full"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Welcome to AYUS
          </h1>
          <p className="text-sm text-gray-500">
            Integrated Campus Operations Platform
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              suppressHydrationWarning
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1113]/30 focus:border-[#7b1113] transition-colors bg-gray-50 focus:bg-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#7b1113] hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                suppressHydrationWarning
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1113]/30 focus:border-[#7b1113] transition-colors bg-gray-50 focus:bg-white"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            suppressHydrationWarning
            type="submit"
            disabled={loading}
            className="w-full disabled:opacity-70 text-white font-bold py-3 rounded-lg transition-all text-sm mt-2"
            style={{ background: "linear-gradient(135deg, #7b1113, #5a0d0f)" }}
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Admin login */}
        <Link
          href="/admin/login"
          className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:border-[#7b1113] hover:bg-[#7b1113]/5 text-gray-500 hover:text-[#7b1113] font-medium py-2.5 rounded-lg transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 2a4 4 0 100 8 4 4 0 000-8zM4 20a8 8 0 0116 0" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Log in as Administrator
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}