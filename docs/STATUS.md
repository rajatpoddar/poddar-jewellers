# Status

**Updated:** 2026-09-14
**Phase:** 1A complete. 1B (storefront) not started.

---

## Done

- Requirements gathered with the owner
- Target server surveyed (spec Section 9)
- Phase 1 design written, and revised for sellability (spec Section 12)
- Project documentation prepared; shareable brief published
- **Phase 1A built and verified** — all 19 tasks:
  - Price engine, fully unit-tested, pure, no database or framework
  - Schema with metal types as rows, not an enum
  - Shop context behind one `getShop()`
  - Admin: login, daily rate screen, metal types, categories, products, settings
  - Content-hashed AVIF/WebP image pipeline
  - Production container and deployment guide

71 unit tests pass. `tsc --noEmit` clean. Production build succeeds.

## Next

1. Write the Phase 1B plan — the storefront
2. Start entering the real catalog through the admin panel

## Blocked on the owner

- **GST treatment** — 3% on the full value, pending his CA (`PROJECT.md` Q1)
- Domain not yet purchased
- Real logo and real product photos — placeholders do not block the build
- `docker compose build` has not been run: Docker is not installed on the
  development machine. `npm run build` passes, so the application builds; the
  image build itself is first exercised on the NAS.

## Not yet built

The entire storefront. `/` is a placeholder. Customers cannot see anything yet —
Phase 1A is the engine room and the admin that feeds it.
