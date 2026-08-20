import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/spots — list all spots with building info + rating aggregates.
// This powers the default map view and the client-side filter panel
// (before any natural-language search).
const NOISE_RANK = ["SILENT", "QUIET", "MODERATE", "LOUD"] as const;
const WIFI_RANK = ["POOR", "OKAY", "GOOD", "EXCELLENT"] as const;

export async function GET() {
  const spots = await db.spot.findMany({
    include: {
      building: true,
      ratings: { select: { noise: true, wifi: true, busyness: true } },
    },
  });

  const withAverages = spots.map((spot) => {
    const n = spot.ratings.length;
    const avgNoiseIdx = n
      ? spot.ratings.reduce((sum, r) => sum + NOISE_RANK.indexOf(r.noise), 0) / n
      : null;
    const avgWifiIdx = n
      ? spot.ratings.reduce((sum, r) => sum + WIFI_RANK.indexOf(r.wifi), 0) / n
      : null;

    return {
      id: spot.id,
      name: spot.name,
      description: spot.description,
      latitude: spot.latitude,
      longitude: spot.longitude,
      hasOutlets: spot.hasOutlets,
      building: spot.building.name,
      ratingCount: n,
      // Rounded to the nearest enum value, or null if unrated yet — lets
      // the filter panel bucket spots without guessing at raw indices.
      avgNoise: avgNoiseIdx !== null ? NOISE_RANK[Math.round(avgNoiseIdx)] : null,
      avgWifi: avgWifiIdx !== null ? WIFI_RANK[Math.round(avgWifiIdx)] : null,
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
