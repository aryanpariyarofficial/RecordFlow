import Link from "next/link";
import { Recorder } from "@/components/recorder";
import { AuthButton } from "@/components/auth-button";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
        <span className="h-3 w-3 rounded-full bg-white" />
      </span>
      <span className="font-heading text-xl font-bold tracking-tight">
        RecordFlow
      </span>
    </Link>
  );
}

const STEPS = [
  {
    step: "1",
    title: "Pick what to share",
    body: "A browser tab, a window, or your whole screen — with an optional webcam bubble and mic narration.",
  },
  {
    step: "2",
    title: "Record",
    body: "Pause and resume freely, mute your mic, and drag your bubble live. Every take auto-saves to your device.",
  },
  {
    step: "3",
    title: "Share instantly",
    body: "Your link is ready the moment you hit stop. Viewers watch in the browser — nothing to download.",
  },
];

const FEATURES = [
  {
    title: "Webcam bubble",
    body: "A draggable, resizable circle over your screen — composited straight into the video, just like Loom.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="2" y="4" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="8" cy="13" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Instant share links",
    body: "The link goes live before the upload even finishes. Stop recording, paste the link, done.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M13 5l7 7-7 7M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Never lose a take",
    body: "Recordings auto-save to your device as you go — close the tab, come back, it's still there.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M12 3v10m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Private by default",
    body: "Every link is unlisted with an unguessable address, and your library is visible only to you.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    title: "MP4 & trim",
    body: "Download any recording as MP4, or trim out just the part you need — without re-recording.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 7.5L20 19M8.5 16.5L20 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Nothing to install",
    body: "Runs entirely in Chrome, Edge, or Brave. Open the page, hit record — that's the whole setup.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
        <path d="M12 21a9 9 0 100-18 9 9 0 000 18z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 9h17M3.5 15h17M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-4" aria-label="Main">
            <Link
              href="/library"
              className="text-sm font-medium text-muted transition hover:text-ink"
            >
              Library
            </Link>
            <AuthButton />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero + recorder */}
        <section className="relative overflow-hidden px-6 pb-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(85,1,254,0.08),transparent),radial-gradient(40%_40%_at_80%_10%,rgba(255,0,157,0.07),transparent)]"
          />
          <div className="mx-auto mt-12 max-w-2xl text-center sm:mt-16">
            <p className="inline-block rounded-full border border-secondary/20 bg-secondary/5 px-4 py-1.5 text-xs font-semibold tracking-wide text-secondary">
              FREE BROWSER SCREEN RECORDER
            </p>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">
              Record your screen.
              <br />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Share in seconds.
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-lg text-muted">
              Screen, webcam bubble, and mic — captured right in your browser.
              Get a share link the moment you hit stop. No installs, no
              watermarks.
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted">
              {["Nothing to install", "Instant share links", "Free to start"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-secondary" aria-hidden>
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>

          <div className="mx-auto mt-10 w-full max-w-2xl">
            <Recorder />
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="border-t border-black/5 bg-white px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 id="how-heading" className="text-center text-2xl font-bold sm:text-3xl">
              From idea to link in under a minute
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((item) => (
                <div key={item.step} className="text-center sm:text-left">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary font-heading text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 id="features-heading" className="text-center text-2xl font-bold sm:text-3xl">
              Everything you need to replace a meeting
            </h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:border-secondary/30 hover:shadow-md"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary px-8 py-12 text-center text-white sm:px-12">
            <h2 className="font-heading text-2xl font-extrabold sm:text-3xl">
              Send your next update as a link, not a meeting
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              A free account unlocks instant share links, your private video
              library, and 30-minute recordings.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-white px-7 py-3 font-semibold text-ink shadow-lg transition hover:bg-white/90"
              >
                Create your free account
              </Link>
              <Link
                href="/library"
                className="rounded-full border border-white/40 px-7 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Open your library
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo />
            <p className="text-xs text-muted">
              Recordings stay on your device until you choose to share.
            </p>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-6 text-sm">
            <Link href="/" className="text-muted transition hover:text-ink">
              Record
            </Link>
            <Link href="/library" className="text-muted transition hover:text-ink">
              Library
            </Link>
            <Link href="/login" className="text-muted transition hover:text-ink">
              Log in
            </Link>
          </nav>
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} RecordFlow
          </p>
        </div>
      </footer>
    </div>
  );
}
