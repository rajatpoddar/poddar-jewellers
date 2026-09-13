# Status

**Updated:** 2026-09-14
**Phase:** 1A complete and merged to `main`. 1B (storefront) not started.

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
- **Image pipeline** — content-hashed AVIF/WebP at three widths
- **Deployment** — Dockerfile, compose stack, and a guide covering another shop

79 tests pass. `tsc --noEmit` clean. Production build succeeds.

One of those tests, `src/lib/no-hardcoded-shop.test.ts`, walks `src/` for
shop-specific literals and fails the suite on a hit. It found two on its first
run — the browser-tab title and a settings hint — which is why it exists now
rather than as a line in a checklist.

## Verified by hand, against a running server

- Signed out, `/admin` and `/admin/metals` both redirect to login
- Signed in, all six admin screens return 200
- Product list shows the ranges the engine's own tests assert:
  Rs 2,93,800–3,67,200 · Rs 88,500–1,06,500 · Rs 7,680–12,800
- Making cascade re-prices live: 15% default → 18% → Payal category 12% → restored
- The seed ran three times with no duplication
- **Adding `SILVER_925` grew the rate screen by one input, with no code change**

## Not verified

- `docker compose build` — Docker is not installed on the development machine.
  `npm run build` passes and emits the standalone server, so the application
  builds; the image itself is first exercised on the NAS.
- The photo upload path through the product form. `processUpload` has six unit
  tests; the multipart form wiring does not.
- The rate-change `confirm()` dialog itself. Its threshold logic is a tested pure
  function (`significantMoves`, seven cases including the stray-extra-digit typo
  it exists to catch); the dialog cannot be driven by an automated browser
  without blocking it.

## Next

1. Write the Phase 1B plan — the storefront
2. Enter the real catalog through the admin panel

## Blocked on the owner

- **GST treatment** — 3% on the full value, pending his CA (`PROJECT.md` Q1)
- Domain not yet purchased
- Real logo and real product photos — placeholders do not block the build

## Not yet built

The entire storefront. `/` is a placeholder. Customers cannot see anything yet —
Phase 1A is the engine room and the admin that feeds it.
