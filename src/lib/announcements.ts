// src/lib/announcements.ts

import { prisma } from "@/lib/prisma";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AnnouncementAttachmentInput {
  name?: string;
  url?: string;
  size?: number;
  mimeType?: string;
}

export interface CreateAnnouncementInput {
  courseId: string;
  title: string;
  bodyText: string;
  bodyHtml: string;
  author: string;
  assignTo: string[];
  allowComment: boolean;
  allowLiking: boolean;
  availableFrom: Date | null;
  availableUntil: Date | null;
  attachments: AnnouncementAttachmentInput[];
}

export interface UpdateAnnouncementInput {
  title?: string;
  bodyText?: string;
  bodyHtml?: string;
  assignTo?: string[];
  allowComment?: boolean;
  allowLiking?: boolean;
  availableFrom?: Date | null;
  availableUntil?: Date | null;
  attachments?: AnnouncementAttachmentInput[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Normalizes raw body fields from a request body.
 * Supports both `bodyText`/`bodyHtml` and the older `content` fallback.
 */
export function resolveBodyFields(body: Record<string, unknown>): {
  bodyText: string;
  bodyHtml: string;
} {
  const bodyText =
    typeof body.bodyText === "string"
      ? body.bodyText
      : typeof body.content === "string"
      ? body.content
      : "";

  const bodyHtml =
    typeof body.bodyHtml === "string"
      ? body.bodyHtml
      : typeof body.content === "string"
      ? body.content
      : "";

  return { bodyText, bodyHtml };
}

/**
 * Resolves allowComment from either `allowComment` or `allowComments` field.
 * Defaults to `true` if neither is provided.
 */
export function resolveAllowComment(
  body: Record<string, unknown>,
  fallback = true
): boolean {
  if (typeof body.allowComment === "boolean") return body.allowComment;
  if (typeof body.allowComments === "boolean") return body.allowComments;
  return fallback;
}

/**
 * Converts an array of raw attachment inputs into Prisma `create` shape.
 */
export function mapAttachments(
  attachments: AnnouncementAttachmentInput[]
): {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}[] {
  return attachments.map((file) => ({
    name: file.name ?? "Attachment",
    url: file.url ?? "",
    size: Number(file.size ?? 0),
    mimeType: file.mimeType ?? "",
  }));
}

// ── Database Queries ───────────────────────────────────────────────────────────

/**
 * Fetches all announcements for a course, newest first.
 */
export async function getCourseAnnouncements(courseId: string) {
  return prisma.announcement.findMany({
    where: { courseId },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Fetches a single announcement by ID and courseId.
 * Returns null if not found.
 */
export async function getAnnouncementById(
  announcementId: string,
  courseId: string
) {
  return prisma.announcement.findUnique({
    where: { id: announcementId, courseId },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Creates a new announcement with optional attachments.
 */
export async function createAnnouncement(input: CreateAnnouncementInput) {
  return prisma.announcement.create({
    data: {
      courseId: input.courseId,
      title: input.title.trim(),
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
      author: input.author,
      assignTo: input.assignTo,
      allowComment: input.allowComment,
      allowLiking: input.allowLiking,
      availableFrom: input.availableFrom,
      availableUntil: input.availableUntil,
      ...(input.attachments.length > 0
        ? {
            attachments: {
              create: mapAttachments(input.attachments),
            },
          }
        : {}),
    },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Updates an existing announcement.
 * If `attachments` is provided in the input, all existing attachments
 * are replaced with the new ones.
 */
export async function updateAnnouncement(
  announcementId: string,
  existing: {
    title: string;
    bodyText: string;
    bodyHtml: string;
    assignTo: string[];
    allowComment: boolean;
    allowLiking: boolean;
    availableFrom: Date | null;
    availableUntil: Date | null;
  },
  input: UpdateAnnouncementInput
) {
  return prisma.announcement.update({
    where: { id: announcementId },
    data: {
      title: input.title !== undefined ? input.title.trim() : existing.title,
      bodyText: input.bodyText !== undefined ? input.bodyText : existing.bodyText,
      bodyHtml: input.bodyHtml !== undefined ? input.bodyHtml : existing.bodyHtml,
      assignTo: input.assignTo !== undefined ? input.assignTo : existing.assignTo,
      allowComment:
        input.allowComment !== undefined
          ? input.allowComment
          : existing.allowComment,
      allowLiking:
        input.allowLiking !== undefined ? input.allowLiking : existing.allowLiking,
      availableFrom:
        input.availableFrom !== undefined
          ? input.availableFrom
          : existing.availableFrom,
      availableUntil:
        input.availableUntil !== undefined
          ? input.availableUntil
          : existing.availableUntil,
      // Replace attachments only when explicitly provided
      ...(Array.isArray(input.attachments)
        ? {
            attachments: {
              deleteMany: {},
              create: mapAttachments(input.attachments),
            },
          }
        : {}),
    },
    include: {
      attachments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * Deletes an announcement and its attachments (cascade handled by Prisma schema).
 */
export async function deleteAnnouncement(announcementId: string) {
  return prisma.announcement.delete({
    where: { id: announcementId },
  });
}