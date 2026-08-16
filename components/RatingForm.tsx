"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Props = {
  spotId: string;
  onSubmitted?: () => void;
};

const NOISE_OPTIONS = ["SILENT", "QUIET", "MODERATE", "LOUD"] as const;
const WIFI_OPTIONS = ["POOR", "OKAY", "GOOD", "EXCELLENT"] as const;
const BUSYNESS_OPTIONS = ["EMPTY", "LIGHT", "MODERATE", "PACKED"] as const;
const TIME_OPTIONS = ["morning", "afternoon", "evening", "night"] as const;

function OptionRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-neutral-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
              value === opt
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
            }`}
          >
            {opt.toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RatingForm({ spotId, onSubmitted }: Props) {
  const { data: session, status: sessionStatus } = useSession();

  const [noise, setNoise] = useState<(typeof NOISE_OPTIONS)[number]>("QUIET");
  const [wifi, setWifi] = useState<(typeof WIFI_OPTIONS)[number]>("GOOD");
  const [busyness, setBusyness] = useState<(typeof BUSYNESS_OPTIONS)[number]>("MODERATE");
  const [timeOfDay, setTimeOfDay] = useState<(typeof TIME_OPTIONS)[number]>("afternoon");
  const [hasOutlets, setHasOutlets] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch(`/api/spots/${spotId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noise, wifi, busyness, hasOutlets, comment: comment.trim() || null, timeOfDay }),
      });
      if (!res.ok) throw new Error(await res.text());

      setStatus("done");
      setComment("");
      onSubmitted?.();
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  if (sessionStatus === "loading") {
    return <div className="h-40 animate-pulse rounded-xl border border-neutral-800 bg-[var(--surface-raised)]" />;
  }

  if (!session?.user) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-[var(--surface-raised)] p-4 text-sm text-neutral-400">
        <p className="mb-3">Sign in to leave a rating.</p>
        <button
          onClick={() => signIn("google")}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-neutral-950"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4 text-sm text-[var(--accent)]">
        Thanks — your rating was added.
        <button type="button" className="ml-2 underline" onClick={() => setStatus("idle")}>
          Rate again
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-neutral-800 bg-[var(--surface-raised)] p-4"
    >
      <h3 className="text-sm font-medium text-neutral-200">Leave a rating</h3>

      <OptionRow label="Noise level" options={NOISE_OPTIONS} value={noise} onChange={setNoise} />
      <OptionRow label="Wi-Fi quality" options={WIFI_OPTIONS} value={wifi} onChange={setWifi} />
      <OptionRow label="How busy" options={BUSYNESS_OPTIONS} value={busyness} onChange={setBusyness} />
      <OptionRow label="Time of day" options={TIME_OPTIONS} value={timeOfDay} onChange={setTimeOfDay} />

      <div>
        <p className="mb-1.5 text-xs text-neutral-500">Outlets available?</p>
        <div className="flex gap-1.5">
          {[{ label: "Yes", val: true }, { label: "No", val: false }].map(({ label, val }) => (
            <button
              key={label}
              type="button"
              onClick={() => setHasOutlets(val)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                hasOutlets === val
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                  : "border-neutral-800 text-neutral-400 hover:border-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-neutral-500">
          Comment — the more specific, the more useful (e.g. "empty after 6pm")
        </p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="What's it actually like there?"
          className="w-full resize-none rounded-lg border border-neutral-800 bg-transparent px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 outline-none focus:border-[var(--accent)]"
        />
      </div>

      {status === "error" && (
        <p className="text-xs text-red-400">Couldn't submit that rating. Try again.</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-[var(--accent)] py-2 text-sm font-medium text-neutral-950 transition disabled:opacity-40"
      >
        {status === "submitting" ? "Submitting…" : "Submit rating"}
      </button>
    </form>
  );
}
