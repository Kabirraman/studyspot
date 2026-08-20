"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";

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
  near?: { lat: number; lng: number };
  onImported?: () => void;
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
    <div className="rounded-2xl border p-4" style={{ backgroundColor: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}>
      <p className="mb-3 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        Find real places nearby to add
      </p>
      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (value.trim().length === 0) setResults([]);
          }}
          placeholder='e.g. "libraries near me" or "cafes in Koramangala"'
          className="focus-ring flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm placeholder-[var(--text-tertiary)]"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          disabled={status === "searching" || !query.trim()}
          className="focus-ring shrink-0 rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          style={{ borderColor: "var(--border-strong)", color: "var(--text-primary)" }}
        >
          {status === "searching" ? "Searching…" : "Search"}
        </motion.button>
      </form>

      {status === "error" && (
        <p className="mt-2 text-xs text-red-400">
          Search failed — check GOOGLE_PLACES_API_KEY is set and Places API (New) is enabled.
        </p>
      )}

      <AnimatePresence>
        {status === "searching" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[60px] animate-pulse rounded-lg" style={{ backgroundColor: "var(--surface-hover)" }} />
            ))}
          </motion.div>
        )}

        {status !== "searching" && results.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
            {results.map((place, i) => {
              const imported = importedIds.has(place.placeId);
              return (
                <motion.div
                  key={place.placeId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 rounded-lg border p-3"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  {place.photoUrl && (
                    <img src={place.photoUrl} alt={place.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm" style={{ color: "var(--text-primary)" }}>
                      {place.name}
                    </p>
                    <p className="truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                      {place.address}
                    </p>
                    {place.rating != null && (
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {place.rating}★ on Google ({place.userRatingCount ?? 0} reviews)
                      </p>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleImport(place)}
                    disabled={imported || importingId === place.placeId}
                    className="focus-ring shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-950 disabled:opacity-40"
                    style={{ backgroundColor: "var(--accent)" }}
                  >
                    {imported ? "Added" : importingId === place.placeId ? "Adding…" : "Add as study spot"}
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
