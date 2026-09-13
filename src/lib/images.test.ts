import { describe, it, expect } from 'vitest';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { processUpload, variantPath, IMAGE_WIDTHS } from './images';

async function jpeg(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 170, b: 90 } },
  }).jpeg().toBuffer();
}

describe('variantPath', () => {
  it('builds a predictable variant name', () => {
    expect(variantPath('a1b2c3', 800, 'avif')).toBe('a1b2c3-800.avif');
    expect(variantPath('a1b2c3', 1600, 'webp')).toBe('a1b2c3-1600.webp');
  });
});

describe('processUpload', () => {
  it('writes an avif and a webp at every width', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pj-img-'));
    const result = await processUpload(await jpeg(2400, 2400), dir);

    const files = await readdir(dir);
    for (const width of IMAGE_WIDTHS) {
      expect(files).toContain(variantPath(result.basePath, width, 'avif'));
      expect(files).toContain(variantPath(result.basePath, width, 'webp'));
    }
  }, 60000);

  it('reports the source dimensions', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pj-img-'));
    const result = await processUpload(await jpeg(1800, 1200), dir);
    expect(result.width).toBe(1800);
    expect(result.height).toBe(1200);
  }, 60000);

  it('never upscales beyond the source width', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pj-img-'));
    const result = await processUpload(await jpeg(600, 600), dir);
    const meta = await sharp(path.join(dir, variantPath(result.basePath, 1600, 'webp'))).metadata();
    expect(meta.width).toBe(600);
  }, 60000);

  it('gives identical bytes the same content-hashed base name', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pj-img-'));
    const buffer = await jpeg(900, 900);
    const a = await processUpload(buffer, dir);
    const b = await processUpload(buffer, dir);
    expect(a.basePath).toBe(b.basePath);
  }, 60000);

  it('rejects a file that is not an image', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'pj-img-'));
    await expect(processUpload(Buffer.from('not an image'), dir)).rejects.toThrow();
  });
});
