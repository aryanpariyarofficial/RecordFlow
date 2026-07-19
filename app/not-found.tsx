import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
        <span className="h-4 w-4 rounded-full bg-white" />
      </span>
      <h1 className="mt-6 text-3xl font-bold">Recording not found</h1>
      <p className="mt-3 max-w-sm text-muted">
        This link may be wrong, or the recording was removed.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-ink px-6 py-3 font-semibold text-white transition hover:bg-ink/85"
      >
        Record your own
      </Link>
    </div>
  );
}
