"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const DEPARTMENTS_BY_ACCOUNT_TYPE: Record<string, string[]> = {
  faculty: [
    "College of Information Technology","College of Hotel Management","College of Education",
    "College of Engineering","College of Business Administration","College of Arts and Sciences","College of Nursing",
  ],
  instructor: [
    "College of Information Technology","College of Hotel Management","College of Education",
    "College of Engineering","College of Business Administration","College of Arts and Sciences","College of Nursing",
  ],
  staff: ["Non-Teaching Staff"],
};

const ACCOUNT_TYPES = [
  { value: "faculty",    label: "Faculty"    },
  { value: "instructor", label: "Instructor" },
  { value: "staff",      label: "Staff"      },
];

const EMPLOYMENT_STATUS = [
  { value: "permanent",   label: "Permanent"   },
  { value: "contractual", label: "Contractual" },
  { value: "part-time",   label: "Part-Time"   },
  { value: "casual",      label: "Casual"      },
];

const POSITIONS_BY_ACCOUNT_TYPE: Record<string, string[]> = {
  faculty:    ["Professor","Associate Professor","Assistant Professor","Lecturer"],
  instructor: ["Instructor I","Instructor II","Instructor III","Teaching Associate"],
  staff:      ["Administrative Aide","Administrative Assistant","Administrative Officer","Registrar Staff","Librarian","Guidance Counselor","IT Support Staff","Accounting Staff","Cashier","Security Personnel","Utility Worker"],
};

const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV", "V"];

type Step = "form" | "verify" | "pending" | "check-status";

interface FormState {
  firstName: string; middleName: string; lastName: string; suffix: string;
  email: string;
  accountType: string; department: string; position: string;
  contactNumber: string; employmentStatus: string;
  password: string; confirmPassword: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(raw: string): string {
  // Strip non-digits
  const digits = raw.replace(/\D/g, "");
  // Allow max 11 digits (09XXXXXXXXX)
  return digits.slice(0, 11);
}

function validatePhone(val: string): string {
  if (!val) return ""; // optional field
  const digits = val.replace(/\D/g, "");
  if (digits.length < 10) return "Enter a valid phone number.";
  if (digits.length === 11 && !digits.startsWith("09")) return "Mobile number must start with 09.";
  if (digits.length === 10 && !digits.startsWith("9")) return "Enter a valid phone number.";
  return "";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ text, required = false }: { text: string; required?: boolean }) {
  return (
    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
      {text}{required && <span className="text-[#7b1113] normal-case"> *</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-[11px] text-red-500 mt-0.5">{msg}</p>;
}

function PageShell({ children, maxW = "max-w-lg" }: { children: React.ReactNode; maxW?: string }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center py-8">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-login.jpg')" }} />
      <div className="absolute inset-0 bg-black/30" />
      <div className={`relative z-10 bg-white rounded-xl shadow-2xl px-8 py-8 w-full ${maxW} mx-4`}>
        {children}
      </div>
      <div className="relative z-10 flex items-center gap-3 mt-4 text-xs text-white/70">
        <Link href="/help" className="hover:text-white">Help</Link>
        <span className="text-white/30">|</span>
        <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
        <span className="text-white/30">|</span>
        <Link href="/terms" className="hover:text-white">Terms</Link>
      </div>
    </div>
  );
}

function CardHeader({ title, sub }: { title: string; sub: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center mb-5">
      <Image src="/psu-logo.png" alt="PSU Logo" width={52} height={52} className="rounded-full mb-3" />
      <h1 className="text-xl font-bold text-gray-800">{title}</h1>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

const STEP_LABELS = ["Fill in Details", "Verify Email", "Await Approval"];

function StepIndicator({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {STEP_LABELS.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className={[
            "w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0",
            i <= active ? "bg-[#7b1113] text-white" : "bg-gray-100 text-gray-400",
          ].join(" ")}>
            {i < active ? "✓" : i + 1}
          </div>
          <span className={["text-[10px] font-medium", i <= active ? "text-[#7b1113]" : "text-gray-300"].join(" ")}>
            {s}
          </span>
          {i < 2 && <div className="h-px flex-1 bg-gray-100" />}
        </div>
      ))}
    </div>
  );
}

