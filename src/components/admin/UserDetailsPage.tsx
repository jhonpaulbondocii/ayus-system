"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UserDetail {
  id: string; name: string; email: string; image: string | null;
  pronouns: string | null; position: string | null; department: string | null;
  bio: string | null;
  phone: string | null;
  contactNumber: string | null;
  role: string; status: string; createdAt: string;
}

interface Enrollment {
  courseId: string; courseName: string; role: string; createdAt: string;
}

const MAROON = "#7b1113";

const VALID_COURSE_ROLES = new Set(["Teacher", "Student", "TA", "Observer", "Designer"]);
const normalizeRole = (r: string | null | undefined): string => {
  if (!r) return "Student";
  if (VALID_COURSE_ROLES.has(r)) return r;
  const lower = r.toLowerCase();
  for (const valid of VALID_COURSE_ROLES) {
    if (valid.toLowerCase() === lower) return valid;
  }
  return "Student";
};

export default function UserDetailsPage({ courseId, userId }: { courseId: string; userId: string }) {
  const router = useRouter();
  const [user,        setUser]        = useState<UserDetail | null>(null);
  const [courseName,  setCourseName]  = useState("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/admin/users/${userId}`)
      .then(r => r.json())
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => {});

    fetch(`/api/admin/courses`)
      .then(r => r.json())
      .then(d => {
        const course = (d.courses ?? []).find((c: { id: string; name: string }) => c.id === courseId);
        if (course?.name) setCourseName(course.name);
      })
      .catch(() => {});

    fetch(`/api/admin/users/${userId}/enrollments`)
      .then(r => r.json())
      .then(d => {
        const normalized = (d.enrollments ?? []).map((e: Enrollment) => ({
          ...e,
          role: normalizeRole(e.role),
        }));
        setEnrollments(normalized);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId, courseId]);

  const handleRemove = async () => {
    if (!confirm("Remove this user from the course?")) return;
    await fetch(`/api/admin/courses/${courseId}/people`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    router.push(`/admin/courses/${courseId}/people`);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const font = { fontFamily: "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif" };

  if (loading) return <div style={{ ...font, padding: "48px 32px", fontSize: 13, color: "#9ca3af" }}>Loading...</div>;
  if (!user)   return <div style={{ ...font, padding: "48px 32px", fontSize: 13, color: "#ef4444" }}>User not found.</div>;

  const contactNumber = user.contactNumber ?? user.phone ?? null;
  const currentEnrollment = enrollments.find(e => e.courseId === courseId);

  return (
    <div style={{ ...font, display: "flex", minHeight: "100%" }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, padding: "32px 40px" }}>

        {/* Back button */}
        <button
          onClick={() => router.push(`/admin/courses/${courseId}/people`)}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: MAROON, background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to People
        </button>

        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 32 }}>
          {user.image
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={user.image} alt={user.name}
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #f0e4e4" }}/>
            : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f0e4e4", color: MAROON, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, flexShrink: 0 }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
          }
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.2 }}>
              {user.name}
              {user.pronouns && (
                <span style={{ fontSize: 16, fontWeight: 400, color: "#9ca3af", marginLeft: 8, fontStyle: "italic" }}>({user.pronouns})</span>
              )}
            </h1>
            <button
              style={{ fontSize: 12, fontWeight: 600, color: MAROON, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 6 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Remove avatar picture
            </button>
          </div>
        </div>

        {/* Contact */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8, marginTop: 0 }}>Contact</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>{user.email}</p>
            {contactNumber
              ? <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>{contactNumber}</p>
              : <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No contact number added.</p>
            }
          </div>
        </section>

        {/* Biography */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8, marginTop: 0 }}>Biography</h2>
          {user.bio
            ? <p style={{ margin: 0, fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>{user.bio}</p>
            : <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No biography has been added.</p>
          }
        </section>

        {/* Enrollments */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8, marginTop: 0 }}>Enrollments</h2>
          {enrollments.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No enrollments.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
              {enrollments.map((e, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                  <span style={{ color: "#6b7280" }}>•</span>
                  <span style={{ color: "#6b7280" }}>{e.role}</span>
                  <span style={{ color: "#9ca3af" }}>in</span>
                  <button
                    onClick={() => router.push(`/admin/courses/${e.courseId}/home`)}
                    style={{ color: MAROON, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {e.courseName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Links */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 8, marginTop: 0 }}>Links</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>No links have been added.</p>
        </section>

        {/* Membership */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12, marginTop: 0 }}>Membership(s)</h2>
          {currentEnrollment ? (
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <button
                    onClick={() => router.push(`/admin/courses/${courseId}/home`)}
                    style={{ color: MAROON, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {courseName}
                  </button>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>Enrolled as: {currentEnrollment.role}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>Created {formatDate(currentEnrollment.createdAt)}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    style={{ fontSize: 13, fontWeight: 600, color: MAROON, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                  >
                    Conclude
                  </button>
                  <button
                    onClick={handleRemove}
                    style={{ fontSize: 13, fontWeight: 600, color: MAROON, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>Not enrolled in this course.</p>
          )}
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16, marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#374151" }}>Recent Messages</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>No Messages</p>
          </div>
        </section>
      </div>

      {/* ── Right sidebar ── */}
      <div style={{ width: 180, borderLeft: "1px solid #f3f4f6", padding: "32px 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {["Student Grades", "Interactions Report", "Access Report", "Course Analytics"].map(label => (
            <button key={label}
              style={{ width: "100%", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 600, color: "#374151", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", cursor: "pointer", textAlign: "left", transition: "all .15s", fontFamily: "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = MAROON; e.currentTarget.style.color = MAROON; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}