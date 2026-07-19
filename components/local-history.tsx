"use client";

import { useEffect, useState } from "react";
import {
  deleteLocalRecording,
  listLocalRecordings,
  LocalRecording,
} from "@/lib/local-history";
import { formatSize, formatTime } from "@/lib/format";

/**
 * "On this device" — recordings auto-saved to the browser so nothing is
 * lost when a tab closes. refreshToken bumps when a new recording lands.
 */
export function LocalHistory({ refreshToken }: { refreshToken: number }) {
  const [items, setItems] = useState<LocalRecording[]>([]);

  useEffect(() => {
    let cancelled = false;
    listLocalRecordings().then((list) => {
      if (!cancelled) setItems(list);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  if (items.length === 0) return null;

  const download = (item: LocalRecording) => {
    const url = URL.createObjectURL(item.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${item.title.replace(/[^\w-]+/g, "-")}.webm`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const remove = async (item: LocalRecording) => {
    if (!window.confirm(`Remove "${item.title}" from this device?`)) return;
    await deleteLocalRecording(item.id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">On this device</h2>
        <p className="text-xs text-muted">
          Saved in this browser only — kept even if you close the tab.
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-black/10 bg-white px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" title={item.title}>
                {item.title}
              </p>
              <p className="text-xs text-muted">
                {new Date(item.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {` · ${formatTime(item.durationMs)} · ${formatSize(item.sizeBytes)}`}
              </p>
            </div>
            <button
              onClick={() => download(item)}
              className="text-sm font-medium text-secondary transition hover:brightness-75"
            >
              Download
            </button>
            <button
              onClick={() => void remove(item)}
              className="text-sm font-medium text-muted transition hover:text-primary"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
