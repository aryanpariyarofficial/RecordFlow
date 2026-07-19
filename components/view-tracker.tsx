"use client";

import { useEffect } from "react";

/** Counts a view once per page load, after a short dwell delay. */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`/api/recordings/${slug}/view`, { method: "POST" }).catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [slug]);
  return null;
}
