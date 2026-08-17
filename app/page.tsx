"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import SpotCard from "@/components/SpotCard";
import MapView from "@/components/MapView";
import AuthButton from "@/components/AuthButton";
import PlaceImportSearch from "@/components/PlaceImportSearch";

type ApiResult =
  | { status: "needs_clarification"; question: string }
  | { status: "ok"; results: any[] }
  | { status: "error"; message: string };

export default function HomePage() {
  const router = useRouter();
  const [allSpots, setAllSpots] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    refetchSpots();
  }, []);

  function refetchSpots() {
    fetch("/api/spots")
      .then((r) => r.json())
      .then(setAllSpots)
      .catch(() => setAllSpots([]));
  }

  async function handleSearch(query: string) {
    setIsLoading(true);
    setSearchResult(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000); // fail fast rather than hang
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok || data?.status === undefined) {
        setSearchResult({ status: "error", message: data?.error ?? "Search failed. Please try again." });
        return;
      }
      setSearchResult(data);
    } catch (err: any) {
      const message =
        err?.name === "AbortError"
          ? "Search took too long — this can happen if the free-tier Gemini rate limit was hit. Wait a few seconds and try again."
          : "Couldn't reach the search agent. Check your connection.";
      setSearchResult({ status: "error", message });
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  }

  const showingSearch = searchResult !== null;
  const mapSpots =
    showingSearch && searchResult.status === "ok" ? searchResult.results : allSpots;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--accent)]">
            Campus Study Spot Finder
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-50">
            Find somewhere good to work.
          </h1>
        </div>
        <AuthButton />
      </header>

      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      <div className="mt-6">
        <MapView
          spots={mapSpots}
          onSelectSpot={(id) => router.push(`/spot/${id}`)}
        />
      </div>

      <div className="mt-6">
        <PlaceImportSearch
          near={averageCenter(allSpots)}
          onImported={refetchSpots}
          onSearchStart={() => setSearchResult(null)}
        />
      </div>

      <section className="mt-6 space-y-3">
        {showingSearch && searchResult.status === "error" && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
            {searchResult.message}
          </p>
        )}

        {showingSearch && searchResult.status === "needs_clarification" && (
          <p className="rounded-lg border border-neutral-800 bg-[var(--surface-raised)] p-4 text-sm text-neutral-300">
            {searchResult.question}
          </p>
        )}

        {showingSearch && searchResult.status === "ok" && searchResult.results.length === 0 && (
          <p className="text-sm text-neutral-500">
            No spots matched that. Try loosening a constraint.
          </p>
        )}

        {showingSearch && searchResult.status === "ok" && searchResult.results.length > 0 && (
          <>
            <p className="text-xs text-neutral-500">
              {searchResult.results.length} spot{searchResult.results.length === 1 ? "" : "s"} matched
            </p>
            {searchResult.results.map((spot) => (
              <SpotCard key={spot.id} spot={spot} />
            ))}
          </>
        )}

        {!showingSearch && (
          <>
            <p className="text-xs text-neutral-500">All spots</p>
            {allSpots.map((spot) => (
              <SpotCard key={spot.id} spot={spot} />
            ))}
          </>
        )}
      </section>
    </main>
  );
}

function averageCenter(spots: any[]): { lat: number; lng: number } | undefined {
  if (spots.length === 0) return undefined;
  const lat = spots.reduce((s, p) => s + p.latitude, 0) / spots.length;
  const lng = spots.reduce((s, p) => s + p.longitude, 0) / spots.length;
  return { lat, lng };
}
