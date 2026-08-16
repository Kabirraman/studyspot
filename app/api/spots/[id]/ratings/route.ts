import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/spots/:id/ratings — submit a rating/review for a spot.
// `comment` is what the search agent later retrieves over, so encourage
// free text in the UI rather than making it an optional afterthought.
//
// The submitting user is read from the server session (not the request
// body) so a client can't attribute a rating to someone else's account.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to leave a rating." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.noise || !body?.wifi || !body?.busyness) {
    return NextResponse.json(
      { error: "noise, wifi, and busyness are required." },
      { status: 400 }
    );
  }

  const rating = await db.rating.create({
    data: {
      spotId: params.id,
      userId: (session.user as typeof session.user & { id: string }).id,
      noise: body.noise,
      wifi: body.wifi,
      busyness: body.busyness,
      hasOutlets: body.hasOutlets ?? null,
      comment: body.comment ?? null,
      timeOfDay: body.timeOfDay ?? null,
    },
  });

  return NextResponse.json(rating, { status: 201 });
}
