import { describe, it, expect } from 'vitest';
import {
  SHOT_TYPES,
  getShotType,
  buildPrompts,
  ordinal,
  type PromptFill,
  type PromptBrand,
} from './ai-prompts';

// A sentinel, not a colour. What is under test is that whatever the shop has
// on its `brandGround` reaches the prompt untouched — the value is opaque
// here, and writing a real hex would put a literal colour under `src/`, which
// design-system.test.ts rightly forbids.
const BRAND: PromptBrand = { ground: 'SHOP-GROUND' };

function fill(overrides: Partial<PromptFill> = {}): PromptFill {
  return {
    row: 2,
    piece: 3,
    layer: 'outer',
    mark: 'a crescent with a teardrop hanging below',
    purityLabel: 'Gold 22K',
    ...overrides,
  };
}

describe('ordinal', () => {
  it('uses st, nd, rd for 1, 2, 3', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
  });

  it('uses th from 4 to 9', () => {
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(9)).toBe('9th');
  });

  // 11, 12 and 13 are the cases a naive last-digit rule gets wrong, and a
  // wrong ordinal here points the AI at a different piece.
  it('uses th for the teens', () => {
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
  });

  it('resumes st, nd, rd past the teens', () => {
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(22)).toBe('22nd');
    expect(ordinal(23)).toBe('23rd');
    expect(ordinal(111)).toBe('111th');
  });
});

describe('shot types', () => {
  it('offers a stable, non-empty, uniquely keyed list', () => {
    expect(SHOT_TYPES.length).toBeGreaterThan(0);
    const keys = SHOT_TYPES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives every shot type an admin-facing label', () => {
    for (const shot of SHOT_TYPES) {
      expect(shot.label.trim()).not.toBe('');
    }
  });

  it('resolves a key back to its shot type', () => {
    for (const shot of SHOT_TYPES) {
      expect(getShotType(shot.key)).toBe(shot);
    }
  });

  it('falls back to the first shot type for an unknown key', () => {
    expect(getShotType('no-such-key')).toBe(SHOT_TYPES[0]);
  });
});

describe('buildPrompts', () => {
  it('returns four non-empty prompts for every shot type', () => {
    for (const shot of SHOT_TYPES) {
      const p = buildPrompts(shot, fill(), BRAND);
      for (const key of ['main', 'zoom', 'worn', 'negative'] as const) {
        expect(p[key].trim().length, `${shot.key}.${key}`).toBeGreaterThan(40);
      }
    }
  });

  // The guide's whole method is two passes: isolate first, then shoot the
  // isolated image. A zoom or worn prompt that forgot to say "uploaded image"
  // would send the owner back to the crowded tray.
  it('points the zoom and worn prompts at the uploaded image', () => {
    for (const shot of SHOT_TYPES) {
      const p = buildPrompts(shot, fill(), BRAND);
      expect(p.zoom, shot.key).toContain('uploaded image');
      expect(p.worn, shot.key).toContain('uploaded image');
    }
  });

  it('leaves no unfilled placeholder behind', () => {
    for (const shot of SHOT_TYPES) {
      const p = buildPrompts(shot, fill(), BRAND);
      for (const text of Object.values(p)) {
        expect(text, shot.key).not.toMatch(/[[\]{}]/);
      }
    }
  });

  it('carries the shop background into the main prompt', () => {
    for (const shot of SHOT_TYPES) {
      const p = buildPrompts(shot, fill(), BRAND);
      expect(p.main, shot.key).toContain('SHOP-GROUND');
    }
  });

  // Another shop's ground is another colour. Nothing may be baked in.
  it('follows a different shop to a different background', () => {
    const p = buildPrompts(SHOT_TYPES[0], fill(), { ground: 'SECOND-SHOP-BACKDROP' });
    expect(p.main).toContain('SECOND-SHOP-BACKDROP');
    expect(p.main).not.toContain('SHOP-GROUND');
  });

  it('names the chosen metal type rather than assuming gold', () => {
    for (const shot of SHOT_TYPES) {
      const p = buildPrompts(shot, fill({ purityLabel: 'Silver 925' }), BRAND);
      expect(p.main, shot.key).toContain('Silver 925');
      expect(p.main, shot.key).not.toContain('22K');
    }
  });

  it('always removes the weight numbers and the watermark', () => {
    for (const shot of SHOT_TYPES) {
      const p = buildPrompts(shot, fill(), BRAND);
      expect(p.main, shot.key).toContain('watermark');
      expect(p.main, shot.key).toMatch(/weight/i);
    }
  });

  it('keeps the face out of every worn shot', () => {
    for (const shot of SHOT_TYPES) {
      const p = buildPrompts(shot, fill(), BRAND);
      expect(p.worn, shot.key).toMatch(/face is not visible/);
    }
  });

  it('forbids redesigning the piece in every main prompt', () => {
    for (const shot of SHOT_TYPES) {
      const p = buildPrompts(shot, fill(), BRAND);
      expect(p.main, shot.key).toMatch(/Do not restyle/);
    }
  });
});

