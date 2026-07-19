/**
 * Core recording engine for RecordFlow.
 *
 * Captures the screen via getDisplayMedia and/or the webcam via getUserMedia,
 * optionally mixes microphone + system audio through a WebAudio graph, and
 * encodes with MediaRecorder. In "screen-cam" mode the video track comes from
 * the canvas Compositor (screen + circular webcam bubble). Chunks are
 * collected on a 1s timeslice so long recordings stream into the blob list
 * instead of buffering in the recorder.
 */

import { Compositor } from "./compositor";

export type RecordingQuality = "720p" | "1080p";
export type RecordingMode = "screen" | "screen-cam" | "camera";

export interface RecorderOptions {
  mode: RecordingMode;
  quality: RecordingQuality;
  /** Capture the microphone and mix it into the recording. */
  micEnabled: boolean;
  micDeviceId?: string;
  camDeviceId?: string;
  /** Ask the browser for tab/system audio alongside the screen. */
  systemAudioEnabled: boolean;
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

const QUALITY_PRESETS: Record<RecordingQuality, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
};

/**
 * Hard recording cap: bounds memory for in-RAM chunks and (later) storage
 * costs. When the login feature ships, guests drop to GUEST_MAX_RECORDING_MS
 * and signed-in users keep the full cap.
 */
export const MAX_RECORDING_MS = 30 * 60_000;
export const GUEST_MAX_RECORDING_MS = 5 * 60_000;

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getDisplayMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

function pickMimeType(): string {
  for (const type of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export class MicPermissionError extends Error {}
export class CameraPermissionError extends Error {}

export class ScreenRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private displayStream: MediaStream | null = null;
  private camStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mimeType = "";

  /** Set in "screen-cam" mode; the UI uses its canvas as a live preview. */
  compositor: Compositor | null = null;

  /** Fired when the user ends the share from the browser's own UI. */
  onScreenShareEnded: (() => void) | null = null;

  /** Live camera stream for the UI preview in "camera" mode. */
  get cameraPreviewStream(): MediaStream | null {
    return this.camStream;
  }

  /**
   * Acquire streams and build the (not yet started) MediaRecorder.
   * Kept separate from begin() so the UI can run a countdown after the
   * user has picked what to share.
   */
  async prepare(options: RecorderOptions): Promise<void> {
    const { width, height } = QUALITY_PRESETS[options.quality];
    const needsScreen = options.mode !== "camera";
    const needsCam = options.mode !== "screen";

    if (needsScreen) {
      this.displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          frameRate: { ideal: 30 },
        },
        audio: options.systemAudioEnabled,
      });
    }

    if (needsCam) {
      try {
        this.camStream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...(options.camDeviceId
              ? { deviceId: { ideal: options.camDeviceId } }
              : {}),
            // Full quality when the camera IS the recording; the bubble
            // only ever renders a few hundred pixels wide.
            width: { ideal: options.mode === "camera" ? width : 1280 },
            height: { ideal: options.mode === "camera" ? height : 720 },
            frameRate: { ideal: 30 },
          },
        });
      } catch (err) {
        this.cleanup();
        throw new CameraPermissionError(
          "Camera access was blocked. Allow camera access or switch to screen-only mode.",
          { cause: err }
        );
      }
    }

    if (options.micEnabled) {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(options.micDeviceId
              ? { deviceId: { ideal: options.micDeviceId } }
              : {}),
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (err) {
        this.cleanup();
        throw new MicPermissionError(
          "Microphone access was blocked. Allow mic access or turn the mic toggle off.",
          { cause: err }
        );
      }
    }

    let videoTrack: MediaStreamTrack;
    if (options.mode === "screen-cam") {
      this.compositor = new Compositor(this.displayStream!, this.camStream!);
      const composited = await this.compositor.start();
      videoTrack = composited.getVideoTracks()[0];
    } else if (options.mode === "camera") {
      videoTrack = this.camStream!.getVideoTracks()[0];
    } else {
      videoTrack = this.displayStream!.getVideoTracks()[0];
    }

    const tracks: MediaStreamTrack[] = [videoTrack];
    const audioTrack = this.mixAudio();
    if (audioTrack) tracks.push(audioTrack);

    const combined = new MediaStream(tracks);

    this.mimeType = pickMimeType();
    this.recorder = new MediaRecorder(combined, {
      ...(this.mimeType ? { mimeType: this.mimeType } : {}),
      videoBitsPerSecond: options.quality === "1080p" ? 5_000_000 : 3_000_000,
    });

    this.chunks = [];
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };

    // The user can stop sharing from the browser chrome at any time.
    this.displayStream?.getVideoTracks()[0]?.addEventListener("ended", () => {
      this.onScreenShareEnded?.();
    });
  }

  /**
   * Mix system audio and mic audio into a single track. Returns null when
   * no audio source is available.
   */
  private mixAudio(): MediaStreamTrack | null {
    const sources: MediaStream[] = [];
    if (this.displayStream && this.displayStream.getAudioTracks().length > 0) {
      sources.push(this.displayStream);
    }
    if (this.micStream && this.micStream.getAudioTracks().length > 0) {
      sources.push(this.micStream);
    }
    if (sources.length === 0) return null;
    if (sources.length === 1) return sources[0].getAudioTracks()[0];

    this.audioContext = new AudioContext();
    const destination = this.audioContext.createMediaStreamDestination();
    for (const stream of sources) {
      this.audioContext.createMediaStreamSource(stream).connect(destination);
    }
    return destination.stream.getAudioTracks()[0];
  }

  begin(): void {
    if (!this.recorder) throw new Error("Recorder not prepared");
    this.recorder.start(1000);
  }

  pause(): void {
    if (this.recorder?.state === "recording") this.recorder.pause();
  }

  resume(): void {
    if (this.recorder?.state === "paused") this.recorder.resume();
  }

  setMicMuted(muted: boolean): void {
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === "inactive") {
        this.cleanup();
        reject(new Error("Recorder is not active"));
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(this.chunks, {
          type: this.mimeType || "video/webm",
        });
        this.cleanup();
        resolve({
          blob,
          url: URL.createObjectURL(blob),
          mimeType: blob.type,
          sizeBytes: blob.size,
        });
      };
      recorder.stop();
    });
  }

  /** Abort without producing a result (e.g. cancelled during countdown). */
  cancel(): void {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.ondataavailable = null;
      this.recorder.stop();
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.compositor?.stop();
    this.compositor = null;
    this.displayStream?.getTracks().forEach((track) => track.stop());
    this.camStream?.getTracks().forEach((track) => track.stop());
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.audioContext?.close().catch(() => {});
    this.displayStream = null;
    this.camStream = null;
    this.micStream = null;
    this.audioContext = null;
    this.recorder = null;
  }
}
