"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import FavoriteButton from "./FavoriteButton";

type Spot = {
  id: string;
  name: string;
  building: { name: string } | string;
  hasOutlets: boolean;
  explanation?: string;
};

type Props = {
  spot: Spot;
  isFavorited?: boolean;
  onToggleFavorite?: (spotId: string, favorited: boolean) => void;
};

export default function SpotCard({ spot, isFavorited = false, onToggleFavorite }: Props) {
  const buildingName = typeof spot.building === "string" ? spot.building : spot.building.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
    >
      <Link
        href={`/spot/${spot.id}`}
        className="focus-ring block rounded-xl border p-4 transition-colors"
        style={{
          backgroundColor: "var(--surface-raised)",
          borderColor: "var(--border-subtle)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-medium" style={{ color: "var(--text-primary)" }}>
              {spot.name}
            </h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {buildingName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {spot.hasOutlets && (
              <span
                className="rounded-full px-2 py-1 text-xs font-medium"
                style={{ backgroundColor: "var(--accent-dim)", color: "var(--accent)" }}
              >
                Outlets
              </span>
            )}
            <FavoriteButton spotId={spot.id} initialFavorited={isFavorited} onToggle={onToggleFavorite} />
          </div>
        </div>
        {spot.explanation && (
          <p
            className="mt-3 border-t pt-3 text-sm leading-relaxed"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            {spot.explanation}
          </p>
        )}
      </Link>
    </motion.div>
  );
}
