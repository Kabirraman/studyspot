import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/spots — list all spots with building info + rating aggregates.
// This powers the default map view (before any natural-language search).
export async function GET() {
  const spots = await db.spot.findMany({
    include: {
      building: true,
      ratings: { select: { noise: true, wifi: true, busyness: true } },
    },
  });

  const withAverages = spots.map((spot) => {
    const n = spot.ratings.length;
    return {
      id: spot.id,
      name: spot.name,
      description: spot.description,
      latitude: spot.latitude,
      longitude: spot.longitude,
      hasOutlets: spot.hasOutlets,
      building: spot.building.name,
      ratingCount: n,
    };
  });

  return NextResponse.json(withAverages);
}

// POST /api/spots — add a new spot (admin/seed use; lock this down with
// auth before shipping publicly).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.buildingId || typeof body?.latitude !== "number") {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const spot = await db.spot.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      latitude: body.latitude,
      longitude: body.longitude,
      hasOutlets: !!body.hasOutlets,
      capacity: body.capacity ?? null,
      buildingId: body.buildingId,
    },
  });

  return NextResponse.json(spot, { status: 201 });
}
