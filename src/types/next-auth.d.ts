// src/types/next-auth.d.ts
// Extends NextAuth Session and JWT types with custom fields

import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id:         string;
      role:       "ADMIN" | "STAFF";
      status:     "PENDING" | "APPROVED" | "REJECTED";
      department: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role:       "ADMIN" | "STAFF";
    status:     "PENDING" | "APPROVED" | "REJECTED";
    department: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id:         string;
    role:       "ADMIN" | "STAFF";
    status:     "PENDING" | "APPROVED" | "REJECTED";
    department: string;
  }
}