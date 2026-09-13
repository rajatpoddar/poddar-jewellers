import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Hard Rule 7, enforced rather than remembered.
 *
 * This software is sold one deployment per jewellery shop. Anything describing
 * a shop belongs on the `Shop` row or in `MetalType`, and `prisma/seed.ts` is
 * the only file allowed to name one. A literal that slips into `src/` would ship
 * the first customer's name, number or town to every later customer.
 */
const FORBIDDEN = [
  /poddar/i,
  /palojori/i,
  /7250580175/,
  /rajatpoddar/i,
  /\b814146\b/,
  /deoghar/i,
];

// This file necessarily contains the very literals it forbids.
const SELF = 'no-hardcoded-shop.test.ts';

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      if (entry.name === SELF) return [];
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    }),
  );
  return files.flat();
}

describe('no shop fact is hardcoded', () => {
  it('finds no shop-specific literal anywhere under src/', async () => {
    const files = await sourceFiles(path.join(process.cwd(), 'src'));
    expect(files.length).toBeGreaterThan(10);

    const offences: string[] = [];
    for (const file of files) {
      const text = await readFile(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        for (const pattern of FORBIDDEN) {
          if (pattern.test(line)) {
            offences.push(`${path.relative(process.cwd(), file)}:${i + 1}  ${line.trim()}`);
          }
        }
      });
    }

    expect(offences).toEqual([]);
  });
});
