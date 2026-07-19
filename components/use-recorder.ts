"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MicPermissionError,
  RecorderOptions,
  RecordingResult,
  ScreenRecorder,
} from "@/lib/recorder";

export type RecorderStatus =
  | "idle"
  | "countdown"
  | "recording"
  | "paused"
  | "finished";

const COUNTDOWN_SECONDS = 3;

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<ScreenRecorder | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Elapsed time accumulated across pauses.
  const accumulatedRef = useRef(0);
  const resumedAtRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (tickerRef.current) clearInterval(tickerRef.current);
    countdownTimerRef.current = null;
    tickerRef.current = null;
  }, []);

  const startTicker = useCallback(() => {
    resumedAtRef.current = performance.now();
    tickerRef.current = setInterval(() => {
      setElapsedMs(
        accumulatedRef.current + (performance.now() - resumedAtRef.current)
      );
    }, 250);
  }, []);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    clearTimers();
    if (resumedAtRef.current > 0) {
      accumulatedRef.current += performance.now() - resumedAtRef.current;
      resumedAtRef.current = 0;
    }
    setElapsedMs(accumulatedRef.current);
    try {
      const recording = await recorder.stop();
      setResult(recording);
      setStatus("finished");
    } catch {
      setError("Recording could not be finalized.");
      setStatus("idle");
    } finally {
      recorderRef.current = null;
    }
  }, [clearTimers]);

  const start = useCallback(
    async (options: RecorderOptions) => {
      setError(null);
      const recorder = new ScreenRecorder();
      try {
        await recorder.prepare(options);
      } catch (err) {
        if (err instanceof MicPermissionError) {
          setError(err.message);
        } else if (err instanceof DOMException && err.name === "NotAllowedError") {
          // User dismissed the share picker — not an error worth showing.
        } else {
          setError("Could not start screen capture. Check browser permissions.");
        }
        return;
      }

      recorderRef.current = recorder;
      recorder.onScreenShareEnded = () => {
        // "Stop sharing" from the browser UI ends the recording gracefully.
        void stop();
      };

      accumulatedRef.current = 0;
      resumedAtRef.current = 0;
      setElapsedMs(0);
      setCountdown(COUNTDOWN_SECONDS);
      setStatus("countdown");

      let remaining = COUNTDOWN_SECONDS;
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          setCountdown(remaining);
          return;
        }
        clearTimers();
        try {
          recorder.begin();
          setStatus("recording");
          startTicker();
        } catch {
          recorder.cancel();
          recorderRef.current = null;
          setError("Recording failed to start.");
          setStatus("idle");
        }
      }, 1000);
    },
    [clearTimers, startTicker, stop]
  );

  const cancelCountdown = useCallback(() => {
    clearTimers();
    recorderRef.current?.cancel();
    recorderRef.current = null;
    setStatus("idle");
  }, [clearTimers]);

  const pause = useCallback(() => {
    recorderRef.current?.pause();
    clearTimers();
    accumulatedRef.current += performance.now() - resumedAtRef.current;
    resumedAtRef.current = 0;
    setElapsedMs(accumulatedRef.current);
    setStatus("paused");
  }, [clearTimers]);

  const resume = useCallback(() => {
    recorderRef.current?.resume();
    startTicker();
    setStatus("recording");
  }, [startTicker]);

  const reset = useCallback(() => {
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setElapsedMs(0);
    setStatus("idle");
  }, [result]);

  // Safety net on unmount: stop tracks and timers.
  useEffect(() => {
    return () => {
      clearTimers();
      recorderRef.current?.cancel();
    };
  }, [clearTimers]);

  return {
    status,
    countdown,
    elapsedMs,
    result,
    error,
    start,
    cancelCountdown,
    pause,
    resume,
    stop,
    reset,
  };
}
