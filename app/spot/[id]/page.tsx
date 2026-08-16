"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import RatingForm from "@/components/RatingForm";
import PhotoUpload from "@/components/PhotoUpload";

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

  if (loading) {
    return <main className="mx-auto max-w-2xl px-4 py-12 text-sm text-neutral-500">Loading…</main>;
  }

  if (!spot) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm text-neutral-500">Spot not found.</p>
        <button onClick={() => router.push("/")} className="mt-2 text-sm text-[var(--accent)] underline">
          Back to all spots
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <button onClick={() => router.push("/")} className="mb-6 text-xs text-neutral-500 hover:text-neutral-300">
        ← All spots
      </button>

      <header className="mb-6">
        <p className="text-xs text-neutral-500">{spot.building.name}</p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-50">{spot.name}</h1>
        {spot.description && <p className="mt-2 text-sm text-neutral-400">{spot.description}</p>}
        {spot.hasOutlets && (
          <span className="mt-3 inline-block rounded-full bg-[var(--accent)]/15 px-2 py-1 text-xs text-[var(--accent)]">
            Outlets available
          </span>
        )}
      </header>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            {spot.photos.length} photo{spot.photos.length === 1 ? "" : "s"}
          </p>
          <PhotoUpload spotId={spot.id} onUploaded={load} />
        </div>
        {spot.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {spot.photos.map((p) => (
              <img
                key={p.id}
                src={p.url}
                alt={p.caption ?? spot.name}
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-600">No photos yet.</p>
        )}
      </section>

      <RatingForm spotId={spot.id} onSubmitted={load} />

      <section className="mt-8">
        <p className="mb-3 text-xs text-neutral-500">
          {spot.ratings.length} rating{spot.ratings.length === 1 ? "" : "s"}
        </p>
        <div className="space-y-3">
          {spot.ratings.map((r) => (
            <div key={r.id} className="rounded-xl border border-neutral-800 bg-[var(--surface-raised)] p-4">
              <div className="flex flex-wrap gap-1.5 text-xs text-neutral-500">
                <span className="rounded-full border border-neutral-800 px-2 py-0.5 capitalize">
                  {r.noise.toLowerCase()}
                </span>
                <span className="rounded-full border border-neutral-800 px-2 py-0.5 capitalize">
                  {r.wifi.toLowerCase()} wifi
                </span>
                <span className="rounded-full border border-neutral-800 px-2 py-0.5 capitalize">
                  {r.busyness.toLowerCase()}
                </span>
                {r.timeOfDay && (
                  <span className="rounded-full border border-neutral-800 px-2 py-0.5 capitalize">
                    {r.timeOfDay}
                  </span>
                )}
              </div>
              {r.comment && <p className="mt-2 text-sm text-neutral-300">{r.comment}</p>}
            </div>
          ))}
          {spot.ratings.length === 0 && (
            <p className="text-sm text-neutral-600">No ratings yet — be the first.</p>
          )}
        </div>
      </section>
    </main>
  );
}
