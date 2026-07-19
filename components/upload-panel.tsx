"use client";

import { useState } from "react";
import Link from "next/link";
import { isUploadConfigured, startUpload } from "@/lib/storage";
import { useUser } from "./use-user";

type UploadStatus = "idle" | "uploading" | "done" | "error";

export function UploadPanel({ blob }: { blob: Blob }) {
  const { user, loading: userLoading } = useUser();
  const [title, setTitle] = useState(
    `Recording — ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`
  );
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isUploadConfigured()) {
    return (
      <div className="mt-6 rounded-xl border border-black/10 bg-black/[0.03] px-5 py-4 text-sm text-muted">
        <span className="font-semibold text-ink">Share links are almost ready</span>{" "}
        — add your Cloudinary keys to <code>.env.local</code> to enable
        uploading and public viewer links.
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="mt-6 h-24 animate-pulse rounded-xl border border-black/10 bg-black/[0.03]" />
    );
  }

  if (!user) {
    return (
      <div className="mt-6 rounded-xl border border-secondary/25 bg-secondary/5 p-5">
        <p className="font-semibold">Want a shareable link?</p>
        <p className="mt-1 text-sm text-muted">
          Your recording is saved on this device and ready to download below —
          free, no account. Log in to upload it and share a link instead.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-full bg-secondary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-secondary/25 transition hover:brightness-110"
        >
          Log in / create free account
        </Link>
      </div>
    );
  }

  const upload = async () => {
    setStatus("uploading");
    setError(null);
    setProgress(0);
    try {
      const started = await startUpload(blob, {
        title,
        onProgress: setProgress,
      });
      // The link is live immediately — the video finishes in the background.
      setViewerUrl(`${window.location.origin}${started.viewerPath}`);
      await started.completion;
      setStatus("done");
    } catch (err) {
      setViewerUrl(null);
      setError(
        err instanceof Error
          ? err.message
          : "Upload failed. Your local copy is safe — try again or download."
      );
      setStatus("error");
    }
  };

  const copyLink = async () => {
    if (!viewerUrl) return;
    try {
      await navigator.clipboard.writeText(viewerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link is visible to select manually.
    }
  };

  if (viewerUrl) {
    const uploading = status === "uploading";
    return (
      <div className="mt-6 rounded-xl border border-secondary/25 bg-secondary/5 p-5">
        <p className="font-semibold">
          {uploading
            ? "Your link is ready — share it now 🚀"
            : "Your video is live 🎉"}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={viewerUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"
          />
          <button
            onClick={copyLink}
            className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a
            href={viewerUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-black/10 px-5 py-2.5 text-center text-sm font-medium transition hover:bg-black/5"
          >
            Open
          </a>
        </div>
        {uploading && (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-[width]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              Uploading in the background ({Math.round(progress * 100)}%) —
              keep this tab open. Viewers see the video the moment it finishes.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-black/10 p-5">
      <p className="font-semibold">Share with a link</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Recording title"
          maxLength={120}
          disabled={status === "uploading"}
          className="flex-1 rounded-lg border border-black/10 px-3 py-2.5 text-sm outline-none focus:border-secondary"
        />
        <button
          onClick={upload}
          disabled={status === "uploading"}
          className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {status === "uploading" ? "Starting…" : "Get share link"}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-primary">{error}</p>}
      <p className="mt-3 text-xs text-muted">
        Links are unlisted — only people you share them with can watch.
      </p>
    </div>
  );
}
