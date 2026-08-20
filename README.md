# Campus Study Spot Finder

Find the best places on campus to study, based on noise level, Wi-Fi quality,
outlets, and how busy they usually are. Students sign in, leave ratings,
free-text reviews, and photos; a natural-language search agent turns a query
like

> "quiet spot with outlets near CS building, usually empty after 6pm"

into a ranked, explained shortlist.

## Stack

- **Next.js 14** (App Router) — frontend + API routes
- **PostgreSQL + Prisma** — data layer
- **NextAuth (Google provider)** — sign-in, session-based rating/photo attribution
- **LangChain + Gemini 2.0 Flash** — the search agent (`lib/agent.ts`), free tier, no billing required
- **Google Maps API** — spot locations
- **Cloudinary (unsigned upload)** — photo hosting, free tier, no server secret needed

## Setup

```bash
npm install
cp .env.example .env   # fill in every var — see below for where each comes from
npm run db:push        # create tables from prisma/schema.prisma
npm run db:seed        # sample buildings/spots/ratings for local dev
npm run dev
```

### Free-tier accounts you'll need

| Service | What it's for | Free tier notes |
|---|---|---|
| [Neon](https://neon.tech) or [Supabase](https://supabase.com) | `DATABASE_URL` | If using Supabase, use the **pooled** connection string (port 6543), not the direct one — the direct one is IPv6-only and fails on most networks. Append `?pgbouncer=true`. |
| [Google AI Studio](https://aistudio.google.com/apikey) | `GOOGLE_API_KEY` | No billing required for Gemini 2.0 Flash at this scale. |
| [Google Cloud Console](https://console.cloud.google.com/apis/credentials) | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Enable "Maps JavaScript API". |
| Same Google Cloud project | `GOOGLE_PLACES_API_KEY` | Enable "Places API (New)" — separate from the Maps JS API above. Free tier covers normal dev/class-project usage; check current pricing if you expect heavy traffic. |
| Same Google Cloud project | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Create an OAuth 2.0 Client (Web application). Redirect URI: `http://localhost:3000/api/auth/callback/google`. |
| — | `NEXTAUTH_SECRET` | Generate with `npx auth secret` or `openssl rand -base64 32`. |
| [Cloudinary](https://cloudinary.com) | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Free tier. Create an **unsigned** upload preset (Settings → Upload → Upload presets) so the browser can upload directly with no server secret. |

## Real places via Google Places (India-ready)

Seeded/manually-added spots are one source; the app can also pull **real**
places — libraries, cafés, coworking spaces — from Google Places and let
students track them the same way:

- `lib/googlePlaces.ts` — calls the Places API (New) Text Search endpoint
  server-side. Works for any location, India included — try queries like
  `"library near Koramangala"` or `"24 hour cafe near IIIT Pune"`.
- `components/PlaceImportSearch.tsx` — search box on the home page; each
  result shows Google's own rating/review count and a "Add as study spot"
  button.
- Importing (`/api/places/import`) creates a `Spot` (and a matching
  `Building` row) from the place's real name, address, and coordinates,
  tagged with `googlePlaceId` so re-importing the same place is a no-op.
- Once imported, it's a normal `Spot` — same noise/wifi/outlet ratings,
  same free-text reviews, same eligibility for the natural-language search
  agent. Google's own star rating is shown at import time as a reference
  point but isn't stored — the app's own `Rating` model is the source of
  truth for search/ranking, since Google doesn't have noise/outlet/busyness
  data.

Needs `GOOGLE_PLACES_API_KEY` (see table above) with **Places API (New)**
enabled in Google Cloud Console — a separate API from "Maps JavaScript
API," so enable both.

## How the search agent works

See `lib/agent.ts` for the full implementation and inline design notes.
Short version:

1. **Intent extraction** — one structured-output LLM call turns free text
   into a typed filter object (noise, outlets, location, time, busyness),
   with a confidence score.
2. **Low-confidence branch** — if confidence is below threshold, the app
   asks a clarifying question instead of guessing.
3. **Candidate query** — a plain Prisma query applies hard filters
   (outlets, building) and soft-ranks by how close average ratings are to
   the requested noise/busyness.
4. **Retrieval + reasoning over reviews** — a second LLM call is handed the
   candidates' recent free-text reviews and judges which spots are
   genuinely supported by that text — the RAG-ish step, and what catches
   "empty after 6pm" claims a plain filter can't.
5. **Grounded explanation** — the same call returns a one-line reason per
   result, tied to an actual review.

This is intentionally a short linear chain rather than a full LangGraph
multi-agent graph — see the note at the bottom of `lib/agent.ts` for why.

## Auth model

Sign-in is Google OAuth via NextAuth, using the Prisma adapter (sessions
and accounts live in Postgres, not JWT cookies — see the `Account`/
`Session`/`VerificationToken` models in `prisma/schema.prisma`). Rating and
photo routes read the user id from the **server session**
(`getServerSession`), never from the request body, so a client can't
attribute a submission to someone else's account.

## Photo upload

Uploads go straight from the browser to Cloudinary using an *unsigned*
upload preset (`components/PhotoUpload.tsx`) — no server-side API secret
to manage. Once Cloudinary returns the hosted URL, it's saved against the
spot via `/api/spots/:id/photos`, attributed to the signed-in user.

## Project layout

```
app/
  page.tsx                    — main search + map + list UI
  providers.tsx                — NextAuth SessionProvider wrapper
  spot/[id]/page.tsx          — spot detail: photos, rating history, forms
  api/auth/[...nextauth]/      — NextAuth route
  api/search/route.ts         — agent-powered NL search endpoint
  api/spots/route.ts          — plain CRUD list of spots
  api/spots/[id]/route.ts     — single spot with full rating/photo history
  api/spots/[id]/ratings/     — submit a rating (session-authenticated)
  api/spots/[id]/photos/      — record an uploaded photo (session-authenticated)
  api/places/search/          — search real places via Google Places
  api/places/import/          — import a Google place as a trackable Spot
  api/favorites/               — list current user's favorited spot ids
  api/spots/[id]/favorite/     — toggle favorite status for a spot
components/
  SearchBar.tsx
  SpotCard.tsx                — links to the detail page, favorite heart
  MapView.tsx                 — Google Maps markers, dark theme, auto-fits bounds
  RatingForm.tsx
  PhotoUpload.tsx
  PlaceImportSearch.tsx        — find + import real places
  FilterPanel.tsx              — noise/wifi/outlets/favorites/distance filters
  FavoriteButton.tsx           — heart toggle, used in SpotCard + detail page
  AuthButton.tsx               — sign in/out
lib/
  agent.ts                    — the search agent (start here)
  db.ts                       — Prisma client
  auth.ts                     — NextAuth config (Google provider + Prisma adapter)
  googlePlaces.ts              — Places API (New) Text Search wrapper
prisma/
  schema.prisma
  seed.ts
```

## Favorites

Signed-in users can bookmark spots (heart icon on every card and on the
detail page). `Favorite` is a simple `(userId, spotId)` unique join table
— `/api/favorites` lists the current user's favorited spot ids,
`/api/spots/:id/favorite` toggles one. The "Favorites only" filter on the
home page uses the same data.

## Filters

The default "All spots" list (not search results — the agent already does
its own relevance filtering) has a filter panel: noise level, Wi-Fi
quality, outlets-only, favorites-only, and distance from the average
spot location ("campus center"). Noise/Wi-Fi filtering compares against
`avgNoise`/`avgWifi` — computed server-side in `/api/spots` by averaging
each spot's ratings and rounding to the nearest enum value; spots with no
ratings yet have `null` for both and won't match a specific noise/Wi-Fi
filter (they'll still show under "any").

## Deploying

This is a standard Next.js 14 App Router project, so [Vercel](https://vercel.com)
is the path of least resistance:

1. Push this repo to GitHub.
2. Import it in Vercel — it auto-detects Next.js, no config needed.
3. Add every variable from `.env.example` in Vercel's Project Settings →
   Environment Variables, with real values (same as local, but:
   - `NEXTAUTH_URL` → your real deployed URL, e.g. `https://yourapp.vercel.app`
   - Add that same URL's `/api/auth/callback/google` as an additional
     Authorized redirect URI in Google Cloud Console — Google needs both
     the localhost and production URLs registered.
4. Vercel builds and deploys automatically on push. First deploy will
   fail if you forget `npm run db:push` against your **production**
   database first — the schema has to exist there too, it's separate
   from your local dev database unless you point both at the same one.

Neon and Supabase (whichever you're using for `DATABASE_URL`) don't need
any extra deployment step — they're already hosted.

## Troubleshooting

**New "Favorite" table doesn't exist / favorites silently fail** — this
update added a `Favorite` model to the schema. Run `npm run db:push`
again to sync it before testing favorites.

**Search hangs for 30-60 seconds, then fails** — LangChain retries a
failed Gemini call up to 6 times by default with exponential backoff, so
a single rate-limited request can silently hang for close to a minute
before finally erroring. The free tier is rate-limited (roughly 15
requests/min for flash models as of writing) — search makes 2 Gemini
calls per request, so testing quickly or importing a bunch of real
places right before searching can trip it. Fixed by capping
`maxRetries: 1` in `getModel()` (fails fast instead of hanging), trimming
how many candidates/reviews go into the ranking prompt (cheaper calls,
less likely to hit the limit), and adding a 20-second client-side timeout
in `app/page.tsx` so the UI never sits stuck indefinitely. If you still
see this, just wait a few seconds between searches.

**Imported places don't show up on the map, or only 2-3 markers ever
appear** — the map used to center itself once, at page load, based on
whatever spots existed at that moment, and never adjusted afterward. A
newly imported cafe across town got a real marker, it just sat outside
the visible area forever. `MapView.tsx` now calls `fitBounds()` every
time the spot list changes, so the view always expands to show
everything currently on screen.

**A spot you just added doesn't show up in natural-language search
results (e.g. "a cafe" finds nothing even though you added one)** — the
ranking step (`rankWithReviews` in `lib/agent.ts`) originally leaned on
review text as its main evidence, which meant a freshly imported spot
with zero reviews almost always got silently marked irrelevant — even
when its name obviously matched (e.g. "Atithi Cafe" for a "cafe" query).
The prompt now explicitly treats a review-less spot as judgeable by name
and description alone, and only insists on review evidence for claims
that genuinely need it (like a specific time-of-day pattern).

**A location phrase in the query (e.g. "cafe near the station") returns
zero results** — `location_hint` was a hard filter against `Building.name`
only, so anything that wasn't literally named "station" got excluded
outright. It's now matched more broadly (building name, spot name, or
description) and falls back to no location filter at all if that broader
match still comes up empty, rather than returning nothing.

**Search results don't clear when you switch to "Find real places
nearby"** — the two search boxes (agent search vs. Places import search)
didn't know about each other. Starting a places search now clears any
leftover natural-language search results via `onSearchStart` in
`app/page.tsx`, so you're not looking at two stale result sets at once.

**`The table 'public.Spot' does not exist`** — this project uses `prisma db
push` (no `prisma/migrations` folder), so `npx prisma migrate reset` has
nothing to reapply after wiping the database and leaves you with zero
tables. Use this instead:
```bash
npx prisma db push --force-reset
npm run db:seed
```

**Search fails with a Gemini 400 error mentioning `"Proto field is not
repeating, cannot start list"`** — this is a real incompatibility, not a
transient issue: Gemini's function-calling API doesn't support
`nullable` fields the way `zod` + LangChain's `withStructuredOutput`
generates them. `IntentSchema` in `lib/agent.ts` originally used
`.boolean().nullable()` and `.string().nullable()` for two fields —
replaced with a `"yes" | "no" | "unspecified"` enum and a plain string
(empty string = unspecified) respectively, since Gemini has no trouble
with enums/plain strings, only with nullable unions. If you add more
fields to that schema later, avoid `.nullable()` — use a sentinel value
in an enum or an empty string instead.

**Search returns nothing / blank results with no error shown** — Google
retires Gemini model versions on a rolling schedule (`gemini-2.0-flash`
was shut down June 1, 2026, for example). If search silently stops
working, check the server logs for a 404 from the Gemini API, then update
the model name in `getModel()` in `lib/agent.ts` — see
[the current model list](https://ai.google.dev/gemini-api/docs/models).
The frontend (`app/page.tsx`) surfaces agent errors in the UI instead of
failing silently, so you should see a red error box instead of nothing.

**Duplicate spots after re-running `npm run db:seed`** — the seed script
now upserts spots by name (no more duplicates going forward), but if you
already ran it more than once before that fix, the old duplicate rows are
still in your database. Clean up either with `npx prisma studio` (delete
the duplicate `Spot` rows by hand) or wipe and reseed with the
`db push --force-reset` command above.

## Still open

- **Custom sign-in page**: NextAuth's default screen works but doesn't
  match the app's dark theme — pass a `pages.signIn` route in
  `lib/auth.ts` if you want a branded one.
- **Rate limiting / abuse checks** on rating and photo submission — fine
  for a class project, worth adding before any real deployment.
