/**
 * Canvas compositor: draws the screen capture full-frame and the webcam as a
 * circular bubble on top, then exposes the result as a MediaStream via
 * canvas.captureStream().
 *
 * The draw loop is driven by a Web Worker timer instead of
 * requestAnimationFrame/setInterval, because both are throttled hard when the
 * tab is backgrounded — and while recording, the user is usually looking at a
 * different window.
 */

export type BubbleSize = "sm" | "md" | "lg";

export interface BubblePosition {
  /** Bubble center, normalized 0..1 across the canvas. */
  cx: number;
  cy: number;
}

const SIZE_FRACTION: Record<BubbleSize, number> = {
  sm: 0.2,
  md: 0.28,
  lg: 0.38,
};

const FPS = 30;

const WORKER_SOURCE = `
  let id = null;
  onmessage = (e) => {
    if (e.data === "start" && id === null) {
      id = setInterval(() => postMessage("tick"), ${Math.round(1000 / FPS)});
    } else if (e.data === "stop" && id !== null) {
      clearInterval(id);
      id = null;
    }
  };
`;

async function attachVideo(stream: MediaStream): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  await video.play();
  return video;
}

export class Compositor {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement | null = null;
  private camVideo: HTMLVideoElement | null = null;
  private worker: Worker | null = null;
  private bubble: BubblePosition = { cx: 0.13, cy: 0.82 };
  private bubbleSize: BubbleSize = "md";

  constructor(
    private screenStream: MediaStream,
    private camStream: MediaStream
  ) {
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
  }

  async start(): Promise<MediaStream> {
    [this.screenVideo, this.camVideo] = await Promise.all([
      attachVideo(this.screenStream),
      attachVideo(this.camStream),
    ]);

    const settings = this.screenStream.getVideoTracks()[0]?.getSettings();
    this.canvas.width = settings?.width || 1280;
    this.canvas.height = settings?.height || 720;

    const blob = new Blob([WORKER_SOURCE], { type: "text/javascript" });
    this.worker = new Worker(URL.createObjectURL(blob));
    this.worker.onmessage = () => this.draw();
    this.worker.postMessage("start");

    this.draw();
    return this.canvas.captureStream(FPS);
  }

  setBubblePosition(pos: BubblePosition): void {
    this.bubble = {
      cx: Math.min(1, Math.max(0, pos.cx)),
      cy: Math.min(1, Math.max(0, pos.cy)),
    };
  }

  setBubbleSize(size: BubbleSize): void {
    this.bubbleSize = size;
  }

  getBubbleSize(): BubbleSize {
    return this.bubbleSize;
  }

  private draw(): void {
    const { canvas, ctx, screenVideo, camVideo } = this;
    if (!screenVideo || !camVideo) return;

    // Shared windows can be resized mid-recording; follow the source.
    if (
      screenVideo.videoWidth > 0 &&
      (screenVideo.videoWidth !== canvas.width ||
        screenVideo.videoHeight !== canvas.height)
    ) {
      canvas.width = screenVideo.videoWidth;
      canvas.height = screenVideo.videoHeight;
    }

    ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

    if (camVideo.videoWidth === 0) return;

    const diameter = SIZE_FRACTION[this.bubbleSize] * canvas.height;
    const radius = diameter / 2;
    const pad = 8;
    const cx = Math.min(
      canvas.width - radius - pad,
      Math.max(radius + pad, this.bubble.cx * canvas.width)
    );
    const cy = Math.min(
      canvas.height - radius - pad,
      Math.max(radius + pad, this.bubble.cy * canvas.height)
    );

    // Center-crop the camera frame to a square, then clip to a circle.
    const side = Math.min(camVideo.videoWidth, camVideo.videoHeight);
    const sx = (camVideo.videoWidth - side) / 2;
    const sy = (camVideo.videoHeight - side) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      camVideo,
      sx,
      sy,
      side,
      side,
      cx - radius,
      cy - radius,
      diameter,
      diameter
    );
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, radius - 1.5, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.stroke();
  }

  stop(): void {
    this.worker?.postMessage("stop");
    this.worker?.terminate();
    this.worker = null;
    if (this.screenVideo) this.screenVideo.srcObject = null;
    if (this.camVideo) this.camVideo.srcObject = null;
    this.screenVideo = null;
    this.camVideo = null;
  }
}