// ── Section divider ───────────────────────────────────────────────────────────
function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="h-px flex-1 bg-gray-100" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [step, setStep]               = useState<Step>("form");
  const [otp, setOtp]                 = useState(["", "", "", "", "", ""]);
  const [loading, setLoading]         = useState(false);
  const [resent, setResent]           = useState(false);
  const [statusEmail, setStatusEmail] = useState("");
  const [statusResult, setStatusResult] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm,  setShowConfirm]    = useState(false);

  const [form, setForm] = useState<FormState>({
    firstName: "", middleName: "", lastName: "", suffix: "",
    email: "",
    accountType: "", department: "", position: "",
    contactNumber: "", employmentStatus: "",
    password: "", confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const fieldCls = (key: string) => [
    "w-full border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2",
    "focus:ring-[#7b1113]/30 transition-all placeholder:text-gray-300",
    errors[key]
      ? "border-red-300 bg-red-50/60 text-red-800"
      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
  ].join(" ");

  const update = (key: keyof FormState, value: string) =>
    setForm((prev) => ({
      ...prev, [key]: value,
      ...(key === "accountType" ? {
        position: "",
        department: value === "staff" ? "Non-Teaching Staff" : "",
      } : {}),
    }));

  const clearError = (key: string) =>
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim())        e.firstName   = "Required.";
    if (!form.lastName.trim())         e.lastName    = "Required.";
    if (!form.email.trim())            e.email       = "Required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.accountType)             e.accountType = "Required.";
    if (!form.department)              e.department  = "Required.";
    if (!form.position.trim())         e.position    = "Required.";
    // Phone validation (optional field but validate format if filled)
    const phoneErr = validatePhone(form.contactNumber);
    if (phoneErr)                      e.contactNumber = phoneErr;
    if (!form.password)                e.password    = "Required.";
    else if (form.password.length < 8) e.password    = "At least 8 characters.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("verify"); }, 1000);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) document.getElementById(`otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      document.getElementById(`otp-${index - 1}`)?.focus();
  };

  const handleVerify = () => {
    if (otp.join("").length < 6) { setErrors({ otp: "Enter the 6-digit code." }); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("pending"); }, 1000);
  };

  const handleResend = () => { setResent(true); setTimeout(() => setResent(false), 5000); };

  const handleCheckStatus = () => {
    if (!statusEmail.trim()) return;
    setLoading(true); setStatusResult(null);
    setTimeout(() => { setLoading(false); setStatusResult("pending"); }, 1000);
  };

  // ── Full name preview ──
  const fullName = [form.firstName.trim(), form.middleName.trim() ? form.middleName.trim()[0] + "." : "", form.lastName.trim(), form.suffix].filter(Boolean).join(" ");

  // ── Form ──
  if (step === "form") return (
    <PageShell>
      <CardHeader
        title="Create Account"
        sub={<>Already have an account?{" "}<Link href="/" className="text-[#7b1113] hover:underline font-medium">Log in</Link></>}
      />
      <StepIndicator active={0} />

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>

        {/* ── Personal Information ── */}
        <SectionDivider label="Personal Information" />

        {/* Row 1: First + Middle */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel text="First Name" required />
            <input type="text" placeholder="Juan" value={form.firstName}
              onChange={(e) => { update("firstName", e.target.value); clearError("firstName"); }}
              className={fieldCls("firstName")} />
            <FieldError msg={errors.firstName} />
          </div>
          <div>
            <FieldLabel text="Middle Name" />
            <input type="text" placeholder="Santos (optional)" value={form.middleName}
              onChange={(e) => update("middleName", e.target.value)}
              className={fieldCls("middleName")} />
          </div>
        </div>

        {/* Row 2: Last + Suffix */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
          <div>
            <FieldLabel text="Last Name" required />
            <input type="text" placeholder="Dela Cruz" value={form.lastName}
              onChange={(e) => { update("lastName", e.target.value); clearError("lastName"); }}
              className={fieldCls("lastName")} />
            <FieldError msg={errors.lastName} />
          </div>
          <div style={{ width: 90 }}>
            <FieldLabel text="Suffix" />
            <select value={form.suffix} onChange={(e) => update("suffix", e.target.value)}
              className={fieldCls("suffix")}>
              {SUFFIXES.map((s) => <option key={s} value={s}>{s || "None"}</option>)}
            </select>
          </div>
        </div>

        {/* Full name preview */}
        {(form.firstName || form.lastName) && (
          <p className="text-[11px] text-gray-400 -mt-1">
            Preview: <span className="text-gray-600 font-medium">{fullName}</span>
          </p>
        )}

        {/* ── Contact ── */}
        <SectionDivider label="Contact" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel text="School Email" required />
            <input type="email" placeholder="juan.delacruz@psu.edu.ph" value={form.email}
              onChange={(e) => { update("email", e.target.value); clearError("email"); }}
              className={fieldCls("email")} />
            <FieldError msg={errors.email} />
          </div>
          <div>
            <FieldLabel text="Contact Number" />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none">+63</span>
              <input
                type="tel"
                placeholder="9XX XXX XXXX"
                value={form.contactNumber}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  update("contactNumber", formatted);
                  clearError("contactNumber");
                }}
                className={`${fieldCls("contactNumber")} pl-9`}
              />
            </div>
            <FieldError msg={errors.contactNumber} />
          </div>
        </div>

        {/* ── Employment ── */}
        <SectionDivider label="Employment" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel text="Account Type" required />
            <select value={form.accountType}
              onChange={(e) => { update("accountType", e.target.value); clearError("accountType"); }}
              className={fieldCls("accountType")}>
              <option value="">Select type...</option>
              {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <FieldError msg={errors.accountType} />
          </div>
          <div>
            <FieldLabel text="Employment Status" />
            <select value={form.employmentStatus}
              onChange={(e) => update("employmentStatus", e.target.value)}
              className={fieldCls("employmentStatus")}>
              <option value="">Select status...</option>
              {EMPLOYMENT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <FieldLabel text="Department" required />
          {form.accountType === "staff" ? (
            <div className={`${fieldCls("department")} opacity-60 cursor-not-allowed flex items-center`}>
              <span className="text-gray-500">Non-Teaching Staff</span>
              <span className="ml-auto text-[10px] text-gray-400 italic">auto-assigned</span>
            </div>
          ) : (
            <select value={form.department} disabled={!form.accountType}
              onChange={(e) => { update("department", e.target.value); clearError("department"); }}
              className={`${fieldCls("department")} ${!form.accountType ? "opacity-50 cursor-not-allowed" : ""}`}>
              <option value="">{form.accountType ? "Select department..." : "Select account type first"}</option>
              {(DEPARTMENTS_BY_ACCOUNT_TYPE[form.accountType] ?? []).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          <FieldError msg={errors.department} />
        </div>

        <div>
          <FieldLabel text="Position" required />
          <select value={form.position} disabled={!form.accountType}
            onChange={(e) => { update("position", e.target.value); clearError("position"); }}
            className={`${fieldCls("position")} ${!form.accountType ? "opacity-50 cursor-not-allowed" : ""}`}>
            <option value="">{form.accountType ? "Select position..." : "Select account type first"}</option>
            {(POSITIONS_BY_ACCOUNT_TYPE[form.accountType] ?? []).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <FieldError msg={errors.position} />
        </div>

        {/* ── Security ── */}
        <SectionDivider label="Security" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel text="Password" required />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => { update("password", e.target.value); clearError("password"); }}
                className={`${fieldCls("password")} pr-9`}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                {showPassword
                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                }
              </button>
            </div>
            <FieldError msg={errors.password} />
          </div>
          <div>
            <FieldLabel text="Confirm Password" required />
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Re-enter password"
                value={form.confirmPassword}
                onChange={(e) => { update("confirmPassword", e.target.value); clearError("confirmPassword"); }}
                className={`${fieldCls("confirmPassword")} pr-9`}
              />
              <button type="button" tabIndex={-1}
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                {showConfirm
                  ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                }
              </button>
            </div>
            <FieldError msg={errors.confirmPassword} />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-[#7b1113] hover:bg-[#5a0d0f] active:bg-[#4a0a0c] text-white font-bold py-2.5 rounded-md text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1">
          {loading ? "Submitting…" : "Create Account →"}
        </button>
      </form>
    </PageShell>
  );

  // ── Verify ──
  if (step === "verify") return (
    <PageShell maxW="max-w-sm">
      <CardHeader
        title="Verify Your Email"
        sub={<>We sent a 6-digit code to{" "}<span className="font-medium text-gray-700">{form.email || "your email"}</span></>}
      />
      <StepIndicator active={1} />

      <div className="flex justify-center gap-2 mb-3">
        {otp.map((digit, i) => (
          <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={digit}
            onChange={(e) => { handleOtpChange(i, e.target.value); clearError("otp"); }}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            className={[
              "w-11 h-12 text-center text-lg font-bold border rounded-md",
              "focus:outline-none focus:ring-2 focus:ring-[#7b1113]/30 transition-all",
              errors.otp ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-gray-300",
            ].join(" ")} />
        ))}
      </div>
      {errors.otp && <p className="text-xs text-red-500 text-center mb-3">{errors.otp}</p>}

      <button onClick={handleVerify} disabled={loading}
        className="w-full bg-[#7b1113] hover:bg-[#5a0d0f] text-white font-bold py-2.5 rounded-md text-sm transition-colors disabled:opacity-60 mb-3">
        {loading ? "Verifying…" : "Verify Email"}
      </button>

      <p className="text-xs text-center text-gray-400">
        {"Didn't receive it?"}{" "}
        <button onClick={handleResend} disabled={resent}
          className="text-[#7b1113] hover:underline font-medium disabled:opacity-50">
          {resent ? "Code resent!" : "Resend code"}
        </button>
      </p>
      <p className="text-xs text-center text-gray-300 mt-3">
        {"Wrong email?"}{" "}
        <button onClick={() => setStep("form")} className="text-gray-400 hover:text-gray-600 hover:underline">
          Go back
        </button>
      </p>
    </PageShell>
  );

  // ── Pending ──
  if (step === "pending") return (
    <PageShell maxW="max-w-sm">
      <StepIndicator active={2} />
      <div className="text-center py-2">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-100">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Account Pending Approval</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-1">
          Your email has been verified. Your account is now being reviewed by an administrator.
        </p>
        <p className="text-xs text-gray-400 leading-relaxed">
          {"You'll receive an email at"}{" "}
          <span className="font-medium text-gray-600">{form.email || "your email"}</span>
          {" once your account is activated."}
        </p>
        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold px-3 py-1.5 rounded-full mt-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Status: Pending Admin Approval
        </div>
      </div>

      <div className="mt-5 bg-gray-50 border border-gray-100 rounded-lg p-3 text-center">
        <p className="text-[11px] text-gray-400 mb-1.5">Closing this page? You can check your approval status anytime.</p>
        <button onClick={() => setStep("check-status")}
          className="text-xs text-[#7b1113] hover:underline font-semibold">
          Check application status →
        </button>
      </div>
      <div className="mt-4 border-t border-gray-100 pt-4 text-center">
        <Link href="/" className="text-xs text-[#7b1113] hover:underline font-medium">← Back to Login</Link>
      </div>
    </PageShell>
  );

  // ── Check Status ──
  return (
    <PageShell maxW="max-w-sm">
      <CardHeader title="Check Application Status" sub="Enter your school email to see your current status" />

      <div className="space-y-3">
        <div>
          <FieldLabel text="School Email" required />
          <input type="email" placeholder="juan.delacruz@psu.edu.ph" value={statusEmail}
            onChange={(e) => { setStatusEmail(e.target.value); setStatusResult(null); }}
            className="w-full border border-gray-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#7b1113]/30 hover:border-gray-300 transition-all" />
        </div>

        <button onClick={handleCheckStatus} disabled={loading || !statusEmail.trim()}
          className="w-full bg-[#7b1113] hover:bg-[#5a0d0f] text-white font-bold py-2.5 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? "Checking…" : "Check Status"}
        </button>

        {statusResult === "pending" && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Still Pending</p>
              <p className="text-[11px] text-amber-600 mt-0.5 leading-relaxed">
                {"Your account is still awaiting admin approval. You'll receive an email once it's activated — no need to sign up again."}
              </p>
            </div>
          </div>
        )}

        {statusResult === "approved" && (
          <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-lg p-3">
            <span className="w-2 h-2 rounded-full bg-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-700">Account Approved!</p>
              <p className="text-[11px] text-green-600 mt-0.5">Your account is active. You can now log in.</p>
            </div>
          </div>
        )}

        {statusResult === "rejected" && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3">
            <span className="w-2 h-2 rounded-full bg-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">Application Rejected</p>
              <p className="text-[11px] text-red-500 mt-0.5 leading-relaxed">
                {"Your application was not approved. Please contact the administrator or "}
                <button onClick={() => { setStep("form"); setStatusResult(null); }} className="underline font-medium">
                  sign up again
                </button>.
              </p>
            </div>
          </div>
        )}

        {statusResult === "approved" && (
          <Link href="/"
            className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-md text-sm transition-colors">
            Go to Login →
          </Link>
        )}
      </div>

      <div className="mt-5 border-t border-gray-100 pt-4 text-center">
        <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">← Back to Login</Link>
      </div>
    </PageShell>
  );
}