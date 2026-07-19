"use client";

import { useEffect, useState } from "react";

export interface MediaDevices {
  mics: MediaDeviceInfo[];
  cams: MediaDeviceInfo[];
}

/**
 * Enumerates mics and cameras, refreshing when devices are plugged in or
 * removed. Labels are only populated after the user has granted mic/camera
 * permission at least once — callers should show a generic fallback label.
 */
export function useMediaDevices(): MediaDevices {
  const [devices, setDevices] = useState<MediaDevices>({ mics: [], cams: [] });

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setDevices({
          mics: list.filter((d) => d.kind === "audioinput" && d.deviceId),
          cams: list.filter((d) => d.kind === "videoinput" && d.deviceId),
        });
      } catch {
        // Enumeration can fail in locked-down contexts; keep empty lists.
      }
    };

    refresh();
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener("devicechange", refresh);
    };
  }, []);

  return devices;
}

export function deviceLabel(
  device: MediaDeviceInfo,
  index: number,
  kind: "Microphone" | "Camera"
): string {
  return device.label || `${kind} ${index + 1}`;
}
