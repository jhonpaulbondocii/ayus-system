"use client";

// src/components/layout/CourseViewPage.tsx

import {
  useState,
  useEffect,
  useTransition,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import Navbar from "./NavBar";
import type { BreadcrumbItem } from "./NavBar";

import CourseHomeTab from "./course/CourseHomeTab";
import CourseAnnouncementsTab from "./course/CourseAnnouncementsTab";
import CourseAssignmentsTab from "./course/CourseAssignmentsTab";
import CourseGradesTab from "./course/CourseGradesTab";
import CoursePeopleTab from "./course/CoursePeopleTab";
import CourseQuizzesTab from "./course/CourseQuizzesTab";
import CourseSettingsTab from "./course/CourseSettingsTab";

import {
  FONT,
  MAROON,
  COLORS,
  ALL_TABS,
  HIDDEN_FOR_STAFF,
  normalizeAnnouncement,
  normalizeCourseRole,
} from "./course/helpers";

import type {
  Course,
  Assignment,
  RawAnnouncement,
  Announcement,
  Person,
  Group,
  Membership,
  Section,
  Staff,
  Tab,
} from "./course/types";

function MembershipBadge({ role }: { role: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border"
      style={{ color: MAROON, borderColor: "#f0c0c0", background: "#fdf8f8" }}
    >
      {role}
    </span>
  );
}

function CourseViewInner({ courseId }: { courseId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id ?? null;

  const [course, setCourse] = useState<Course | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Home");

  const [drillLabel, setDrillLabel] = useState<string | null>(null);
  const [drillBack, setDrillBack] = useState<(() => void) | null>(null);

  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [newPersonRole, setNewPersonRole] = useState<"Staff" | "Head">("Staff");
  const [newGroupName, setNewGroupName] = useState("");
  const [peopleActionLoading, setPeopleActionLoading] = useState(false);

  const [, startTransition] = useTransition();

  const handleTabChange = (tab: Tab) => {
  drillBack?.();        // ← i-reset ang internal state ng current tab
  setActiveTab(tab);
  setDrillLabel(null);
  setDrillBack(null);
};

  useEffect(() => {
    const tabParam = searchParams.get("tab") as Tab | null;
    const validTabs: Tab[] = [...ALL_TABS];
    if (tabParam && validTabs.includes(tabParam)) {
      startTransition(() => setActiveTab(tabParam));
    }
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch(`/api/courses/${courseId}`).then((r) => r.json()).catch(() => ({})),
      fetch(`/api/courses/${courseId}/assignments`).then((r) => r.json()).catch(() => ({ assignments: [] })),
      fetch(`/api/courses/${courseId}/announcements`).then((r) => r.json()).catch(() => ({ announcements: [] })),
      fetch(`/api/courses/${courseId}/people`).then((r) => r.json()).catch(() => ({ people: [] })),
      fetch(`/api/courses/${courseId}/groups`).then((r) => r.json()).catch(() => ({ groups: [] })),
      fetch(`/api/courses/${courseId}/sections`).then((r) => r.json()).catch(() => ({ sections: [], staff: [] })),
    ]).then(([courseData, assignmentData, announcementData, peopleData, groupData, sectionData]) => {
      if (!isMounted) return;
      setCourse(courseData.course ?? null);
      const role = normalizeCourseRole(courseData?.membership?.role);
      setMembership({
        role,
        permissions: {
          viewCourse: Boolean(courseData?.membership?.permissions?.viewCourse),
          viewAnnouncements: Boolean(courseData?.membership?.permissions?.viewAnnouncements),
          submitAssignments: Boolean(courseData?.membership?.permissions?.submitAssignments),
          manageAnnouncements: Boolean(courseData?.membership?.permissions?.manageAnnouncements),
          manageAssignments: Boolean(courseData?.membership?.permissions?.manageAssignments),
          managePeople: Boolean(courseData?.membership?.permissions?.managePeople),
          manageCourse: Boolean(courseData?.membership?.permissions?.manageCourse),
        },
      });
      setAssignments(assignmentData.assignments ?? []);
      const rawAnnouncements =
        announcementData.announcements ??
        announcementData.items ??
        announcementData.data ??
        [];
      setAnnouncements(
        rawAnnouncements.map((item: RawAnnouncement, index: number) =>
          normalizeAnnouncement(item, index)
        )
      );
      setPeople(
        (peopleData.people ?? []).map((p: Person) => ({
          ...p,
          role: normalizeCourseRole(p.role),
        }))
      );
      setGroups(groupData.groups ?? []);
      setSections(sectionData.sections ?? []);
      setStaff(
        (sectionData.staff ?? []).map(
          (s: { id: string; name?: string; email?: string }) => ({
            id: s.id,
            name: s.name ?? s.email ?? s.id,
          })
        )
      );
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const sessionLoaded = sessionStatus !== "loading";
  const dataLoaded = !loading && sessionLoaded;

  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
const isHead = dataLoaded && (
  membership?.role === "Head" ||
  membership?.role?.includes("Head") ||
  isAdmin
);
  const canManageAssignments = dataLoaded && (membership?.permissions.manageAssignments ?? false);
  const canManageAnnouncements = membership?.permissions.manageAnnouncements ?? false;
  const canManagePeople = membership?.permissions.managePeople ?? false;
  const canManageCourse = membership?.permissions.manageCourse ?? false;

  const TABS: Tab[] = ALL_TABS.filter(
    (t) => !HIDDEN_FOR_STAFF.includes(t)
  ) as Tab[];

  const handleAddPerson = async () => {
    const email = newPersonEmail.trim();
    if (!email) return;
    setPeopleActionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: newPersonRole }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const person = data.person ?? data.member ?? data.user ?? null;
      if (person)
        setPeople((prev) => [
          { ...person, role: normalizeCourseRole(person.role ?? newPersonRole) },
          ...prev,
        ]);
      setNewPersonEmail("");
      setNewPersonRole("Staff");
      setShowAddPeopleModal(false);
    } catch (err) {
      console.error(err);
      alert("Could not add person.");
    } finally {
      setPeopleActionLoading(false);
    }
  };

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setPeopleActionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.group) setGroups((prev) => [data.group, ...prev]);
      setNewGroupName("");
      setShowAddGroupModal(false);
    } catch (err) {
      console.error(err);
      alert("Could not add group.");
    } finally {
      setPeopleActionLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div
          className="flex items-center justify-center h-64 text-sm"
          style={{ color: COLORS.textMuted, fontFamily: FONT }}
        >
          Loading...
        </div>
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Navbar showBack onBack={() => router.back()} />
        <div
          className="flex flex-col items-center justify-center h-64 text-center gap-3"
          style={{ fontFamily: FONT }}
        >
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            Course not found.
          </p>
          <button
            onClick={() => router.back()}
            className="text-sm hover:underline"
            style={{ color: COLORS.primary }}
          >
            ← Go back
          </button>
        </div>
      </>
    );
  }

  const goHome = () => handleTabChange("Home");

  // FIX: goToTab now calls drillBack() first to reset the tab's internal state
  // (e.g. clear selectedAssignment in CourseAssignmentsTab) before clearing
  // the breadcrumb drill state.
  const goToTab = () => {
    drillBack?.();
    setDrillLabel(null);
    setDrillBack(null);
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: course.code ?? "Course", onClick: goHome },
    ...(activeTab !== "Home"
      ? [
          {
            label: activeTab,
            onClick: drillLabel ? goToTab : undefined,
          },
        ]
      : []),
    ...(drillLabel ? [{ label: drillLabel }] : []),
  ];

  return (
    <div
      className="flex flex-col h-full bg-white overflow-hidden"
      style={{ fontFamily: FONT, fontSize: 13 }}
    >
      <Navbar breadcrumbs={breadcrumbs} />

      <div className="flex flex-1 overflow-hidden">

        <nav
          className="w-52 border-r bg-white shrink-0 overflow-y-auto py-3"
          style={{ borderColor: COLORS.border }}
        >
          <div className="px-3 pb-3">
            <div
              className="rounded-lg border px-3 py-2 bg-[#fdf8f8]"
              style={{ borderColor: "#f0e4e4" }}
            >
              <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
  Office Role
</div>
<div className="mt-1">
  <MembershipBadge role={membership?.role ?? "Staff"} />
</div>
            </div>
          </div>
          <div className="space-y-0.5 px-0">
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className="w-full text-left text-sm py-2 transition-colors flex items-center gap-2"
                  style={{
                    fontFamily: FONT,
                    paddingLeft: isActive ? 13 : 16,
                    paddingRight: 12,
                    color: isActive ? COLORS.text : COLORS.primary,
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? COLORS.primarySoft : "transparent",
                    borderLeft: isActive
                      ? `3px solid ${COLORS.primary}`
                      : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = COLORS.primarySoft;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex-1 overflow-hidden flex flex-col bg-white">

          {activeTab === "Home" && (
            <div className="flex-1 overflow-y-auto">
              <CourseHomeTab
                course={course}
                membership={membership}
                groups={groups}
                courseId={courseId}
                canManageAnnouncements={canManageAnnouncements}
                canManageAssignments={canManageAssignments}
                canManagePeople={canManagePeople}
                canManageCourse={canManageCourse}
                isHead={isHead}
                currentUserId={currentUserId ?? ""}
                onTabChange={(tab) => handleTabChange(tab as Tab)}
              />
            </div>
          )}

          {activeTab === "Announcements" && (
            <div className="flex-1 overflow-y-auto">
              <CourseAnnouncementsTab
                courseId={courseId}
                courseStatus={course.status}
                announcements={announcements}
                setAnnouncements={setAnnouncements}
                people={people}
                canManageAnnouncements={canManageAnnouncements}
              />
            </div>
          )}

          {activeTab === "Assignments" && (
  <div className={`flex-1 flex flex-col ${drillLabel ? "overflow-hidden" : "overflow-y-auto"}`}>
              <CourseAssignmentsTab
                courseId={courseId}
                assignments={assignments}
                setAssignments={setAssignments}
                sections={sections}
                staff={staff}
                isHead={isHead}
                canManageAssignments={canManageAssignments}
                currentUserId={currentUserId}
                onNavDrillIn={(label: string, backFn: () => void) => {
                  setDrillLabel(label);
                  setDrillBack(() => backFn);
                }}
                onNavDrillOut={() => {
                  setDrillLabel(null);
                  setDrillBack(null);
                }}
              />
            </div>
          )}

          {activeTab === "Grades" && sessionLoaded && (
            <div className="flex-1 overflow-y-auto">
              <CourseGradesTab
  courseId={courseId}
  isHead={isHead}
  isAdmin={isAdmin}
  currentUserId={currentUserId}
  courseRole={membership?.role}
/>
            </div>
          )}

          {activeTab === "People" && (
            <div className="flex-1 overflow-y-auto">
              <CoursePeopleTab
                course={course}
                courseId={courseId}
                people={people}
                groups={groups}
                membership={membership}
                canManagePeople={canManagePeople}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isHead={isHead}
                onAddPeople={() => setShowAddPeopleModal(true)}
                onAddGroup={() => setShowAddGroupModal(true)}
              />
            </div>
          )}

          {activeTab === "Collaborations" && (
            <div className="flex-1 overflow-y-auto px-8 py-8 text-sm" style={{ color: COLORS.textMuted }}>
              No content available.
            </div>
          )}

          {activeTab === "Form" && dataLoaded && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <CourseQuizzesTab
                courseId={courseId}
                isHead={isHead}
                canManageForms={canManageAssignments}
                currentUserId={currentUserId}
              />
            </div>
          )}
          {activeTab === "Form" && !dataLoaded && (
            <div
              className="flex-1 flex items-center justify-center text-sm"
              style={{ color: COLORS.textMuted }}
            >
              Loading...
            </div>
          )}

          {activeTab === "Settings" && isHead && course && (
            <div className="flex-1 overflow-y-auto">
              <CourseSettingsTab
                courseId={courseId}
                course={course}
                onCourseUpdate={(updated) =>
                  setCourse((prev) => (prev ? { ...prev, ...updated } : prev))
                }
              />
            </div>
          )}
        </div>
      </div>

      {/* Add People Modal */}
      {showAddPeopleModal && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowAddPeopleModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Add People</h2>
              <button
                onClick={() => setShowAddPeopleModal(false)}
                className="w-7 h-7 flex items-center justify-center border border-gray-200 text-gray-400 rounded-lg text-base hover:border-gray-400"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  value={newPersonEmail}
                  onChange={(e) => setNewPersonEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#7b1113]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Role
                </label>
                <select
                  value={newPersonRole}
                  onChange={(e) => setNewPersonRole(e.target.value as "Staff" | "Head")}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#7b1113]"
                >
                  <option value="Staff">Staff</option>
                  <option value="Head">Head</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowAddPeopleModal(false)}
                disabled={peopleActionLoading}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPerson}
                disabled={peopleActionLoading || !newPersonEmail.trim()}
                style={{ background: MAROON }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              >
                {peopleActionLoading ? "Saving..." : "Add People"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setShowAddGroupModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Add Group</h2>
              <button
                onClick={() => setShowAddGroupModal(false)}
                className="w-7 h-7 flex items-center justify-center border border-gray-200 text-gray-400 rounded-lg text-base hover:border-gray-400"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-5">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                Group Name
              </label>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Team Alpha"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#7b1113]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowAddGroupModal(false)}
                disabled={peopleActionLoading}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGroup}
                disabled={peopleActionLoading || !newGroupName.trim()}
                style={{ background: MAROON }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              >
                {peopleActionLoading ? "Saving..." : "Save Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseViewPage({ courseId }: { courseId: string }) {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center h-64 text-sm"
          style={{ color: COLORS.textMuted, fontFamily: FONT }}
        >
          Loading...
        </div>
      }
    >
      <CourseViewInner courseId={courseId} />
    </Suspense>
  );
}