"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ALLOWED_EMOJI } from "@/lib/engagement";
import { formatDuration } from "@/lib/format";

interface Comment {
  id: string;
  author: string;
  body: string;
  atSeconds: number | null;
  createdAt: string;
}

/** Video player with emoji reactions, timestamped comments, and
 * anonymous watch-progress beacons for owner analytics. */
export function ViewerPlayer({
  slug,
  url,
  isOwner = false,
}: {
  slug: string;
  url: string;
  isOwner?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reacted, setReacted] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [atCurrentTime, setAtCurrentTime] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const maxWatchedRef = useRef(0);
  const lastSentRef = useRef(0);

  // Watch-through beacons: furthest point reached, every 10s + on leave.
  useEffect(() => {
    const send = (useBeacon: boolean) => {
      const seconds = maxWatchedRef.current;
      if (seconds < 1 || seconds - lastSentRef.current < 1) return;
      lastSentRef.current = seconds;
      const payload = JSON.stringify({
        sessionId,
        seconds,
        duration: videoRef.current?.duration || null,
      });
      const endpoint = `/api/recordings/${slug}/watch`;
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          endpoint,
          new Blob([payload], { type: "application/json" })
        );
      } else {
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };
    const interval = setInterval(() => send(false), 10_000);
    const onHide = () => send(true);
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      send(true);
    };
  }, [slug, sessionId]);

  useEffect(() => {
    fetch(`/api/recordings/${slug}/reactions`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCounts(data.counts ?? {}))
      .catch(() => {});
    fetch(`/api/recordings/${slug}/comments`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setComments(data.comments ?? []))
      .catch(() => {});
  }, [slug]);

  const react = async (emoji: string) => {
    if (reacted === emoji) return;
    setReacted(emoji);
    setCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }));
    await fetch(`/api/recordings/${slug}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    }).catch(() => {});
  };

  const submitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const atSeconds =
      atCurrentTime && videoRef.current
        ? videoRef.current.currentTime
        : undefined;
    const res = await fetch(`/api/recordings/${slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, body, atSeconds }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      setBody("");
    } else {
      setError("Could not post the comment — try again.");
    }
  };

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    void video.play().catch(() => {});
    video.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      <video
        ref={videoRef}
        src={url}
        controls
        playsInline
        onTimeUpdate={(e) => {
          maxWatchedRef.current = Math.max(
            maxWatchedRef.current,
            e.currentTarget.currentTime
          );
        }}
        className="mt-4 w-full rounded-2xl border border-black/10 bg-ink shadow-sm"
      />

      {/* Reactions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {ALLOWED_EMOJI.map((emoji) => (
          <button
            key={emoji}
            onClick={() => react(emoji)}
            className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
              reacted === emoji
                ? "border-secondary bg-secondary/10"
                : "border-black/10 bg-white hover:border-secondary/40"
            }`}
          >
            <span>{emoji}</span>
            {(counts[emoji] ?? 0) > 0 && (
              <span className="font-semibold text-muted">
                {counts[emoji]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Comments */}
      <section aria-label="Comments" className="mt-8">
        <h2 className="text-lg font-bold">
          Comments{comments.length > 0 && ` (${comments.length})`}
        </h2>

        <form
          onSubmit={submitComment}
          className="mt-4 rounded-2xl border border-black/10 bg-white p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name (optional)"
              maxLength={40}
              className="rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-secondary sm:w-48"
            />
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Leave a comment…"
              maxLength={1000}
              required
              className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-secondary"
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-lg bg-secondary px-5 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              Post
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={atCurrentTime}
              onChange={(e) => setAtCurrentTime(e.target.checked)}
              className="h-3.5 w-3.5 accent-secondary"
            />
            Attach the current video timestamp
          </label>
          {error && <p className="mt-2 text-sm text-primary">{error}</p>}
        </form>

        {comments.length > 0 && (
          <ul className="mt-4 flex flex-col gap-3">
            {comments.map((comment) => (
              <li
                key={comment.id}
                className="rounded-2xl border border-black/10 bg-white p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{comment.author}</span>
                  {typeof comment.atSeconds === "number" && (
                    <button
                      onClick={() => seekTo(comment.atSeconds!)}
                      className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-semibold text-secondary transition hover:bg-secondary/20"
                    >
                      ▶ {formatDuration(comment.atSeconds)}
                    </button>
                  )}
                  <span className="text-xs text-muted">
                    {new Date(comment.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {isOwner && (
                    <button
                      onClick={async () => {
                        if (!window.confirm("Delete this comment?")) return;
                        const res = await fetch(
                          `/api/recordings/${slug}/comments/${comment.id}`,
                          { method: "DELETE" }
                        ).catch(() => null);
                        if (res?.ok) {
                          setComments((prev) =>
                            prev.filter((c) => c.id !== comment.id)
                          );
                        }
                      }}
                      className="ml-auto text-xs font-medium text-muted transition hover:text-primary"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                  {comment.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
