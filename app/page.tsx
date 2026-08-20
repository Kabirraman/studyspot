"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import SpotCard from "@/components/SpotCard";
import MapView from "@/components/MapView";
import AuthButton from "@/components/AuthButton";
import PlaceImportSearch from "@/components/PlaceImportSearch";
import FilterPanel, { DEFAULT_FILTERS, type Filters } from "@/components/FilterPanel";

type ApiResult =
  | { status: "needs_clarification"; question: string }
  | { status: "ok"; results: any[] }
  | { status: "error"; message: string };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [allSpots, setAllSpots] = useState<any[]>([]);
  const [spotsLoaded, setSpotsLoaded] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [searchResult, setSearchResult] = useState<ApiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    refetchSpots();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setFavoriteIds(new Set());
      return;
    }
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((ids: string[]) => setFavoriteIds(new Set(ids)))
      .catch(() => setFavoriteIds(new Set()));
  }, [session?.user]);

  function refetchSpots() {
    fetch("/api/spots")
      .then((r) => r.json())
      .then((data) => {
        setAllSpots(data);
        setSpotsLoaded(true);
      })
      .catch(() => setSpotsLoaded(true));
  }

  function handleToggleFavorite(spotId: string, favorited: boolean) {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(spotId);
      else next.delete(spotId);
      return next;
    });
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

  const campusCenter = useMemo(() => {
    if (allSpots.length === 0) return null;
    const lat = allSpots.reduce((s, p) => s + p.latitude, 0) / allSpots.length;
    const lng = allSpots.reduce((s, p) => s + p.longitude, 0) / allSpots.length;
    return { lat, lng };
  }, [allSpots]);

  const filteredSpots = useMemo(() => {
    return allSpots.filter((spot) => {
      if (filters.outletsOnly && !spot.hasOutlets) return false;
      if (filters.noise !== "any" && spot.avgNoise !== filters.noise) return false;
      if (filters.wifi !== "any" && spot.avgWifi !== filters.wifi) return false;
      if (filters.favoritesOnly && !favoriteIds.has(spot.id)) return false;
      if (filters.maxDistanceKm !== null && campusCenter) {
        const d = haversineKm(campusCenter.lat, campusCenter.lng, spot.latitude, spot.longitude);
        if (d > filters.maxDistanceKm) return false;
      }
      return true;
    });
  }, [allSpots, filters, favoriteIds, campusCenter]);

  const mapSpots = showingSearch && searchResult.status === "ok" ? searchResult.results : filteredSpots;

  return (
    <main className="relative min-h-screen">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 flex items-start justify-between gap-4"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              Campus Study Spot Finder
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)" }}>
              Find somewhere good to work.
            </h1>
          </div>
          <AuthButton />
        </motion.header>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <SearchBar onSearch={handleSearch} onClear={() => setSearchResult(null)} isLoading={isLoading} />
        </motion.div>

        <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <MapView spots={mapSpots} onSelectSpot={(id) => router.push(`/spot/${id}`)} />
        </motion.div>

        <motion.div className="mt-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <PlaceImportSearch near={campusCenter ?? undefined} onImported={refetchSpots} onSearchStart={() => setSearchResult(null)} />
        </motion.div>

        {!showingSearch && (
          <div className="mt-6">
            <FilterPanel filters={filters} onChange={setFilters} hasDistanceData={allSpots.length > 1} />
          </div>
        )}

        <section className="mt-6 space-y-3">
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[72px] animate-pulse rounded-xl border"
                    style={{ backgroundColor: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
                  />
                ))}
              </motion.div>
            )}

            {!isLoading && showingSearch && searchResult.status === "error" && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300"
              >
                {searchResult.message}
              </motion.p>
            )}

            {!isLoading && showingSearch && searchResult.status === "needs_clarification" && (
              <motion.p
                key="clarify"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border p-4 text-sm"
                style={{ backgroundColor: "var(--surface-raised)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                {searchResult.question}
              </motion.p>
            )}

            {!isLoading && showingSearch && searchResult.status === "ok" && searchResult.results.length === 0 && (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No spots matched that. Try loosening a constraint.
              </motion.p>
            )}

            {!isLoading && showingSearch && searchResult.status === "ok" && searchResult.results.length > 0 && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {searchResult.results.length} spot{searchResult.results.length === 1 ? "" : "s"} matched
                </p>
                {searchResult.results.map((spot, i) => (
                  <motion.div key={spot.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <SpotCard spot={spot} isFavorited={favoriteIds.has(spot.id)} onToggleFavorite={handleToggleFavorite} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {!isLoading && !showingSearch && (
              <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {filteredSpots.length === allSpots.length
                    ? "All spots"
                    : `${filteredSpots.length} of ${allSpots.length} spots`}
                </p>
                {!spotsLoaded &&
                  [0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[72px] animate-pulse rounded-xl border"
                      style={{ backgroundColor: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
                    />
                  ))}
                {spotsLoaded && allSpots.length === 0 && (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No spots yet — search for real places nearby to add the first one.
                  </p>
                )}
                {spotsLoaded && allSpots.length > 0 && filteredSpots.length === 0 && (
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    No spots match these filters.
                  </p>
                )}
                {filteredSpots.map((spot, i) => (
                  <motion.div key={spot.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
                    <SpotCard spot={spot} isFavorited={favoriteIds.has(spot.id)} onToggleFavorite={handleToggleFavorite} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </main>
  );
}
