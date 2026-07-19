/**
 * Swappable storage layer — Cloudinary implementation.
 *
 * Uploads go directly from the browser to Cloudinary using a signature
 * generated server-side (/api/upload/sign), so the API secret never reaches
 * the client. Files larger than one chunk use Cloudinary's chunked upload
 * protocol (X-Unique-Upload-Id + Content-Range) so 30+ minute recordings
 * upload reliably.
 */

const CHUNK_BYTES = 20_000_000; // 20 MB — Cloudinary requires chunks >= 5 MB

export interface UploadedRecording {
  slug: string;
  viewerPath: string;
}

export function isUploadConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
}

export function randomSlug(length = 12): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

interface SignedParams {
  signature: string;
  apiKey: string;
  cloudName: string;
}

async function getSignature(
  publicId: string,
  timestamp: number,
  context: string
): Promise<SignedParams> {
  const res = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, timestamp, context }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "Could not authorize the upload.");
  }
  return res.json();
}

function postChunk(
  url: string,
  form: FormData,
  headers: Record<string, string>,
  onBytes: (loaded: number) => void
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => onBytes(event.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          resolve({});
        }
      } else {
        let message = `Upload failed (HTTP ${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          if (body?.error?.message) message = body.error.message;
        } catch {}
        reject(new Error(message));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });
}

export async function uploadRecording(
  blob: Blob,
  options: {
    title: string;
    onProgress?: (fraction: number) => void;
  }
): Promise<UploadedRecording> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error("Cloudinary is not configured.");

  const slug = randomSlug();
  const publicId = `recordflow/${slug}`;
  const timestamp = Math.floor(Date.now() / 1000);
  // "|" and "=" are Cloudinary's context delimiters.
  const safeTitle =
    options.title.replace(/[|=\r\n]/g, " ").trim().slice(0, 120) ||
    "Untitled recording";
  const context = `title=${safeTitle}`;

  const { signature, apiKey } = await getSignature(publicId, timestamp, context);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
  const baseFields: Record<string, string> = {
    api_key: apiKey,
    timestamp: String(timestamp),
    signature,
    public_id: publicId,
    context,
  };

  const total = blob.size;
  const uploadId = randomSlug(24);
  let response: Record<string, unknown> = {};

  for (let start = 0; start < total; start += CHUNK_BYTES) {
    const end = Math.min(start + CHUNK_BYTES, total);
    const form = new FormData();
    for (const [name, value] of Object.entries(baseFields)) {
      form.append(name, value);
    }
    form.append("file", blob.slice(start, end));

    const headers: Record<string, string> =
      total > CHUNK_BYTES
        ? {
            "X-Unique-Upload-Id": uploadId,
            "Content-Range": `bytes ${start}-${end - 1}/${total}`,
          }
        : {};

    response = await postChunk(endpoint, form, headers, (loaded) => {
      options.onProgress?.(Math.min(1, (start + loaded) / total));
    });
  }

  if (!response.public_id) {
    throw new Error("Upload did not complete. Your local copy is safe.");
  }

  options.onProgress?.(1);
  return { slug, viewerPath: `/v/${slug}` };
}
