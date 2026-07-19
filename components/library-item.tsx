"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDuration } from "@/lib/format";
import { mp4DownloadUrl } from "@/lib/cloudinary-urls";

function parseTimestamp(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export function LibraryItem({
  slug,
  title,
  createdAt,
  durationSeconds,
  views,
  processing,
  hasPassword,
  expiresAt,
  plays,
  avgWatchPercent,
  thumbnail,
}: {
  slug: string;
  title: string;
  createdAt: string;
  durationSeconds: number | null;
  views: number;
  processing: boolean;
  hasPassword: boolean;
  expiresAt: string | null;
  plays: number;
  avgWatchPercent: number | null;
  thumbnail: string;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [thumbBroken, setThumbBroken] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [trimStart, setTrimStart] = useState("");
  const [trimEnd, setTrimEnd] = useState("");
  const [trimError, setTrimError] = useState<string | null>(null);
  const [protectOpen, setProtectOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState("");
  const [protectMsg, setProtectMsg] = useState<string | null>(null);
  const viewerPath = `/v/${slug}`;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

  const saveProtection = async () => {
    setBusy(true);
    setProtectMsg(null);
    const payload: Record<string, unknown> = {};
    if (password !== "") payload.password = password;
    if (expiry !== "") {
      payload.expiresInDays = expiry === "never" ? null : Number(expiry);
    }
    if (Object.keys(payload).length === 0) {
      setBusy(false);
      setProtectMsg("Nothing to change.");
      return;
    }
    const res = await fetch(`/api/recordings/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setPassword("");
      setExpiry("");
      setProtectOpen(false);
      router.refresh();
    } else {
      setProtectMsg("Could not save link settings — try again.");
    }
  };

  const removePassword = async () => {
    setBusy(true);
    const res = await fetch(`/api/recordings/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "" }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${viewerPath}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const saveRename = async () => {
    const next = draftTitle.trim();
    if (!next || next === title) {
      setRenaming(false);
      setDraftTitle(title);
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/recordings/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    }).catch(() => null);
    setBusy(false);
    setRenaming(false);
    if (res?.ok) router.refresh();
    else setDraftTitle(title);
  };

  const remove = async () => {
    if (
      !window.confirm(
        `Delete "${title}"? The video and its share link stop working immediately.`
      )
    ) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/recordings/${slug}`, {
      method: "DELETE",
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else window.alert("Delete failed — try again.");
  };

  const downloadTrim = () => {
    const startSec = parseTimestamp(trimStart);
    const endSec = parseTimestamp(trimEnd);
    if (trimStart.trim() && startSec === null) {
      setTrimError("Start time should look like 0:30 or 30.");
      return;
    }
    if (trimEnd.trim() && endSec === null) {
      setTrimError("End time should look like 2:15 or 135.");
      return;
    }
    if (startSec !== null && endSec !== null && endSec <= startSec) {
      setTrimError("End must be after start.");
      return;
    }
    setTrimError(null);
    window.open(
      mp4DownloadUrl(slug, {
        startSec: startSec ?? undefined,
        endSec: endSec ?? undefined,
      }),
      "_blank"
    );
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition ${
        busy ? "opacity-50" : ""
      }`}
    >
      <a
        href={viewerPath}
        target="_blank"
        rel="noreferrer"
        className="relative block"
      >
        {thumbBroken || processing ? (
          <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-primary/80 to-secondary/80">
            <span className="h-4 w-4 rounded-full bg-white/90" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={title}
            onError={() => setThumbBroken(true)}
            className="aspect-video w-full bg-ink object-cover"
          />
        )}
        {processing && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-xs font-semibold text-white">
            Processing…
          </span>
        )}
        <span className="absolute right-3 top-3 flex gap-1.5">
          {hasPassword && (
            <span className="rounded-full bg-ink/80 px-2.5 py-1 text-xs font-semibold text-white">
              🔒
            </span>
          )}
          {expiresAt && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white ${
                isExpired ? "bg-primary/90" : "bg-ink/80"
              }`}
              title={`Link ${isExpired ? "expired" : "expires"} ${new Date(expiresAt).toLocaleDateString()}`}
            >
              {isExpired ? "Expired" : "⏳"}
            </span>
          )}
        </span>
      </a>
      <div className="p-4">
        {renaming ? (
          <input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveRename();
              if (e.key === "Escape") {
                setRenaming(false);
                setDraftTitle(title);
              }
            }}
            autoFocus
            maxLength={120}
            className="w-full rounded-lg border border-secondary px-2 py-1 font-semibold outline-none"
          />
        ) : (
          <p className="truncate font-semibold" title={title}>
            {title}
          </p>
        )}
        <p className="mt-1 text-xs text-muted">
          {formatDate(createdAt)}
          {typeof durationSeconds === "number" &&
            ` · ${formatDuration(durationSeconds)}`}
          {` · ${views} view${views === 1 ? "" : "s"}`}
        </p>
        {plays > 0 && (
          <p className="mt-1 text-xs font-medium text-secondary">
            ▶ {plays} play{plays === 1 ? "" : "s"}
            {typeof avgWatchPercent === "number" &&
              ` · ${avgWatchPercent}% watched on average`}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <button
            onClick={copyLink}
            className="font-medium text-secondary transition hover:brightness-75"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          {!processing && (
            <>
              <a
                href={mp4DownloadUrl(slug)}
                className="font-medium text-muted transition hover:text-ink"
              >
                MP4
              </a>
              <button
                onClick={() => setTrimOpen((open) => !open)}
                className={`font-medium transition ${
                  trimOpen ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                Trim
              </button>
              <button
                onClick={() => setProtectOpen((open) => !open)}
                className={`font-medium transition ${
                  protectOpen ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                Protect
              </button>
            </>
          )}
          <button
            onClick={() => setRenaming(true)}
            disabled={busy}
            className="font-medium text-muted transition hover:text-ink"
          >
            Rename
          </button>
          <button
            onClick={remove}
            disabled={busy}
            className="ml-auto font-medium text-muted transition hover:text-primary"
          >
            Delete
          </button>
        </div>

        {trimOpen && !processing && (
          <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-3">
            <div className="flex items-center gap-2">
              <input
                value={trimStart}
                onChange={(e) => setTrimStart(e.target.value)}
                placeholder="Start (0:00)"
                className="w-full min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-secondary"
              />
              <span className="text-muted">→</span>
              <input
                value={trimEnd}
                onChange={(e) => setTrimEnd(e.target.value)}
                placeholder={
                  typeof durationSeconds === "number"
                    ? `End (${formatDuration(durationSeconds)})`
                    : "End (1:30)"
                }
                className="w-full min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-secondary"
              />
              <button
                onClick={downloadTrim}
                className="shrink-0 rounded-lg bg-secondary px-3.5 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Download
              </button>
            </div>
            {trimError && (
              <p className="mt-2 text-xs text-primary">{trimError}</p>
            )}
            <p className="mt-2 text-xs text-muted">
              Downloads a trimmed MP4 — the original stays untouched.
            </p>
          </div>
        )}

        {protectOpen && !processing && (
          <div className="mt-3 rounded-xl border border-black/10 bg-black/[0.02] p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    hasPassword ? "New password" : "Set a password (optional)"
                  }
                  maxLength={72}
                  className="w-full min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-secondary"
                />
                {hasPassword && (
                  <button
                    onClick={removePassword}
                    disabled={busy}
                    className="shrink-0 text-xs font-medium text-muted transition hover:text-primary"
                  >
                    Remove password
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-secondary"
                >
                  <option value="">
                    {expiresAt
                      ? `Expiry: ${new Date(expiresAt).toLocaleDateString()} (keep)`
                      : "Link expiry: never (keep)"}
                  </option>
                  <option value="1">Expire in 1 day</option>
                  <option value="7">Expire in 7 days</option>
                  <option value="30">Expire in 30 days</option>
                  <option value="never">Never expire</option>
                </select>
                <button
                  onClick={saveProtection}
                  disabled={busy}
                  className="shrink-0 rounded-lg bg-secondary px-3.5 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            </div>
            {protectMsg && (
              <p className="mt-2 text-xs text-primary">{protectMsg}</p>
            )}
            <p className="mt-2 text-xs text-muted">
              Viewers with the link will need the password; expired links stop
              working for everyone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
