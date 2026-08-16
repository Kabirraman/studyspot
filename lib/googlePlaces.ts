// Thin wrapper around the Places API (New) Text Search endpoint.
// Requires GOOGLE_PLACES_API_KEY (server-side — do NOT expose with
// NEXT_PUBLIC_, unlike the Maps JS key) with "Places API (New)" enabled
// in Google Cloud Console.

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
].join(",");

export type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingCount: number | null;
  photoUrl: string | null;
};

export async function searchPlacesText(
  query: string,
  opts?: { lat?: number; lng?: number; radiusMeters?: number }
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("Missing GOOGLE_PLACES_API_KEY");

  const body: Record<string, unknown> = { textQuery: query };
  if (opts?.lat != null && opts?.lng != null) {
    body.locationBias = {
      circle: {
        center: { latitude: opts.lat, longitude: opts.lng },
        radius: opts.radiusMeters ?? 5000,
      },
    };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const places: any[] = data.places ?? [];

  return places.map((p) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "Unnamed place",
    address: p.formattedAddress ?? "",
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    photoUrl: p.photos?.[0]
      ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxWidthPx=400&key=${apiKey}`
      : null,
  }));
}
