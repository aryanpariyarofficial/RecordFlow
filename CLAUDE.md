# RecordFlow — Loom-style browser screen recorder

A browser-based screen + camera recorder. Record screen (+ webcam bubble + mic),
stop, and get a local download (Phase 1) or a shareable link (Phase 2+).

## Current phase

**Phase 1 — MVP Recorder** ✅ implemented
Record screen + mic → countdown → pause/resume/stop with timer → preview →
download `.webm` locally. No backend, no uploads.

Next up: **Phase 2** — webcam bubble (canvas compositing), device pickers,
Cloudinary signed uploads, public viewer page `/v/[slug]`.

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
