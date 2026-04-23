"use client";

import Link from "next/link";

interface CourseHomeProps {
  courseId: string;
  courseName: string;
  courseCode?: string;
}

const MAROON = "#7b1113";
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Arial,sans-serif";

export default function CourseHome({
  courseId,
  courseName,
  courseCode,
}: CourseHomeProps) {
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        minHeight: "100vh",
        background: "#fff",
        fontFamily: FONT,
      }}
    >
      {/* Left Course Nav */}
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #e5e7eb",
          background: "#fafafa",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb" }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#2563eb",
              marginBottom: 4,
            }}
          >
            {courseName}
          </div>

          {courseCode ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>{courseCode}</div>
          ) : null}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", paddingTop: 8 }}>
          <CourseNavLink href={`/courses/${courseId}`} label="Home" active />
          <CourseNavLink href={`/courses/${courseId}/assignments`} label="Assignments" />
          <CourseNavLink href={`/courses/${courseId}/discussions`} label="Discussions" />
          <CourseNavLink href={`/courses/${courseId}/grades`} label="Grades" />
          <CourseNavLink href={`/courses/${courseId}/people`} label="People" />
          <CourseNavLink href={`/courses/${courseId}/files`} label="Files" />
          <CourseNavLink href={`/courses/${courseId}/syllabus`} label="Syllabus" />
          <CourseNavLink href={`/courses/${courseId}/collaborations`} label="Collaborations" />
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: "24px 32px" }}>
        <p
          style={{
            fontSize: 16,
            color: "#6b7280",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          No modules have been defined for this course.
        </p>
      </main>

      {/* Right Sidebar */}
      <aside
        style={{
          width: 270,
          borderLeft: "1px solid #e5e7eb",
          padding: "22px 20px",
          flexShrink: 0,
          background: "#fff",
        }}
      >
        <SidebarButton label="View Course Stream" />
        <SidebarButton label="View Course Calendar" />
        <SidebarButton label="View Course Notifications" />

        <Section title="To Do">
          <p style={mutedText}>Nothing for now</p>
        </Section>

        <Section title="Course Groups">
          <p style={{ ...mutedText, color: "#2563eb" }}>Group 2</p>
        </Section>

        <Section title="Recent Feedback">
          <p style={mutedText}>Nothing for now</p>
        </Section>
      </aside>
    </div>
  );
}

function CourseNavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: "10px 16px",
        fontSize: 14,
        textDecoration: "none",
        color: active ? "#111827" : "#2563eb",
        fontWeight: active ? 700 : 500,
        background: active ? "#f3f4f6" : "transparent",
        borderLeft: active ? `3px solid ${MAROON}` : "3px solid transparent",
      }}
    >
      {label}
    </Link>
  );
}

function SidebarButton({ label }: { label: string }) {
  return (
    <button
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        marginBottom: 12,
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        background: "#fff",
        cursor: "pointer",
        fontSize: 14,
        color: "#374151",
        fontFamily: FONT,
      }}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 24 }}>
      <h4
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#111827",
          margin: "0 0 8px",
        }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

const mutedText: React.CSSProperties = {
  fontSize: 14,
  color: "#6b7280",
  margin: 0,
};