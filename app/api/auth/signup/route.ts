import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export async function POST(req: Request) {
  // bcrypt makes each attempt expensive — throttle before doing any work.
  const limited = rateLimit(`signup:${clientIp(req.headers)}`, 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    // The findUnique pre-check races with concurrent signups; the unique index
    // is the real guard, so surface its violation as the same 409.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("Signup error:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
