"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDuration } from "@/lib/format";

export function LibraryItem({
  slug,
  title,
  createdAt,
  durationSeconds,
  views,
  thumbnail,
}: {
  slug: string;
  title: string;
  createdAt: string;
  durationSeconds: number | null;
  views: number;
  thumbnail: string;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewerPath = `/v/${slug}`;

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

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition ${
        busy ? "opacity-50" : ""
      }`}
    >
      <a href={viewerPath} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt={title}
          className="aspect-video w-full bg-ink object-cover"
        />
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
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button
            onClick={copyLink}
            className="font-medium text-secondary transition hover:brightness-75"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
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
      </div>
    </div>
  );
}
