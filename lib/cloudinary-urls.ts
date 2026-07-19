/**
 * Cloudinary delivery URL builders. Client-safe: only uses the public
 * cloud name.
 */

function base(): string {
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`;
}

export function videoUrl(slug: string): string {
  return `${base()}/recordflow/${slug}.webm`;
}

export function thumbnailUrl(slug: string): string {
  // Frame at 1s, cropped to 16:9 JPEG.
  return `${base()}/so_1,w_640,h_360,c_fill/recordflow/${slug}.jpg`;
}

/**
 * MP4 download (H.264 via format conversion, forced attachment).
 * Optional trim: start/end offsets in seconds.
 */
export function mp4DownloadUrl(
  slug: string,
  trim?: { startSec?: number; endSec?: number }
): string {
  const parts = ["fl_attachment"];
  if (typeof trim?.startSec === "number" && trim.startSec > 0) {
    parts.push(`so_${trim.startSec}`);
  }
  if (typeof trim?.endSec === "number" && trim.endSec > 0) {
    parts.push(`eo_${trim.endSec}`);
  }
  return `${base()}/${parts.join(",")}/recordflow/${slug}.mp4`;
}
