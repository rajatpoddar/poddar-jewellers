import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * The design system, enforced rather than remembered.
 *
 * `docs/DESIGN-SYSTEM.md` says every colour in the interface is a semantic
 * token derived from the three brand values on the `Shop` row. That claim is
 * only true while it is checked: one `bg-stone-100` merged in a hurry is a
 * pixel that ignores the shop's branding, and it will not look wrong on the
 * shop that happens to be beige.
 *
 * This is the same mechanism as no-hardcoded-shop.test.ts, and for the same
 * reason — a rule a future session cannot silently break is worth more than a
 * rule written down.
 */

/** Tailwind's stock palette. Semantic tokens exist so that none of it is used. */
const PALETTE =
  '(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|' +
  'cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const UTILITY = '(?:bg|text|border|divide|ring|outline|fill|stroke|accent|caret|shadow|from|via|to|decoration|placeholder)';

const RULES: Array<{ pattern: RegExp; why: string }> = [
  {
    pattern: new RegExp(`\\b${UTILITY}-${PALETTE}-\\d{2,3}\\b`),
    why: "Tailwind's stock palette ignores the shop's branding. Use a semantic token — bg-surface, text-ink-muted, border-line, text-danger. See docs/DESIGN-SYSTEM.md.",
  },
  {
    pattern: /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/,
    why: 'A literal colour cannot follow a shop. Add a token to globals.css and use it. Brand defaults belong in globals.css alone.',
  },
  {
    pattern: /\brounded-(?:sm|md|lg|xl|2xl|3xl)\b/,
    why: 'Radius is a token: rounded-field, rounded-card, rounded-pill.',
  },
  {
    pattern: /<img\s/,
    why: 'Use next/image. A raw <img> ships an unoptimised file and shifts the layout as it loads.',
  },
  {
    // U+1F300–U+1FAFF. Emoji render differently on every device and are read
    // aloud by screen readers as their unicode name.
    pattern: /[\u{1F300}-\u{1FAFF}]/u,
    why: 'No emoji in the interface. Add a stroke path to components/ui/icons.tsx.',
  },
];

/**
 * Only `.ts` / `.tsx` are walked, so `globals.css` — where the token layer is
 * defined and the one place a hex belongs — is never reached. This file has to
 * exempt itself: it necessarily contains the patterns it forbids.
 */
const EXEMPT = new Set(['design-system.test.ts']);

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      if (EXEMPT.has(entry.name)) return [];
      return /\.tsx?$/.test(entry.name) ? [full] : [];
    }),
  );
  return files.flat();
}

describe('the interface is built from design tokens', () => {
  it('finds no stock palette class, literal colour or raw image under src/', async () => {
    const files = await sourceFiles(path.join(process.cwd(), 'src'));
    expect(files.length).toBeGreaterThan(10);

    const offences: string[] = [];
    for (const file of files) {
      const text = await readFile(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        for (const rule of RULES) {
          if (rule.pattern.test(line)) {
            offences.push(
              `${path.relative(process.cwd(), file)}:${i + 1}\n    ${line.trim()}\n    → ${rule.why}`,
            );
          }
        }
      });
    }

    expect(offences).toEqual([]);
  });
});
