// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Adapter } from "next-auth/adapters";

// Extend NextAuth types to accept our custom fields
declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    status: string;
    department: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      status: string;
      department: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    status: string;
    department: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        if (user.role !== "ADMIN" && user.status !== "APPROVED") {
          throw new Error(user.status === "PENDING" ? "PENDING_APPROVAL" : "ACCESS_DENIED");
        }

        return {
          id:         user.id,
          name:       user.name,
          email:      user.email,
          role:       user.role,
          status:     user.status,
          department: user.department ?? "",
          image:      user.image      ?? "",
        };
      },
    }),

    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id         = user.id;
        token.role       = user.role;
        token.status     = user.status;
        token.department = user.department;
      }

      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id         = dbUser.id;
          token.role       = dbUser.role;
          token.status     = dbUser.status;
          token.department = dbUser.department ?? "";
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id         = token.id;
        session.user.role       = token.role;
        session.user.status     = token.status;
        session.user.department = token.department;
      }
      return session;
    },

    async signIn({ account, user }) {
      if (account?.provider === "google") {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
        });
        if (!dbUser) {
          await prisma.user.create({
            data: {
              name:   user.name  ?? "",
              email:  user.email!,
              image:  user.image ?? "",
              role:   "STAFF",
              status: "PENDING",
            },
          });
          return "/login?error=PENDING_APPROVAL";
        }
        if (dbUser.role !== "ADMIN" && dbUser.status !== "APPROVED") {
          return "/login?error=" + dbUser.status;
        }
      }
      return true;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};