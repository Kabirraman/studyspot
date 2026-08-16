import Link from "next/link";

type Spot = {
  id: string;
  name: string;
  building: { name: string } | string;
  hasOutlets: boolean;
  explanation?: string;
};

export default function SpotCard({ spot }: { spot: Spot }) {
  const buildingName = typeof spot.building === "string" ? spot.building : spot.building.name;

  return (
    <Link
      href={`/spot/${spot.id}`}
      className="block rounded-xl border border-neutral-800 bg-[var(--surface-raised)] p-4 transition hover:border-neutral-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-neutral-100">{spot.name}</h3>
          <p className="text-sm text-neutral-500">{buildingName}</p>
        </div>
        {spot.hasOutlets && (
          <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-1 text-xs text-[var(--accent)]">
            Outlets
          </span>
        )}
      </div>
      {spot.explanation && (
        <p className="mt-3 border-t border-neutral-800 pt-3 text-sm text-neutral-300">
          {spot.explanation}
        </p>
      )}
    </Link>
  );
}
