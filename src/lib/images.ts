import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const IMAGE_WIDTHS = [400, 800, 1600] as const;
export type ImageFormat = 'avif' | 'webp';

/**
 * Variant filenames are derived from a content hash, so they can be cached
 * forever at the edge — which is what keeps the NAS out of the request path.
 * Re-uploading the same bytes produces the same name.
 */
export function variantPath(basePath: string, width: number, format: ImageFormat): string {
  return `${basePath}-${width}.${format}`;
}

export async function processUpload(
  buffer: Buffer,
  uploadDir: string,
): Promise<{ basePath: string; width: number; height: number }> {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Ye file image nahi hai, ya kharab hai.');
  }

  const basePath = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  await mkdir(uploadDir, { recursive: true });

  for (const width of IMAGE_WIDTHS) {
    // `withoutEnlargement` keeps a small source from being blown up into a soft,
    // larger file that looks worse than the original.
    const resized = sharp(buffer).resize({ width, withoutEnlargement: true });

    await writeFile(
      path.join(uploadDir, variantPath(basePath, width, 'avif')),
      await resized.clone().avif({ quality: 62 }).toBuffer(),
    );
    await writeFile(
      path.join(uploadDir, variantPath(basePath, width, 'webp')),
      await resized.clone().webp({ quality: 78 }).toBuffer(),
    );
  }

  return { basePath, width: metadata.width, height: metadata.height };
}
