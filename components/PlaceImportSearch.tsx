"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

type PlaceResult = {
  placeId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingCount: number | null;
  photoUrl: string | null;
};

type Props = {
  /** Bias search results toward this location — pass the campus/area center. */
  near?: { lat: number; lng: number };
  onImported?: () => void;
  /** Called right as a places search starts — lets the parent clear any
   * leftover natural-language search results, so the page doesn't show
   * two stale result sets at once. */
  onSearchStart?: () => void;
};

export default function PlaceImportSearch({ near, onImported, onSearchStart }: Props) {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "error">("idle");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onSearchStart?.();
    setStatus("searching");
    try {
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), lat: near?.lat, lng: near?.lng }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResults(await res.json());
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  async function handleImport(place: PlaceResult) {
    if (!session?.user) {
      signIn("google");
      return;
    }
    setImportingId(place.placeId);
    try {
      const res = await fetch("/api/places/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: place.placeId,
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setImportedIds((prev) => new Set(prev).add(place.placeId));
      onImported?.();
    } catch (err) {
      console.error(err);
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-[var(--surface-raised)] p-4">
      <p className="mb-3 text-sm font-medium text-neutral-200">
        Find real places nearby to add
      </p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (value.trim().length === 0) {
              // Clearing the box should collapse old results too — leaving
              // them stuck on screen after the query is deleted looks like
              // a stale/broken list.
              setResults([]);
            }
          }}
          placeholder='e.g. "libraries near me" or "cafes in Koramangala"'
          className="flex-1 rounded-lg border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={status === "searching" || !query.trim()}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 disabled:opacity-40"
        >
          {status === "searching" ? "Searching…" : "Search"}
        </button>
      </form>

      {status === "error" && (
        <p className="mt-2 text-xs text-red-400">
          Search failed — check GOOGLE_PLACES_API_KEY is set and Places API (New) is enabled.
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((place) => {
            const imported = importedIds.has(place.placeId);
            return (
              <div
                key={place.placeId}
                className="flex items-center gap-3 rounded-lg border border-neutral-800 p-3"
              >
                {place.photoUrl && (
                  <img
                    src={place.photoUrl}
                    alt={place.name}
                    className="h-12 w-12 shrink-0 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-100">{place.name}</p>
                  <p className="truncate text-xs text-neutral-500">{place.address}</p>
                  {place.rating != null && (
                    <p className="text-xs text-neutral-600">
                      {place.rating}★ on Google ({place.userRatingCount ?? 0} reviews)
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleImport(place)}
                  disabled={imported || importingId === place.placeId}
                  className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-neutral-950 disabled:opacity-40"
                >
                  {imported ? "Added" : importingId === place.placeId ? "Adding…" : "Add as study spot"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
