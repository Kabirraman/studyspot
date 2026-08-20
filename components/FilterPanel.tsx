"use client";

import { motion } from "framer-motion";

export type Filters = {
  noise: "any" | "SILENT" | "QUIET" | "MODERATE" | "LOUD";
  wifi: "any" | "POOR" | "OKAY" | "GOOD" | "EXCELLENT";
  outletsOnly: boolean;
  favoritesOnly: boolean;
  maxDistanceKm: number | null; // null = no distance filter
};

export const DEFAULT_FILTERS: Filters = {
  noise: "any",
  wifi: "any",
  outletsOnly: false,
  favoritesOnly: false,
  maxDistanceKm: null,
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring rounded-full border px-3 py-1 text-xs capitalize transition-colors"
      style={{
        borderColor: active ? "var(--accent)" : "var(--border-subtle)",
        backgroundColor: active ? "var(--accent-dim)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  );
}

export default function FilterPanel({
  filters,
  onChange,
  hasDistanceData,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  hasDistanceData: boolean;
}) {
  const activeCount =
    (filters.noise !== "any" ? 1 : 0) +
    (filters.wifi !== "any" ? 1 : 0) +
    (filters.outletsOnly ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0) +
    (filters.maxDistanceKm !== null ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-3"
      style={{ backgroundColor: "var(--surface-raised)", borderColor: "var(--border-subtle)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Noise
          </span>
          {(["any", "SILENT", "QUIET", "MODERATE", "LOUD"] as const).map((v) => (
            <Chip key={v} active={filters.noise === v} onClick={() => onChange({ ...filters, noise: v })}>
              {v.toLowerCase()}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          Wi-Fi
        </span>
        {(["any", "POOR", "OKAY", "GOOD", "EXCELLENT"] as const).map((v) => (
          <Chip key={v} active={filters.wifi === v} onClick={() => onChange({ ...filters, wifi: v })}>
            {v.toLowerCase()}
          </Chip>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Chip active={filters.outletsOnly} onClick={() => onChange({ ...filters, outletsOnly: !filters.outletsOnly })}>
          Outlets only
        </Chip>
        <Chip
          active={filters.favoritesOnly}
          onClick={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
        >
          ♥ Favorites only
        </Chip>
        {hasDistanceData &&
          ([1, 3, 5] as const).map((km) => (
            <Chip
              key={km}
              active={filters.maxDistanceKm === km}
              onClick={() => onChange({ ...filters, maxDistanceKm: filters.maxDistanceKm === km ? null : km })}
            >
              Within {km}km
            </Chip>
          ))}
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="focus-ring ml-1 text-xs underline"
            style={{ color: "var(--text-tertiary)" }}
          >
            Clear ({activeCount})
          </button>
        )}
      </div>
    </motion.div>
  );
}
