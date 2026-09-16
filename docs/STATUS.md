# Status

**Updated:** 2026-09-16
**Phase:** Phase 1 (Catalog, Price Engine & Storefront), Phase 2 (Customer Accounts, Wishlist Sync & Printable Invoicing), and Phase 3 (CRM Segmentation, Customer Tagging, Opt-In Direct Marketing Outreach & Public Metal Rates Removal) complete and verified.
**Design system:** built and applied across all Admin, Customer Portal, and Storefront screens (D15).

---

## What works today

Sign in at `/admin`, enter the morning's rate, press Save — the entire catalog
re-prices itself. Products, categories, metal types and every shop setting are
managed from there. Customers browse at `/`, view category listings, select product weight options, calculate live estimated prices, search the entire catalogue at `/search`, save designs to wishlist at `/wishlist`, authenticate via WhatsApp OTP (Evolution API), book designs with target dates (*"Required-By Date"*), view their placed orders at `/orders`, and start conversations on WhatsApp.

Public metal rates display has been completely removed from the storefront (customers see only final computed estimated total prices), and `/rates` permanently redirects to `/`.

Built and verified:

- **Price engine** — pure, no database or framework, exhaustively tested
- **Schema** — metal types as rows, not an enum; `shopId` on every shop-owned table
- **Shop context** — one `getShop()`, the single thing multi-tenancy would change
- **Admin** — login, daily rate screen, metal types, categories, products, settings, diary contact import, customer CRM activity timeline, orders management, and printable A4 luxury GST invoice generator
- **Phase 3 CRM & Marketing Suite (`/admin/customers`)**:
  - **Smart Segment Builder & Filter Toolbar**: Live multi-criteria filters by WhatsApp Opt-in consent status, Category interest/views, Upcoming event dates (*Required-By* next 15/30/60 days), Wishlist value (> ₹50,000), and Custom Tags with live segment counter.
  - **Custom Tagging Engine (`CustomerTag`)**: 1-click badge dropdown (`TagBadgeSelect.tsx`) to assign/remove custom tags (e.g. *VIP*, *Bridal 2026*, *Local Palojori*) on customer profiles.
  - **WhatsApp Consent Capture**: Opt-in consent tracking (`marketingOptIn`, `optInSource`, `optInAt`) via WhatsApp OTP Login modal (`AuthModal.tsx`) and Order Booking modal (`BookOrderModal.tsx`).
  - **Outreach & Broadcast Hub (`/admin/customers/outreach`)**: Template selector (`CampaignTemplate`), dynamic variable interpolation engine (`{{CustomerName}}`, `{{WishlistCategory}}`, `{{ShopPhone}}`), 1-click personalized `wa.me` WhatsApp deep-links with background audit logging (`OutreachLog`), and 1-click CSV broadcast exporter.
- **Customer Portal & Auth (Phase 2)**:
  - **WhatsApp OTP Engine**: Evolution API REST integration (`NregaBot`) with crypto 6-digit OTP generation, 5-min expiry, max 3 attempt rate-limiting, and console log fallback for dev environment
  - **Customer Auth & Onboarding (`AuthModal.tsx`)**: Step 1 Mobile number input, Step 2 WhatsApp OTP verification, Step 3 Profile registration for new customers. Auto-login for pre-imported diary contacts!
  - **Wishlist Sync**: Automatic migration of client-side `localStorage` wishlist items into `WishlistItem` database table upon customer login
  - **Order Booking (`BookOrderModal.tsx`)**: Customers book/reserve designs directly from Product Detail Page or Wishlist with optional target date (*"Required-By Date"* e.g. wedding or festival date)
  - **Customer Orders View (`/orders`)**: Itemized booking summary, status tracking badges, target dates, and WhatsApp query deep-link
- **A4 Luxury Color Printable GST Invoice (`/admin/orders/[id]/invoice`)**:
  - Format-tailored specifically for `@media print` on A4 paper (210mm x 297mm).
  - Double gold border frame (`brandPrimary`), shop logo, GSTIN, address, customer details.
  - Itemized Breakdown Table: Product Description, HSN Code (7113), Net Gold Weight (g), Today's Rate (Rs/g), Metal Amount (Rs), Making Charges (%), Stone Value (Rs), Subtotal, 3% GST (1.5% CGST + 1.5% SGST), and Total Amount (Rs).
- **Storefront Clean-up & Public Rate Removal**:
  - Public `/rates` page removed and permanently redirected (301) to `/`. Header rate link and homepage rates strip removed. Storefront visitors see only final computed estimated total prices (`estimate()`).
  - Header & Footer with Search shortcut and live Wishlist badge counter (`WishlistHeaderBadge.tsx`).
  - Multi-slide luxury Hero Carousel (`HeroCarousel.tsx`) with auto-play, desktop/mobile responsive backgrounds, and touch swipe gestures.
  - Homepage (`/`) with Hero carousel, 10 curated category cover tiles, featured collection, and Showroom Trust Banner.
  - Category listing (`/c/[...slug]`) with leaf slug resolution, dedicated category header banners, sorting, and empty states.
  - Product Detail Page (`/p/[slug]`) with photo gallery, category image fallbacks, interactive live weight selector chips, live estimated pricing calculation (`estimate()`), Wishlist toggle button, Order Booking modal, and pre-filled WhatsApp link (`wa.me`).
  - Shop Contact page (`/contact`) with Google Maps directions.
- **AI Imagery Master Suite**:
  - Full AI imagery master prompt guide (`COMPLETE_IMAGE_PROMPTS.md`) for DALL-E / Imagen / Grok
  - Complete set of 22 generated luxury images placed in `images/` & `public/images/`
- **Deployment & Design System**:
  - Token layer driven by the `Shop` row, component vocabulary in `src/components/ui/`, every admin, customer, and storefront screen built on both.

208 tests pass across 33 test files. `tsc --noEmit` clean. Production build succeeds.

Two of those tests enforce rules rather than behaviour:
- `src/lib/no-hardcoded-shop.test.ts` walks `src/` for shop-specific literals.
- `src/lib/design-system.test.ts` fails on a stock Tailwind palette class, a literal hex, an untokenised radius, a raw `<img>` or an emoji, naming the offending line and its replacement.

---

## Next

1. Move to Phase 4 (WhatsApp Automation: Transactional messages via Evolution API and official WhatsApp Cloud API setup for opted-in marketing lists).
2. Enter real catalog products & high-quality photography through admin panel before production launch.

---

## Blocked on the owner

- Domain not yet purchased (`poddarjewellers.in`)
- Real logo and real product photos — placeholders do not block the build
