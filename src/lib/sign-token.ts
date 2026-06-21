// src/lib/sign-token.ts

import crypto from "crypto";

/**
 * Generates a cryptographically secure random token used as the unique
 * identifier in the e-signature link sent to students.
 * 32 bytes -> 64 hex characters, effectively unguessable.
 */
export function generateSignToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Returns a Date `days` from now, used as the expiry timestamp
 * for a signing token.
 */
export function signTokenExpiry(days: number = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}