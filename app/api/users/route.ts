import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Minimal identity endpoint so rating submission works before real auth is
// wired up. Finds-or-creates a User by email. Replace with a proper
// NextAuth session lookup when you add sign-in — see README.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: body?.name?.trim() || null },
  });

  return NextResponse.json(user);
}
