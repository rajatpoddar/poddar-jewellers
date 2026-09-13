# Phase 1A — Core, Price Engine and Admin: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working admin panel where a jewellery shop enters a daily metal rate and manages a product catalog, backed by a fully tested price engine that computes every product's price from weight and rate.

**Architecture:** All money is integer paise; all percentages are integer basis points; no float ever accumulates a rupee value. The price engine is a set of pure functions with no database or framework dependency, tested in isolation. Which purities a shop deals in is data, not an enum, so the daily rate screen builds itself from the shop's own metal types. Persistence is Prisma over Postgres. The admin is Next.js App Router server components with server actions. Saving a rate recomputes a per-product price range cache and revalidates cached pages.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, PostgreSQL 16 in production (14 locally), Prisma 7, Vitest 5, jose, bcryptjs, sharp, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-13-phase1-catalog-price-engine-design.md`

**Follows:** Phase 1B (storefront) is a separate plan, written after this one is complete.

**Deliberately deferred to Phase 1B:** spec Sections 5 and 10 in full (every storefront page, the weight selector, the wishlist, the WhatsApp link, the `/rates` page, and the edge-caching work), the storefront half of Section 7 (the stale-rate banner — the admin warning is Task 14 here), and the Playwright suite from Section 11, which exists to drive browse-and-buy flows that do not exist yet. Everything else in the spec is covered below.

## Global Constraints

From the spec and `CLAUDE.md`. Every task inherits these.

- **Price is never stored.** No `price` column. The only persisted prices are `cachedPriceMinPaise` / `cachedPriceMaxPaise` on `Product`, used solely for filtering and sorting, recomputed on every rate save.
- **Money is integer paise.** `Int` columns, integer arithmetic, `Math.round` at each step. Never accumulate rupees in a float.
- **Percentages are integer basis points.** 15% is `1500`. 3% is `300`. Value = `paise * bp / 10000`.
- **Estimates round up.** Nearest Rs 100 (`10000` paise) at or above Rs 10,000; nearest Rs 10 (`1000` paise) below it.
- **Metal types are rows, never an enum.** A shop adds `SILVER_925` from the admin panel and the daily rate screen grows an input by itself. The engine takes rates as `Record<MetalKey, number>`.
- **`Shop` is a real row with a real id**, never a singleton pinned to `id = 1`. Every query resolves its shop through `getShop()`. Every shop-owned table carries `shopId`.
- **No shop fact is hardcoded.** Name, address, phone, WhatsApp, email, logo, branding colours and fonts, hours, social links, making default, GST percent, rounding steps, disclaimer copy, hero copy and SEO terms all live on the `Shop` row. Seed values come from `docs/PROJECT.md`.
- **Default making charge is 1500 bp (15%)**, overridable per category and per product. Most specific wins: product, then nearest ancestor category, then the shop default.
- **GST is 300 bp (3%)** on metal + making + stone. Pending the shop's CA; it is a `Shop` field so changing it is not a deploy.
- **The daily admin screen stays a 30-second job.** One input per metal type and a Save button. Nothing destructive reachable from it.
- **Currency renders with Indian digit grouping** — `Rs 3,37,900`, never `Rs 337,900`. Use `toLocaleString('en-IN')`.
- **Node 22 or newer**, package manager `npm`.
- **Versions are the current stable ones as of 2026-09-13**, verified against the
  registry rather than assumed — see D12 in `docs/DECISIONS.md`. `prisma`'s
  `latest` dist-tag points at an 8.0 release candidate; this project uses the
  stable 7.10.0.

---

## File Structure

```
poddar-jewellers/
├── docker-compose.yml            # postgres + app, for the NAS
├── docker-compose.dev.yml        # postgres only, for local work
├── Dockerfile                    # multi-stage, next standalone output
├── .env.example
├── package.json
├── tsconfig.json
├── next.config.ts
├── vitest.config.ts
├── postcss.config.mjs
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── lib/
│   │   ├── money.ts              # paise arithmetic, INR formatting, rounding
│   │   ├── money.test.ts
│   │   ├── weights.ts            # parse "20, 23, 25" into milligrams
│   │   ├── weights.test.ts
│   │   ├── rates.ts              # staleness classification (pure)
│   │   ├── rates.test.ts
│   │   ├── price-cache.ts        # price range across weight options (pure)
│   │   ├── price-cache.test.ts
│   │   ├── pricing/
│   │   │   ├── types.ts          # MetalKey, RateSet, PriceInput, PriceBreakdown
│   │   │   ├── making.ts         # making-charge cascade
│   │   │   ├── making.test.ts
│   │   │   ├── engine.ts         # estimate()
│   │   │   └── engine.test.ts
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── shop.ts               # getShop(), getPricingConfig() — server only
│   │   ├── rates.server.ts       # latest rate for the shop
│   │   ├── price-cache.server.ts # recompute every product's cached range
│   │   └── images.ts             # sharp variant pipeline
│   ├── auth/
│   │   ├── session.ts
│   │   └── session.test.ts
│   ├── middleware.ts             # protects /admin
│   ├── components/admin/
│   │   ├── Nav.tsx
│   │   ├── RateForm.tsx
│   │   └── ProductForm.tsx
│   └── app/
│       ├── globals.css
│       ├── layout.tsx
│       ├── page.tsx
│       └── admin/
│           ├── layout.tsx
│           ├── page.tsx          # DAILY: today's rate
│           ├── actions.ts        # saveRate
│           ├── login/{page.tsx,actions.ts}
│           ├── metals/{page.tsx,actions.ts}
│           ├── products/{page.tsx,actions.ts,new/page.tsx,[id]/page.tsx}
│           ├── categories/{page.tsx,actions.ts}
│           └── settings/{page.tsx,form.tsx,actions.ts}
```

`src/lib/pricing/` is pure domain logic and imports nothing from `db.ts` or `next/*`. That is what lets it be exhaustively tested without a database or a server. Anything that touches Prisma lives in a `.server.ts` file so a unit test importing the pure module never drags Prisma into the test process.

---

### Task 1: Project scaffold and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `postcss.config.mjs`, `.env.example`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/lib/smoke.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a repo where `npm test` and `npm run typecheck` both succeed

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "poddar-jewellers",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "typecheck": "tsc --noEmit"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^7.10.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.6",
    "next": "^16.3.5",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "sharp": "^0.35.4",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.3",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^24.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "prisma": "^7.10.0",
    "tailwindcss": "^4.3.3",
    "tsx": "^4.23.13",
    "typescript": "^5.7.2",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `vitest.config.ts`, `next.config.ts`, `postcss.config.mjs`**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
});
```

`next.config.ts`:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: { formats: ['image/avif', 'image/webp'] },
};

export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```

- [ ] **Step 4: Create `.env.example`**

```bash
DATABASE_URL="postgresql://poddar:poddar@localhost:5544/poddar_jewellers?schema=public"
SESSION_SECRET="change-me-to-a-32-byte-random-string"
SEED_ADMIN_USERNAME="rajat"
SEED_ADMIN_PASSWORD="change-me-on-first-login"
UPLOAD_DIR="./public/uploads"
```

- [ ] **Step 5: Create the minimal app shell**

`src/app/globals.css`:
```css
@import "tailwindcss";
```

`src/app/layout.tsx`:
```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Poddar Jewellers' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8">Phase 1B will build the storefront here.</main>;
}
```

- [ ] **Step 6: Write a smoke test**

`src/lib/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Install and verify**

Run: `npm install && npm test && npm run typecheck`
Expected: one passing test, no type errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Vitest and Tailwind"
```

---

### Task 2: Money utilities

The foundation every later task's arithmetic rests on. Pure, no dependencies.

**Files:**
- Create: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `rupeesToPaise(rupees: number): number`
  - `paiseToRupees(paise: number): number`
  - `applyPercentBp(paise: number, bp: number): number`
  - `roundUpPaise(paise: number, stepPaise: number): number`
  - `formatINR(paise: number): string`

- [ ] **Step 1: Write the failing tests**

`src/lib/money.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { rupeesToPaise, applyPercentBp, roundUpPaise, formatINR } from './money';

describe('rupeesToPaise', () => {
  it('converts whole rupees', () => {
    expect(rupeesToPaise(12400)).toBe(1240000);
  });

  it('converts rupees with paise without float drift', () => {
    expect(rupeesToPaise(216.35)).toBe(21635);
    expect(rupeesToPaise(0.1)).toBe(10);
  });

  it('rejects negatives', () => {
    expect(() => rupeesToPaise(-1)).toThrow();
  });
});

describe('applyPercentBp', () => {
  it('applies 15% (1500 bp)', () => {
    expect(applyPercentBp(28520000, 1500)).toBe(4278000);
  });

  it('applies 3% (300 bp)', () => {
    expect(applyPercentBp(32798000, 300)).toBe(983940);
  });

  it('rounds to the nearest paisa', () => {
    expect(applyPercentBp(101, 300)).toBe(3);
  });

  it('returns zero for zero bp', () => {
    expect(applyPercentBp(28520000, 0)).toBe(0);
  });
});

describe('roundUpPaise', () => {
  it('rounds up to the nearest Rs 100', () => {
    expect(roundUpPaise(33781940, 10000)).toBe(33790000);
  });

  it('leaves an exact multiple untouched', () => {
    expect(roundUpPaise(33790000, 10000)).toBe(33790000);
  });

  it('rounds up by a single paisa over', () => {
    expect(roundUpPaise(33790001, 10000)).toBe(33800000);
  });

  it('rounds up to the nearest Rs 10', () => {
    expect(roundUpPaise(864512, 1000)).toBe(865000);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    expect(formatINR(33790000)).toBe('₹3,37,900');
  });

  it('groups lakhs and crores the Indian way, not in thousands', () => {
    expect(formatINR(1234567800)).toBe('₹1,23,45,678');
    expect(formatINR(100000000)).toBe('₹10,00,000');
  });

  it('formats small amounts', () => {
    expect(formatINR(21600)).toBe('₹216');
  });

  it('formats zero', () => {
    expect(formatINR(0)).toBe('₹0');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/money.test.ts`
Expected: FAIL — `Failed to resolve import "./money"`

- [ ] **Step 3: Implement `src/lib/money.ts`**

```ts
/**
 * All money in this codebase is an integer number of paise.
 * All percentages are integer basis points: 15% is 1500, 3% is 300.
 * Never let a rupee value live in a float.
 */

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) {
    throw new Error(`rupeesToPaise: expected a non-negative finite number, got ${rupees}`);
  }
  // Round rather than truncate: 216.35 * 100 is 21634.999... in binary floating point.
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** value = paise * bp / 10000, rounded to the nearest paisa. */
export function applyPercentBp(paise: number, bp: number): number {
  if (!Number.isInteger(paise) || !Number.isInteger(bp)) {
    throw new Error(`applyPercentBp: expected integers, got (${paise}, ${bp})`);
  }
  return Math.round((paise * bp) / 10000);
}

/** Always rounds up. An estimate must never land under the real price. */
export function roundUpPaise(paise: number, stepPaise: number): number {
  if (!Number.isInteger(paise) || !Number.isInteger(stepPaise) || stepPaise <= 0) {
    throw new Error(`roundUpPaise: bad arguments (${paise}, ${stepPaise})`);
  }
  return Math.ceil(paise / stepPaise) * stepPaise;
}

/** Indian digit grouping, whole rupees. Rs 3,37,900 — never Rs 337,900. */
export function formatINR(paise: number): string {
  const rupees = Math.round(paise / 100);
  return '₹' + rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/money.test.ts`
Expected: PASS, 15 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts src/lib/money.test.ts
git commit -m "feat: integer-paise money utilities with Indian digit grouping"
```

---

### Task 3: Pricing types and the making-charge cascade

**Files:**
- Create: `src/lib/pricing/types.ts`, `src/lib/pricing/making.ts`
- Test: `src/lib/pricing/making.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type MetalKey = string`
  - `type RateSet = Readonly<Record<MetalKey, number>>` — paise per gram
  - `interface PriceInput { weightMg: number; metalKey: MetalKey; makingPercentBp: number; stoneValuePaise: number }`
  - `interface RoundingConfig { stepPaise: number; smallStepPaise: number; thresholdPaise: number }`
  - `interface PriceBreakdown { metalPaise; makingPaise; stonePaise; subtotalPaise; gstPaise; totalPaise; displayPaise }`
  - `type MakingSource = { kind: 'product' } | { kind: 'category'; categoryName: string } | { kind: 'default' }`
  - `resolveMakingPercent(product, categoryChain, defaultBp): { percentBp: number; source: MakingSource }`

- [ ] **Step 1: Write the failing tests**

`src/lib/pricing/making.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveMakingPercent } from './making';

const DEFAULT_BP = 1500;

