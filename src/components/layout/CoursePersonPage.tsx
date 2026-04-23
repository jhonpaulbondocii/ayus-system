"use client";

// src/components/layout/CoursePersonPage.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const MAROON = "#7b1113";

interface UserDetail {
  id: string; name: string | null; email: string;
  image: string | null; pronouns: string | null;
  bio: string | null; contactNumber: string | null;
  position: string | null; department: string | null;
}

interface Enrollment {
  courseId: string; courseName: string; role: string; createdAt: string;
}

function Avatar({ name, image }: { name: string | null; image: string | null }) {
  const initials = (name ?? "?")
    .trim().split(/[\s,]+/).filter(Boolean)
    .map(n => n[0]).slice(0, 2).join("").toUpperCase();

  if (image) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt={name ?? ""} className="w-20 h-20 rounded-full object-cover"
      style={{ border: `3px solid #f0e4e4` }}/>
  );
  return (
    <div className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-black select-none"
      style={{ background: "#f0e4e4", color: MAROON }}>
      {initials}
    </div>
  );
}

export default function CoursePersonPage({ courseId, userId }: { courseId: string; userId: string }) {
  const router = useRouter();
  const [user,        setUser]        = useState<UserDetail | null>(null);
  const [courseName,  setCourseName]  = useState("");
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);

  useEffect(() => {
    if (!userId || !courseId) return;

    Promise.all([
      fetch(`/api/courses/${courseId}/people/${userId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/courses/${courseId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/courses/${courseId}/people/${userId}/enrollments`).then(r => r.json()).catch(() => null),
    ]).then(([personData, courseData, enrollmentData]) => {
      if (!personData?.user) { setNotFound(true); }
      else { setUser(personData.user); }
      if (courseData?.course?.name) setCourseName(courseData.course.name);
      if (enrollmentData?.enrollments) setEnrollments(enrollmentData.enrollments);
    }).finally(() => setLoading(false));
  }, [userId, courseId]);

  const font = { fontFamily: "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif" };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400" style={font}>
      Loading...
    </div>
  );

  if (notFound || !user) return (
    <div className="flex flex-col items-center justify-center h-64 text-center gap-3" style={font}>
      <p className="text-sm text-gray-500">User not found.</p>
      <button onClick={() => router.back()}
        className="text-sm font-semibold hover:underline" style={{ color: MAROON }}>
        ← Go back
      </button>
    </div>
  );

  return (
    <div className="flex min-h-full bg-white" style={font}>
      <div className="flex-1 px-10 py-8 max-w-3xl">

        {/* Back button */}
        <button
          onClick={() => router.push(`/courses/${courseId}`)}
          className="flex items-center gap-1 text-sm font-semibold mb-6 transition-opacity hover:opacity-70"
          style={{ color: MAROON }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          Back to Course
        </button>

        {/* Profile header */}
        <div className="flex items-start gap-6 mb-8">
          <Avatar name={user.name} image={user.image}/>
          <div className="pt-2">
            <h1 className="text-xl font-black text-gray-900 leading-tight">
              {user.name ?? user.email}
              {user.pronouns && (
                <span className="text-gray-400 font-normal text-base ml-2 italic">
                  ({user.pronouns})
                </span>
              )}
            </h1>
            {courseName && (
              <p className="text-xs text-gray-400 mt-1 font-medium">{courseName}</p>
            )}
          </div>
        </div>

        {/* Contact */}
        <section className="mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>
            Contact
          </h2>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">{user.email}</p>
            {user.contactNumber && (
              <p className="text-sm text-gray-600">{user.contactNumber}</p>
            )}
          </div>
        </section>

        <div style={{ borderTop: "1px solid #f0e4e4", marginBottom: 20 }}/>

        {/* Biography */}
        <section className="mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>
            Biography
          </h2>
          {user.bio ? (
            <p className="text-sm text-gray-600 leading-relaxed">{user.bio}</p>
          ) : user.position || user.department ? (
            <p className="text-sm text-gray-600">
              {[user.position, user.department].filter(Boolean).join(" — ")}
            </p>
          ) : (
            <p className="text-sm text-gray-400">No biography has been added</p>
          )}
        </section>

        <div style={{ borderTop: "1px solid #f0e4e4", marginBottom: 20 }}/>

        {/* Enrollments */}
        <section className="mb-6">
          <h2 className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>
            Enrollments
          </h2>
          {enrollments.length === 0 ? (
            <p className="text-sm text-gray-400">No enrollments.</p>
          ) : (
            <ul className="space-y-1.5">
              {enrollments.map((e, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: MAROON }}/>
                  <span className="capitalize font-medium text-gray-500">{e.role}</span>
                  <span className="text-gray-400">in</span>
                  <button
                    onClick={() => router.push(`/courses/${e.courseId}`)}
                    className="font-semibold hover:underline transition-colors"
                    style={{ color: MAROON }}>
                    {e.courseName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div style={{ borderTop: "1px solid #f0e4e4", marginBottom: 20 }}/>

        {/* Links */}
        <section>
          <h2 className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: MAROON }}>
            Links
          </h2>
          <p className="text-sm text-gray-400">No links have been added.</p>
        </section>

      </div>
    </div>
  );
}