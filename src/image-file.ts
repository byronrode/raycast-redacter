import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
};

export function imageMimeType(path: string): string | undefined {
  return MIME_TYPES[extname(path).toLowerCase()];
}

export function clipboardFilePath(value: string): string {
  return value.startsWith("file://") ? fileURLToPath(value) : value;
}

export async function validateImage(path: string): Promise<string> {
  if (!path) throw new Error("Choose an image first.");

  const mimeType = imageMimeType(path);
  if (!mimeType) {
    throw new Error(
      "Choose a PNG, JPEG, WebP, GIF, TIFF, BMP, AVIF, HEIC, or HEIF image.",
    );
  }

  let details;
  try {
    details = await stat(path);
  } catch {
    throw new Error("The selected image no longer exists.");
  }

  if (!details.isFile()) throw new Error("Choose an image file, not a folder.");
  return mimeType;
}
