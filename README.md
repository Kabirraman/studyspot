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
components/
  SearchBar.tsx
  SpotCard.tsx                — links to the detail page
  MapView.tsx                 — Google Maps markers, dark theme
  RatingForm.tsx
  PhotoUpload.tsx
  PlaceImportSearch.tsx        — find + import real places
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

## Still open

- **Custom sign-in page**: NextAuth's default screen works but doesn't
  match the app's dark theme — pass a `pages.signIn` route in
  `lib/auth.ts` if you want a branded one.
- **Rate limiting / abuse checks** on rating and photo submission — fine
  for a class project, worth adding before any real deployment.
