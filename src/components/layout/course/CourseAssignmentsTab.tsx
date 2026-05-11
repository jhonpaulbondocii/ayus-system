"use client";

// src/components/layout/course/CourseAssignmentsTab.tsx

import { useState, useCallback, useMemo } from "react";
import type { Assignment, Section, Staff } from "./types";
import CourseAssignmentsList from "./CourseAssignmentsList";
import CourseAssignmentDetail from "./CourseAssignmentDetail";
import CourseAssignmentSubmitterDetail from "./CourseAssignmentSubmitterDetail";
import HeadCreateAssignment from "./CourseAssignmentForm";
import StaffAssignmentList from "./CourseAssignmentsStaffList";
import CourseAssignmentSubmissions from "./CourseAssignmentSubmissions";
import { FONT } from "./helpers";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type AssignmentWithRole = Assignment & {
  _assignmentRole?: "manager" | "submitter";
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherRole?: string | null;
  _publisherId?: string | null;
  _isAssignedToYou?: boolean;
  _isExplicitlyAssignedToYou?: boolean;
  isAssignedToYou?: boolean;
  isCreator?: boolean;
};

type AssignView = "list" | "detail" | "submitter-detail" | "create" | "edit" | "submissions";

/* ─────────────────────────────────────────────────────────────────────────────
   ROLE RESOLUTION
───────────────────────────────────────────────────────────────────────────── */
function getBool(v: unknown): boolean { return v === true; }

