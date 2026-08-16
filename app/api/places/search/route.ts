import { NextRequest, NextResponse } from "next/server";
import { searchPlacesText } from "@/lib/googlePlaces";

// POST /api/places/search — search real-world places via Google Places.
// Body: { query: string, lat?: number, lng?: number }
// Used to find candidate places (libraries, cafes, coworking spaces) near
// campus that aren't in the app's own Spot table yet.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.query || typeof body.query !== "string") {
    return NextResponse.json({ error: "A search query is required." }, { status: 400 });
  }

  try {
    const results = await searchPlacesText(body.query, {
      lat: body.lat,
      lng: body.lng,
    });
    return NextResponse.json(results);
  } catch (err) {
    console.error("Places search failed:", err);
    return NextResponse.json({ error: "Places search failed." }, { status: 500 });
  }
}
