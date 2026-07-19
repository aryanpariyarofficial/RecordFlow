"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Compositor } from "@/lib/compositor";
import { formatTime } from "@/lib/format";
import type { RecorderStatus } from "./use-recorder";

const PEN_COLORS = ["#FF009D", "#5501FE", "#FFFFFF", "#0f0f0f"];

interface DocumentPictureInPicture {
  requestWindow(options?: {
    width?: number;
    height?: number;
  }): Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

interface FloatingToolsProps {
  compositor: Compositor;
  camStream: MediaStream | null;
  status: RecorderStatus;
  elapsedMs: number;
  micEnabled: boolean;
  micMuted: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggleMic: () => void;
}

/**
 * Loom-style always-on-top helpers while recording:
 * - "Float tools": a Document Picture-in-Picture window with the live
 *   preview (drawable), timer, and controls — visible over every tab,
 *   window, and app.
 * - "Float self-view": the webcam in a classic PiP bubble that follows
 *   you everywhere.
 * Browsers cannot draw directly onto other apps' windows; drawing happens
 * on the floating live preview and is composited into the recording.
 */
export function FloatingTools(props: FloatingToolsProps) {
  const { compositor, camStream, status } = props;
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const selfViewRef = useRef<HTMLVideoElement>(null);
  const [docPipSupported, setDocPipSupported] = useState(false);

  useEffect(() => {
    setDocPipSupported(Boolean(window.documentPictureInPicture));
  }, []);

  const openControls = useCallback(async () => {
    if (!window.documentPictureInPicture || pipWindow) return;
    try {
      const pip = await window.documentPictureInPicture.requestWindow({
        width: 400,
        height: 420,
      });
      // Copy the app's stylesheets so Tailwind classes work inside PiP.
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const css = Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join("");
          const style = pip.document.createElement("style");
          style.textContent = css;
          pip.document.head.appendChild(style);
        } catch {
          if (sheet.href) {
            const link = pip.document.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href;
            pip.document.head.appendChild(link);
          }
        }
      }
      pip.document.title = "RecordFlow — recording";
      pip.document.body.style.margin = "0";
      pip.document.body.style.backgroundColor = "#0f0f0f";
      pip.addEventListener("pagehide", () => setPipWindow(null));
      setPipWindow(pip);
    } catch {
      // User gesture requirements or platform quirks — silently ignore.
    }
  }, [pipWindow]);

  const popSelfView = useCallback(async () => {
    const video = selfViewRef.current;
    if (!video || !camStream) return;
    try {
      if (video.srcObject !== camStream) video.srcObject = camStream;
      await video.play();
      await video.requestPictureInPicture();
    } catch {
      // PiP refused (no gesture / unsupported) — nothing to clean up.
    }
  }, [camStream]);

  // Close the floating windows when the recording ends.
  useEffect(() => {
    if (status === "recording" || status === "paused") return;
    pipWindow?.close();
    setPipWindow(null);
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
  }, [status, pipWindow]);

  useEffect(() => {
    return () => {
      pipWindow?.close();
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };
  }, [pipWindow]);

  return (
    <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4">
      <p className="text-sm font-semibold">Going to another tab or window?</p>
      <p className="mt-1 text-xs text-muted">
        Pop out floating tools that stay on top of every app — draw, watch
        yourself, and control the recording from anywhere.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {docPipSupported ? (
          <button
            onClick={() => void openControls()}
            disabled={Boolean(pipWindow)}
            className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {pipWindow ? "Tools are floating" : "Float tools + pen"}
          </button>
        ) : (
          <span className="rounded-full border border-black/10 px-4 py-2 text-xs text-muted">
            Floating tools need Chrome or Edge 116+
          </span>
        )}
        {camStream && (
          <button
            onClick={() => void popSelfView()}
            className="rounded-full border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5"
          >
            Float self-view
          </button>
        )}
      </div>
      {/* Hidden host for the self-view PiP video. */}
      <video
        ref={selfViewRef}
        muted
        playsInline
        className="pointer-events-none fixed bottom-0 right-0 h-px w-px opacity-0"
      />
      {pipWindow &&
        createPortal(<PipPanel {...props} />, pipWindow.document.body)}
    </div>
  );
}

/** Content rendered inside the Document PiP window. */
function PipPanel({
  compositor,
  status,
  elapsedMs,
  micEnabled,
  micMuted,
  onPause,
  onResume,
  onStop,
  onToggleMic,
}: FloatingToolsProps) {
  const mirrorRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [color, setColor] = useState(PEN_COLORS[0]);

  // Mirror the compositor canvas using the PiP window's own rAF — the main
  // tab's timers throttle when it's hidden, but the PiP window stays live.
  useEffect(() => {
    const mirror = mirrorRef.current;
    if (!mirror) return;
    const ctx = mirror.getContext("2d");
    const win = mirror.ownerDocument.defaultView ?? window;
    let raf = 0;
    const loop = () => {
      const source = compositor.canvas;
      if (ctx && source.width > 0) {
        const width = 376;
        const height = Math.round((width * source.height) / source.width) || 212;
        if (mirror.width !== width || mirror.height !== height) {
          mirror.width = width;
          mirror.height = height;
        }
        ctx.drawImage(source, 0, 0, width, height);
      }
      raf = win.requestAnimationFrame(loop);
    };
    raf = win.requestAnimationFrame(loop);
    return () => win.cancelAnimationFrame(raf);
  }, [compositor]);

  const normalized = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  return (
    <div className="flex h-full flex-col gap-3 bg-ink p-3 font-body text-white">
      <canvas
        ref={mirrorRef}
        className="w-full cursor-crosshair rounded-lg border border-white/10 touch-none"
        onPointerDown={(e) => {
          drawingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const { x, y } = normalized(e);
          compositor.startStroke(color, x, y);
        }}
        onPointerMove={(e) => {
          if (!drawingRef.current) return;
          const { x, y } = normalized(e);
          compositor.addStrokePoint(x, y);
        }}
        onPointerUp={() => {
          drawingRef.current = false;
          compositor.endStroke();
        }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === "recording" ? "animate-pulse bg-primary" : "bg-white/40"
            }`}
          />
          <span className="font-heading text-xl font-bold tabular-nums">
            {formatTime(elapsedMs)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {PEN_COLORS.map((option) => (
            <button
              key={option}
              onClick={() => setColor(option)}
              aria-label={`Pen color ${option}`}
              className={`h-6 w-6 rounded-full border-2 transition ${
                color === option ? "scale-110 border-white" : "border-white/20"
              }`}
              style={{ backgroundColor: option }}
            />
          ))}
          <button
            onClick={() => compositor.clearAnnotations()}
            className="ml-1 text-xs font-medium text-white/60 transition hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {micEnabled && (
          <button
            onClick={onToggleMic}
            className={`flex-1 rounded-full border px-3 py-2 text-sm font-medium transition ${
              micMuted
                ? "border-primary/60 bg-primary/20 text-primary"
                : "border-white/20 hover:bg-white/10"
            }`}
          >
            {micMuted ? "Unmute" : "Mute"}
          </button>
        )}
        {status === "recording" ? (
          <button
            onClick={onPause}
            className="flex-1 rounded-full border border-white/20 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={onResume}
            className="flex-1 rounded-full border border-white/20 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Resume
          </button>
        )}
        <button
          onClick={onStop}
          className="flex-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Stop
        </button>
      </div>
      <p className="text-center text-[11px] leading-snug text-white/40">
        Draw on the preview above — strokes are recorded live.
      </p>
    </div>
  );
}
