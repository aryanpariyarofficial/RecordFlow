"use client";

import { useEffect, useRef, useState } from "react";
import { BubbleSize, Compositor } from "@/lib/compositor";
import {
  GUEST_MAX_RECORDING_MS,
  isRecordingSupported,
  MAX_RECORDING_MS,
  RecordingMode,
  RecordingQuality,
} from "@/lib/recorder";
import { formatSize, formatTime } from "@/lib/format";
import { saveLocalRecording } from "@/lib/local-history";
import { deviceLabel, useMediaDevices } from "./use-devices";
import { useRecorder } from "./use-recorder";
import { useUser } from "./use-user";
import { UploadPanel } from "./upload-panel";
import { LocalHistory } from "./local-history";
import { FloatingTools } from "./floating-tools";

const MODES: { id: RecordingMode; label: string; hint: string }[] = [
  { id: "screen", label: "Screen", hint: "Just your screen" },
  { id: "screen-cam", label: "Screen + Cam", hint: "Webcam bubble overlay" },
  { id: "camera", label: "Camera", hint: "Face-to-camera video" },
];

function downloadFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `recordflow-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}.webm`;
}

export function Recorder() {
  const {
    status,
    countdown,
    elapsedMs,
    result,
    error,
    engine,
    micMuted,
    start,
    cancelCountdown,
    pause,
    resume,
    stop,
    toggleMicMuted,
    reset,
  } = useRecorder();

  const { mics, cams } = useMediaDevices();
  const [mode, setMode] = useState<RecordingMode>("screen-cam");
  const [quality, setQuality] = useState<RecordingQuality>("720p");
  const [micEnabled, setMicEnabled] = useState(true);
  const [micDeviceId, setMicDeviceId] = useState<string>("");
  const [camDeviceId, setCamDeviceId] = useState<string>("");
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(true);
  const [supported, setSupported] = useState(true);
  const [historyToken, setHistoryToken] = useState(0);
  const savedUrlRef = useRef<string | null>(null);
  const { user } = useUser();
  // Guests get the short tier; logging in lifts the cap.
  const maxRecordingMs = user ? MAX_RECORDING_MS : GUEST_MAX_RECORDING_MS;

  useEffect(() => {
    setSupported(isRecordingSupported());
  }, []);

  // Hard cap: auto-stop (also bounds memory on long sessions).
  useEffect(() => {
    if (status === "recording" && elapsedMs >= maxRecordingMs) {
      void stop();
    }
  }, [status, elapsedMs, maxRecordingMs, stop]);

  // "Never lose a recording": auto-save every finished recording to
  // IndexedDB so closing the tab doesn't destroy it.
  useEffect(() => {
    if (status !== "finished" || !result || savedUrlRef.current === result.url) {
      return;
    }
    savedUrlRef.current = result.url;
    saveLocalRecording({
      id: crypto.randomUUID(),
      title: `Recording — ${new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`,
      createdAt: Date.now(),
      durationMs: elapsedMs,
      sizeBytes: result.sizeBytes,
      mimeType: result.mimeType,
      blob: result.blob,
    })
      .then(() => setHistoryToken((t) => t + 1))
      .catch(() => {});
  }, [status, result, elapsedMs]);

  if (!supported) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold">Browser not supported</h2>
        <p className="mt-3 text-muted">
          This browser doesn&apos;t support screen recording. Please use Chrome,
          Edge, or Brave for the full experience.
        </p>
      </div>
    );
  }

  const usesScreen = mode !== "camera";
  const usesCam = mode !== "screen";
  const isActive = status === "recording" || status === "paused";

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Countdown overlay */}
      {status === "countdown" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/90 backdrop-blur-sm">
          <span
            key={countdown}
            className="font-heading text-[10rem] font-extrabold leading-none text-white"
          >
            {countdown}
          </span>
          <p className="mt-2 text-lg text-white/70">Recording starts soon…</p>
          <button
            onClick={cancelCountdown}
            className="mt-8 rounded-full border border-white/30 px-6 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Cancel
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 text-sm text-ink">
          {error}
        </div>
      )}

      {(status === "idle" || status === "countdown") && (
        <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex flex-col gap-6">
            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setMode(option.id)}
                  className={`rounded-2xl border px-3 py-4 text-center transition ${
                    mode === option.id
                      ? "border-secondary bg-secondary/5"
                      : "border-black/10 hover:border-black/25"
                  }`}
                >
                  <span className="block font-semibold">{option.label}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>

            {/* Quality toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Resolution</p>
                <p className="text-sm text-muted">
                  720p keeps files small; 1080p for crisp detail.
                </p>
              </div>
              <div className="flex rounded-full border border-black/10 p-1">
                {(["720p", "1080p"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setQuality(option)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      quality === option
                        ? "bg-ink text-white"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Mic toggle + picker */}
            <div className="flex flex-col gap-2">
              <ToggleRow
                label="Microphone"
                description="Narrate over your recording."
                checked={micEnabled}
                onChange={setMicEnabled}
              />
              {micEnabled && mics.length > 1 && (
                <DeviceSelect
                  value={micDeviceId}
                  onChange={setMicDeviceId}
                  options={mics.map((d, i) => ({
                    id: d.deviceId,
                    label: deviceLabel(d, i, "Microphone"),
                  }))}
                  defaultLabel="Default microphone"
                />
              )}
            </div>

            {/* Camera picker */}
            {usesCam && cams.length > 1 && (
              <div className="flex flex-col gap-2">
                <p className="font-semibold">Camera</p>
                <DeviceSelect
                  value={camDeviceId}
                  onChange={setCamDeviceId}
                  options={cams.map((d, i) => ({
                    id: d.deviceId,
                    label: deviceLabel(d, i, "Camera"),
                  }))}
                  defaultLabel="Default camera"
                />
              </div>
            )}

            {/* System audio toggle */}
            {usesScreen && (
              <ToggleRow
                label="Tab / system audio"
                description="Capture sound playing on your screen (tab shares work best)."
                checked={systemAudioEnabled}
                onChange={setSystemAudioEnabled}
              />
            )}

            <button
              onClick={() =>
                start({
                  mode,
                  quality,
                  micEnabled,
                  micDeviceId: micDeviceId || undefined,
                  camDeviceId: camDeviceId || undefined,
                  systemAudioEnabled: usesScreen && systemAudioEnabled,
                })
              }
              className="group mt-2 flex items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/25 transition hover:brightness-110 active:scale-[0.99]"
            >
              <span className="relative flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60 group-hover:opacity-90" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-white" />
              </span>
              Start recording
            </button>
            <p className="text-center text-xs text-muted">
              {usesScreen
                ? "You'll pick a tab, window, or screen — then a 3-second countdown begins."
                : "Camera starts after a 3-second countdown."}
              {!user && " Guest recordings cap at 5:00 — log in for 30 minutes."}
            </p>
          </div>
        </div>
      )}

      {isActive && (
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6">
            {/* Live preview: composited canvas or camera feed */}
            {engine?.compositor && (
              <>
                <CompositePreview compositor={engine.compositor} />
                <FloatingTools
                  compositor={engine.compositor}
                  camStream={engine.cameraPreviewStream}
                  status={status}
                  elapsedMs={elapsedMs}
                  micEnabled={micEnabled}
                  micMuted={micMuted}
                  onPause={pause}
                  onResume={resume}
                  onStop={() => void stop()}
                  onToggleMic={toggleMicMuted}
                />
              </>
            )}
            {!engine?.compositor && engine?.cameraPreviewStream && (
              <CameraPreview stream={engine.cameraPreviewStream} />
            )}

            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    status === "recording"
                      ? "animate-pulse bg-primary"
                      : "bg-muted"
                  }`}
                />
                <span className="font-heading text-5xl font-bold tabular-nums tracking-tight">
                  {formatTime(elapsedMs)}
                </span>
              </div>
              <p className="text-sm text-muted">
                {status === "recording" ? "Recording in progress" : "Paused"}
              </p>
              {maxRecordingMs - elapsedMs < 60_000 && (
                <p className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  Auto-stopping in{" "}
                  {Math.max(
                    0,
                    Math.ceil((maxRecordingMs - elapsedMs) / 1000)
                  )}
                  s — {user ? "recording limit reached" : "guest limit (log in for 30 min)"}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={toggleMicMuted}
                  className={`rounded-full border px-6 py-3 font-medium transition ${
                    micMuted
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-black/15 hover:bg-black/5"
                  }`}
                >
                  {micMuted ? "Unmute mic" : "Mute mic"}
                </button>
                {status === "recording" ? (
                  <button
                    onClick={pause}
                    className="rounded-full border border-black/15 px-6 py-3 font-medium transition hover:bg-black/5"
                  >
                    Pause
                  </button>
                ) : (
                  <button
                    onClick={resume}
                    className="rounded-full border border-black/15 px-6 py-3 font-medium transition hover:bg-black/5"
                  >
                    Resume
                  </button>
                )}
                <button
                  onClick={() => void stop()}
                  className="rounded-full bg-ink px-6 py-3 font-semibold text-white transition hover:bg-ink/85"
                >
                  Stop &amp; preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === "finished" && result && (
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold">Your recording</h2>
          <p className="mt-1 text-sm text-muted">
            {formatTime(elapsedMs)} · {formatSize(result.sizeBytes)} · WebM
          </p>
          <video
            src={result.url}
            controls
            playsInline
            className="mt-5 w-full rounded-xl border border-black/10 bg-ink"
          />

          <UploadPanel blob={result.blob} />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <a
              href={result.url}
              download={downloadFileName()}
              className="flex-1 rounded-full border border-black/15 px-6 py-3.5 text-center font-medium transition hover:bg-black/5"
            >
              Download .webm
            </a>
            <button
              onClick={reset}
              className="flex-1 rounded-full border border-black/15 px-6 py-3.5 font-medium transition hover:bg-black/5"
            >
              New recording
            </button>
          </div>
        </div>
      )}

      <LocalHistory refreshToken={historyToken} />
    </div>
  );
}

const PEN_COLORS = ["#FF009D", "#5501FE", "#FFFFFF", "#0f0f0f"];

/**
 * Live composited canvas. Two pointer tools: move the webcam bubble
 * (when there is one) or draw annotations straight into the recording.
 */
function CompositePreview({ compositor }: { compositor: Compositor }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDownRef = useRef(false);
  const [tool, setTool] = useState<"move" | "draw">(
    compositor.hasCamera ? "move" : "draw"
  );
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = compositor.canvas;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";
    canvas.style.borderRadius = "0.75rem";
    container.appendChild(canvas);
    return () => {
      canvas.remove();
    };
  }, [compositor]);

  const normalized = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  return (
    <div>
      <div
        ref={containerRef}
        className={`touch-none overflow-hidden rounded-xl border border-black/10 bg-ink ${
          tool === "draw" ? "cursor-crosshair" : "cursor-move"
        }`}
        onPointerDown={(e) => {
          pointerDownRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const { x, y } = normalized(e);
          if (tool === "draw") compositor.startStroke(penColor, x, y);
          else compositor.setBubblePosition({ cx: x, cy: y });
        }}
        onPointerMove={(e) => {
          if (!pointerDownRef.current) return;
          const { x, y } = normalized(e);
          if (tool === "draw") compositor.addStrokePoint(x, y);
          else compositor.setBubblePosition({ cx: x, cy: y });
        }}
        onPointerUp={() => {
          pointerDownRef.current = false;
          compositor.endStroke();
        }}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {compositor.hasCamera && (
            <div className="flex rounded-full border border-black/10 p-0.5">
              {(["move", "draw"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setTool(option)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                    tool === option
                      ? "bg-ink text-white"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {option === "move" ? "Move bubble" : "Draw"}
                </button>
              ))}
            </div>
          )}
          {tool === "draw" && (
            <>
              <div className="flex items-center gap-1.5">
                {PEN_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setPenColor(color)}
                    aria-label={`Pen color ${color}`}
                    className={`h-6 w-6 rounded-full border transition ${
                      penColor === color
                        ? "scale-110 border-ink"
                        : "border-black/15"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                onClick={() => compositor.clearAnnotations()}
                className="text-xs font-medium text-muted transition hover:text-primary"
              >
                Clear drawing
              </button>
            </>
          )}
        </div>
        {compositor.hasCamera && <BubbleSizePicker compositor={compositor} />}
      </div>
      <p className="mt-2 text-xs text-muted">
        {tool === "draw"
          ? "Draw on the preview — strokes are recorded into the video. Clear when done."
          : "Drag inside the preview to move your bubble."}
      </p>
    </div>
  );
}

function BubbleSizePicker({ compositor }: { compositor: Compositor }) {
  const [size, setSize] = useState<BubbleSize>(compositor.getBubbleSize());
  return (
    <div className="flex rounded-full border border-black/10 p-0.5">
      {(["sm", "md", "lg"] as const).map((option) => (
        <button
          key={option}
          onClick={() => {
            compositor.setBubbleSize(option);
            setSize(option);
          }}
          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase transition ${
            size === option ? "bg-ink text-white" : "text-muted hover:text-ink"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function CameraPreview({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [stream]);
  return (
    <video
      ref={videoRef}
      muted
      playsInline
      className="w-full rounded-xl border border-black/10 bg-ink"
    />
  );
}

function DeviceSelect({
  value,
  onChange,
  options,
  defaultLabel,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
  defaultLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-secondary"
    >
      <option value="">{defaultLabel}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full border transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
          checked
            ? "border-transparent bg-gradient-to-r from-primary to-secondary shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
            : "border-black/10 bg-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] hover:bg-black/15"
        }`}
      >
        <span
          className={`pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-300 ease-out ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
