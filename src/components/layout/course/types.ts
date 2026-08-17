// src/components/layout/course/types.ts

export interface Course {
  id: string;
  name: string;
  code: string;
  color: string;
  image: string | null;
  status: string;
  term: string | null;
  officeType: string | null;
}

export interface Assignment {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  points: number;
  status: string;
  submissionType: string;
  assignmentGroup: string;
  onlineEntryOptions?: string[];
  assignees?: string[];
  allowedAttempts?: number | null;
  submissionAttempts?: string;
  submissions?: {
    status: string;
    grade: number | null;
    submittedAt: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    textEntry?: string | null;
    websiteUrl?: string | null;
    comments?: string | null;
    feedback?: string | null;
  }[];
  // Publisher info injected by API
  _assignmentRole?: "manager" | "submitter";
  _publisherName?: string | null;
  _publisherImage?: string | null;
  _publisherRole?: string | null;
  _publisherId?: string | null;
}

export interface RawAnnouncement {
  id?: string | number;
  title?: string;
  topicTitle?: string;
  bodyText?: string;
  bodyHtml?: string;
  message?: string;
  author?: string;
  authorName?: string;
  authorImage?: string | null;
  authorId?: string | null;
  authorRole?: string | null;
  postTo?: string | string[];
  assignTo?: string | string[];
  createdAtIso?: string;
  createdAt?: string;
  created_at?: string;
  read?: boolean;
  locked?: boolean;
  allowComments?: boolean;
  allowLiking?: boolean;
  attachments?: {
    id: string;
    name: string;
    size: number;
    mimeType?: string;
    type?: string;
    url: string;
  }[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  bodyHtml: string;
  authorName: string;
  authorImage: string | null;
  authorId: string | null;
  authorRole: string | null;
  recipientsLabel: string;
  createdAt: string | null;
  read: boolean;
  locked: boolean;
  allowComments: boolean;
  allowLiking: boolean;
  attachments: {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
}

export interface AnnouncementCreateAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Person {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  pronouns: string | null;
  department: string | null;
  position: string | null;
  accountType: string | null;
  employmentStatus: string | null;
  bio: string | null;
  status: string;
}

export interface GroupMember {
  id: string;
  name: string | null;
  image: string | null;
  isLeader: boolean;
}

export interface Group {
  id: string;
  name: string;
  groupSetId: string;
  groupSetName: string;
  memberCount: number;
  isMember: boolean;
  members: GroupMember[];
}

export interface MembershipPermissions {
  viewCourse: boolean;
  viewAnnouncements: boolean;
  submitAssignments: boolean;
  manageAnnouncements: boolean;
  manageAssignments: boolean;
  managePeople: boolean;
  manageCourse: boolean;
  canDelete: boolean;
}

export interface Membership {
  role: string;
  permissions: MembershipPermissions;
}

export interface EnrolledUser {
  id: string;
  name: string;
  email?: string;
  courseRole?: string;
}

export interface AssignRow {
  id: number;
  assignees: string[];
  dueDate: string;
  dueTime: string;
  availableFrom: string;
  availableFromTime: string;
  until: string;
  untilTime: string;
}

export interface SubmissionEntry {
  id: number;
  label: string;
  required: boolean;
  type: string;
}

export interface AssignmentGroupItem {
  id: number;
  name: string;
}

export interface GroupSetItem {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  name: string;
}

// ── Course Role ───────────────────────────────────────────────────────────────
// "Head"    = full access including delete
// "Staff"   = create/edit own, no delete
// "Faculty" = view + submit only
export type CourseRole = "Head" | "Staff" | "Faculty";

export type Tab =
  | "Home"
  | "Announcements"
  | "Assignments"
  | "Grades"
  | "Users"
  | "Collaborations"
  | "Form"
  | "Repositories"
  | "Patient Records"
  | "Medical Exam Record"
  | "Medicine Inventory"
  | "Medical Cases Summary"
  | "Information Sheets"
  | "Log Sheet"
  | "Exit Interviews"
  | "Library Cards"
  | "Library Log"
  | "Book Catalog"
  | "Inventory"
  | "Borrowing"
  | "Settings";

export type TabKey = "details" | "submission" | "settings" | "assign";

export type AssignView = "list" | "create" | "detail" | "edit";