describe('resolveMakingPercent', () => {
  it('uses the product override when present', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: 1800 },
      [{ name: 'Payal', makingPercentBp: 1200 }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(1800);
    expect(r.source).toEqual({ kind: 'product' });
  });

  it('falls back to the nearest ancestor category', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: null },
      [{ name: 'Payal', makingPercentBp: 1200 }, { name: 'Anklets', makingPercentBp: 1400 }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(1200);
    expect(r.source).toEqual({ kind: 'category', categoryName: 'Payal' });
  });

  it('skips categories with no override and keeps walking up', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: null },
      [{ name: 'Payal', makingPercentBp: null }, { name: 'Anklets', makingPercentBp: 1400 }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(1400);
    expect(r.source).toEqual({ kind: 'category', categoryName: 'Anklets' });
  });

  it('falls back to the shop default when nothing overrides', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: null },
      [{ name: 'Payal', makingPercentBp: null }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(1500);
    expect(r.source).toEqual({ kind: 'default' });
  });

  it('uses the default for a product with no category chain at all', () => {
    const r = resolveMakingPercent({ makingPercentBp: null }, [], DEFAULT_BP);
    expect(r.percentBp).toBe(1500);
    expect(r.source).toEqual({ kind: 'default' });
  });

  it('treats an explicit zero override as a real value, not as absent', () => {
    const r = resolveMakingPercent(
      { makingPercentBp: 0 },
      [{ name: 'Payal', makingPercentBp: 1200 }],
      DEFAULT_BP,
    );
    expect(r.percentBp).toBe(0);
    expect(r.source).toEqual({ kind: 'product' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/pricing/making.test.ts`
Expected: FAIL — `Failed to resolve import "./making"`

- [ ] **Step 3: Implement `src/lib/pricing/types.ts`**

```ts
/**
 * A metal type's stable key, e.g. "GOLD_22K" or "SILVER_925".
 *
 * Deliberately a string and not a union: which purities a shop deals in is a
 * fact about that shop, stored as rows in `metal_types`. Another shop running
 * this software may carry 14K or platinum, and must be able to add it from the
 * admin panel without a migration.
 */
export type MetalKey = string;

/** Paise per gram, keyed by metal type key, as entered by the shop each morning. */
export type RateSet = Readonly<Record<MetalKey, number>>;

export interface PriceInput {
  /** Integer milligrams. 23g is 23000. */
  weightMg: number;
  metalKey: MetalKey;
  /** Already resolved through the cascade. Basis points. */
  makingPercentBp: number;
  /** Fixed rupee value of any stone or diamond. Does not scale with weight. */
  stoneValuePaise: number;
}

export interface RoundingConfig {
  /** Step at or above the threshold. Rs 100 is 10000. */
  stepPaise: number;
  /** Step below the threshold. Rs 10 is 1000. */
  smallStepPaise: number;
  /** Rs 10,000 is 1000000. */
  thresholdPaise: number;
}

export interface PriceBreakdown {
  metalPaise: number;
  makingPaise: number;
  stonePaise: number;
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  /** Rounded up. The only figure the customer is ever shown. */
  displayPaise: number;
}
```

- [ ] **Step 4: Implement `src/lib/pricing/making.ts`**

```ts
export type MakingSource =
  | { kind: 'product' }
  | { kind: 'category'; categoryName: string }
  | { kind: 'default' };

export interface MakingResolution {
  percentBp: number;
  source: MakingSource;
}

/**
 * Most specific wins: the product's own override, then the nearest ancestor
 * category with an override, then the shop default.
 *
 * `categoryChain` is ordered nearest-first: the product's own category, then its
 * parent, and so on up the tree.
 *
 * The admin UI renders `source` so a non-technical user can always see where an
 * effective percentage came from.
 */
export function resolveMakingPercent(
  product: { makingPercentBp: number | null },
  categoryChain: Array<{ name: string; makingPercentBp: number | null }>,
  defaultBp: number,
): MakingResolution {
  if (product.makingPercentBp !== null) {
    return { percentBp: product.makingPercentBp, source: { kind: 'product' } };
  }

  for (const category of categoryChain) {
    if (category.makingPercentBp !== null) {
      return {
        percentBp: category.makingPercentBp,
        source: { kind: 'category', categoryName: category.name },
      };
    }
  }

  return { percentBp: defaultBp, source: { kind: 'default' } };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/pricing/making.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 6: Commit**

```bash
git add src/lib/pricing/
git commit -m "feat: pricing types and making-charge cascade resolution"
```

---

### Task 4: The price engine

The single most important function in the codebase. A bug here shows a customer a wrong number.

**Files:**
- Create: `src/lib/pricing/engine.ts`
- Test: `src/lib/pricing/engine.test.ts`

**Interfaces:**
- Consumes: `money.ts` (`applyPercentBp`, `roundUpPaise`), `pricing/types.ts`
- Produces: `estimate(input: PriceInput, rates: RateSet, gstPercentBp: number, rounding: RoundingConfig): PriceBreakdown`

- [ ] **Step 1: Write the failing tests**

`src/lib/pricing/engine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { estimate } from './engine';
import type { RateSet, RoundingConfig } from './types';

const RATES: RateSet = {
  GOLD_24K: 1353000,   // Rs 13,530/g
  GOLD_22K: 1240000,   // Rs 12,400/g
  GOLD_18K: 1015000,   // Rs 10,150/g
  SILVER_999: 21600,   // Rs 216/g
};

const GST_BP = 300;

const ROUNDING: RoundingConfig = {
  stepPaise: 10000,        // Rs 100
  smallStepPaise: 1000,    // Rs 10
  thresholdPaise: 1000000, // Rs 10,000
};

describe('estimate', () => {
  it('prices the worked example from the spec: 23g of 22K at 15% making', () => {
    const r = estimate(
      { weightMg: 23000, metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.metalPaise).toBe(28520000);      // Rs 2,85,200
    expect(r.makingPaise).toBe(4278000);      // Rs 42,780
    expect(r.stonePaise).toBe(0);
    expect(r.subtotalPaise).toBe(32798000);   // Rs 3,27,980
    expect(r.gstPaise).toBe(983940);          // Rs 9,839.40
    expect(r.totalPaise).toBe(33781940);
    expect(r.displayPaise).toBe(33790000);    // Rs 3,37,900
  });

  it('scales with the selected weight', () => {
    const base = { metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 };
    const at20 = estimate({ ...base, weightMg: 20000 }, RATES, GST_BP, ROUNDING);
    const at25 = estimate({ ...base, weightMg: 25000 }, RATES, GST_BP, ROUNDING);
    expect(at20.displayPaise).toBe(29380000); // Rs 2,93,800
    expect(at25.displayPaise).toBe(36720000); // Rs 3,67,200
  });

  it('uses the rate for the product’s own metal type', () => {
    const base = { weightMg: 10000, makingPercentBp: 1500, stoneValuePaise: 0 };
    expect(estimate({ ...base, metalKey: 'GOLD_24K' }, RATES, GST_BP, ROUNDING).metalPaise).toBe(13530000);
    expect(estimate({ ...base, metalKey: 'GOLD_18K' }, RATES, GST_BP, ROUNDING).metalPaise).toBe(10150000);
    expect(estimate({ ...base, metalKey: 'SILVER_999' }, RATES, GST_BP, ROUNDING).metalPaise).toBe(216000);
  });

  it('works with a metal type this shop invented', () => {
    // Proves the engine has no hardcoded list of purities.
    const rates: RateSet = { ...RATES, SILVER_925: 20000 };
    const r = estimate(
      { weightMg: 30000, metalKey: 'SILVER_925', makingPercentBp: 1500, stoneValuePaise: 0 },
      rates, GST_BP, ROUNDING,
    );
    expect(r.metalPaise).toBe(600000); // 30g x Rs 200
  });

  it('handles fractional gram weights', () => {
    const r = estimate(
      { weightMg: 4200, metalKey: 'GOLD_18K', makingPercentBp: 1500, stoneValuePaise: 0 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.metalPaise).toBe(4263000); // 4.2g x Rs 10,150 = Rs 42,630
  });

  it('adds a stone value that does not scale with weight', () => {
    const withStone = { metalKey: 'GOLD_18K', makingPercentBp: 1500, stoneValuePaise: 4500000 };
    const light = estimate({ ...withStone, weightMg: 4200 }, RATES, GST_BP, ROUNDING);
    const heavy = estimate({ ...withStone, weightMg: 8400 }, RATES, GST_BP, ROUNDING);
    expect(light.stonePaise).toBe(4500000);
    expect(heavy.stonePaise).toBe(4500000);
    expect(heavy.metalPaise).toBe(light.metalPaise * 2);
  });

  it('charges making on the metal value only, never on the stone', () => {
    const r = estimate(
      { weightMg: 4200, metalKey: 'GOLD_18K', makingPercentBp: 1500, stoneValuePaise: 4500000 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.makingPaise).toBe(639450); // 15% of Rs 42,630, not of Rs 87,630
  });

  it('charges GST on metal plus making plus stone', () => {
    const r = estimate(
      { weightMg: 4200, metalKey: 'GOLD_18K', makingPercentBp: 1500, stoneValuePaise: 4500000 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.subtotalPaise).toBe(4263000 + 639450 + 4500000);
    expect(r.gstPaise).toBe(282074); // 3% of Rs 94,024.50
  });

  it('rounds up to the nearest Rs 10 below the Rs 10,000 threshold', () => {
    const r = estimate(
      { weightMg: 30000, metalKey: 'SILVER_999', makingPercentBp: 1500, stoneValuePaise: 0 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.totalPaise).toBe(767556);   // Rs 7,675.56
    expect(r.displayPaise).toBe(768000); // Rs 7,680
  });

  it('never displays less than the true total', () => {
    for (let mg = 1000; mg <= 60000; mg += 137) {
      const r = estimate(
        { weightMg: mg, metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      );
      expect(r.displayPaise).toBeGreaterThanOrEqual(r.totalPaise);
    }
  });

  it('handles a zero making charge', () => {
    const r = estimate(
      { weightMg: 23000, metalKey: 'GOLD_22K', makingPercentBp: 0, stoneValuePaise: 0 },
      RATES, GST_BP, ROUNDING,
    );
    expect(r.makingPaise).toBe(0);
    expect(r.subtotalPaise).toBe(28520000);
  });

  it('throws when today’s rates carry no line for this metal type', () => {
    expect(() =>
      estimate(
        { weightMg: 23000, metalKey: 'PLATINUM_950', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      ),
    ).toThrow(/PLATINUM_950/);
  });

  it('throws rather than picking up an inherited Object property as a rate', () => {
    expect(() =>
      estimate(
        { weightMg: 23000, metalKey: 'toString', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      ),
    ).toThrow(/toString/);
  });

  it('rejects a non-positive weight', () => {
    expect(() =>
      estimate(
        { weightMg: 0, metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 },
        RATES, GST_BP, ROUNDING,
      ),
    ).toThrow(/weight/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/pricing/engine.test.ts`
Expected: FAIL — `Failed to resolve import "./engine"`

- [ ] **Step 3: Implement `src/lib/pricing/engine.ts`**

```ts
import { applyPercentBp, roundUpPaise } from '../money';
import type { PriceBreakdown, PriceInput, RateSet, RoundingConfig } from './types';

/**
 * The one function that decides what a customer is quoted.
 *
 * Pure: no database, no clock, no framework. Everything it needs arrives as an
 * argument, which is what makes it exhaustively testable.
 *
 *   metal    = weight x rate for the product's metal type
 *   making   = metal x makingPercent          (metal only — never the stone)
 *   stone    = fixed, does not scale with weight
 *   subtotal = metal + making + stone
 *   gst      = subtotal x gstPercent
 *   display  = subtotal + gst, rounded UP
 */
export function estimate(
  input: PriceInput,
  rates: RateSet,
  gstPercentBp: number,
  rounding: RoundingConfig,
): PriceBreakdown {
  if (!Number.isInteger(input.weightMg) || input.weightMg <= 0) {
    throw new Error(`estimate: weight must be a positive integer in milligrams, got ${input.weightMg}`);
  }

  // `hasOwnProperty`, not a truthiness check: rates is a plain record keyed by
  // shop-defined strings, and a key like "toString" would otherwise resolve to
  // an inherited function rather than a rate.
  const hasRate = Object.prototype.hasOwnProperty.call(rates, input.metalKey);
  const ratePaisePerGram = hasRate ? rates[input.metalKey] : undefined;

  if (typeof ratePaisePerGram !== 'number' || !Number.isInteger(ratePaisePerGram) || ratePaisePerGram <= 0) {
    throw new Error(`estimate: today's rates carry no usable line for metal type "${input.metalKey}"`);
  }

  const metalPaise = Math.round((input.weightMg * ratePaisePerGram) / 1000);
  const makingPaise = applyPercentBp(metalPaise, input.makingPercentBp);
  const stonePaise = input.stoneValuePaise;

  const subtotalPaise = metalPaise + makingPaise + stonePaise;
  const gstPaise = applyPercentBp(subtotalPaise, gstPercentBp);
  const totalPaise = subtotalPaise + gstPaise;

  const step = totalPaise >= rounding.thresholdPaise ? rounding.stepPaise : rounding.smallStepPaise;

  return {
    metalPaise,
    makingPaise,
    stonePaise,
    subtotalPaise,
    gstPaise,
    totalPaise,
    displayPaise: roundUpPaise(totalPaise, step),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/pricing/engine.test.ts`
Expected: PASS, 14 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/pricing/engine.ts src/lib/pricing/engine.test.ts
git commit -m "feat: price engine — weight x rate, making, stone, GST, round up"
```

---

### Task 5: Product price range for the filter cache

**Files:**
- Create: `src/lib/price-cache.ts`
- Test: `src/lib/price-cache.test.ts`

**Interfaces:**
- Consumes: `pricing/engine.ts`, `pricing/types.ts`
- Produces: `priceRange(weightsMg: number[], base: Omit<PriceInput, 'weightMg'>, rates: RateSet, gstPercentBp: number, rounding: RoundingConfig): { minPaise: number; maxPaise: number }`

- [ ] **Step 1: Write the failing tests**

`src/lib/price-cache.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { priceRange } from './price-cache';
import type { RateSet, RoundingConfig } from './pricing/types';

const RATES: RateSet = {
  GOLD_24K: 1353000, GOLD_22K: 1240000, GOLD_18K: 1015000, SILVER_999: 21600,
};
const GST_BP = 300;
const ROUNDING: RoundingConfig = {
  stepPaise: 10000, smallStepPaise: 1000, thresholdPaise: 1000000,
};
const BASE = { metalKey: 'GOLD_22K', makingPercentBp: 1500, stoneValuePaise: 0 };

describe('priceRange', () => {
  it('spans the cheapest and dearest weight options', () => {
    const r = priceRange([23000, 20000, 25000], BASE, RATES, GST_BP, ROUNDING);
    expect(r.minPaise).toBe(29380000); // 20g
    expect(r.maxPaise).toBe(36720000); // 25g
  });

  it('returns an equal min and max for a single weight', () => {
    const r = priceRange([23000], BASE, RATES, GST_BP, ROUNDING);
    expect(r.minPaise).toBe(33790000);
    expect(r.maxPaise).toBe(33790000);
  });

  it('is insensitive to the order the weights arrive in', () => {
    const a = priceRange([25000, 20000, 23000], BASE, RATES, GST_BP, ROUNDING);
    const b = priceRange([20000, 23000, 25000], BASE, RATES, GST_BP, ROUNDING);
    expect(a).toEqual(b);
  });

  it('throws when a product has no weight options', () => {
    expect(() => priceRange([], BASE, RATES, GST_BP, ROUNDING)).toThrow(/weight/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/price-cache.test.ts`
Expected: FAIL — `Failed to resolve import "./price-cache"`

- [ ] **Step 3: Implement `src/lib/price-cache.ts`**

```ts
import { estimate } from './pricing/engine';
import type { PriceInput, RateSet, RoundingConfig } from './pricing/types';

/**
 * A product's cheapest and dearest weight option, at today's rate.
 *
 * Persisted on Product so listing pages can filter and sort by price without
 * recomputing the whole catalog on every request. Recomputed for every product
 * whenever a rate is saved.
 */
export function priceRange(
  weightsMg: number[],
  base: Omit<PriceInput, 'weightMg'>,
  rates: RateSet,
  gstPercentBp: number,
  rounding: RoundingConfig,
): { minPaise: number; maxPaise: number } {
  if (weightsMg.length === 0) {
    throw new Error('priceRange: a product needs at least one weight option');
  }

  const prices = weightsMg.map(
    (weightMg) => estimate({ ...base, weightMg }, rates, gstPercentBp, rounding).displayPaise,
  );

  return { minPaise: Math.min(...prices), maxPaise: Math.max(...prices) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/price-cache.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/price-cache.ts src/lib/price-cache.test.ts
git commit -m "feat: per-product price range for listing filters"
```

---

### Task 6: Rate staleness and weight parsing

Two small pure helpers, grouped because neither carries a task's worth of work alone.

**Files:**
- Create: `src/lib/rates.ts`, `src/lib/weights.ts`
- Test: `src/lib/rates.test.ts`, `src/lib/weights.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type RateStatus = 'FRESH' | 'WARN' | 'STALE'`
  - `rateStatus(enteredAt: Date, now: Date, warnHours: number, staleHours: number): RateStatus`
  - `percentChangeBp(previousPaise: number, nextPaise: number): number`
  - `parseWeights(raw: string): number[]` — milligrams, sorted, deduplicated

- [ ] **Step 1: Write the failing tests**

`src/lib/rates.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { rateStatus, percentChangeBp } from './rates';

const at = (iso: string) => new Date(iso);

describe('rateStatus', () => {
  const entered = at('2026-09-13T08:00:00Z');

  it('is fresh within the warn window', () => {
    expect(rateStatus(entered, at('2026-09-13T20:00:00Z'), 24, 48)).toBe('FRESH');
  });

  it('warns once past the warn threshold', () => {
    expect(rateStatus(entered, at('2026-09-14T09:00:00Z'), 24, 48)).toBe('WARN');
  });

  it('is stale once past the stale threshold', () => {
    expect(rateStatus(entered, at('2026-09-15T09:00:00Z'), 24, 48)).toBe('STALE');
  });

  it('is fresh exactly at the warn threshold', () => {
    expect(rateStatus(entered, at('2026-09-14T08:00:00Z'), 24, 48)).toBe('FRESH');
  });

  it('warns exactly at the stale threshold', () => {
    expect(rateStatus(entered, at('2026-09-15T08:00:00Z'), 24, 48)).toBe('WARN');
  });

  it('treats a clock skewed into the past as fresh', () => {
    expect(rateStatus(entered, at('2026-09-13T07:00:00Z'), 24, 48)).toBe('FRESH');
  });
});

describe('percentChangeBp', () => {
  it('reports a rise in basis points', () => {
    expect(percentChangeBp(1200000, 1240000)).toBe(333); // +3.33%
  });

  it('reports a fall as negative', () => {
    expect(percentChangeBp(1240000, 1200000)).toBe(-323);
  });

  it('reports no change as zero', () => {
    expect(percentChangeBp(1240000, 1240000)).toBe(0);
  });

  it('reports zero when there is no previous rate to compare against', () => {
    expect(percentChangeBp(0, 1240000)).toBe(0);
  });
});
```

`src/lib/weights.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseWeights } from './weights';

describe('parseWeights', () => {
  it('parses a comma-separated list into milligrams', () => {
    expect(parseWeights('20, 23, 25')).toEqual([20000, 23000, 25000]);
  });

  it('accepts a g suffix and stray whitespace', () => {
    expect(parseWeights('20g  23g\n25g')).toEqual([20000, 23000, 25000]);
  });

  it('handles fractional grams', () => {
    expect(parseWeights('4.2, 5')).toEqual([4200, 5000]);
  });

  it('sorts ascending regardless of input order', () => {
    expect(parseWeights('25, 20, 23')).toEqual([20000, 23000, 25000]);
  });

  it('removes duplicates', () => {
    expect(parseWeights('20, 20, 23')).toEqual([20000, 23000]);
  });

  it('rejects a non-numeric entry', () => {
    expect(() => parseWeights('20, bees, 25')).toThrow(/weight/i);
  });

  it('rejects zero, negative and empty input', () => {
    expect(() => parseWeights('20, 0')).toThrow(/weight/i);
    expect(() => parseWeights('-5')).toThrow(/weight/i);
    expect(() => parseWeights('   ')).toThrow(/weight/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/rates.test.ts src/lib/weights.test.ts`
Expected: FAIL — both imports unresolved

- [ ] **Step 3: Implement `src/lib/rates.ts`**

```ts
export type RateStatus = 'FRESH' | 'WARN' | 'STALE';

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * How old the shop's last rate entry is.
 *
 * FRESH — normal.
 * WARN  — admin shows a prominent warning.
 * STALE — the storefront shows a banner asking the customer to call.
 *
 * Prices are never hidden at any level. A site that hides its prices is
 * useless; the rate's date is shown on product pages instead.
 */
export function rateStatus(
  enteredAt: Date,
  now: Date,
  warnHours: number,
  staleHours: number,
): RateStatus {
  const ageHours = (now.getTime() - enteredAt.getTime()) / MS_PER_HOUR;
  if (ageHours >= staleHours) return 'STALE';
  if (ageHours > warnHours) return 'WARN';
  return 'FRESH';
}

/**
 * Change from the previous rate, in basis points, for the admin's save
 * confirmation. A typo of one extra digit shows up here as a huge number before
 * it ever reaches a customer.
 */
export function percentChangeBp(previousPaise: number, nextPaise: number): number {
  if (previousPaise <= 0) return 0;
  return Math.round(((nextPaise - previousPaise) * 10000) / previousPaise);
}
```

- [ ] **Step 4: Implement `src/lib/weights.ts`**

Kept out of the server-action file deliberately: a `'use server'` module may only export async functions, and this parser is worth testing on its own.

```ts
/** "20, 23, 25" and "20g 23g 25g" both parse to [20000, 23000, 25000]. */
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/lib/rates.test.ts src/lib/weights.test.ts`
Expected: PASS, 17 tests

- [ ] **Step 6: Commit**

```bash
git add src/lib/rates.ts src/lib/rates.test.ts src/lib/weights.ts src/lib/weights.test.ts
git commit -m "feat: rate staleness classification and weight parsing"
```

---

### Task 7: Database schema and Postgres

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`, `docker-compose.dev.yml`

**Interfaces:**
- Consumes: nothing
- Produces: Prisma models `Shop`, `MetalType`, `Rate`, `RateLine`, `Category`, `Product`, `ProductWeight`, `ProductImage`, `AttributeGroup`, `Attribute`, `ProductAttribute`, `AdminUser`; and `db` — the Prisma client singleton

- [ ] **Step 1: Create `docker-compose.dev.yml` for a local Postgres**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: poddar
      POSTGRES_PASSWORD: poddar
      POSTGRES_DB: poddar_jewellers
    ports:
      - "5544:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

Port 5544 rather than 5432 because the target NAS already runs several Postgres containers.

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum ProductStatus {
  DRAFT
  LIVE
}

/// One row per shop. Everything describing a shop or its business rules lives
/// here and is editable from the admin panel — nothing may be hardcoded.
///
/// A real id, never a singleton pinned to 1: this software is sold to other
/// jewellery shops, and the day it serves more than one from a single
/// deployment, only `getShop()` has to change.
model Shop {
  id   String @id @default(cuid())
  slug String @unique

  // Identity
  name     String
  tagline  String?
  logoPath String?

  // Branding — so two customers do not get the same site with a different name
  brandPrimary String @default("#8F621A")
  brandInk     String @default("#1A1D1B")
  brandGround  String @default("#F4F4F2")
  fontDisplay  String @default("Instrument Serif")
  fontBody     String @default("Karla")

  // Contact
  phone    String
  whatsapp String
  email    String

  // Address
  addressLine1 String
  addressLine2 String?
  city         String
  state        String
  pincode      String
  mapUrl       String?
  hoursText    String

  // Social
  instagramUrl String?
  facebookUrl  String?

  // Pricing
  defaultMakingPercentBp Int @default(1500)
  gstPercentBp           Int @default(300)
  roundingStepPaise      Int @default(10000)
  roundingSmallStepPaise Int @default(1000)
  roundingThresholdPaise Int @default(1000000)
  priceDisclaimer        String

  // Rate staleness
  rateWarnHours  Int    @default(24)
  rateStaleHours Int    @default(48)
  rateBannerText String

  // Site copy
  heroHeading    String
  heroSubheading String
  seoLocations   String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  metalTypes      MetalType[]
  categories      Category[]
  products        Product[]
  rates           Rate[]
  admins          AdminUser[]
  attributeGroups AttributeGroup[]
}

/// The purities this shop deals in. Data, never an enum: another shop may carry
/// 14K, Silver 925 or platinum, and must be able to add it from the admin panel.
model MetalType {
  id        String  @id @default(cuid())
  shopId    String
  shop      Shop    @relation(fields: [shopId], references: [id], onDelete: Cascade)
  /// Stable machine key, e.g. "GOLD_22K". Never changes once products use it.
  key       String
  /// What the shop and its customers see, e.g. "Gold 22K".
  label     String
  sortOrder Int     @default(0)
  isActive  Boolean @default(true)

  products  Product[]
  rateLines RateLine[]

  @@unique([shopId, key])
  @@index([shopId, sortOrder])
}

/// One header per rate entry. The newest is live; the rest are history.
model Rate {
  id        String     @id @default(cuid())
  shopId    String
  shop      Shop       @relation(fields: [shopId], references: [id], onDelete: Cascade)
  enteredBy String
  createdAt DateTime   @default(now())
  lines     RateLine[]

  @@index([shopId, createdAt])
}

/// One line per metal type per rate entry.
model RateLine {
  id                String    @id @default(cuid())
  rateId            String
  rate              Rate      @relation(fields: [rateId], references: [id], onDelete: Cascade)
  metalTypeId       String
  metalType         MetalType @relation(fields: [metalTypeId], references: [id], onDelete: Cascade)
  pricePerGramPaise Int

  @@unique([rateId, metalTypeId])
  @@index([metalTypeId])
}

model Category {
  id     String @id @default(cuid())
  shopId String
  shop   Shop   @relation(fields: [shopId], references: [id], onDelete: Cascade)

  slug            String
  name            String
  parentId        String?
  parent          Category?  @relation("CategoryTree", fields: [parentId], references: [id], onDelete: SetNull)
  children        Category[] @relation("CategoryTree")
  /// Basis points. Null means inherit from the parent, then from the shop default.
  makingPercentBp Int?
  sortOrder       Int        @default(0)
  products        Product[]

  @@unique([shopId, slug])
  @@index([shopId, parentId])
}

model Product {
  id     String @id @default(cuid())
  shopId String
  shop   Shop   @relation(fields: [shopId], references: [id], onDelete: Cascade)

  slug        String
  name        String
  description String?

  metalTypeId String
  metalType   MetalType @relation(fields: [metalTypeId], references: [id])

  /// Basis points. Null means inherit from the category, then from the shop default.
  makingPercentBp Int?
  /// Fixed value of any stone or diamond. Does not scale with weight.
  stoneValuePaise  Int     @default(0)
  stoneDescription String?

  categoryId String
  category   Category      @relation(fields: [categoryId], references: [id])
  status     ProductStatus @default(DRAFT)
  featured   Boolean       @default(false)

  /// Filter/sort cache ONLY. Never rendered as a price. Recomputed on rate save.
  cachedPriceMinPaise Int?
  cachedPriceMaxPaise Int?
  cachedAt            DateTime?

  weights    ProductWeight[]
  images     ProductImage[]
  attributes ProductAttribute[]
  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt

  @@unique([shopId, slug])
  @@index([shopId, categoryId, status])
  @@index([shopId, status, cachedPriceMinPaise])
  @@index([shopId, featured, status])
  @@index([metalTypeId])
}

model ProductWeight {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  /// Integer milligrams. 23g is 23000.
  weightMg  Int
  sortOrder Int     @default(0)

  @@unique([productId, weightMg])
  @@index([productId])
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  /// Content-hashed base name, no extension. Variants are derived from it.
  basePath  String
  alt       String
  width     Int
  height    Int
  sortOrder Int     @default(0)
  isPrimary Boolean @default(false)

  @@index([productId])
}

model AttributeGroup {
  id         String      @id @default(cuid())
  shopId     String
  shop       Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  key        String
  name       String
  sortOrder  Int         @default(0)
  attributes Attribute[]

  @@unique([shopId, key])
}

model Attribute {
  id        String             @id @default(cuid())
  groupId   String
  group     AttributeGroup     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  slug      String
  name      String
  sortOrder Int                @default(0)
  products  ProductAttribute[]

  @@unique([groupId, slug])
}

model ProductAttribute {
  productId   String
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  attributeId String
  attribute   Attribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)

  @@id([productId, attributeId])
  @@index([attributeId])
}

model AdminUser {
  id           String   @id @default(cuid())
  shopId       String
  shop         Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  username     String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
}
```

Note the absence of a `Purity` enum and of any `price` column. Metal types are
rows; price is always computed.

- [ ] **Step 3: Implement `src/lib/db.ts`**

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

- [ ] **Step 4: Start Postgres and run the first migration**

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate dev --name init
```
Expected: migration applied, Prisma client generated.

- [ ] **Step 5: Verify the schema is sound**

Run: `npx prisma validate && npm run typecheck`
Expected: `The schema at prisma/schema.prisma is valid`, no type errors.

Also confirm the two rules the schema must satisfy:
```bash
grep -c "price " prisma/schema.prisma   # expect 0 — no price column
grep -c "enum Purity" prisma/schema.prisma  # expect 0 — metal types are rows
```

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/lib/db.ts docker-compose.dev.yml
git commit -m "feat: schema — shop, metal types as rows, catalog, rate lines"
```

---

### Task 8: Shop context and rate reader

The bridge from the pure engine to the database. Every shop-scoped query starts here.

**Files:**
- Create: `src/lib/shop.ts`, `src/lib/rates.server.ts`

**Interfaces:**
- Consumes: `db.ts`, `pricing/types.ts`, `rates.ts` (for `rateStatus`)
- Produces:
  - `getShop(): Promise<Shop>`
  - `getPricingConfig(): Promise<{ gstPercentBp: number; defaultMakingPercentBp: number; rounding: RoundingConfig }>`
  - `getMetalTypes(): Promise<MetalType[]>` — active only, in sort order
  - `getLatestRate(): Promise<{ rates: RateSet; enteredAt: Date; enteredBy: string } | null>`
  - `getRateSnapshot(): Promise<{ rates: RateSet; enteredAt: Date; status: RateStatus } | null>`

- [ ] **Step 1: Implement `src/lib/shop.ts`**

```ts
import { cache } from 'react';
import { db } from './db';
import type { RoundingConfig } from './pricing/types';

/**
 * The shop this request belongs to.
 *
 * Today there is exactly one, so this returns it. This software is sold one
 * deployment per shop; the day a deployment serves several, THIS FUNCTION is the
 * only thing that changes — it resolves the shop from the request's domain
 * instead. Every shop-owned table already carries `shopId`, so nothing else has
 * to move.
 *
 * Never read a shop row any other way. `cache` deduplicates within a render.
 */
export const getShop = cache(async () => {
  const shop = await db.shop.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!shop) {
    throw new Error('No shop row found. Run `npm run db:seed`.');
  }
  return shop;
});

export const getPricingConfig = cache(async (): Promise<{
  gstPercentBp: number;
  defaultMakingPercentBp: number;
  rounding: RoundingConfig;
}> => {
  const shop = await getShop();
  return {
    gstPercentBp: shop.gstPercentBp,
    defaultMakingPercentBp: shop.defaultMakingPercentBp,
    rounding: {
      stepPaise: shop.roundingStepPaise,
      smallStepPaise: shop.roundingSmallStepPaise,
      thresholdPaise: shop.roundingThresholdPaise,
    },
  };
});

/** Active metal types, in the order the shop arranged them. */
export const getMetalTypes = cache(async () => {
  const shop = await getShop();
  return db.metalType.findMany({
    where: { shopId: shop.id, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
});
```

- [ ] **Step 2: Implement `src/lib/rates.server.ts`**

```ts
// Kept separate from the pure `rates.ts` so the unit tests can import that
// module without pulling Prisma or any server-only API into the test process.

import { cache } from 'react';
import { db } from './db';
import { getShop } from './shop';
import { rateStatus } from './rates';
import type { RateSet } from './pricing/types';

export const getLatestRate = cache(async () => {
  const shop = await getShop();

  const rate = await db.rate.findFirst({
    where: { shopId: shop.id },
    orderBy: { createdAt: 'desc' },
    include: { lines: { include: { metalType: { select: { key: true } } } } },
  });
  if (!rate) return null;

  // A plain object keyed by metal-type key — exactly what the engine expects,
  // with no knowledge of which purities this particular shop deals in.
  const rates: Record<string, number> = Object.create(null);
  for (const line of rate.lines) {
    rates[line.metalType.key] = line.pricePerGramPaise;
  }

  return { rates: rates as RateSet, enteredAt: rate.createdAt, enteredBy: rate.enteredBy };
});

export const getRateSnapshot = cache(async () => {
  const latest = await getLatestRate();
  if (!latest) return null;

  const shop = await getShop();
  return {
    rates: latest.rates,
    enteredAt: latest.enteredAt,
    status: rateStatus(latest.enteredAt, new Date(), shop.rateWarnHours, shop.rateStaleHours),
  };
});
```

- [ ] **Step 3: Verify the pure tests are untouched**

Run: `npm test && npm run typecheck`
Expected: every unit test still PASSES — the pure modules gained no server imports — and no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/shop.ts src/lib/rates.server.ts
git commit -m "feat: shop context helper and database-backed rate reader"
```

---

### Task 9: Seed script

**Files:**
- Create: `prisma/seed.ts`

**Interfaces:**
- Consumes: `@prisma/client`, `bcryptjs`
- Produces: a seeded database — one shop, its metal types, an admin user, a category tree, attribute groups, one opening rate with a line per metal type, and three sample products

- [ ] **Step 1: Implement `prisma/seed.ts`**

```ts
import { PrismaClient, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();
const rs = (rupees: number) => Math.round(rupees * 100);

const SHOP_SLUG = 'poddar-jewellers';

async function main() {
  // ── The shop ────────────────────────────────────────────────────────────
  // Seed values only. Every one of these is editable from the admin panel;
  // nothing here may ever be read from source. See Hard Rule 7 in CLAUDE.md.
  const shop = await db.shop.upsert({
    where: { slug: SHOP_SLUG },
    update: {},
    create: {
      slug: SHOP_SLUG,
      name: 'Poddar Jewellers',
      tagline: 'Palojori, Deoghar',
      phone: '7250580175',
      whatsapp: '917250580175',
      email: 'rajatpoddar17@gmail.com',
      addressLine1: 'Main Road Palojori',
      city: 'Deoghar',
      state: 'Jharkhand',
      pincode: '814146',
      hoursText: 'Online 24x7',
      priceDisclaimer: 'Aaj ke rate par anumaanit, sab tax shaamil. Final price dukaan par tay hoga.',
      rateBannerText: 'Rate 2 din se update nahi hua — confirm karne ke liye call kariye.',
      heroHeading: 'Ghar baithe humari dukaan dekhiye',
      heroSubheading: 'Har design, har weight, aaj ke rate par.',
      seoLocations: 'Palojori,Deoghar,Jharkhand,Asansol',
    },
  });

  // ── Metal types ─────────────────────────────────────────────────────────
  // What THIS shop deals in. Another shop would seed a different set, and any
  // shop can add to it from the admin panel.
  const metalSeed = [
    { key: 'GOLD_24K', label: 'Gold 24K', rupeesPerGram: 13530 },
    { key: 'GOLD_22K', label: 'Gold 22K', rupeesPerGram: 12400 },
    { key: 'GOLD_18K', label: 'Gold 18K', rupeesPerGram: 10150 },
    { key: 'SILVER_999', label: 'Silver 999', rupeesPerGram: 216 },
  ];

  const metals: Record<string, string> = {};
  for (const [i, m] of metalSeed.entries()) {
    const row = await db.metalType.upsert({
      where: { shopId_key: { shopId: shop.id, key: m.key } },
      update: {},
      create: { shopId: shop.id, key: m.key, label: m.label, sortOrder: i },
    });
    metals[m.key] = row.id;
  }

  // ── Admin user ──────────────────────────────────────────────────────────
  const username = process.env.SEED_ADMIN_USERNAME ?? 'rajat';
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error('SEED_ADMIN_PASSWORD is required to seed an admin user');

  await db.adminUser.upsert({
    where: { username },
    update: {},
    create: {
      shopId: shop.id,
      username,
      name: 'Rajat Poddar',
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  // ── Categories ──────────────────────────────────────────────────────────
  const categorySeed = [
    { slug: 'necklaces', name: 'Necklaces', children: [{ slug: 'chokers', name: 'Chokers' }, { slug: 'chains', name: 'Chains' }] },
    { slug: 'rings', name: 'Rings', children: [] },
    { slug: 'earrings', name: 'Earrings', children: [] },
    { slug: 'bangles', name: 'Bangles', children: [] },
    { slug: 'payal', name: 'Payal', children: [] },
    { slug: 'mangalsutra', name: 'Mangalsutra', children: [] },
  ];

  for (const [i, c] of categorySeed.entries()) {
    const parent = await db.category.upsert({
      where: { shopId_slug: { shopId: shop.id, slug: c.slug } },
      update: {},
      create: { shopId: shop.id, slug: c.slug, name: c.name, sortOrder: i },
    });
    for (const [j, child] of c.children.entries()) {
      await db.category.upsert({
        where: { shopId_slug: { shopId: shop.id, slug: child.slug } },
        update: {},
        create: { shopId: shop.id, slug: child.slug, name: child.name, parentId: parent.id, sortOrder: j },
      });
    }
  }

  // ── Attribute groups ────────────────────────────────────────────────────
  // "Metal" is an attribute rather than a column: it is a browsing facet, and a
  // shop that sells platinum should be able to add that value itself.
  const groups = [
    { key: 'METAL', name: 'Metal', values: ['gold', 'silver', 'diamond'] },
    { key: 'OCCASION', name: 'Occasion', values: ['wedding', 'daily-wear', 'gifting', 'festive'] },
    { key: 'GENDER', name: 'For', values: ['women', 'men', 'kids', 'teens'] },
    { key: 'STYLE', name: 'Style', values: ['traditional', 'modern', 'minimal'] },
  ];

  const attributes: Record<string, string> = {};
  for (const [i, g] of groups.entries()) {
    const group = await db.attributeGroup.upsert({
      where: { shopId_key: { shopId: shop.id, key: g.key } },
      update: {},
      create: { shopId: shop.id, key: g.key, name: g.name, sortOrder: i },
    });
    for (const [j, slug] of g.values.entries()) {
      const name = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      const row = await db.attribute.upsert({
        where: { groupId_slug: { groupId: group.id, slug } },
        update: {},
        create: { groupId: group.id, slug, name, sortOrder: j },
      });
      attributes[`${g.key}:${slug}`] = row.id;
    }
  }

  // ── Opening rate ────────────────────────────────────────────────────────
  if ((await db.rate.count({ where: { shopId: shop.id } })) === 0) {
    await db.rate.create({
      data: {
        shopId: shop.id,
        enteredBy: 'seed',
        lines: {
          create: metalSeed.map((m) => ({
            metalTypeId: metals[m.key],
            pricePerGramPaise: rs(m.rupeesPerGram),
          })),
        },
      },
    });
  }

  // ── Sample products ─────────────────────────────────────────────────────
  const categoryId = async (slug: string) =>
    (await db.category.findUniqueOrThrow({ where: { shopId_slug: { shopId: shop.id, slug } } })).id;

  const samples = [
    {
      slug: 'traditional-payal', name: 'Traditional Payal',
      metalKey: 'GOLD_22K', category: 'payal',
      stoneValuePaise: 0, stoneDescription: null,
      weightsMg: [20000, 23000, 25000],
      attributeKeys: ['METAL:gold', 'OCCASION:wedding', 'GENDER:women'],
    },
    {
      slug: 'silver-payal-classic', name: 'Classic Silver Payal',
      metalKey: 'SILVER_999', category: 'payal',
      stoneValuePaise: 0, stoneDescription: null,
      weightsMg: [30000, 40000, 50000],
      attributeKeys: ['METAL:silver', 'OCCASION:daily-wear', 'GENDER:women'],
    },
    {
      slug: 'solitaire-ring', name: 'Solitaire Ring',
      metalKey: 'GOLD_18K', category: 'rings',
      stoneValuePaise: rs(45000), stoneDescription: '0.50ct',
      weightsMg: [3500, 4200, 5000],
      attributeKeys: ['METAL:diamond', 'OCCASION:gifting', 'GENDER:women'],
    },
  ];

  for (const s of samples) {
    const product = await db.product.upsert({
      where: { shopId_slug: { shopId: shop.id, slug: s.slug } },
      update: {},
      create: {
        shopId: shop.id,
        slug: s.slug,
        name: s.name,
        metalTypeId: metals[s.metalKey],
        categoryId: await categoryId(s.category),
        stoneValuePaise: s.stoneValuePaise,
        stoneDescription: s.stoneDescription,
        status: ProductStatus.LIVE,
        featured: true,
      },
    });

    for (const [i, weightMg] of s.weightsMg.entries()) {
      await db.productWeight.upsert({
        where: { productId_weightMg: { productId: product.id, weightMg } },
        update: {},
        create: { productId: product.id, weightMg, sortOrder: i },
      });
    }

    for (const key of s.attributeKeys) {
      await db.productAttribute.upsert({
        where: { productId_attributeId: { productId: product.id, attributeId: attributes[key] } },
        update: {},
        create: { productId: product.id, attributeId: attributes[key] },
      });
    }
  }

  console.log('Seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 2: Run the seed**

Run: `npm run db:seed`
Expected: `Seeded.`

- [ ] **Step 3: Verify it is idempotent**

```bash
npm run db:seed
npx tsx -e "import {PrismaClient} from '@prisma/client';const d=new PrismaClient();Promise.all([d.shop.count(),d.product.count(),d.metalType.count(),d.rateLine.count()]).then(([s,p,m,l])=>{console.log({shops:s,products:p,metalTypes:m,rateLines:l});return d.\$disconnect()})"
```
Expected after running the seed twice: `{ shops: 1, products: 3, metalTypes: 4, rateLines: 4 }` — not doubled.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed one shop with its metal types, taxonomy and samples"
```

---

### Task 10: Admin authentication

**Files:**
- Create: `src/auth/session.ts`, `src/middleware.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/login/actions.ts`
- Test: `src/auth/session.test.ts`

**Interfaces:**
- Consumes: `db.ts`
- Produces:
  - `SESSION_COOKIE = 'pj_session'`
  - `signSession(payload: SessionPayload): Promise<string>`
  - `verifySession(token: string): Promise<SessionPayload | null>`
  - `getCurrentAdmin(): Promise<SessionPayload | null>`
  - `sessionCookieOptions`
  - server actions `login(prev, formData)` and `logout()`

- [ ] **Step 1: Write the failing tests**

`src/auth/session.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { signSession, verifySession } from './session';

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-bytes-long!!';
});

describe('session tokens', () => {
  it('round-trips a payload', async () => {
    const token = await signSession({ sub: 'user_1', name: 'Rajat' });
    expect(await verifySession(token)).toMatchObject({ sub: 'user_1', name: 'Rajat' });
  });

  it('rejects a tampered token', async () => {
    const token = await signSession({ sub: 'user_1', name: 'Rajat' });
    expect(await verifySession(token.slice(0, -3) + 'aaa')).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSession({ sub: 'user_1', name: 'Rajat' });
    process.env.SESSION_SECRET = 'a-completely-different-secret-of-length-32!';
    const result = await verifySession(token);
    process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-bytes-long!!';
    expect(result).toBeNull();
  });

  it('rejects nonsense', async () => {
    expect(await verifySession('not-a-jwt')).toBeNull();
    expect(await verifySession('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/auth/session.test.ts`
Expected: FAIL — `Failed to resolve import "./session"`

- [ ] **Step 3: Implement `src/auth/session.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'pj_session';
const SESSION_DAYS = 30;

export interface SessionPayload {
  sub: string;
  name: string;
}

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ name: payload.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== 'string' || typeof payload.name !== 'string') return null;
    return { sub: payload.sub, name: payload.name };
  } catch {
    return null;
  }
}

/** Server-component helper. Null when signed out. */
export async function getCurrentAdmin(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/auth/session.test.ts`
Expected: PASS, 4 tests

- [ ] **Step 5: Implement `src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/auth/session';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin((?!/login).*)'],
};
```

- [ ] **Step 6: Implement the login action and page**

`src/app/admin/login/actions.ts`:
```ts
'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SESSION_COOKIE, signSession, sessionCookieOptions } from '@/auth/session';

export async function login(_prev: { error?: string }, formData: FormData) {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  const user = await db.adminUser.findUnique({ where: { username } });
  // Compare against a dummy hash when the user is absent, so a wrong username
  // and a wrong password take the same time to answer.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    return { error: 'Username ya password galat hai.' };
  }

  const token = await signSession({ sub: user.id, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  redirect(next.startsWith('/admin') ? next : '/admin');
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/admin/login');
}
```

`src/app/admin/login/page.tsx`:
```tsx
'use client';

import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from './actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});
  const next = useSearchParams().get('next') ?? '/admin';

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
      <form action={action} className="w-full max-w-sm bg-white border border-stone-200 rounded p-8 space-y-5">
        <h1 className="text-2xl font-semibold text-stone-900">Admin Login</h1>
        <input type="hidden" name="next" value={next} />

        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Username</span>
          <input name="username" required autoFocus autoComplete="username"
            className="w-full border border-stone-300 rounded px-3 py-2.5 text-base" />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Password</span>
          <input name="password" type="password" required autoComplete="current-password"
            className="w-full border border-stone-300 rounded px-3 py-2.5 text-base" />
        </label>

        {state.error && <p className="text-sm text-red-700">{state.error}</p>}

        <button type="submit" disabled={pending}
          className="w-full bg-stone-900 text-white rounded py-3 text-base font-medium disabled:opacity-60">
          {pending ? 'Ek minute…' : 'Login'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: Verify login works end to end**

Run: `npm run dev`, open `http://localhost:3000/admin`
Expected: redirected to `/admin/login`; the seeded credentials sign you in; a wrong password shows the error without redirecting.

- [ ] **Step 8: Commit**

```bash
git add src/auth/ src/middleware.ts src/app/admin/login/
git commit -m "feat: admin session auth with signed cookie and login page"
```

---

### Task 11: Admin shell

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/components/admin/Nav.tsx`

**Interfaces:**
- Consumes: `auth/session.ts` (`getCurrentAdmin`), `app/admin/login/actions.ts` (`logout`), `lib/shop.ts` (`getShop`)
- Produces: the admin chrome every admin page renders inside

- [ ] **Step 1: Implement `src/components/admin/Nav.tsx`**

```tsx
import Link from 'next/link';
import { logout } from '@/app/admin/login/actions';

const LINKS = [
  { href: '/admin', label: 'Aaj ka Rate' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/metals', label: 'Metal types' },
  { href: '/admin/settings', label: 'Settings' },
];

export function Nav({ shopName, adminName }: { shopName: string; adminName: string }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-5xl mx-auto px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <span className="font-semibold text-stone-900">{shopName}</span>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-stone-600 hover:text-stone-900">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="ml-auto flex items-center gap-3">
          <span className="text-sm text-stone-500">{adminName}</span>
          <button type="submit" className="text-sm text-stone-500 underline">Logout</button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Implement `src/app/admin/layout.tsx`**

```tsx
import type { ReactNode } from 'react';
import { getCurrentAdmin } from '@/auth/session';
import { getShop } from '@/lib/shop';
import { Nav } from '@/components/admin/Nav';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();

  // The login page lives under /admin but renders outside this chrome.
  if (!admin) return <>{children}</>;

  const shop = await getShop();

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav shopName={shop.name} adminName={admin.name} />
      <main className="max-w-5xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, sign in, visit `/admin`
Expected: the nav renders with the seeded shop name and the signed-in admin's name; `/admin/login` renders bare.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/layout.tsx src/components/admin/Nav.tsx
git commit -m "feat: admin shell and navigation"
```

---

### Task 12: Price cache recomputation

**Files:**
- Create: `src/lib/price-cache.server.ts`

**Interfaces:**
- Consumes: `db.ts`, `shop.ts`, `rates.server.ts`, `price-cache.ts`, `pricing/making.ts`
- Produces: `recomputeAllPriceCaches(): Promise<number>` — how many products were updated

- [ ] **Step 1: Implement `src/lib/price-cache.server.ts`**

```ts
// The database-backed counterpart to the pure `priceRange` in price-cache.ts,
// kept separate for the same reason as rates.server.ts.

import { db } from './db';
import { getShop, getPricingConfig } from './shop';
import { getLatestRate } from './rates.server';
import { resolveMakingPercent } from './pricing/making';
import { priceRange } from './price-cache';

/** Nearest-ancestor-first chain above and including each category. */
async function categoryChains(shopId: string) {
  const categories = await db.category.findMany({
    where: { shopId },
    select: { id: true, name: true, parentId: true, makingPercentBp: true },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  const chains = new Map<string, Array<{ name: string; makingPercentBp: number | null }>>();
  for (const category of categories) {
    const chain: Array<{ name: string; makingPercentBp: number | null }> = [];
    let cursor: (typeof categories)[number] | undefined = category;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      chain.push({ name: cursor.name, makingPercentBp: cursor.makingPercentBp });
      cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
    }
    chains.set(category.id, chain);
  }
  return chains;
}

/**
 * Re-price every product against the newest rate.
 *
 * Called whenever a rate is saved, and whenever anything else that feeds the
 * engine changes — a category's making override, the shop's default making
 * charge, GST, or the rounding steps.
 *
 * At the catalog sizes this shop will reach it is a single pass over a few
 * hundred rows: fast enough to run inline, with no queue and no background
 * worker to operate.
 */
export async function recomputeAllPriceCaches(): Promise<number> {
  const latest = await getLatestRate();
  if (!latest) return 0;

  const shop = await getShop();
  const { gstPercentBp, defaultMakingPercentBp, rounding } = await getPricingConfig();
  const chains = await categoryChains(shop.id);

  const products = await db.product.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      makingPercentBp: true,
      stoneValuePaise: true,
      categoryId: true,
      metalType: { select: { key: true } },
      weights: { select: { weightMg: true } },
    },
  });

  const now = new Date();
  let updated = 0;

  for (const product of products) {
    const weightsMg = product.weights.map((w) => w.weightMg);
    const metalKey = product.metalType.key;

    // A product with no weights cannot be priced, and neither can one whose
    // metal type has no line in today's rate — the shop may have added the
    // metal type after entering this morning's rate. Clear the cache rather
    // than leave a number that no longer means anything.
    const priceable =
      weightsMg.length > 0 && Object.prototype.hasOwnProperty.call(latest.rates, metalKey);

    if (!priceable) {
      await db.product.update({
        where: { id: product.id },
        data: { cachedPriceMinPaise: null, cachedPriceMaxPaise: null, cachedAt: now },
      });
      continue;
    }

    const { percentBp } = resolveMakingPercent(
      { makingPercentBp: product.makingPercentBp },
      chains.get(product.categoryId) ?? [],
      defaultMakingPercentBp,
    );

    const { minPaise, maxPaise } = priceRange(
      weightsMg,
      { metalKey, makingPercentBp: percentBp, stoneValuePaise: product.stoneValuePaise },
      latest.rates,
      gstPercentBp,
      rounding,
    );

    await db.product.update({
      where: { id: product.id },
      data: { cachedPriceMinPaise: minPaise, cachedPriceMaxPaise: maxPaise, cachedAt: now },
    });
    updated += 1;
  }

  return updated;
}
```

- [ ] **Step 2: Verify the pure tests are untouched**

Run: `npm test && npm run typecheck`
Expected: every unit test still PASSES, no type errors.

- [ ] **Step 3: Verify the recomputation against the seeded data**

The admin screen that calls this arrives in Task 14, so drive it directly:

```bash
npx tsx -e "import('./src/lib/price-cache.server.ts').then(async m=>console.log('updated',await m.recomputeAllPriceCaches()))"
npx tsx -e "import {PrismaClient} from '@prisma/client';const d=new PrismaClient();d.product.findMany({select:{slug:true,cachedPriceMinPaise:true,cachedPriceMaxPaise:true}}).then(r=>{console.table(r);return d.\$disconnect()})"
```

Expected: `updated 3`, and all three seeded products carry a non-null min and max.
Traditional Payal (22K, 20/23/25g, 15% making, seeded rate Rs 12,400/g) must show
`cachedPriceMinPaise` 29380000 and `cachedPriceMaxPaise` 36720000 — the same
figures the engine tests assert in Task 4.

If the first script fails because `react`'s `cache()` wants a request scope, do
not work around it — skip this step, finish Task 14, and verify there instead by
saving a rate in the admin UI and running only the second script. The figures to
check are the same.

- [ ] **Step 4: Commit**

```bash
git add src/lib/price-cache.server.ts
git commit -m "feat: recompute every product price cache against the latest rate"
```

---

### Task 13: Metal type management

The screen that makes this sellable. A shop adds Silver 925 here, and tomorrow's rate screen has a box for it.

**Files:**
- Create: `src/app/admin/metals/page.tsx`, `src/app/admin/metals/actions.ts`

**Interfaces:**
- Consumes: `db.ts`, `shop.ts`, `price-cache.server.ts`
- Produces: server actions `createMetalType(prev, formData)`, `updateMetalType(id, formData)`, `deactivateMetalType(id)`

- [ ] **Step 1: Implement `src/app/admin/metals/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

const metalSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Key zaroori hai')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key sirf BADE akshar, number aur _ me likhiye, jaise SILVER_925'),
  label: z.string().trim().min(1, 'Label zaroori hai'),
});

export type MetalState = { error?: string };

export async function createMetalType(_prev: MetalState, formData: FormData): Promise<MetalState> {
  const parsed = metalSchema.safeParse({ key: formData.get('key'), label: formData.get('label') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const shop = await getShop();
  const existing = await db.metalType.findUnique({
    where: { shopId_key: { shopId: shop.id, key: parsed.data.key } },
  });
  if (existing) return { error: `"${parsed.data.key}" pehle se maujood hai.` };

  const count = await db.metalType.count({ where: { shopId: shop.id } });
  await db.metalType.create({
    data: { shopId: shop.id, key: parsed.data.key, label: parsed.data.label, sortOrder: count },
  });

  revalidatePath('/admin/metals');
  revalidatePath('/admin');
  return {};
}

/** The key is deliberately not editable: products and rate history point at it. */
export async function updateMetalType(id: string, formData: FormData) {
  const label = String(formData.get('label') ?? '').trim();
  if (!label) throw new Error('Label khaali nahi ho sakta');

  await db.metalType.update({ where: { id }, data: { label } });
  revalidatePath('/admin/metals');
  revalidatePath('/admin');
}

/**
 * Deactivated, never deleted. Rate history and existing products still reference
 * it; removing the row would erase what past prices were computed from.
 */
export async function deactivateMetalType(id: string) {
  const inUse = await db.product.count({ where: { metalTypeId: id } });
  if (inUse > 0) {
    throw new Error(`${inUse} product is metal type par hain. Pehle unhe badaliye.`);
  }

  await db.metalType.update({ where: { id }, data: { isActive: false } });
  await recomputeAllPriceCaches();
  revalidatePath('/admin/metals');
  revalidatePath('/admin');
}
```

- [ ] **Step 2: Implement `src/app/admin/metals/page.tsx`**

```tsx
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { createMetalType, updateMetalType, deactivateMetalType } from './actions';

export const dynamic = 'force-dynamic';

export default async function MetalsPage() {
  const shop = await getShop();
  const metals = await db.metalType.findMany({
    where: { shopId: shop.id },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">Metal types</h1>
        <p className="text-stone-600 mt-1 max-w-2xl">
          Aapki dukaan kaun-kaun se metal aur purity me kaam karti hai. Yahan naya
          jodte hi <strong>Aaj ka Rate</strong> screen par uska box apne aap aa jayega.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
        {metals.map((m) => (
          <div key={m.id} className="p-4 flex flex-wrap items-center gap-3">
            <code className="text-sm text-stone-500 min-w-36">{m.key}</code>
            <form action={updateMetalType.bind(null, m.id)} className="flex items-center gap-3 flex-1 min-w-60">
              <input name="label" defaultValue={m.label}
                className="border border-stone-300 rounded px-3 py-2 flex-1" />
              <button type="submit" className="text-sm underline text-stone-700">Save</button>
            </form>
            <span className="text-sm text-stone-500 min-w-24">{m._count.products} products</span>
            {m.isActive ? (
              <form action={deactivateMetalType.bind(null, m.id)}>
                <button type="submit" className="text-sm underline text-stone-500">Band karein</button>
              </form>
            ) : (
              <span className="text-xs rounded-full px-2.5 py-1 bg-stone-100 text-stone-600">band</span>
            )}
          </div>
        ))}
      </div>

      <form action={async (fd: FormData) => { 'use server'; await createMetalType({}, fd); }}
        className="bg-white border border-stone-200 rounded p-5 flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Key</span>
          <input name="key" required placeholder="SILVER_925"
            className="border border-stone-300 rounded px-3 py-2 font-mono" />
          <span className="block text-xs text-stone-500">Baad me badla nahi ja sakta</span>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Label</span>
          <input name="label" required placeholder="Silver 925"
            className="border border-stone-300 rounded px-3 py-2" />
        </label>
        <button type="submit" className="bg-stone-900 text-white rounded px-6 py-2.5">Add</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run `npm run dev`, open `/admin/metals`. Add `SILVER_925` / `Silver 925`, then open
`/admin` and confirm a fifth rate input has appeared with no code change.
(The rate screen arrives in Task 14; if running these in order, verify this step
after Task 14 and note it here.)

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/metals/
git commit -m "feat: metal type management — a shop defines its own purities"
```

---

### Task 14: The daily rate screen

The one screen the shop uses every morning. It must stay a thirty-second job, and it builds itself from the shop's metal types.

**Files:**
- Create: `src/app/admin/page.tsx`, `src/app/admin/actions.ts`, `src/components/admin/RateForm.tsx`

**Interfaces:**
- Consumes: `shop.ts` (`getShop`, `getMetalTypes`), `rates.server.ts` (`getLatestRate`), `rates.ts` (`rateStatus`), `money.ts`, `price-cache.server.ts`
- Produces: server action `saveRate(prev, formData)`; form fields are named `rate_<metalTypeId>`

- [ ] **Step 1: Implement `src/app/admin/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { rupeesToPaise } from '@/lib/money';
import { getShop, getMetalTypes } from '@/lib/shop';
import { getCurrentAdmin } from '@/auth/session';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

export type SaveRateState = { error?: string; savedAt?: string };

export async function saveRate(_prev: SaveRateState, formData: FormData): Promise<SaveRateState> {
  const admin = await getCurrentAdmin();
  if (!admin) return { error: 'Session khatam ho gaya. Dobara login kariye.' };

  const shop = await getShop();
  const metals = await getMetalTypes();
  if (metals.length === 0) {
    return { error: 'Pehle Metal types me kam se kam ek metal jodiye.' };
  }

  // One field per metal type, so adding a metal type needs no change here.
  const lines: Array<{ metalTypeId: string; pricePerGramPaise: number }> = [];
  for (const metal of metals) {
    const raw = String(formData.get(`rate_${metal.id}`) ?? '').trim();
    const rupees = Number(raw);

    if (raw === '' || !Number.isFinite(rupees) || rupees <= 0 || rupees > 1_000_000) {
      return { error: `${metal.label} ka rate sahi number me bhariye.` };
    }
    lines.push({ metalTypeId: metal.id, pricePerGramPaise: rupeesToPaise(rupees) });
  }

  await db.rate.create({
    data: { shopId: shop.id, enteredBy: admin.name, lines: { create: lines } },
  });

  await recomputeAllPriceCaches();
  revalidatePath('/', 'layout');

  return { savedAt: new Date().toISOString() };
}
```

- [ ] **Step 2: Implement `src/components/admin/RateForm.tsx`**

```tsx
'use client';

import { useActionState, useState } from 'react';
import { saveRate, type SaveRateState } from '@/app/admin/actions';

export interface RateField {
  metalTypeId: string;
  label: string;
  /** Rupees per gram at the last save. 0 when this metal has no rate yet. */
  previousRupees: number;
}

/** A single rate moving more than this much needs a second confirmation. */
const BIG_CHANGE_PERCENT = 10;

export function RateForm({ fields }: { fields: RateField[] }) {
  const [state, action, pending] = useActionState<SaveRateState, FormData>(saveRate, {});
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.metalTypeId, f.previousRupees ? String(f.previousRupees) : ''])),
  );

  const changes = fields.map((f) => {
    const next = Number(values[f.metalTypeId]);
    const pct =
      f.previousRupees > 0 && Number.isFinite(next) && next > 0
        ? ((next - f.previousRupees) / f.previousRupees) * 100
        : 0;
    return { ...f, next, pct };
  });

  const big = changes.filter((c) => Math.abs(c.pct) >= BIG_CHANGE_PERCENT);

  function confirmBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (big.length === 0) return;
    const lines = big.map(
      (c) => `${c.label}: ₹${c.previousRupees.toLocaleString('en-IN')} → ₹${c.next.toLocaleString('en-IN')} (${c.pct > 0 ? '+' : ''}${c.pct.toFixed(1)}%)`,
    );
    // A confirm() dialog is deliberate here: it is the last stop before a typo
    // reaches every price on the website.
    if (!window.confirm(`Ye bada badlaav hai:\n\n${lines.join('\n')}\n\nSahi hai?`)) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmBeforeSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {changes.map((f) => (
          <label key={f.metalTypeId} className="block bg-white border border-stone-200 rounded p-5 space-y-2">
            <span className="block text-base font-medium text-stone-900">{f.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-lg text-stone-400">₹</span>
              <input
                name={`rate_${f.metalTypeId}`}
                inputMode="decimal"
                required
                value={values[f.metalTypeId]}
                onChange={(e) => setValues((v) => ({ ...v, [f.metalTypeId]: e.target.value }))}
                className="w-full border border-stone-300 rounded px-3 py-3 text-xl tabular-nums"
              />
              <span className="text-sm text-stone-500 whitespace-nowrap">/ gram</span>
            </div>
            <span className={`block text-sm ${Math.abs(f.pct) >= BIG_CHANGE_PERCENT ? 'text-amber-700 font-medium' : 'text-stone-500'}`}>
              {f.previousRupees > 0
                ? `Kal: ₹${f.previousRupees.toLocaleString('en-IN')}${f.pct !== 0 ? ` · ${f.pct > 0 ? '+' : ''}${f.pct.toFixed(1)}%` : ''}`
                : 'Pehli baar'}
            </span>
          </label>
        ))}
      </div>

      {state.error && <p className="text-red-700">{state.error}</p>}
      {state.savedAt && <p className="text-green-800">Rate save ho gaya. Poori website update ho gayi.</p>}

      <button type="submit" disabled={pending}
        className="w-full sm:w-auto bg-stone-900 text-white rounded px-10 py-4 text-lg font-medium disabled:opacity-60">
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Implement `src/app/admin/page.tsx`**

```tsx
import Link from 'next/link';
import { getShop, getMetalTypes } from '@/lib/shop';
import { getLatestRate } from '@/lib/rates.server';
import { rateStatus } from '@/lib/rates';
import { RateForm, type RateField } from '@/components/admin/RateForm';

export const dynamic = 'force-dynamic';

export default async function DailyRatePage() {
  const [shop, metals, latest] = await Promise.all([getShop(), getMetalTypes(), getLatestRate()]);

  const status = latest
    ? rateStatus(latest.enteredAt, new Date(), shop.rateWarnHours, shop.rateStaleHours)
    : 'STALE';

  const fields: RateField[] = metals.map((m) => ({
    metalTypeId: m.id,
    label: m.label,
    previousRupees: (latest?.rates[m.key] ?? 0) / 100,
  }));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">Aaj ka Rate</h1>
        <p className="text-stone-600 mt-1">
          Rate bhariye aur Save dabaiye. Poori website apne aap update ho jayegi.
        </p>
      </div>

      {status !== 'FRESH' && (
        <div className="border border-amber-300 bg-amber-50 rounded p-4 text-amber-900">
          <strong>Rate purana hai.</strong>{' '}
          {latest
            ? `Aakhri baar ${latest.enteredAt.toLocaleString('en-IN')} ko update hua tha.`
            : 'Abhi tak koi rate nahi daala gaya.'}
        </div>
      )}

      {metals.length === 0 ? (
        <div className="border border-stone-300 bg-white rounded p-6">
          <p className="text-stone-700">
            Abhi koi metal type nahi hai. Pehle{' '}
            <Link href="/admin/metals" className="underline">Metal types</Link> me
            batayiye ki aapki dukaan kis-kis purity me kaam karti hai.
          </p>
        </div>
      ) : (
        <RateForm fields={fields} />
      )}

      {latest && (
        <p className="text-sm text-stone-500">
          Aakhri update: {latest.enteredAt.toLocaleString('en-IN')} · {latest.enteredBy}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify the whole loop**

Run `npm run dev`, sign in, and change the 22K rate. Then:

```bash
npx tsx -e "import {PrismaClient} from '@prisma/client';const d=new PrismaClient();d.product.findMany({select:{slug:true,cachedPriceMinPaise:true,cachedPriceMaxPaise:true}}).then(r=>{console.table(r);return d.\$disconnect()})"
```

Expected: every product's cached range moved with the rate. Then:
- Raise a rate by more than 10% and confirm the second confirmation appears.
- Add `SILVER_925` under `/admin/metals`, return to `/admin`, and confirm a fifth
  input is there — the proof that metal types are data and not code.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/actions.ts src/components/admin/RateForm.tsx
git commit -m "feat: daily rate screen, built from the shop's own metal types"
```

---

### Task 15: Category management

**Files:**
- Create: `src/app/admin/categories/page.tsx`, `src/app/admin/categories/actions.ts`

**Interfaces:**
- Consumes: `db.ts`, `shop.ts`, `price-cache.server.ts`
- Produces: server actions `createCategory(prev, formData)`, `updateCategory(id, formData)`, `deleteCategory(id)`

- [ ] **Step 1: Implement `src/app/admin/categories/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** "" means inherit. A real number becomes basis points. */
function toBp(value: string | null | undefined): number | null {
  const raw = (value ?? '').trim();
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error('Making charge 0 se 100 ke beech hona chahiye');
  }
  return Math.round(n * 100);
}

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Naam zaroori hai'),
  parentId: z.string().optional().transform((v) => (v ? v : null)),
});

export type CategoryState = { error?: string };

export async function createCategory(_prev: CategoryState, formData: FormData): Promise<CategoryState> {
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    parentId: formData.get('parentId'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const shop = await getShop();
  const slug = slugify(parsed.data.name);

  const clash = await db.category.findUnique({ where: { shopId_slug: { shopId: shop.id, slug } } });
  if (clash) return { error: `"${parsed.data.name}" pehle se hai.` };

  try {
    await db.category.create({
      data: {
        shopId: shop.id,
        name: parsed.data.name,
        slug,
        parentId: parsed.data.parentId,
        makingPercentBp: toBp(formData.get('makingPercent') as string | null),
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Category save nahi hui' };
  }

  await recomputeAllPriceCaches();
  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
  return {};
}

export async function updateCategory(id: string, formData: FormData) {
  await db.category.update({
    where: { id },
    data: {
      name: String(formData.get('name') ?? '').trim(),
      makingPercentBp: toBp(formData.get('makingPercent') as string | null),
    },
  });

  // A category's making override feeds the engine for every product under it.
  await recomputeAllPriceCaches();
  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
}

export async function deleteCategory(id: string) {
  const [productCount, childCount] = await Promise.all([
    db.product.count({ where: { categoryId: id } }),
    db.category.count({ where: { parentId: id } }),
  ]);

  if (productCount > 0) throw new Error(`Is category me ${productCount} product hain. Pehle unhe hataiye.`);
  if (childCount > 0) throw new Error(`Is category ke andar ${childCount} aur category hain.`);

  await db.category.delete({ where: { id } });
  revalidatePath('/admin/categories');
  revalidatePath('/', 'layout');
}
```

- [ ] **Step 2: Implement `src/app/admin/categories/page.tsx`**

```tsx
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { createCategory, updateCategory, deleteCategory } from './actions';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const shop = await getShop();
  const categories = await db.category.findMany({
    where: { shopId: shop.id },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    include: { parent: { select: { name: true } }, _count: { select: { products: true } } },
  });

  const defaultPercent = shop.defaultMakingPercentBp / 100;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">Categories</h1>
        <p className="text-stone-600 mt-1">
          Making charge khaali chhod dijiye to default <strong>{defaultPercent}%</strong> lagega.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
        {categories.map((c) => (
          <div key={c.id} className="p-4 flex flex-wrap items-center gap-3">
            <form action={updateCategory.bind(null, c.id)} className="flex flex-wrap items-center gap-3 flex-1">
              <input name="name" defaultValue={c.name}
                className="border border-stone-300 rounded px-3 py-2 flex-1 min-w-45" />
              <span className="text-sm text-stone-500 min-w-32">
                {c.parent ? `under ${c.parent.name}` : 'top level'}
              </span>
              <label className="flex items-center gap-2 text-sm">
                <input name="makingPercent" inputMode="decimal" placeholder={String(defaultPercent)}
                  defaultValue={c.makingPercentBp === null ? '' : String(c.makingPercentBp / 100)}
                  className="w-20 border border-stone-300 rounded px-2 py-2 tabular-nums" />
                <span className="text-stone-500">% making</span>
              </label>
              <button type="submit" className="text-sm underline text-stone-700">Save</button>
            </form>
            <span className="text-sm text-stone-500 min-w-24">{c._count.products} products</span>
            <form action={deleteCategory.bind(null, c.id)}>
              <button type="submit" className="text-sm underline text-stone-500">Hataiye</button>
            </form>
          </div>
        ))}
      </div>

      <form action={async (fd: FormData) => { 'use server'; await createCategory({}, fd); }}
        className="bg-white border border-stone-200 rounded p-5 flex flex-wrap items-end gap-3">
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Nayi category</span>
          <input name="name" required className="border border-stone-300 rounded px-3 py-2" />
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Parent</span>
          <select name="parentId" className="border border-stone-300 rounded px-3 py-2">
            <option value="">— top level —</option>
            {categories.filter((c) => !c.parentId).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block text-sm text-stone-600">Making %</span>
          <input name="makingPercent" inputMode="decimal" placeholder={String(defaultPercent)}
            className="w-24 border border-stone-300 rounded px-3 py-2 tabular-nums" />
        </label>
        <button type="submit" className="bg-stone-900 text-white rounded px-6 py-2.5">Add</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run `npm run dev`, open `/admin/categories`. Set Payal to 12%, save, then confirm
Traditional Payal's cached range fell relative to its 15% value (min was
29380000; at 12% it must be lower). Set it back to blank afterwards.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/categories/
git commit -m "feat: category management with making-charge overrides"
```

---

### Task 16: Image upload pipeline

**Files:**
- Create: `src/lib/images.ts`
- Test: `src/lib/images.test.ts`

**Interfaces:**
- Consumes: `sharp`, `node:crypto`, `node:fs/promises`
- Produces:
  - `IMAGE_WIDTHS = [400, 800, 1600] as const`
  - `variantPath(basePath: string, width: number, format: 'avif' | 'webp'): string`
  - `processUpload(buffer: Buffer, uploadDir: string): Promise<{ basePath: string; width: number; height: number }>`

- [ ] **Step 1: Write the failing tests**

`src/lib/images.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/images.test.ts`
Expected: FAIL — `Failed to resolve import "./images"`

- [ ] **Step 3: Implement `src/lib/images.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/images.test.ts`
Expected: PASS, 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/images.ts src/lib/images.test.ts
git commit -m "feat: content-hashed AVIF/WebP image variant pipeline"
```

---

### Task 17: Product management

The largest admin surface. Creates and edits products, their weight options, images and attributes.

**Files:**
- Create: `src/app/admin/products/page.tsx`, `src/app/admin/products/actions.ts`, `src/app/admin/products/new/page.tsx`, `src/app/admin/products/[id]/page.tsx`, `src/components/admin/ProductForm.tsx`

**Interfaces:**
- Consumes: `db.ts`, `shop.ts`, `weights.ts` (`parseWeights`), `images.ts`, `price-cache.server.ts`, `pricing/making.ts`, `money.ts`
- Produces: server actions `saveProduct(id: string | null, prev, formData)` and `deleteProduct(id)`

- [ ] **Step 1: Implement `src/app/admin/products/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import path from 'node:path';
import { db } from '@/lib/db';
import { rupeesToPaise } from '@/lib/money';
import { parseWeights } from '@/lib/weights';
import { processUpload } from '@/lib/images';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product ka naam zaroori hai'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Category chuniye'),
  metalTypeId: z.string().min(1, 'Metal type chuniye'),
  status: z.enum(['DRAFT', 'LIVE']),
  featured: z.coerce.boolean(),
  stoneValue: z.coerce.number().min(0).default(0),
  stoneDescription: z.string().optional(),
  weights: z.string().min(1, 'Kam se kam ek weight daaliye'),
});

export type SaveProductState = { error?: string };

export async function saveProduct(
  id: string | null,
  _prev: SaveProductState,
  formData: FormData,
): Promise<SaveProductState> {
  const shop = await getShop();

  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    categoryId: formData.get('categoryId'),
    metalTypeId: formData.get('metalTypeId'),
    status: formData.get('status'),
    featured: formData.get('featured') === 'on',
    stoneValue: formData.get('stoneValue') || 0,
    stoneDescription: formData.get('stoneDescription'),
    weights: formData.get('weights'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let weightsMg: number[];
  try {
    weightsMg = parseWeights(parsed.data.weights);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Weight galat hai' };
  }

  const makingRaw = String(formData.get('makingPercent') ?? '').trim();
  let makingPercentBp: number | null = null;
  if (makingRaw !== '') {
    const n = Number(makingRaw);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return { error: 'Making charge 0 se 100 ke beech hona chahiye' };
    }
    makingPercentBp = Math.round(n * 100);
  }

  const data = {
    name: parsed.data.name,
    description: parsed.data.description || null,
    categoryId: parsed.data.categoryId,
    metalTypeId: parsed.data.metalTypeId,
    status: parsed.data.status,
    featured: parsed.data.featured,
    stoneValuePaise: rupeesToPaise(parsed.data.stoneValue),
    stoneDescription: parsed.data.stoneDescription || null,
    makingPercentBp,
  };

  let productId: string;
  if (id) {
    const updated = await db.product.update({ where: { id }, data });
    productId = updated.id;
  } else {
    const slug = slugify(parsed.data.name);
    const clash = await db.product.findUnique({ where: { shopId_slug: { shopId: shop.id, slug } } });
    if (clash) return { error: `"${parsed.data.name}" naam ka product pehle se hai.` };

    const created = await db.product.create({ data: { ...data, shopId: shop.id, slug } });
    productId = created.id;
  }

  // Replace the weight set wholesale — simpler and safer than diffing, and the
  // sets are three or four rows.
  await db.productWeight.deleteMany({ where: { productId } });
  await db.productWeight.createMany({
    data: weightsMg.map((weightMg, sortOrder) => ({ productId, weightMg, sortOrder })),
  });

  // Attributes
  const attributeIds = formData.getAll('attributeIds').map(String).filter(Boolean);
  await db.productAttribute.deleteMany({ where: { productId } });
  if (attributeIds.length > 0) {
    await db.productAttribute.createMany({
      data: attributeIds.map((attributeId) => ({ productId, attributeId })),
    });
  }

  // Images — appended, never replaced, so an edit does not drop existing photos.
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads');
  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0);
  const existingCount = await db.productImage.count({ where: { productId } });

  for (const [i, file] of files.entries()) {
    try {
      const processed = await processUpload(Buffer.from(await file.arrayBuffer()), uploadDir);
      await db.productImage.create({
        data: {
          productId,
          basePath: processed.basePath,
          alt: parsed.data.name,
          width: processed.width,
          height: processed.height,
          sortOrder: existingCount + i,
          isPrimary: existingCount === 0 && i === 0,
        },
      });
    } catch (e) {
      return { error: `Photo upload nahi hui: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  await recomputeAllPriceCaches();
  revalidatePath('/admin/products');
  revalidatePath('/', 'layout');
  redirect('/admin/products');
}

export async function deleteProduct(id: string) {
  await db.product.delete({ where: { id } });
  revalidatePath('/admin/products');
  revalidatePath('/', 'layout');
}
```

- [ ] **Step 2: Implement `src/components/admin/ProductForm.tsx`**

```tsx
'use client';

import { useActionState } from 'react';
import { saveProduct, type SaveProductState } from '@/app/admin/products/actions';

export interface ProductFormData {
  id: string | null;
  name: string;
  description: string;
  categoryId: string;
  metalTypeId: string;
  status: string;
  featured: boolean;
  stoneValueRupees: number;
  stoneDescription: string;
  makingPercent: string;
  weightsGrams: string;
  attributeIds: string[];
}

export interface ProductFormOptions {
  categories: Array<{ id: string; name: string }>;
  metalTypes: Array<{ id: string; label: string }>;
  attributeGroups: Array<{ id: string; name: string; attributes: Array<{ id: string; name: string }> }>;
  /** What the making charge resolves to if this product's own override is blank. */
  inheritedMakingLabel: string;
}

const field = 'w-full border border-stone-300 rounded px-3 py-2.5';

export function ProductForm({ product, options }: { product: ProductFormData; options: ProductFormOptions }) {
  const bound = saveProduct.bind(null, product.id);
  const [state, formAction, pending] = useActionState<SaveProductState, FormData>(bound, {});

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Product ka naam</span>
        <input name="name" required defaultValue={product.name} className={field} />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Description</span>
        <textarea name="description" rows={3} defaultValue={product.description} className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Category</span>
          <select name="categoryId" required defaultValue={product.categoryId} className={field}>
            <option value="">— chuniye —</option>
            {options.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Metal type</span>
          <select name="metalTypeId" required defaultValue={product.metalTypeId} className={field}>
            <option value="">— chuniye —</option>
            {options.metalTypes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <span className="block text-xs text-stone-500">
            Isi ka daily rate is product ka price banata hai.
          </span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Status</span>
          <select name="status" defaultValue={product.status} className={field}>
            <option value="DRAFT">Draft — website par nahi dikhega</option>
            <option value="LIVE">Live — website par dikhega</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Available weights (gram)</span>
        <input name="weights" required defaultValue={product.weightsGrams} placeholder="20, 23, 25" className={field} />
        <span className="block text-xs text-stone-500">
          Comma se alag kariye. Heere wale product me sirf metal ka weight likhiye, heere ka nahi.
        </span>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Making charge %</span>
        <input name="makingPercent" inputMode="decimal" defaultValue={product.makingPercent} className={field} />
        <span className="block text-xs text-stone-500">
          Khaali chhodiye to <strong>{options.inheritedMakingLabel}</strong> lagega.
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Heere / patthar ki keemat (₹)</span>
          <input name="stoneValue" inputMode="decimal" defaultValue={product.stoneValueRupees || ''} className={field} />
          <span className="block text-xs text-stone-500">Ye weight ke saath nahi badalta.</span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-stone-600">Heere ka vivaran</span>
          <input name="stoneDescription" defaultValue={product.stoneDescription} placeholder="0.50ct" className={field} />
        </label>
      </div>

      {options.attributeGroups.map((group) => (
        <fieldset key={group.id} className="space-y-2">
          <legend className="text-sm text-stone-600">{group.name}</legend>
          <div className="flex flex-wrap gap-3">
            {group.attributes.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="attributeIds" value={a.id}
                  defaultChecked={product.attributeIds.includes(a.id)} />
                {a.name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <label className="block space-y-1.5">
        <span className="text-sm text-stone-600">Photos</span>
        <input type="file" name="images" accept="image/*" multiple className={field} />
        <span className="block text-xs text-stone-500">Purani photos hategi nahi, nayi jud jayengi.</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={product.featured} />
        Home page par dikhaiye
      </label>

      {state.error && <p className="text-red-700">{state.error}</p>}

      <button type="submit" disabled={pending}
        className="bg-stone-900 text-white rounded px-8 py-3 text-base disabled:opacity-60">
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Implement the product list page**

`src/app/admin/products/page.tsx`:
```tsx
import Link from 'next/link';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { formatINR } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const shop = await getShop();
  const products = await db.product.findMany({
    where: { shopId: shop.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      category: { select: { name: true } },
      metalType: { select: { label: true } },
      _count: { select: { weights: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-semibold text-stone-900">Products</h1>
        <Link href="/admin/products/new" className="ml-auto bg-stone-900 text-white rounded px-6 py-2.5">
          Naya product
        </Link>
      </div>

      <div className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
        {products.length === 0 && <p className="p-6 text-stone-500">Abhi koi product nahi hai.</p>}
        {products.map((p) => (
          <Link key={p.id} href={`/admin/products/${p.id}`}
            className="p-4 flex flex-wrap items-center gap-4 hover:bg-stone-50">
            <span className="font-medium text-stone-900 flex-1 min-w-45">{p.name}</span>
            <span className="text-sm text-stone-500 min-w-24">{p.category.name}</span>
            <span className="text-sm text-stone-500 min-w-24">{p.metalType.label}</span>
            <span className="text-sm text-stone-500 min-w-20">{p._count.weights} weights</span>
            <span className="text-sm tabular-nums text-stone-700 min-w-40">
              {p.cachedPriceMinPaise !== null && p.cachedPriceMaxPaise !== null
                ? `${formatINR(p.cachedPriceMinPaise)} – ${formatINR(p.cachedPriceMaxPaise)}`
                : 'aaj ka rate nahi hai'}
            </span>
            <span className={`text-xs rounded-full px-2.5 py-1 ${p.status === 'LIVE' ? 'bg-green-100 text-green-900' : 'bg-stone-100 text-stone-600'}`}>
              {p.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement the new and edit pages**

`src/app/admin/products/new/page.tsx`:
```tsx
import { db } from '@/lib/db';
import { getShop, getMetalTypes } from '@/lib/shop';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const shop = await getShop();
  const [categories, metalTypes, attributeGroups] = await Promise.all([
    db.category.findMany({ where: { shopId: shop.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getMetalTypes(),
    db.attributeGroup.findMany({
      where: { shopId: shop.id },
      orderBy: { sortOrder: 'asc' },
      include: { attributes: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-stone-900">Naya product</h1>
      <ProductForm
        product={{
          id: null, name: '', description: '', categoryId: '', metalTypeId: '',
          status: 'DRAFT', featured: false, stoneValueRupees: 0, stoneDescription: '',
          makingPercent: '', weightsGrams: '', attributeIds: [],
        }}
        options={{
          categories,
          metalTypes: metalTypes.map((m) => ({ id: m.id, label: m.label })),
          attributeGroups,
          inheritedMakingLabel: `default ${shop.defaultMakingPercentBp / 100}%`,
        }}
      />
    </div>
  );
}
```

`src/app/admin/products/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getShop, getMetalTypes } from '@/lib/shop';
import { resolveMakingPercent } from '@/lib/pricing/making';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

/** Nearest-ancestor-first chain above and including a category. */
async function chainFor(categoryId: string) {
  const chain: Array<{ name: string; makingPercentBp: number | null }> = [];
  let id: string | null = categoryId;
  const seen = new Set<string>();

  while (id && !seen.has(id)) {
    seen.add(id);
    const c: { name: string; makingPercentBp: number | null; parentId: string | null } | null =
      await db.category.findUnique({
        where: { id },
        select: { name: true, makingPercentBp: true, parentId: true },
      });
    if (!c) break;
    chain.push({ name: c.name, makingPercentBp: c.makingPercentBp });
    id = c.parentId;
  }
  return chain;
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await getShop();

  const product = await db.product.findUnique({
    where: { id },
    include: {
      weights: { orderBy: { sortOrder: 'asc' } },
      attributes: { select: { attributeId: true } },
    },
  });
  if (!product || product.shopId !== shop.id) notFound();

  const [categories, metalTypes, attributeGroups, chain] = await Promise.all([
    db.category.findMany({ where: { shopId: shop.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getMetalTypes(),
    db.attributeGroup.findMany({
      where: { shopId: shop.id },
      orderBy: { sortOrder: 'asc' },
      include: { attributes: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } } },
    }),
    chainFor(product.categoryId),
  ]);

  // What WOULD apply if this product's own override were cleared, so the admin
  // can see the inherited value without deleting anything first.
  const inherited = resolveMakingPercent({ makingPercentBp: null }, chain, shop.defaultMakingPercentBp);
  const inheritedMakingLabel =
    inherited.source.kind === 'category'
      ? `${inherited.percentBp / 100}% (${inherited.source.categoryName} category se)`
      : `${inherited.percentBp / 100}% (default se)`;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-stone-900">{product.name}</h1>
      <ProductForm
        product={{
          id: product.id,
          name: product.name,
          description: product.description ?? '',
          categoryId: product.categoryId,
          metalTypeId: product.metalTypeId,
          status: product.status,
          featured: product.featured,
          stoneValueRupees: product.stoneValuePaise / 100,
          stoneDescription: product.stoneDescription ?? '',
          makingPercent: product.makingPercentBp === null ? '' : String(product.makingPercentBp / 100),
          weightsGrams: product.weights.map((w) => w.weightMg / 1000).join(', '),
          attributeIds: product.attributes.map((a) => a.attributeId),
        }}
        options={{
          categories,
          metalTypes: metalTypes.map((m) => ({ id: m.id, label: m.label })),
          attributeGroups,
          inheritedMakingLabel,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run `npm run dev`. Create a product: weights `20, 23, 25`, metal type Gold 22K,
making blank, status LIVE, one photo. Confirm:
- the form reports the inherited making value and where it came from
- the list shows a price range matching Traditional Payal's
- `public/uploads` gained six variant files
- editing the product and saving again does not remove the existing photo

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/products/ src/components/admin/ProductForm.tsx
git commit -m "feat: product management with weights, images, attributes and making inheritance"
```

---

### Task 18: Shop settings and branding

**Files:**
- Create: `src/app/admin/settings/page.tsx`, `src/app/admin/settings/form.tsx`, `src/app/admin/settings/actions.ts`

**Interfaces:**
- Consumes: `db.ts`, `shop.ts`, `price-cache.server.ts`
- Produces: server action `saveSettings(prev, formData)`

- [ ] **Step 1: Implement `src/app/admin/settings/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getShop } from '@/lib/shop';
import { recomputeAllPriceCaches } from '@/lib/price-cache.server';

const percentToBp = z.coerce.number().min(0).max(100).transform((n) => Math.round(n * 100));
const rupeesToPaiseField = z.coerce.number().positive().transform((n) => Math.round(n * 100));
const hexColour = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colour #RRGGBB me likhiye');
const optional = z.string().optional();

const settingsSchema = z.object({
  name: z.string().trim().min(1),
  tagline: optional,
  brandPrimary: hexColour,
  brandInk: hexColour,
  brandGround: hexColour,
  fontDisplay: z.string().trim().min(1),
  fontBody: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  whatsapp: z.string().trim().min(1),
  email: z.string().email(),
  addressLine1: z.string().trim().min(1),
  addressLine2: optional,
  city: z.string().trim().min(1),
  state: z.string().trim().min(1),
  pincode: z.string().trim().min(1),
  mapUrl: optional,
  hoursText: z.string().trim().min(1),
  instagramUrl: optional,
  facebookUrl: optional,
  defaultMakingPercentBp: percentToBp,
  gstPercentBp: percentToBp,
  roundingStepPaise: rupeesToPaiseField,
  roundingSmallStepPaise: rupeesToPaiseField,
  roundingThresholdPaise: rupeesToPaiseField,
  priceDisclaimer: z.string().trim().min(1),
  rateWarnHours: z.coerce.number().int().positive(),
  rateStaleHours: z.coerce.number().int().positive(),
  rateBannerText: z.string().trim().min(1),
  heroHeading: z.string().trim().min(1),
  heroSubheading: z.string().trim().min(1),
  seoLocations: z.string().trim().min(1),
});

export type SaveSettingsState = { error?: string; saved?: boolean };

export async function saveSettings(_prev: SaveSettingsState, formData: FormData): Promise<SaveSettingsState> {
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join('.')}: ${issue.message}` };
  }
  if (parsed.data.rateStaleHours <= parsed.data.rateWarnHours) {
    return { error: 'Banner ke ghante warning ke ghanton se zyada hone chahiye.' };
  }

  const shop = await getShop();
  await db.shop.update({
    where: { id: shop.id },
    data: {
      ...parsed.data,
      tagline: parsed.data.tagline || null,
      addressLine2: parsed.data.addressLine2 || null,
      mapUrl: parsed.data.mapUrl || null,
      instagramUrl: parsed.data.instagramUrl || null,
      facebookUrl: parsed.data.facebookUrl || null,
    },
  });

  // The making default, GST and the rounding steps all feed the price engine.
  await recomputeAllPriceCaches();
  revalidatePath('/', 'layout');
  return { saved: true };
}
```

- [ ] **Step 2: Implement `src/app/admin/settings/form.tsx`**

```tsx
'use client';

import type { ReactNode } from 'react';
import { useActionState } from 'react';
import { saveSettings, type SaveSettingsState } from './actions';

const field = 'w-full border border-stone-300 rounded px-3 py-2.5';

function Text({ name, label, value, hint, type = 'text' }: {
  name: string; label: string; value: string; hint?: string; type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-stone-600">{label}</span>
      <input name={name} type={type} defaultValue={value} className={field} />
      {hint && <span className="block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="bg-white border border-stone-200 rounded p-6 space-y-4">
      <legend className="px-2 text-sm font-medium text-stone-900">{title}</legend>
      {hint && <p className="text-sm text-stone-500">{hint}</p>}
      {children}
    </fieldset>
  );
}

export function SettingsForm({ shop }: { shop: Record<string, string | number | null> }) {
  const [state, action, pending] = useActionState<SaveSettingsState, FormData>(saveSettings, {});
  const str = (k: string) => String(shop[k] ?? '');
  const pct = (k: string) => String(Number(shop[k] ?? 0) / 100);
  const rup = (k: string) => String(Number(shop[k] ?? 0) / 100);

  return (
    <form action={action} className="space-y-6 max-w-2xl">
      <Group title="Dukaan">
        <Text name="name" label="Naam" value={str('name')} />
        <Text name="tagline" label="Tagline" value={str('tagline')} />
        <Text name="hoursText" label="Timing" value={str('hoursText')} />
      </Group>

      <Group title="Branding" hint="Website ke rang aur font. Har dukaan apni pehchaan ke saath dikhe.">
        <Text name="brandPrimary" label="Main colour" value={str('brandPrimary')} type="color" />
        <Text name="brandInk" label="Text ka colour" value={str('brandInk')} type="color" />
        <Text name="brandGround" label="Background" value={str('brandGround')} type="color" />
        <Text name="fontDisplay" label="Heading ka font" value={str('fontDisplay')} hint="Google Fonts ka naam" />
        <Text name="fontBody" label="Text ka font" value={str('fontBody')} hint="Google Fonts ka naam" />
      </Group>

      <Group title="Sampark">
        <Text name="phone" label="Phone" value={str('phone')} />
        <Text name="whatsapp" label="WhatsApp" value={str('whatsapp')} hint="Country code ke saath, jaise 917250580175" />
        <Text name="email" label="Email" value={str('email')} />
        <Text name="instagramUrl" label="Instagram" value={str('instagramUrl')} />
        <Text name="facebookUrl" label="Facebook" value={str('facebookUrl')} />
      </Group>

      <Group title="Pata">
        <Text name="addressLine1" label="Line 1" value={str('addressLine1')} />
        <Text name="addressLine2" label="Line 2" value={str('addressLine2')} />
        <Text name="city" label="Sheher" value={str('city')} />
        <Text name="state" label="Rajya" value={str('state')} />
        <Text name="pincode" label="Pincode" value={str('pincode')} />
        <Text name="mapUrl" label="Google Maps link" value={str('mapUrl')} />
      </Group>

      <Group title="Price" hint="Inme se kuch bhi badalne par poora catalog turant dobara calculate hota hai.">
        <Text name="defaultMakingPercentBp" label="Default making charge %" value={pct('defaultMakingPercentBp')} />
        <Text name="gstPercentBp" label="GST %" value={pct('gstPercentBp')} hint="CA se confirm kara lijiye." />
        <Text name="roundingStepPaise" label="Rounding step (₹)" value={rup('roundingStepPaise')} />
        <Text name="roundingSmallStepPaise" label="Chhoti keemat ka step (₹)" value={rup('roundingSmallStepPaise')} />
        <Text name="roundingThresholdPaise" label="Chhoti keemat ki seema (₹)" value={rup('roundingThresholdPaise')} />
        <Text name="priceDisclaimer" label="Price ke neeche ka text" value={str('priceDisclaimer')} />
      </Group>

      <Group title="Rate purana hone par">
        <Text name="rateWarnHours" label="Warning ke ghante" value={str('rateWarnHours')} />
        <Text name="rateStaleHours" label="Banner ke ghante" value={str('rateStaleHours')} />
        <Text name="rateBannerText" label="Banner ka text" value={str('rateBannerText')} />
      </Group>

      <Group title="Website">
        <Text name="heroHeading" label="Home page heading" value={str('heroHeading')} />
        <Text name="heroSubheading" label="Home page subheading" value={str('heroSubheading')} />
        <Text name="seoLocations" label="Jagah ke naam (SEO)" value={str('seoLocations')} hint="Comma se alag" />
      </Group>

      {state.error && <p className="text-red-700">{state.error}</p>}
      {state.saved && <p className="text-green-800">Save ho gaya.</p>}

      <button type="submit" disabled={pending}
        className="bg-stone-900 text-white rounded px-8 py-3 disabled:opacity-60">
        {pending ? 'Save ho raha hai…' : 'Save karein'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Implement `src/app/admin/settings/page.tsx`**

```tsx
import { getShop } from '@/lib/shop';
import { SettingsForm } from './form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const shop = await getShop();
  // Dates cannot cross the server/client boundary as-is; this form only reads
  // scalars, so serialise them plainly.
  const plain = JSON.parse(JSON.stringify(shop)) as Record<string, string | number | null>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-stone-900">Settings</h1>
        <p className="text-stone-600 mt-1">Dukaan ki har jankari yahin se badalti hai.</p>
      </div>
      <SettingsForm shop={plain} />
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run `npm run dev`, open `/admin/settings`. Change the default making charge to
18%, save, and confirm a product with no override moved up in price on
`/admin/products`. Change it back to 15%. Change the shop name and confirm the
admin nav picks it up.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/settings/
git commit -m "feat: shop settings and branding — every shop fact editable without a deploy"
```

---

### Task 19: Production container and deployment

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `docs/DEPLOYMENT.md`
- Modify: `docs/STATUS.md`

**Interfaces:**
- Consumes: everything above
- Produces: a deployable stack for Coolify on the NAS

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
.next
.git
docs
*.md
.env
public/uploads
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/public/uploads

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
      SESSION_SECRET: ${SESSION_SECRET}
      UPLOAD_DIR: /app/public/uploads
    volumes:
      - uploads:/app/public/uploads
    ports:
      - "${APP_PORT:-3210}:3000"

volumes:
  pgdata:
  uploads:
```

`app` is published on a host port that the existing Cloudflare Tunnel points at.
Postgres is not published at all — nothing outside the compose network reaches it.

- [ ] **Step 4: Write `docs/DEPLOYMENT.md`**

````markdown
# Deployment

Target: the Synology NAS, through Coolify, published by the Cloudflare Tunnel
already running there. See spec Section 9 for the survey of that box and why the
caching decisions below matter.

## First deploy

1. In Coolify, create a Docker Compose resource from this repository.
2. Set the environment variables:
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `SESSION_SECRET` — 32+ random bytes (`openssl rand -base64 32`)
   - `APP_PORT` — a free host port; check with `sudo docker ps` first, the NAS
     runs 52 containers
   - `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` — for the one-time seed
3. Deploy, then migrate and seed inside the app container:
   ```bash
   sudo docker compose exec app npx prisma migrate deploy
   sudo docker compose exec app npx tsx prisma/seed.ts
   ```
4. Add a public hostname in the Cloudflare Tunnel pointing at
   `http://<nas-ip>:<APP_PORT>`.
5. Sign in and change the seeded admin password.

## Cloudflare cache rules

These are what keep the NAS out of the request path. Without them the site is as
slow as the disk it sits on.

- `/_next/static/*` and `/uploads/*` — cache everything, edge TTL one year. Both
  use content-hashed filenames, so a stale cache is impossible.
- `/admin/*` — bypass cache entirely.

## Setting this up for another jewellery shop

This software is sold one deployment per shop. To stand up a new one:

1. Deploy the same compose stack with its own `POSTGRES_*`, `SESSION_SECRET` and
   `APP_PORT`.
2. Copy `prisma/seed.ts` to a new file and change the shop block and the metal
   types to that shop's — a shop that deals in 14K or Silver 925 seeds those keys
   instead. Everything else in the seed is generic.
3. Run migrate and seed as above.
4. Point that shop's domain at the new port through the tunnel.
5. Hand over the admin credentials. Everything else — name, address, phone,
   colours, fonts, making charge, GST, metal types — they change themselves from
   the admin panel.

Nothing in the application code is specific to Poddar Jewellers. If a change for
one shop ever needs a code edit, that is a bug: the value belongs on the `Shop`
row or in `MetalType`.

## Moving to a VPS

The stack is plain Docker Compose. On a new host: copy `docker-compose.yml` and
the environment, `docker compose up -d`, restore the `pgdata` and `uploads`
volumes, and repoint the tunnel hostname. Budget about half an hour.

## Backups

Two volumes hold everything that cannot be rebuilt:

- `pgdata` — the catalog, rate history and shop settings
- `uploads` — the product photography

Add both to the NAS's existing backup job.
````

- [ ] **Step 5: Verify the production build**

Run: `npm run build`
Expected: build succeeds, `.next/standalone/server.js` exists.

Then: `docker compose build`
Expected: completes without error.

- [ ] **Step 6: Update `docs/STATUS.md`**

Replace the "Done" and "Next" sections:

```markdown
## Done

- Requirements gathered with the owner
- Target server surveyed (spec Section 9)
- Phase 1 design written and committed
- Project documentation prepared
- Shareable project brief published
- **Phase 1A complete:** price engine (fully unit-tested), schema with metal
  types as data, shop context, admin auth, daily rate screen, metal type,
  product and category management, image pipeline, deployable container

## Next

1. Write the Phase 1B plan — the storefront
2. Enter the real catalog through the admin panel
```

- [ ] **Step 7: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore docs/DEPLOYMENT.md docs/STATUS.md
git commit -m "feat: production container and deployment guide"
```

---

## Definition of done for Phase 1A

- [ ] `npm test` — every unit test passes
- [ ] `npm run typecheck` — no errors
- [ ] `npm run build` — production build succeeds
- [ ] An admin signs in, saves a rate, and every product's cached price moves
- [ ] A rate change above 10% asks for a second confirmation before saving
- [ ] Adding `SILVER_925` in Metal types makes a new input appear on the daily
      rate screen, with no code change — the proof the software is not welded to
      one shop's purities
- [ ] A product created with weights `20, 23, 25` and no making override reports
      the inherited percentage and its source in the form
- [ ] Uploading a photo writes six variants under `public/uploads`, and a
      subsequent edit does not remove them
- [ ] Changing the default making charge in settings re-prices the catalog
- [ ] Changing the shop name in settings changes it in the admin nav
- [ ] `grep -c "price " prisma/schema.prisma` returns 0 — no price column exists
- [ ] `grep -rn "Poddar\|7250580175\|Palojori" src/` returns nothing — no shop
      fact is read from source outside `prisma/seed.ts`
