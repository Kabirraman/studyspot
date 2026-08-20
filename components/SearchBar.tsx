"use client";

import { useState } from "react";
import { motion } from "framer-motion";

type Props = {
  onSearch: (query: string) => void;
  onClear?: () => void;
  isLoading: boolean;
};

export default function SearchBar({ onSearch, onClear, isLoading }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSearch(value.trim());
      }}
      className="relative flex w-full flex-col gap-2 rounded-2xl border p-2 shadow-xl transition-colors sm:flex-row sm:items-center"
      style={{
        backgroundColor: "var(--surface-raised)",
        borderColor: focused ? "var(--accent)" : "var(--border-subtle)",
      }}
    >
      <svg
        className="pointer-events-none absolute left-4 top-1/2 hidden -translate-y-1/2 sm:block"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>

      <input
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          if (next.trim().length === 0) onClear?.();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder='Try: "quiet spot with outlets near CS building, usually empty after 6pm"'
        className="focus-ring flex-1 rounded-lg bg-transparent px-3 py-2.5 text-sm placeholder-[var(--text-tertiary)] sm:pl-9"
        style={{ color: "var(--text-primary)" }}
      />

      <motion.button
        type="submit"
        disabled={isLoading || !value.trim()}
        whileTap={{ scale: 0.97 }}
        className="focus-ring flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-950 transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{ backgroundColor: "var(--accent)" }}
      >
        {isLoading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-950/30 border-t-neutral-950" />
            Searching…
          </>
        ) : (
          "Find a spot"
        )}
      </motion.button>
    </form>
  );
}
