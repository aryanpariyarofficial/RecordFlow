# RecordFlow — Loom-style browser screen recorder

A browser-based screen + camera recorder. Record screen (+ webcam bubble + mic),
stop, and get a local download (Phase 1) or a shareable link (Phase 2+).

## Current phase

**Phase 3.5 — Instant links, local history, limits, MP4/trim** ✅ implemented
- Instant links: `startUpload()` registers a `processing` row + returns the
  share link immediately; upload completes in background; viewer page shows a
  spinner and auto-refreshes until `ready`. Failed uploads delete the row.
- Local history: every finished recording auto-saves to IndexedDB
  (`lib/local-history.ts`, newest 10 kept); "On this device" list on home.
- Duration cap: 30-min auto-stop (`MAX_RECORDING_MS`); `GUEST_MAX_RECORDING_MS`
  (5 min) activates for guests when auth ships.
- Rate limiting: in-memory sliding window (`lib/rate-limit.ts`) on sign,
  recordings, and view routes — per-instance only; swap for a shared store
  if abuse appears.
- MP4 download (viewer + library) and non-destructive trim-to-MP4 downloads
  via Cloudinary `so_/eo_/fl_attachment` transformations
  (`lib/cloudinary-urls.ts`).

**Phase 3 (minus auth) — Library, metadata, view counts** ✅ implemented
Supabase `recordings` table (schema in `supabase/schema.sql` — must be run
once in the Supabase SQL Editor) stores slug/title/duration/size/views with a
nullable `user_id` for later. Upload persists metadata via `POST
/api/recordings`; `/library` shows a grid with Cloudinary thumbnails,
rename/delete, view counts, and a Cloudinary credits meter; viewer pages count
views (3s dwell) and read from Supabase with Cloudinary Admin API fallback.

**Product rule:** guests = record + local download only. Upload + share links
will require login. Auth is deliberately built LAST (user decision) — until
then uploads stay open and management routes are unauthenticated (documented
in code); gate them by user when auth ships.

**Phase 2 — Webcam bubble + share links** ✅ implemented
Three modes (screen / screen + cam bubble / camera-only), draggable + resizable
bubble via canvas compositing (`lib/compositor.ts`, Worker-driven draw loop so
background tabs don't throttle it), mic/camera device pickers, live mic mute,
Cloudinary signed uploads (chunked for large files) and public viewer pages at
`/v/[slug]` (metadata read from Cloudinary Admin API — no database yet).

Requires env vars (see `.env.example`): `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — locally in `.env.local` and on
Vercel. Without them the app still works; upload UI shows a setup hint.

Next up: **Phase 3** — Supabase Auth + video library, thumbnails, chunked
upload *during* recording (instant links), view counter, storage usage meter.

## Stack

- Next.js 15 (App Router) + TypeScript, React 19
- Tailwind CSS v4 (via `@tailwindcss/postcss`, theme tokens in `app/globals.css`)
- Recording: `getDisplayMedia` + `getUserMedia` + `MediaRecorder` (WebM VP9/VP8 + Opus)
- Planned: Supabase (auth + metadata, Phase 3), Cloudinary (video storage, Phase 2+), Vercel hosting

## Branding

- Headings: **Syne** (`font-heading`) · Body/UI: **DM Sans** (`font-body`)
- Colors: primary `#FF009D` (`primary`), secondary `#5501FE` (`secondary`),
  accent/ink `#0f0f0f` (`ink`), muted text `#6c6a72` (`muted`)
- 720p is the default resolution with a 1080p toggle (smaller files, kinder to
  the Cloudinary free tier later)

## Folder structure

- `app/` — App Router pages and global styles
- `components/` — UI components (`recorder.tsx`) and hooks (`use-recorder.ts`)
- `lib/` — isolated media logic. Keep these small and framework-free:
  - `recorder.ts` — capture + MediaRecorder engine (no React in here)
  - `compositor.ts` (Phase 2) — canvas webcam-bubble compositing
  - `storage.ts` (Phase 2+) — swappable storage layer (Cloudinary first)

## Conventions

- Media logic stays out of React components — components call `lib/` modules.
- Chunked recording (1s timeslice); never hold a whole recording in one buffer
  path that can't survive 30+ minute sessions.
- Never lose a recording: on any upload failure (Phase 2+), keep the local blob
  and offer download/retry.
- Chrome/Edge/Brave are the primary targets; degrade gracefully elsewhere.
- Test recording manually in Chrome after each change — media APIs are not
  unit-testable in any meaningful way.
- Videos unlisted by default (unguessable slugs) once sharing exists.
- Storage is a swappable layer — all provider calls go through `lib/storage.ts`.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build (must pass before ending a session)
