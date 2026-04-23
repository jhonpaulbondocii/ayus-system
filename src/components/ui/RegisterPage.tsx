"use client";

// src/components/ui/RegisterPage.tsx

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

// ── PSU Mexico Campus specific data ──────────────────────────────────────────
const DEPARTMENTS = [
  "College of Computing Studies",
  "College of Business Studies",
  "College of Education",
  "College of Industrial Technology",
  "College of Hospitality and Tourism Management",
  "Non-Teaching Staff",
];

const ACCOUNT_TYPES = [
  { value: "faculty",    label: "Faculty"    },
  { value: "instructor", label: "Instructor" },
  { value: "staff",      label: "Staff"      },
];

const POSITIONS: Record<string, string[]> = {
  faculty: [
    "Professor I", "Professor II", "Professor III", "Professor IV", "Professor V", "Professor VI",
    "Associate Professor I", "Associate Professor II", "Associate Professor III", "Associate Professor IV", "Associate Professor V",
    "Assistant Professor I", "Assistant Professor II", "Assistant Professor III", "Assistant Professor IV",
  ],
  instructor: [
    "Instructor I", "Instructor II", "Instructor III",
    "Teaching Associate I", "Teaching Associate II",
  ],
  staff: [
    "Administrative Aide I", "Administrative Aide II", "Administrative Aide III", "Administrative Aide IV", "Administrative Aide V", "Administrative Aide VI",
    "Administrative Assistant I", "Administrative Assistant II", "Administrative Assistant III",
    "Administrative Officer I", "Administrative Officer II", "Administrative Officer III", "Administrative Officer IV", "Administrative Officer V",
    "Registrar Staff", "Librarian I", "Librarian II",
    "Guidance Counselor I", "Guidance Counselor II",
    "IT Support Staff",
    "Accounting Staff", "Cashier",
    "Security Guard",
    "Utility Worker",
  ],
};

const EMPLOYMENT_STATUS = [
  { value: "permanent",   label: "Permanent"           },
  { value: "temporary",   label: "Temporary"           },
  { value: "casual",      label: "Casual"              },
  { value: "contractual", label: "Contractual"         },
  { value: "cos",         label: "Contract of Service" },
  { value: "job-order",   label: "Job Order"           },
  { value: "part-time",   label: "Part-Time"           },
];

const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV", "V"];

function formatPhone(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 11);
}

function validatePhone(val: string): string {
  if (!val) return "";
  const digits = val.replace(/\D/g, "");
  if (digits.length < 10) return "Enter a valid phone number.";
  if (digits.length === 11 && !digits.startsWith("09")) return "Mobile number must start with 09.";
  return "";
}

