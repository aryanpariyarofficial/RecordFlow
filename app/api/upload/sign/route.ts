import { createHash } from "node:crypto";

/**
 * Signs Cloudinary upload parameters server-side so the API secret never
 * ships to the browser. Only allows uploads into the recordflow/ folder
 * with a slug-shaped public_id and a title-only context string.
 */
export async function POST(request: Request) {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return Response.json(
      { error: "Cloudinary is not configured on the server." },
      { status: 503 }
    );
  }

  let body: { publicId?: unknown; timestamp?: unknown; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { publicId, timestamp, context } = body;

  if (
    typeof publicId !== "string" ||
    !/^recordflow\/[a-z0-9]{8,24}$/.test(publicId)
  ) {
    return Response.json({ error: "Invalid public_id." }, { status: 400 });
  }
  if (
    typeof timestamp !== "number" ||
    Math.abs(Date.now() / 1000 - timestamp) > 600
  ) {
    return Response.json({ error: "Invalid timestamp." }, { status: 400 });
  }
  if (
    typeof context !== "string" ||
    !/^title=[^|=\r\n]{1,160}$/.test(context)
  ) {
    return Response.json({ error: "Invalid context." }, { status: 400 });
  }

  // Cloudinary signature: sha1 over the alphabetically sorted params + secret.
  const toSign = `context=${context}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = createHash("sha1").update(toSign).digest("hex");

  return Response.json({ signature, apiKey, cloudName });
}