describe('the address block', () => {
  it('gives a grid tray both a row and a position', () => {
    const shot = SHOT_TYPES.find((s) => s.address === 'row-and-piece')!;
    const p = buildPrompts(shot, fill({ row: 2, piece: 3 }), BRAND);
    expect(p.main).toContain('3rd');
    expect(p.main).toContain('from the left');
    expect(p.main).toContain('2nd row from the top');
  });

  it('gives a diagonal layout a sequence with no row', () => {
    const shot = SHOT_TYPES.find((s) => s.address === 'sequence')!;
    const p = buildPrompts(shot, fill({ piece: 3 }), BRAND);
    expect(p.main).toContain('3rd');
    expect(p.main).toContain('counting from the top');
    expect(p.main).not.toContain('row from the top');
  });

  it('gives a single row of pairs a position with no row', () => {
    const shot = SHOT_TYPES.find((s) => s.address === 'piece-only')!;
    const p = buildPrompts(shot, fill({ piece: 4 }), BRAND);
    expect(p.main).toContain('4th');
    expect(p.main).toContain('from the left');
    expect(p.main).not.toContain('row from the top');
  });

  it('addresses layered necklaces by which one is on the outside', () => {
    const shot = SHOT_TYPES.find((s) => s.address === 'layer')!;
    expect(buildPrompts(shot, fill({ layer: 'outer' }), BRAND).main).toContain(
      'outer',
    );
    expect(buildPrompts(shot, fill({ layer: 'inner' }), BRAND).main).toContain(
      'inner',
    );
  });

  it('includes the distinguishing mark when one is given', () => {
    const p = buildPrompts(SHOT_TYPES[0], fill({ mark: 'a five-petal flower' }), BRAND);
    expect(p.main).toContain('a five-petal flower');
  });

  // Position alone picks the neighbouring piece often enough that the screen
  // asks for a mark. Leaving it blank must still produce a clean sentence.
  it('reads cleanly when no mark is given', () => {
    const p = buildPrompts(SHOT_TYPES[0], fill({ mark: '   ' }), BRAND);
    expect(p.main).not.toMatch(/—\s*\./);
    expect(p.main).not.toContain('undefined');
    expect(p.main).toMatch(/USE ONLY: .+\./);
  });
});

describe('shakha, which the AI will otherwise turn to gold', () => {
  const shakha = SHOT_TYPES.find((s) => s.key === 'shakha')!;

  // The guard is worded without naming gold on purpose: the shop picks the
  // metal, and a shop selling these in silver must get the same warning.
  it('guards the white shell in both the main and the worn prompt', () => {
    const p = buildPrompts(shakha, fill(), BRAND);
    expect(p.main).toContain('CRITICAL');
    expect(p.main).toMatch(/Keep the white parts white/);
    expect(p.main).toMatch(/Do not turn any part of the bangle into a solid/);
    expect(p.worn).toMatch(/must stay white/);
  });

  it('warns without assuming the metal is gold', () => {
    const p = buildPrompts(shakha, fill({ purityLabel: 'Silver 925' }), BRAND);
    expect(p.main).toMatch(/Keep the white parts white/);
    expect(p.main).not.toContain('22K');
  });

  it('adds the solid-gold guard to its negative prompt', () => {
    const p = buildPrompts(shakha, fill(), BRAND);
    expect(p.negative).toContain('solid gold bangle');
  });

  it('removes the white roller the bangles are mounted on', () => {
    const p = buildPrompts(shakha, fill(), BRAND);
    expect(p.main).toContain('roller');
  });
});

describe('bracelets, which are photographed with their hallmark tags on', () => {
  const bracelet = SHOT_TYPES.find((s) => s.key === 'bracelet')!;

  it('removes the paper tag and its barcode', () => {
    const p = buildPrompts(bracelet, fill(), BRAND);
    expect(p.main).toMatch(/tag/i);
    expect(p.negative).toMatch(/hallmark tags/);
  });
});

describe('pairs', () => {
  it('asks for both pieces when the item is sold as a pair', () => {
    for (const shot of SHOT_TYPES.filter((s) => s.soldAsPair)) {
      const p = buildPrompts(shot, fill(), BRAND);
      expect(p.main, shot.key).toMatch(/both|pair/i);
    }
  });
});

// An `extraIgnore` carrying its own ", and" once produced "the other necklace,
// completely, and the photographer's watermark" — a list the AI has to guess
// its way through.
describe('the ignore list reads as one sentence', () => {
  it('joins with exactly one "and", whatever the shot type adds', () => {
    for (const shot of SHOT_TYPES) {
      const line = buildPrompts(shot, fill(), BRAND)
        .main.split('\n')
        .find((l) => l.startsWith('IGNORE AND REMOVE:'))!;
      const listSentence = line.slice(0, line.indexOf('.') + 1);
      expect(listSentence.match(/, and /g)?.length ?? 0, shot.key).toBe(1);
      expect(listSentence, shot.key).not.toMatch(/,\s*,/);
    }
  });

  it('keeps a clasp note out of the list it qualifies', () => {
    const bracelet = SHOT_TYPES.find((s) => s.key === 'bracelet')!;
    const p = buildPrompts(bracelet, fill(), BRAND);
    expect(p.main).toContain('The clasp stays. Only the tag goes.');
  });
});
