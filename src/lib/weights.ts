/**
 * "20, 23, 25" and "20g 23g 25g" both parse to [20000, 23000, 25000].
 *
 * Kept out of the server-action file deliberately: a `'use server'` module may
 * only export async functions, and this parser is worth testing on its own.
 */
export function parseWeights(raw: string): number[] {
  const grams = raw
    .split(/[,\s]+/)
    .map((piece) => piece.replace(/g$/i, '').trim())
    .filter(Boolean)
    .map(Number);

  if (grams.length === 0 || grams.some((g) => !Number.isFinite(g) || g <= 0)) {
    throw new Error('Weight sahi number me likhiye, jaise: 20, 23, 25');
  }

  const mg = grams.map((g) => Math.round(g * 1000));
  return [...new Set(mg)].sort((a, b) => a - b);
}
