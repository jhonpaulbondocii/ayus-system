// src/app/api/register/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const RegisterSchema = z.object({
  name:             z.string().min(2,  "Name must be at least 2 characters"),
  email:            z.string().email(  "Invalid email address"),
  password:         z.string().min(8,  "Password must be at least 8 characters"),
  department:       z.string().min(1,  "Department is required"),
  position:         z.string().optional(),
  accountType:      z.string().optional(),
  employmentStatus: z.string().optional(),
  contactNumber:    z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      name, email, password,
      department, position,
      accountType, employmentStatus,
      contactNumber,
    } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered. Please use a different email." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password:        hashedPassword,
        department:      department       ?? null,
        position:        position         ?? null,
        accountType:     accountType      ?? null, // ← faculty | instructor | staff
        employmentStatus:employmentStatus ?? null, // ← Permanent, Casual, etc.
        contactNumber:   contactNumber    ?? null,
        role:            "STAFF",
        status:          "PENDING",
      },
      select: {
        id:              true,
        name:            true,
        email:           true,
        department:      true,
        accountType:     true,
        employmentStatus:true,
        status:          true,
        createdAt:       true,
      },
    });

    return NextResponse.json(
      { message: "Registration successful. Please wait for admin approval.", user },
      { status: 201 }
    );

  } catch (error) {
    console.error("[REGISTER]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}