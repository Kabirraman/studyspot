import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/places/import — turn a real Google Places result into a Spot
// this app can track ratings/reviews against. Google gives us name,
// address, coordinates, and its own star rating; our own Rating model
// still owns noise/wifi/outlets/busyness, which Places doesn't have.
//
// Real places don't map to your seeded campus "Building" concept, so each
// import gets its own Building row named after the place — keeps the
// schema unchanged rather than special-casing off-campus spots.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a place." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { placeId, name, address, latitude, longitude } = body ?? {};
  if (!placeId || !name || typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "Missing place details." }, { status: 400 });
  }

  // Avoid duplicate imports of the same Google place.
  const existing = await db.spot.findFirst({ where: { googlePlaceId: placeId } });
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const building = await db.building.upsert({
    where: { name },
    update: {},
    create: { name, latitude, longitude },
  });

  const spot = await db.spot.create({
    data: {
      name,
      description: address || null,
      latitude,
      longitude,
      buildingId: building.id,
      googlePlaceId: placeId,
    },
  });

  return NextResponse.json(spot, { status: 201 });
}
