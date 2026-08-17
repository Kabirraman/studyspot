import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { db } from "./db";
import type { Prisma } from "@prisma/client";

/**
 * Natural-language spot search agent.
 *
 * Flow (deliberately a short linear chain, not a heavyweight agent loop —
 * see design note at the bottom of this file):
 *
 *   1. extractIntent      — LLM call #1, structured output, turns free text
 *                            into a typed filter object
 *   2. queryCandidates     — plain Prisma query using that filter object
 *   3. rankWithReviews     — LLM call #2, RAG-ish step: feeds recent review
 *                            text for the candidate spots back to the model
 *                            so it can judge nuance numeric fields miss
 *                            (e.g. "usually empty after 6pm")
 *   4. explainResults      — attaches a one-line grounded justification per
 *                            spot, quoting/paraphrasing the review that
 *                            supports it
 *
 * searchSpots() runs all four steps and returns the final ranked list.
 */

// ---------- 1. Intent schema ----------

const IntentSchema = z.object({
  noise_preference: z
    .enum(["silent", "quiet", "moderate", "loud", "any"])
    .describe("How quiet the user wants the spot to be"),
  requires_outlets: z
    .enum(["yes", "no", "unspecified"])
    .describe("'yes' if the user explicitly needs power outlets, else 'unspecified'"),
  location_hint: z
    .string()
    .describe(
      "Building or area name mentioned by the user, as plain text. Use an " +
        "empty string if none was mentioned — never omit this field."
    ),
  time_context: z
    .enum(["morning", "afternoon", "evening", "night", "any"])
    .describe("Time of day the user cares about, defaults to 'any'"),
  busyness_preference: z
    .enum(["empty", "light", "moderate", "packed", "any"])
    .describe("How busy/crowded the user wants the spot to be"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Model's confidence that this extraction reflects the query"),
});

export type SearchIntent = z.infer<typeof IntentSchema>;

const CONFIDENCE_THRESHOLD = 0.5;

function getModel(temperature = 0) {
  // NOTE: gemini-2.0-flash was shut down by Google on June 1, 2026. Using
  // gemini-3.5-flash (the recommended replacement, still on the free tier
  // via Google AI Studio). Google's models move fast — if this starts
  // 404ing again, check https://ai.google.dev/gemini-api/docs/models for
  // the current stable flash model name.
  //
  // maxRetries is capped low deliberately: LangChain's default (6 retries,
  // exponential backoff) means a rate-limited request can silently hang
  // for close to a minute before finally failing — worse than just
  // failing fast and letting the user try again. The free tier is
  // rate-limited (~15 requests/min for flash models as of writing), so if
  // you're testing quickly or importing lots of spots right before
  // searching, you may hit it — spacing out requests a few seconds apart
  // avoids this.
  return new ChatGoogleGenerativeAI({
    model: "gemini-3.5-flash",
    temperature,
    apiKey: process.env.GOOGLE_API_KEY,
    maxRetries: 1,
  });
}

export async function extractIntent(query: string): Promise<SearchIntent> {
  const model = getModel().withStructuredOutput(IntentSchema, {
    name: "extract_search_intent",
  });

  return model.invoke([
    {
      role: "system",
      content:
        "You extract structured search filters from a student's natural-language " +
        "request for a campus study spot. Only set fields the user actually implied — " +
        "default to 'any'/'unspecified'/empty string when unstated. Lower your " +
        "confidence if the query is vague, ambiguous, or unrelated to study-spot " +
        "attributes.",
    },
    { role: "user", content: query },
  ]);
}

// ---------- 2. Candidate query ----------

const noiseRank = ["SILENT", "QUIET", "MODERATE", "LOUD"] as const;
const busynessRank = ["EMPTY", "LIGHT", "MODERATE", "PACKED"] as const;

export async function queryCandidates(intent: SearchIntent, limit = 6) {
  const where: Prisma.SpotWhereInput = {};

  if (intent.requires_outlets === "yes") {
    where.hasOutlets = true;
  }

  const hint = intent.location_hint.trim();
  if (hint.length > 0) {
    where.OR = [
      { building: { name: { contains: hint, mode: "insensitive" } } },
      { description: { contains: hint, mode: "insensitive" } },
      { name: { contains: hint, mode: "insensitive" } },
    ];
  }

  let spots = await db.spot.findMany({
    where,
    include: {
      building: true,
      ratings: {
        orderBy: { createdAt: "desc" },
        take: 3, // most recent reviews only — cheap recency signal, kept small so the ranking prompt stays fast
      },
    },
    take: limit * 2, // over-fetch, then re-rank down to `limit` below
  });

  // A location hint is a soft signal, not a hard requirement — real place
  // names/addresses vary too much to reliably match a vague phrase like
  // "near the station". If it matched nothing, retry without it rather
  // than returning zero candidates.
  if (spots.length === 0 && hint.length > 0) {
    spots = await db.spot.findMany({
      where: intent.requires_outlets === "yes" ? { hasOutlets: true } : {},
      include: {
        building: true,
        ratings: { orderBy: { createdAt: "desc" }, take: 3 },
      },
      take: limit * 2,
    });
  }

  // Soft-rank by how closely avg noise/busyness matches the requested
  // preference, when one was given. This is a cheap pre-filter before the
  // more expensive LLM reasoning step over review text.
  const scored = spots.map((spot) => {
    let score = 0;
    if (spot.ratings.length > 0) {
      if (intent.noise_preference !== "any") {
        const avgNoiseIdx =
          spot.ratings.reduce((sum, r) => sum + noiseRank.indexOf(r.noise), 0) /
          spot.ratings.length;
        const targetIdx = noiseRank.indexOf(intent.noise_preference.toUpperCase() as any);
        score -= Math.abs(avgNoiseIdx - targetIdx);
      }
      if (intent.busyness_preference !== "any") {
        const avgBusyIdx =
          spot.ratings.reduce((sum, r) => sum + busynessRank.indexOf(r.busyness), 0) /
          spot.ratings.length;
        const targetIdx = busynessRank.indexOf(
          intent.busyness_preference.toUpperCase() as any
        );
        score -= Math.abs(avgBusyIdx - targetIdx);
      }
    }
    return { spot, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.spot);
}

// ---------- 3 & 4. Reasoning + explanation over review text ----------

const RankedResultSchema = z.object({
  results: z.array(
    z.object({
      spot_id: z.string(),
      relevant: z
        .boolean()
        .describe("Whether this spot genuinely matches the user's query"),
      explanation: z
        .string()
        .describe(
          "One grounded sentence explaining why this spot fits — based on its " +
          "reviews if it has any relevant ones, or its name/description if it " +
          "doesn't. Not a generic restatement of the query."
        ),
    })
  ),
});

export async function rankWithReviews(
  query: string,
  intent: SearchIntent,
  candidates: Awaited<ReturnType<typeof queryCandidates>>
) {
  if (candidates.length === 0) return [];

  const model = getModel(0.2).withStructuredOutput(RankedResultSchema, {
    name: "rank_and_explain",
  });

  const context = candidates
    .map((spot) => {
      const reviews = spot.ratings
        .map((r) => `  - (${r.timeOfDay ?? "unspecified time"}) "${r.comment ?? "no comment"}"`)
        .join("\n");
      return (
        `Spot ID: ${spot.id}\n` +
        `Name: ${spot.name} (${spot.building.name})\n` +
        `Description/address: ${spot.description ?? "(none)"}\n` +
        `Outlets: ${spot.hasOutlets ? "yes" : "no"}\n` +
        `Recent reviews:\n${reviews || "  (none yet)"}`
      );
    })
    .join("\n\n");

  const result = await model.invoke([
    {
      role: "system",
      content:
        "You judge which study spots genuinely match a student's request. " +
        "Use the recent review text as evidence for specific, checkable claims — " +
        "especially time-of-day claims (e.g. 'empty after 6pm' must be supported " +
        "by a review that actually mentions that time context), and mark a spot " +
        "irrelevant if its reviews directly contradict the request (e.g. reviews " +
        "call it loud but the user wants quiet). " +
        "IMPORTANT: a spot with no reviews yet is NOT automatically irrelevant — " +
        "many real, valid spots (freshly imported places especially) simply " +
        "haven't been rated. For those, judge relevance from its name and " +
        "description against the query instead (e.g. a spot named 'X Cafe' is a " +
        "reasonable match for a query about cafes, even with zero reviews). Only " +
        "withhold a match for lack of reviews when the query itself hinges on a " +
        "specific claim (like a time-of-day pattern) that only review text could " +
        "confirm.",
    },
    {
      role: "user",
      content: `User query: "${query}"\nExtracted intent: ${JSON.stringify(intent)}\n\nCandidates:\n\n${context}`,
    },
  ]);

  const relevantOnly = result.results.filter((r) => r.relevant);
  const explanationById = new Map(relevantOnly.map((r) => [r.spot_id, r.explanation]));

  return candidates
    .filter((spot) => explanationById.has(spot.id))
    .map((spot) => ({
      ...spot,
      explanation: explanationById.get(spot.id)!,
    }));
}

// ---------- Orchestration ----------

export type SearchResult =
  | { status: "needs_clarification"; question: string; partialIntent: SearchIntent }
  | { status: "ok"; intent: SearchIntent; results: Awaited<ReturnType<typeof rankWithReviews>> };

export async function searchSpots(query: string): Promise<SearchResult> {
  const intent = await extractIntent(query);

  // Conditional branch: low-confidence extraction asks a clarifying
  // question instead of guessing — this is the one real "branch" in the
  // chain (see note below on why the rest stays linear).
  if (intent.confidence < CONFIDENCE_THRESHOLD) {
    return {
      status: "needs_clarification",
      question:
        "Could you say a bit more about what you're looking for — " +
        "e.g. how quiet, whether you need outlets, or a building/area?",
      partialIntent: intent,
    };
  }

  const candidates = await queryCandidates(intent);
  const results = await rankWithReviews(query, intent, candidates);

  return { status: "ok", intent, results };
}

/**
 * Design note: steps 2–4 are a plain sequential chain, not a LangGraph
 * multi-agent graph. The one genuine branch (low-confidence → clarify) is
 * modeled above as a simple conditional. Wrapping this in a full graph
 * with parallel agent nodes wouldn't add real capability for this task —
 * it would just add latency and cost. If the app grows extra branches
 * (e.g. a separate "browse by building" flow that reconverges here), that's
 * the point where porting this to a LangGraph StateGraph starts to pay for
 * itself.
 */
