# Poddar Jewellers — Session Primer

**Read this file first, every session. It is the map.**

Poddar Jewellers is a real jewellery shop in Palojori, Deoghar, Jharkhand. This
repo brings the shop online: a premium catalog where customers browse from home,
see a realistic all-inclusive price, and continue the conversation on WhatsApp.

It is also **a product**. The owner intends to sell it to other jewellery shops,
one deployment each. That shapes almost every rule below.

Two people use the admin: the owner (technical) today, and his father
(non-technical) after handover. That handover is a design constraint, not a
nice-to-have.

---

## Hard rules — never break these

1. **Price is never stored.** No `price` column, ever. Price is computed from
   `selected weight x today's metal rate` + making charge + stone value + GST.
   The only cached prices are `cachedPriceMinPaise` / `cachedPriceMaxPaise` on
   `Product`, used purely for filtering and sorting, recomputed on every rate
   save.

2. **The customer sees one number.** No metal/making/GST breakdown on the
   storefront, ever. The breakdown is computed and retained server-side for
   invoicing, and shown nowhere else. This was an explicit owner decision.

3. **Estimates round up, never down.** An estimate must never undercut what the
   shop will actually charge.

4. **The daily admin screen stays a 30-second job.** One input per metal type
   and a Save button. Nothing destructive is reachable from it. Admin errors are
   readable sentences, never stack traces — a non-technical user is on the other
   side.

5. **No WhatsApp automation in Phase 1.** Product pages use plain `wa.me`
   click-to-chat links. Automation arrives in Phase 4 with the transactional and
   marketing paths kept strictly separate — see D9.

6. **The NAS stays out of the request hot path.** Photos are Cloudflare-cached,
   pages are pre-rendered, revalidation is event-driven off rate saves. Anything
   that puts a database query on a normal page view is a regression.

7. **No shop fact is hardcoded.** Shop name, address, phone, WhatsApp, email,
   logo, branding colours and fonts, hours, social links, making default, GST
   percent, rounding steps, disclaimer copy, hero copy and SEO terms all live on
   the `Shop` row. `prisma/seed.ts` is the only file allowed to name a shop.
   **`src/lib/no-hardcoded-shop.test.ts` enforces this** — it walks `src/` and
   fails the suite on a hit. It caught two real violations on its first run.

8. **This is a product, not one shop's website.** Metal types are rows, never an
   enum — a shop adds 14K or Silver 925 from the admin panel and the daily rate
   screen grows an input by itself. `Shop` is a real row with a real id, never a
   singleton pinned to `id = 1`, and every query resolves its shop through
   `getShop()`. Every shop-owned table carries `shopId` even though there is one
   shop today — that is what keeps multi-tenancy additive instead of a rewrite.
   If a change for one shop needs a code edit, that is a bug.
   Not built until a second real customer exists: billing, self-serve signup,
   subdomain routing, tenant isolation.

9. **No screen picks a colour, a font or a radius.** It names a meaning —
   `bg-surface`, `text-ink-muted`, `intent="danger"` — and the token layer in
   `src/app/globals.css` decides what that looks like, deriving everything from
   the five branding values on the `Shop` row. `src/app/globals.css` is the only
   file allowed to contain a hex. Screens never write a bare `<button>` or
   `<input>`; `src/components/ui/` is the whole vocabulary.
   **`src/lib/design-system.test.ts` enforces this** — it fails the suite on a
   stock Tailwind palette class, a literal hex, an untokenised radius, a raw
   `<img>` or an emoji, and names the replacement.
   Read `docs/DESIGN-SYSTEM.md` before writing any interface code.

---

## Current state

**Phase 1A is built and merged.** Price engine, database, and the full admin
panel. **The design system landed on top of it** — token layer, component
vocabulary, and every admin screen rebuilt on both. 80 tests pass.

**Phase 1B — the storefront — is not started.** `/` is a placeholder. Customers
cannot see anything yet.

Roadmap and phase boundaries are in the spec, Section 13. Do not pull Phase 2+
work forward without saying so explicitly: the phases exist so the shop gets
something usable early.

---

## Running it

```bash
npm run dev          # http://localhost:3000/admin
npm test             # 79 tests, all pure — no database needed
npm run typecheck
npm run build        # production build, emits .next/standalone
npm run db:seed      # idempotent, safe to re-run
npx prisma migrate dev --name <name>   # after a schema change
npx prisma migrate reset               # wipe and re-seed
```

Local Postgres runs as a Homebrew service (`postgresql@14`, port 5432) with a
dedicated `poddar` role and `poddar_jewellers` database. Setup and the Docker
alternative are in `docs/DEPLOYMENT.md`.

---

## Where things are

| File | What it holds | When to read |
|---|---|---|
| `CLAUDE.md` | This map, plus the hard rules | Always, first |
| `docs/STATUS.md` | What is built, what is next, what is blocked | Always, second |
| [Phase 1 spec](docs/superpowers/specs/2026-09-13-phase1-catalog-price-engine-design.md) | **Source of truth** for the design: price engine, data model, storefront, deployment, sellability | Before any Phase 1 work |
| [Phase 1A plan](docs/superpowers/plans/2026-09-13-phase1a-core-price-engine-admin.md) | The 19 tasks that built the admin, with an amendments section recording where reality differed | When touching something it built |
| `docs/DESIGN-SYSTEM.md` | **Source of truth for the interface**: tokens, components, the rules that are enforced | Before any UI work, always |
| `docs/DECISIONS.md` | Append-only log, D1-D16, each with its reason | Before revisiting a settled choice |
| `docs/PROJECT.md` | Shop facts, roadmap, open questions | When you need a real-world fact |
| `docs/DEPLOYMENT.md` | NAS deploy, Cloudflare cache rules, standing this up for another shop, local setup | Deploying or onboarding a new shop |
| `docs/ADMIN-GUIDE.md` | How to use the admin, written in Hinglish for the shop | Changing admin UX |
| `docs/PHOTOGRAPHY.md` | Shooting guide, written for the photographer | Photo/asset work |
| `docs/AI-IMAGERY.md` | Turning supplier tray photos into per-product site images: the two-pass method, category-wise prompts, and hero/poster work | Image or asset generation |

