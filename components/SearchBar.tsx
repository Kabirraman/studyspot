"use client";

import { useState } from "react";

type Props = {
  onSearch: (query: string) => void;
  isLoading: boolean;
};

export default function SearchBar({ onSearch, isLoading }: Props) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSearch(value.trim());
      }}
      className="flex w-full items-center gap-2 rounded-xl border border-neutral-800 bg-[var(--surface-raised)] p-2 shadow-lg"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Try: "quiet spot with outlets near CS building, usually empty after 6pm"'
        className="flex-1 bg-transparent px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none"
      />
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-neutral-950 transition disabled:opacity-40"
      >
        {isLoading ? "Searching…" : "Find a spot"}
      </button>
    </form>
  );
}
