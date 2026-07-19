import { Recorder } from "@/components/recorder";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <span className="h-3 w-3 rounded-full bg-white" />
          </span>
          <span className="font-heading text-xl font-bold tracking-tight">
            RecordFlow
          </span>
        </div>
        <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-muted">
          Phase 1 · MVP
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-20">
        <div className="mt-10 mb-12 max-w-2xl text-center sm:mt-16">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Record your screen.
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Share in seconds.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg text-muted">
            Screen + mic recording straight from your browser. No installs, no
            accounts — hit record and go.
          </p>
        </div>

        <Recorder />
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-muted">
        RecordFlow — recordings stay on your device. Nothing is uploaded.
      </footer>
    </div>
  );
}
