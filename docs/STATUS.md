# Status

**Updated:** 2026-09-14
**Phase:** 1A complete and merged to `main`. 1B (storefront) not started.
**Design system:** built and applied to every admin screen (D15).

---

## What works today

Sign in at `/admin`, enter the morning's rate, press Save — the entire catalog
re-prices itself. Products, categories, metal types and every shop setting are
managed from there.

Built and verified:

- **Price engine** — pure, no database or framework, exhaustively tested
- **Schema** — metal types as rows, not an enum; `shopId` on every shop-owned table
- **Shop context** — one `getShop()`, the single thing multi-tenancy would change
- **Admin** — login, daily rate screen, metal types, categories, products, settings
- **Photo prompts** — `/admin/photos` builds the three AI image prompts for one
  product from a supplier's tray photo. Pure builder in `src/lib/ai-prompts.ts`,
  keyed to shot types rather than categories so no shop needs a code edit (D16).
  The method it implements is `docs/AI-IMAGERY.md`.
- **Image pipeline** — content-hashed AVIF/WebP at three widths
- **Deployment** — Dockerfile, compose stack, and a guide covering another shop
- **Design system** — token layer driven by the `Shop` row, component
  vocabulary in `src/components/ui/`, every admin screen rebuilt on both.
  `docs/DESIGN-SYSTEM.md` is the source of truth; D15 records why.

111 tests pass. `tsc --noEmit` clean. Production build succeeds.

Two of those tests enforce rules rather than behaviour, which is why they exist
as tests and not as lines in a checklist:

- `src/lib/no-hardcoded-shop.test.ts` walks `src/` for shop-specific literals.
  It found two on its first run — the browser-tab title and a settings hint.
- `src/lib/design-system.test.ts` fails on a stock Tailwind palette class, a
  literal hex, an untokenised radius, a raw `<img>` or an emoji, naming the
  offending line and its replacement. It was checked against a deliberate
  violation before being trusted.

## Verified by hand, against a running server

- Signed out, `/admin` and `/admin/metals` both redirect to login
- Signed in, all six admin screens return 200
- Product list shows the ranges the engine's own tests assert:
  Rs 2,93,800–3,67,200 · Rs 88,500–1,06,500 · Rs 7,680–12,800
- Making cascade re-prices live: 15% default → 18% → Payal category 12% → restored
- The seed ran three times with no duplication
- **Adding `SILVER_925` grew the rate screen by one input, with no code change**
- `/admin/photos`, at 1440px and 375px: the prompt rebuilds as the shop types,
  choosing Rani haar swaps the row/piece boxes for an inner/outer select, and
  Copy puts the real text on the system clipboard (checked with `pbpaste`).
  Looking at that clipboard output caught a defect the tests had not: a shot
  type whose own ignore-phrase contained ", and" broke the sentence it was
  spliced into. Fixed, and a test now asserts the list joins with exactly one.

Design system, in a browser at 1440px, 1280px and 375px:

- All five admin screens plus login and the product edit form render correctly;
  no horizontal page scroll at 375px. The nav scrolls inside its own container
  by design.
- The shop's branding now actually reaches the interface: Instrument Serif
  headings, `#8F621A` on buttons and the active nav tab, all read from the
  `Shop` row through `<html>` custom properties.
- Generated CSS confirmed to emit `var(--brand-ink)` rather than a baked hex,
  with a `color-mix` fallback pair for older browsers — this is what lets one
  build serve a second shop's colours.
- Three defects were found by looking and fixed: `Input` hardcoded `w-full`, so
  a caller's `w-20` lost the specificity race and a percentage box rendered
  200px wide; the rate field stretched, pushing "/ gram" to the card's edge; and
  `intent="danger"` as a permanently boxed red button shouted when repeated
  down a list.

## Not verified

- `docker compose build` — Docker is not installed on the development machine.
  `npm run build` passes and emits the standalone server, so the application
  builds; the image itself is first exercised on the NAS.
- The photo upload path through the product form. `processUpload` has six unit
  tests; the multipart form wiring does not.
- The interface under a *different* shop's branding. The token layer is built
  so that changing `brandPrimary` recolours everything coherently, and the
  generated CSS was checked to confirm it can, but no second palette has been
  entered and looked at. Contrast is the thing to re-measure when one is:
  `#8F621A` is 5.34:1 on white, and a shop picking a lighter primary would not
  be.
- The rate-change `confirm()` dialog itself. Its threshold logic is a tested pure
  function (`significantMoves`, seven cases including the stray-extra-digit typo
  it exists to catch); the dialog cannot be driven by an automated browser
  without blocking it.

## Next

1. Write the Phase 1B plan — the storefront. It builds on
   `src/components/ui/` and `docs/DESIGN-SYSTEM.md`, not on fresh markup.
2. Enter the real catalog through the admin panel. The photos for it come out
   of `/admin/photos`; the tray originals are in `media/`.

## Blocked on the owner

- Domain not yet purchased
- Real logo and real product photos — placeholders do not block the build

**GST is no longer blocked.** The owner will set it from the Settings screen;
`Shop.gstPercentBp` already defaults to 3% (`300` basis points). Nothing in the
code was waiting on the answer — only the number in one editable field was.

## Not yet built

The entire storefront. `/` is a placeholder. Customers cannot see anything yet —
Phase 1A is the engine room and the admin that feeds it.