export default function RegisterPage() {
  const [done,    setDone]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [form, setForm] = useState({
    firstName:        "",
    middleName:       "",
    lastName:         "",
    suffix:           "",
    email:            "",
    accountType:      "",  // ← empty default
    employmentStatus: "",  // ← empty default
    department:       "",  // ← empty default
    position:         "",  // ← empty default
    contactNumber:    "",
    password:         "",
    confirm:          "",
  });

  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [phoneError,  setPhoneError]  = useState("");

  const update = (k: string, v: string) => {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (k === "accountType") {
        updated.position   = "";  // reset when account type changes
        updated.department = v === "staff" ? "Non-Teaching Staff" : "";
      }
      return updated;
    });
  };

  // Full name preview: Lastname, Firstname M. Suffix
  const preview = [
    form.lastName.trim(),
    form.firstName.trim() ? ", " + form.firstName.trim() : "",
    form.middleName.trim() ? " " + form.middleName.trim()[0].toUpperCase() + "." : "",
    form.suffix ? " " + form.suffix : "",
  ].join("").replace(/^,\s*/, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.accountType) {
      setError("Please select an account type.");
      return;
    }
    if (!form.employmentStatus) {
      setError("Please select an employment status.");
      return;
    }
    if (!form.department) {
      setError("Please select a department.");
      return;
    }
    if (!form.position) {
      setError("Please select a position.");
      return;
    }
    const pErr = validatePhone(form.contactNumber);
    if (pErr) { setPhoneError(pErr); return; }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:             `${form.lastName}, ${form.firstName}${form.middleName ? " " + form.middleName[0].toUpperCase() + "." : ""}${form.suffix ? " " + form.suffix : ""}`,
          firstName:        form.firstName,
          middleName:       form.middleName,
          lastName:         form.lastName,
          suffix:           form.suffix,
          email:            form.email,
          password:         form.password,
          department:       form.department,
          position:         form.position,
          accountType:      form.accountType,
          employmentStatus: form.employmentStatus,
          contactNumber:    form.contactNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Registration failed. Please try again."); return; }
      setDone(true);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Submitted screen ──────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen relative flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg-login.jpg')" }} />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Registration Submitted!</h2>
        <p className="text-sm text-gray-500 mb-2">
          Your account is <span className="font-semibold text-amber-600">waiting for approval</span>.
        </p>
        <p className="text-sm text-gray-400 mb-8">
          The administrator will review your request. You will be notified once your account is approved.
        </p>
        <Link href="/login"
          className="block w-full py-2.5 bg-[#7b1113] hover:bg-[#5a0d0f] text-white text-sm font-bold rounded-lg transition-colors">
          Back to Login
        </Link>
      </div>
    </div>
  );

  // ── Styling helpers ───────────────────────────────────────────────────────
  const inputCls = (hasError = false) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7b1113]/20 ${
      hasError ? "border-red-300 bg-red-50/30" : "border-gray-200 focus:border-[#7b1113]/40"
    }`;

  const selectWrap = (children: React.ReactNode) => (
    <div className="relative">
      {children}
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
    </div>
  );

  // Gray text when no value selected, dark when value present
  const selectCls = (val: string, disabled = false) =>
    `w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none appearance-none pr-7
     ${!val ? "text-gray-400" : "text-gray-900"}
     ${disabled ? "opacity-60 cursor-not-allowed" : ""}`;

  const Label = ({ text, required, optional }: { text: string; required?: boolean; optional?: boolean }) => (
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {text}
      {required && <span className="text-red-500"> *</span>}
      {optional && <span className="text-gray-400 font-normal normal-case text-[10px]"> (optional)</span>}
    </label>
  );

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg-login.jpg')" }} />
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-7 pb-5 text-center border-b border-gray-100">
          <div className="flex items-center justify-center mx-auto mb-3">
            <Image
              src="/canvas-logo.png"
              alt="PSU Logo"
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Create Account</h1>
          <p className="text-xs text-gray-400 mt-0.5">Pampanga State University — Mexico Campus</p>
          <p className="text-sm text-gray-400 mt-1">
            Already have an account?{" "}
            <Link href="/login" className="text-[#7b1113] font-semibold hover:underline">Log in</Link>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-lg">{error}</div>
          )}

          {/* ── Personal Info ── */}
          <div className="flex items-center gap-2 py-0.5">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Personal Information</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label text="First Name" required />
              <input
                value={form.firstName}
                onChange={e => update("firstName", e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <Label text="Middle Name" optional />
              <input
                value={form.middleName}
                onChange={e => update("middleName", e.target.value)}
                className={inputCls()}
              />
            </div>
          </div>

          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <Label text="Last Name" required />
              <input
                value={form.lastName}
                onChange={e => update("lastName", e.target.value)}
                className={inputCls()}
              />
            </div>
            <div>
              <Label text="Suffix" />
              {selectWrap(
                <select
                  value={form.suffix}
                  onChange={e => update("suffix", e.target.value)}
                  className={selectCls(form.suffix)}>
                  {SUFFIXES.map(s => <option key={s} value={s}>{s || "None"}</option>)}
                </select>
              )}
            </div>
          </div>

          {(form.firstName || form.lastName) && (
            <p className="text-[11px] text-gray-400 -mt-1">
              Preview: <span className="text-gray-600 font-medium">{preview}</span>
            </p>
          )}

          {/* ── Contact ── */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Contact</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label text="PSU Email" required />
              <input
                value={form.email}
                onChange={e => update("email", e.target.value)}
                type="email"
                className={inputCls()}
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Use your official PSU email</p>
            </div>
            <div>
              <Label text="Contact Number" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none pointer-events-none">+63</span>
                <input
                  value={form.contactNumber}
                  onChange={e => {
                    const v = formatPhone(e.target.value);
                    update("contactNumber", v);
                    setPhoneError(validatePhone(v));
                  }}
                  placeholder="9XX XXX XXXX"
                  className={`${inputCls(!!phoneError)} pl-9`}
                />
              </div>
              {phoneError && <p className="text-[11px] text-red-500 mt-0.5">{phoneError}</p>}
            </div>
          </div>

          {/* ── Employment ── */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Employment</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label text="Account Type" required />
              {selectWrap(
                <select
                  value={form.accountType}
                  onChange={e => update("accountType", e.target.value)}
                  className={selectCls(form.accountType)}>
                  <option value="" disabled>Select account type</option>
                  {ACCOUNT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <Label text="Employment Status" />
              {selectWrap(
                <select
                  value={form.employmentStatus}
                  onChange={e => update("employmentStatus", e.target.value)}
                  className={selectCls(form.employmentStatus)}>
                  <option value="" disabled>Select status</option>
                  {EMPLOYMENT_STATUS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <Label text="College / Department" required />
            {selectWrap(
              <select
                value={form.department}
                onChange={e => update("department", e.target.value)}
                disabled={form.accountType === "staff"}
                className={selectCls(form.department, form.accountType === "staff")}>
                <option value="" disabled>Select department</option>
                {(form.accountType === "staff"
                  ? ["Non-Teaching Staff"]
                  : DEPARTMENTS.filter(d => d !== "Non-Teaching Staff")
                ).map(d => <option key={d}>{d}</option>)}
              </select>
            )}
            {form.accountType === "staff" && (
              <p className="text-[10px] text-gray-400 mt-0.5">Auto-assigned for Staff accounts</p>
            )}
          </div>

          <div>
            <Label text="Position" required />
            {selectWrap(
              <select
                value={form.position}
                onChange={e => update("position", e.target.value)}
                disabled={!form.accountType}
                className={selectCls(form.position, !form.accountType)}>
                <option value="" disabled>
                  {!form.accountType ? "Select account type first" : "Select position"}
                </option>
                {(POSITIONS[form.accountType] ?? []).map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            )}
          </div>

          {/* ── Security ── */}
          <div className="flex items-center gap-2 pt-1">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Security</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label text="Password" required />
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => update("password", e.target.value)}
                  placeholder="Min. 8 characters"
                  className={`${inputCls()} pr-8`}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <Label text="Confirm Password" required />
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirm}
                  onChange={e => update("confirm", e.target.value)}
                  placeholder="Re-enter password"
                  className={`${inputCls(!!form.confirm && form.password !== form.confirm)} pr-8`}
                />
                <button type="button" onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {form.confirm && form.password !== form.confirm && (
                <p className="text-[11px] text-red-500 mt-0.5">Passwords do not match.</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#7b1113] hover:bg-[#5a0d0f] disabled:bg-gray-300 text-white text-sm font-bold rounded-lg transition-colors mt-1">
            {loading ? "Creating Account..." : "Create Account →"}
          </button>

          <p className="text-center text-xs text-gray-400 pt-1">
            Help &nbsp;|&nbsp; Privacy Policy &nbsp;|&nbsp; Terms
          </p>
        </form>
      </div>
    </div>
  );
}