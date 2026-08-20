"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { motion } from "framer-motion";

type Props = {
  spotId: string;
  initialFavorited: boolean;
  onToggle?: (spotId: string, favorited: boolean) => void;
  /** Larger touch target + label, for the spot detail page rather than a card corner. */
  size?: "sm" | "lg";
};

export default function FavoriteButton({ spotId, initialFavorited, onToggle, size = "sm" }: Props) {
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);

  // initialFavorited often arrives from an async fetch that resolves after
  // this card's first render — sync when it changes, not just on mount.
  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user) {
      signIn("google");
      return;
    }
    if (pending) return;

    setPending(true);
    const next = !favorited;
    setFavorited(next); // optimistic
    try {
      const res = await fetch(`/api/spots/${spotId}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      const data = await res.json();
      setFavorited(data.favorited);
      onToggle?.(spotId, data.favorited);
    } catch {
      setFavorited(!next); // revert on failure
    } finally {
      setPending(false);
    }
  }

  const dimension = size === "lg" ? 20 : 16;

  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={handleClick}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className="focus-ring flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors"
      style={{ backgroundColor: favorited ? "var(--accent-dim)" : "transparent" }}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        fill={favorited ? "var(--accent)" : "none"}
        stroke={favorited ? "var(--accent)" : "var(--text-tertiary)"}
        strokeWidth="2"
      >
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </motion.button>
  );
}
