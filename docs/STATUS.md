# Status

**Updated:** 2026-09-16
**Phase:** Phase 1 (1A Admin & Price Engine + 1B Storefront) and Phase 2 (Customer Accounts, Wishlist Sync, CRM Activity Tracking & A4 Luxury Invoicing) complete and verified.
**Design system:** built and applied across all Admin, Customer Portal, and Storefront screens (D15).

---

## What works today

Sign in at `/admin`, enter the morning's rate, press Save — the entire catalog
re-prices itself. Products, categories, metal types and every shop setting are
managed from there. Customers browse at `/`, view category listings, select product weight options, calculate live estimated prices, view daily metal rates at `/rates`, search the entire catalogue at `/search`, save designs to wishlist at `/wishlist`, authenticate via WhatsApp OTP (Evolution API), book designs with target dates (*"Required-By Date"*), view their placed orders at `/orders`, and start conversations on WhatsApp.

Built and verified:

- **Price engine** — pure, no database or framework, exhaustively tested
- **Schema** — metal types as rows, not an enum; `shopId` on every shop-owned table
- **Shop context** — one `getShop()`, the single thing multi-tenancy would change
- **Admin** — login, daily rate screen, metal types, categories, products, settings, diary contact import, customer CRM activity timeline, orders management, and printable A4 luxury GST invoice generator
- **Customer Portal & Auth (Phase 2)**:
  - **WhatsApp OTP Engine**: Evolution API REST integration (`NregaBot`) with crypto 6-digit OTP generation, 5-min expiry, max 3 attempt rate-limiting, and console log fallback for dev environment
  - **Customer Auth & Onboarding (`AuthModal.tsx`)**: Step 1 Mobile number input, Step 2 WhatsApp OTP verification, Step 3 Profile registration for new customers. Auto-login for pre-imported diary contacts!
  - **Wishlist Sync**: Automatic migration of client-side `localStorage` wishlist items into `WishlistItem` database table upon customer login
  - **Order Booking (`BookOrderModal.tsx`)**: Customers book/reserve designs directly from Product Detail Page or Wishlist with optional target date (*"Required-By Date"* e.g. wedding or festival date)
  - **Customer Orders View (`/orders`)**: Itemized booking summary, status tracking badges, target dates, and WhatsApp query deep-link
- **Admin CRM & Intelligence (`/admin/customers`)**:
  - **Offline Diary Bulk Import (`/admin/customers/import`)**: Paste or upload multi-line/CSV contacts (`Name, Phone, Address, City, Pincode`). Instant bulk import for 100+ offline customer records.
  - **Activity Tracking Engine (`CustomerActivity`)**: Logs customer interactions (`PRODUCT_VIEW`, `WISHLIST_ADD`, `SEARCH_QUERY`, `WHATSAPP_ENQUIRE`) silently in background.
  - **Customer Profile (`/admin/customers/[id]`)**: Full address details, diary notes, orders history, real-time activity timeline, and 1-tap WhatsApp outreach button with personalized text links.
- **A4 Luxury Color Printable GST Invoice (`/admin/orders/[id]/invoice`)**:
  - Format-tailored specifically for `@media print` on A4 paper (210mm x 297mm).
  - Double gold border frame (`brandPrimary`), shop logo, GSTIN, address, customer details.
  - Itemized Breakdown Table: Product Description, HSN Code (7113), Net Gold Weight (g), Today's Rate (Rs/g), Metal Amount (Rs), Making Charges (%), Stone Value (Rs), Subtotal, 3% GST (1.5% CGST + 1.5% SGST), and Total Amount (Rs).
  - Terms & Conditions, bank payment details, and authorized signatory stamp box.
- **Storefront (Phase 1B)**:
  - Header & Footer with rate staleness warning banner (>48h warning), Search shortcut, and live Wishlist badge counter (`WishlistHeaderBadge.tsx`)
  - Multi-slide luxury Hero Carousel (`HeroCarousel.tsx`) with auto-play, desktop/mobile responsive backgrounds, and touch swipe gestures
  - Homepage (`/`) with Hero carousel, daily rates strip, 10 curated category cover tiles, featured collection, and Showroom Trust Banner
  - Category listing (`/c/[...slug]`) with leaf slug resolution, dedicated category header banners, sorting, and empty states
  - Product Detail Page (`/p/[slug]`) with photo gallery, category image fallbacks, interactive live weight selector chips, live estimated pricing calculation (`estimate()`), Wishlist toggle button, Order Booking modal, and pre-filled WhatsApp link (`wa.me`)
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
  vocabulary in `src/components/ui/`, every admin, customer, and storefront screen built on both.

152 tests pass across 27 test files. `tsc --noEmit` clean. Production build succeeds.

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
2. Move to Phase 3 (CRM Segmentation & Opt-In Direct Marketing).

---

## Blocked on the owner

- Domain not yet purchased
- Real logo and real product photos — placeholders do not block the build
