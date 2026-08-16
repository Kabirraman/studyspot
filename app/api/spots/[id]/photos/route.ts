import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/spots/:id/photos — attach a photo URL to a spot.
// The actual upload happens client-side straight to Cloudinary (unsigned
// upload preset, no server secret needed); this route just records the
// resulting URL against the signed-in user.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a photo." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "A photo url is required." }, { status: 400 });
  }

  const photo = await db.photo.create({
    data: {
      spotId: params.id,
      userId: (session.user as typeof session.user & { id: string }).id,
      url: body.url,
      caption: body.caption ?? null,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
