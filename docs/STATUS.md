# Status

**Updated:** 2026-09-15
**Phase:** Phase 1 (1A Admin & Price Engine + 1B Storefront) complete and verified with complete AI luxury imagery.
**Design system:** built and applied across all Admin and Storefront screens (D15).

---

## What works today

Sign in at `/admin`, enter the morning's rate, press Save — the entire catalog
re-prices itself. Products, categories, metal types and every shop setting are
managed from there. Customers browse at `/`, view category listings, select product weight options, calculate live estimated prices, view daily metal rates at `/rates`, and start conversations on WhatsApp.

Built and verified:

- **Price engine** — pure, no database or framework, exhaustively tested
- **Schema** — metal types as rows, not an enum; `shopId` on every shop-owned table
- **Shop context** — one `getShop()`, the single thing multi-tenancy would change
- **Admin** — login, daily rate screen, metal types, categories, products, settings
- **Storefront (Phase 1B)**:
  - Header & Footer with rate staleness warning banner (>48h warning)
  - Multi-slide luxury Hero Carousel (`HeroCarousel.tsx`) with auto-play, desktop/mobile responsive backgrounds, and touch swipe gestures
  - Homepage (`/`) with Hero carousel, daily rates strip, 10 curated category cover tiles, featured collection, and Showroom Trust Banner
  - Category listing (`/c/[...slug]`) with leaf slug resolution, dedicated category header banners (including Chokers, Rani Haar, Jhumka, Bangles, etc.), sorting, and empty states
  - Product Detail Page (`/p/[slug]`) with product photo gallery, category image fallbacks, interactive live weight selector chips, live estimated pricing calculation (`estimate()`), and pre-filled WhatsApp click-to-chat deep link (`wa.me`)
  - Certified Metal Rates page (`/rates`) & Shop Contact page (`/contact`) with Google Maps directions
- **AI Imagery Master Suite**:
  - Full AI imagery master prompt guide (`COMPLETE_IMAGE_PROMPTS.md`) for DALL-E / Imagen / Grok
  - Complete set of 22 generated luxury images placed in `images/` & `public/images/`
- **Photo prompts** — `/admin/photos` builds the three AI image prompts for one
  product from a supplier's tray photo. Pure builder in `src/lib/ai-prompts.ts`,
  keyed to shot types rather than categories so no shop needs a code edit (D16).
  The method it implements is `docs/AI-IMAGERY.md`.
- **Image pipeline** — content-hashed AVIF/WebP at three widths
- **Deployment** — Dockerfile, compose stack, and a guide covering another shop
- **Design system** — token layer driven by the `Shop` row, component
  vocabulary in `src/components/ui/`, every admin and storefront screen built on both.
  `docs/DESIGN-SYSTEM.md` is the source of truth; D15 records why.

124 tests pass across 19 test files. `tsc --noEmit` clean. Production build succeeds.

Two of those tests enforce rules rather than behaviour, which is why they exist
as tests and not as lines in a checklist:

- `src/lib/no-hardcoded-shop.test.ts` walks `src/` for shop-specific literals.
- `src/lib/design-system.test.ts` fails on a stock Tailwind palette class, a
  literal hex, an untokenised radius, a raw `<img>` or an emoji, naming the
  offending line and its replacement.

---

## Next

1. Enter the real catalog through the admin panel. The photos for it come out
   of `/admin/photos`; the tray originals are in `media/`.
2. Move to Phase 2 (Customer Login, Wishlist Sync & Order Placement).

---

## Blocked on the owner

- Domain not yet purchased
- Real logo and real product photos — placeholders do not block the build