function resolveRole(a: AssignmentWithRole, currentUserId?: string | null): "manager" | "submitter" {
  const assignedToYou = getBool(a._isAssignedToYou) || getBool(a._isExplicitlyAssignedToYou) || getBool(a.isAssignedToYou);
  const isCreator = getBool(a.isCreator) || (!!currentUserId && !!a._publisherId && a._publisherId === currentUserId);
  if (assignedToYou && !isCreator) return "submitter";
  if (isCreator) return "manager";
  if (a._assignmentRole === "submitter") return "submitter";
  if (a._assignmentRole === "manager") return "manager";
  return "submitter";
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────────────────────────── */
interface Props {
  courseId: string;
  assignments: Assignment[];
  setAssignments: React.Dispatch<React.SetStateAction<Assignment[]>>;
  sections: Section[];
  staff: Staff[];
  isHead: boolean;
  canManageAssignments: boolean;
  currentUserId?: string | null;
  currentUserName?: string | null;
  currentUserRole?: string | null;
  onNavDrillIn?: (label: string, backFn: () => void) => void;
  onNavDrillOut?: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────────────────────── */
export default function CourseAssignmentsTab({
  courseId,
  assignments: rawAssignments,
  setAssignments: rawSetAssignments,
  sections,
  staff,
  isHead,
  canManageAssignments,
  currentUserId,
  currentUserName,
  currentUserRole,
  onNavDrillIn,
  onNavDrillOut,
}: Props) {
  const assignments = rawAssignments as AssignmentWithRole[];
  const setAssignments = rawSetAssignments as React.Dispatch<React.SetStateAction<AssignmentWithRole[]>>;

  const [assignView, setAssignView] = useState<AssignView>("list");
  const [viewTarget, setViewTarget] = useState<AssignmentWithRole | null>(null);
  const [createGroup, setCreateGroup] = useState<string | undefined>(undefined);

  const reloadAssignments = useCallback(() => {
    fetch(`/api/courses/${courseId}/assignments`)
      .then(r => r.json())
      .then(d => setAssignments(d.assignments ?? []))
      .catch(() => { });
  }, [courseId, setAssignments]);

  const resolvedAssignments = useMemo(
    () => assignments.map(a => ({ ...a, _assignmentRole: resolveRole(a, currentUserId) })),
    [assignments, currentUserId]
  );

  // ── Helpers for drill-in/out ──────────────────────────────────────────────
  const drillInToDetail = useCallback((a: AssignmentWithRole) => {
    onNavDrillIn?.(a.title ?? "Assignment", () => {
      setAssignView("list");
      setViewTarget(null);
      onNavDrillOut?.();
    });
  }, [onNavDrillIn, onNavDrillOut]);

  const drillOut = useCallback(() => {
    setAssignView("list");
    setViewTarget(null);
    onNavDrillOut?.();
  }, [onNavDrillOut]);

  // ── SUBMISSIONS VIEW ──────────────────────────────────────────────────────
  if (assignView === "submissions" && viewTarget) {
    return (
      <CourseAssignmentSubmissions
        assignment={viewTarget}
        courseId={courseId}
        onBack={() => {
          setAssignView("detail");
        }}
      />
    );
  }

  /* ── NON-HEAD PATH ── */
  if (!isHead || !canManageAssignments) {

    if (assignView === "submitter-detail" && viewTarget) {
      return (
        <CourseAssignmentSubmitterDetail
          assignment={viewTarget}
          courseId={courseId}
          currentUserId={currentUserId}
          onBack={drillOut}
        />
      );
    }

    if (assignView === "detail" && viewTarget) {
      return (
        <CourseAssignmentDetail
          assignment={viewTarget}
          courseId={courseId}
          sections={sections}
          staff={staff}
          currentUserId={currentUserId}
          onBack={drillOut}
          onEditFull={a => {
            setViewTarget({ ...a, _assignmentRole: "manager" });
            setAssignView("edit");
          }}
          setAssignments={setAssignments}
        />
      );
    }

    return (
      <div style={{ fontFamily: FONT, height: "100%" }}>
        <StaffAssignmentList
          assignments={resolvedAssignments}
          courseId={courseId}
          onSelectAssignment={a => {
            const role = resolveRole(a, currentUserId);
            const resolved = { ...a, _assignmentRole: role };
            setViewTarget(resolved);
            setAssignView(role === "manager" ? "detail" : "submitter-detail");
            drillInToDetail(resolved);
          }}
        />
      </div>
    );
  }

  /* ── HEAD: SUBMITTER DETAIL VIEW ── */
  if (assignView === "submitter-detail" && viewTarget) {
    return (
      <CourseAssignmentSubmitterDetail
        assignment={viewTarget}
        courseId={courseId}
        currentUserId={currentUserId}
        onBack={drillOut}
      />
    );
  }

  /* ── HEAD: MANAGER DETAIL VIEW ── */
  if (assignView === "detail" && viewTarget && viewTarget._assignmentRole === "manager") {
    return (
      <CourseAssignmentDetail
        assignment={viewTarget}
        courseId={courseId}
        sections={sections}
        staff={staff}
        currentUserId={currentUserId}
        onBack={drillOut}
        onEditFull={a => {
          setViewTarget({ ...a, _assignmentRole: "manager" });
          setAssignView("edit");
        }}
        setAssignments={setAssignments}
      />
    );
  }

  /* ── HEAD: CREATE ── */
  if (assignView === "create") {
    return (
      <HeadCreateAssignment
        courseId={courseId}
        initialGroup={createGroup}
        existingAssignment={null}
        onCancel={() => {
          setAssignView("list");
          setCreateGroup(undefined);
          onNavDrillOut?.();
        }}
        onCreated={() => {
          setAssignView("list");
          setCreateGroup(undefined);
          onNavDrillOut?.();
          reloadAssignments();
        }}
      />
    );
  }

  /* ── HEAD: EDIT ── */
  if (assignView === "edit" && viewTarget) {
    return (
      <HeadCreateAssignment
        courseId={courseId}
        initialGroup={viewTarget.assignmentGroup}
        existingAssignment={viewTarget}
        onCancel={() => {
          setAssignView(viewTarget._assignmentRole === "manager" ? "detail" : "list");
          if (viewTarget._assignmentRole !== "manager") onNavDrillOut?.();
        }}
        onCreated={() => {
          setAssignView("list");
          onNavDrillOut?.();
          reloadAssignments();
        }}
      />
    );
  }

  /* ── HEAD: ASSIGNMENT LIST (default) ── */
  return (
    <CourseAssignmentsList
      courseId={courseId}
      assignments={resolvedAssignments}
      setAssignments={setAssignments}
      sections={sections}
      staff={staff}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      currentUserRole={currentUserRole}
      onViewDetail={a => {
        const role = resolveRole(a, currentUserId);
        const resolved = { ...a, _assignmentRole: role };
        setViewTarget(resolved);
        setAssignView(role === "submitter" ? "submitter-detail" : "detail");
        drillInToDetail(resolved);
      }}
      onCreateNew={group => {
        setCreateGroup(group);
        setAssignView("create");
        onNavDrillIn?.("New Assignment", () => {
          setAssignView("list");
          setCreateGroup(undefined);
          onNavDrillOut?.();
        });
      }}
      onEditFull={a => {
        setViewTarget({ ...a, _assignmentRole: "manager" });
        setAssignView("edit");
        onNavDrillIn?.(a.title ?? "Edit Assignment", () => {
          setAssignView("list");
          setViewTarget(null);
          onNavDrillOut?.();
        });
      }}
    />
  );
}