**Do not duplicate the spec into other docs.** If a design fact changes, change
it in the spec and link to it. Duplicated facts go stale and then mislead.

---

## Code map

```
src/lib/pricing/     Pure domain logic. Imports nothing from db.ts or next/*.
  types.ts           MetalKey, RateSet, PriceInput, PriceBreakdown
  engine.ts          estimate() — the one function that decides a customer's price
  making.ts          the making-charge cascade: product → category → shop default

src/lib/
  money.ts           integer paise, basis points, Indian digit grouping
  weights.ts         "20, 23, 25" → milligrams
  rates.ts           staleness classification, significantMoves (the >10% guard)
  price-cache.ts     priceRange across a product's weight options
  labels.ts          admin copy shared between screens, so wording cannot drift
  ai-prompts.ts      the shot types and the prompt builder behind /admin/photos,
                     pure and shop-agnostic — colours and metal come from the
                     Shop row, never from here. See D16.
  db.ts              Prisma client singleton, via the pg driver adapter
  shop.ts            getShop(), getPricingConfig(), getMetalTypes()
  *.server.ts        the database-backed halves, kept separate so unit tests
                     never pull Prisma into the test process

src/components/ui/    the design system's component vocabulary. Screens use
                      these and never a bare <button> or <input>.
  Button.tsx          intent: primary | secondary | quiet | danger
  Field.tsx           Field, Input, Textarea, Select, Checkbox
  Surface.tsx         Card, CardFieldset, RowList, EmptyState, PageHeader
  Notice.tsx          page-level messages, and Badge
  icons.tsx           inline stroke SVGs — no icon library, no emoji

src/app/globals.css   the token layer. THE only file allowed a hex colour.
src/lib/branding.ts   Shop row → CSS custom properties, and the font registry
                      next/font needs because it cannot take a runtime name

src/auth/session.ts  signed cookie, jose
src/proxy.ts         optimistic /admin gate (Next 16 renamed middleware → proxy)
src/app/admin/
  login/             OUTSIDE the (panel) group, so it skips the auth redirect
  (panel)/           route group: same URLs, own layout, authoritative auth gate
    photos/          AI image prompts, copy-ready. No database writes.
```

**Authorization holds at three layers**, deliberately: `proxy.ts` is optimistic,
the `(panel)` layout is the real gate, and every server action checks
`getCurrentAdmin()` independently. Next's own docs say proxy is not an
authorization solution — see D14.

---

## Conventions

- **Stack:** Next.js 16 (App Router) + TypeScript, Tailwind v4, PostgreSQL +
  Prisma 7, Vitest. Versions were checked against the registry, not assumed — D12.
- **Money is integer paise.** Never accumulate rupees in a float.
- **Percentages are integer basis points.** 15% is `1500`. Value = `paise * bp / 10000`.
- **The price engine is pure and test-first.** It is the one place a bug shows a
  customer a wrong number, so it carries the heaviest coverage. Never change a
  price figure to make a test pass without re-deriving it independently — two
  plan figures turned out wrong that way, and one implementation did.
- **Customer-facing and admin copy is Hinglish in Latin script** — how the
  shop's customers actually read. Code, comments, commits and docs are English.
- **Currency renders as `Rs 3,37,900`**, never `Rs 337,900`. Use `formatINR`.
- **Digits that get compared carry `.numeric`** — every rupee amount, weight
  and rate. Proportional figures do not line up in a column.
- **Colour, radius and elevation are tokens**, never literals. New meaning →
  new token in `globals.css`. New shade → you are doing it wrong. See Rule 9.

---

## Gotchas this codebase already paid for

- **Prisma 7 removed `url` from the datasource block.** It lives in
  `prisma.config.ts`, which also has to call `process.loadEnvFile()` because
  Prisma 7 does not read `.env`. The runtime client takes a `@prisma/adapter-pg`
  driver adapter. `migrate dev` needs `ALTER ROLE <user> CREATEDB` for its shadow
  database. (D13)
- **`npx tsx -e` compiles as CommonJS** and rejects top-level `await`. Ad-hoc
  database scripts go in a file, and that file must live inside the project so
  `node_modules` resolves.
- **`next dev` appends a block to this file** on every run and re-adds it if
  removed. It is committed rather than fought.
- **Tailwind v4** generates spacing utilities dynamically, so `min-w-45` is valid.

---

## Update discipline

At the end of a working session, update `docs/STATUS.md`. A new session should be
productive from `CLAUDE.md` + `STATUS.md` + the spec alone, without re-reading
the codebase or re-deriving decisions.

New decisions go in `docs/DECISIONS.md` with the reason, not just the choice.
The log is append-only: to reverse a decision, add one that supersedes it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
