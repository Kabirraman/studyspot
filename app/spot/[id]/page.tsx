"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import RatingForm from "@/components/RatingForm";
import PhotoUpload from "@/components/PhotoUpload";
import FavoriteButton from "@/components/FavoriteButton";

type Rating = {
  id: string;
  noise: string;
  wifi: string;
  busyness: string;
  hasOutlets: boolean | null;
  comment: string | null;
  timeOfDay: string | null;
  createdAt: string;
};

type Photo = {
  id: string;
  url: string;
  caption: string | null;
};

type SpotDetail = {
  id: string;
  name: string;
  description: string | null;
  hasOutlets: boolean;
  building: { name: string };
  ratings: Rating[];
  photos: Photo[];
};

export default function SpotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [spot, setSpot] = useState<SpotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/spots/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setSpot)
      .catch(() => setSpot(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((ids: string[]) => setIsFavorited(ids.includes(id)))
      .catch(() => {});
  }, [id]);

  const cardStyle = { backgroundColor: "var(--surface-raised)", borderColor: "var(--border-subtle)" };

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="h-6 w-24 animate-pulse rounded" style={{ backgroundColor: "var(--surface-hover)" }} />
        <div className="mt-6 h-10 w-2/3 animate-pulse rounded" style={{ backgroundColor: "var(--surface-hover)" }} />
        <div className="mt-8 h-40 animate-pulse rounded-2xl border" style={cardStyle} />
      </main>
    );
  }

  if (!spot) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Spot not found.
        </p>
        <button onClick={() => router.push("/")} className="focus-ring mt-2 text-sm underline" style={{ color: "var(--accent)" }}>
          Back to all spots
        </button>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <div className="ambient-glow pointer-events-none absolute inset-x-0 top-0 h-[420px]" />
      <div className="relative mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <button
          onClick={() => router.push("/")}
          className="focus-ring mb-6 text-xs transition-colors"
          style={{ color: "var(--text-tertiary)" }}
        >
          ← All spots
        </button>

        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {spot.building.name}
          </p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)" }}>
              {spot.name}
            </h1>
            <FavoriteButton spotId={spot.id} initialFavorited={isFavorited} onToggle={(_, f) => setIsFavorited(f)} size="lg" />
          </div>
          {spot.description && (
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {spot.description}
            </p>
          )}
          {spot.hasOutlets && (
            <span
              className="mt-3 inline-block rounded-full px-2 py-1 text-xs font-medium"
              style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)" }}
            >
              Outlets available
            </span>
          )}
        </motion.header>

        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {spot.photos.length} photo{spot.photos.length === 1 ? "" : "s"}
            </p>
            <PhotoUpload spotId={spot.id} onUploaded={load} />
          </div>
          {spot.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {spot.photos.map((p, i) => (
                <motion.img
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
                  src={p.url}
                  alt={p.caption ?? spot.name}
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              No photos yet.
            </p>
          )}
        </motion.section>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <RatingForm spotId={spot.id} onSubmitted={load} />
        </motion.div>

        <section className="mt-8">
          <p className="mb-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
            {spot.ratings.length} rating{spot.ratings.length === 1 ? "" : "s"}
          </p>
          <div className="space-y-3">
            {spot.ratings.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
                className="rounded-xl border p-4"
                style={cardStyle}
              >
                <div className="flex flex-wrap gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <span className="rounded-full border px-2 py-0.5 capitalize" style={{ borderColor: "var(--border-subtle)" }}>
                    {r.noise.toLowerCase()}
                  </span>
                  <span className="rounded-full border px-2 py-0.5 capitalize" style={{ borderColor: "var(--border-subtle)" }}>
                    {r.wifi.toLowerCase()} wifi
                  </span>
                  <span className="rounded-full border px-2 py-0.5 capitalize" style={{ borderColor: "var(--border-subtle)" }}>
                    {r.busyness.toLowerCase()}
                  </span>
                  {r.timeOfDay && (
                    <span className="rounded-full border px-2 py-0.5 capitalize" style={{ borderColor: "var(--border-subtle)" }}>
                      {r.timeOfDay}
                    </span>
                  )}
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {r.comment}
                  </p>
                )}
              </motion.div>
            ))}
            {spot.ratings.length === 0 && (
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                No ratings yet — be the first.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
