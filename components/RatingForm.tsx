"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

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
      <p className="mb-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="focus-ring rounded-full border px-3 py-1 text-xs capitalize transition-colors"
            style={{
              borderColor: value === opt ? "var(--accent)" : "var(--border-subtle)",
              backgroundColor: value === opt ? "var(--accent-dim)" : "transparent",
              color: value === opt ? "var(--accent)" : "var(--text-secondary)",
            }}
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

  const cardStyle = { backgroundColor: "var(--surface-raised)", borderColor: "var(--border-subtle)" };

  if (sessionStatus === "loading") {
    return <div className="h-40 animate-pulse rounded-2xl border" style={cardStyle} />;
  }

  if (!session?.user) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ ...cardStyle, color: "var(--text-secondary)" }}>
        <p className="mb-3">Sign in to leave a rating.</p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => signIn("google")}
          className="focus-ring rounded-lg px-4 py-2 text-sm font-medium text-neutral-950"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Sign in with Google
        </motion.button>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {status === "done" ? (
        <motion.div
          key="done"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "var(--accent)", backgroundColor: "var(--accent-dim)", color: "var(--accent)" }}
        >
          Thanks — your rating was added.
          <button type="button" className="ml-2 underline" onClick={() => setStatus("idle")}>
            Rate again
          </button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border p-4"
          style={cardStyle}
        >
          <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Leave a rating
          </h3>

          <OptionRow label="Noise level" options={NOISE_OPTIONS} value={noise} onChange={setNoise} />
          <OptionRow label="Wi-Fi quality" options={WIFI_OPTIONS} value={wifi} onChange={setWifi} />
          <OptionRow label="How busy" options={BUSYNESS_OPTIONS} value={busyness} onChange={setBusyness} />
          <OptionRow label="Time of day" options={TIME_OPTIONS} value={timeOfDay} onChange={setTimeOfDay} />

          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Outlets available?
            </p>
            <div className="flex gap-1.5">
              {[{ label: "Yes", val: true }, { label: "No", val: false }].map(({ label, val }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setHasOutlets(val)}
                  className="focus-ring rounded-full border px-3 py-1 text-xs transition-colors"
                  style={{
                    borderColor: hasOutlets === val ? "var(--accent)" : "var(--border-subtle)",
                    backgroundColor: hasOutlets === val ? "var(--accent-dim)" : "transparent",
                    color: hasOutlets === val ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Comment — the more specific, the more useful (e.g. "empty after 6pm")
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="What's it actually like there?"
              className="focus-ring w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm placeholder-[var(--text-tertiary)]"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          {status === "error" && <p className="text-xs text-red-400">Couldn't submit that rating. Try again.</p>}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={status === "submitting"}
            className="focus-ring w-full rounded-lg py-2 text-sm font-medium text-neutral-950 transition disabled:opacity-40"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {status === "submitting" ? "Submitting…" : "Submit rating"}
          </motion.button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
