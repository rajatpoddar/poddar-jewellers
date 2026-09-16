# Status

**Updated:** 2026-09-16  
**Phase:** Phase 1 (Catalog, Price Engine & Storefront), Phase 2 (Customer Accounts, Wishlist Sync & Printable Invoicing), Phase 3 (CRM Segmentation, Customer Tagging, Direct Marketing & Public Rates Removal), Phase 4 (WhatsApp Automation Engine & Dual-Track Notifications), Phase 5 (Campaign & Festive Offer Engine), and Phase 6 (Hermes Agent Admin API & Automation Suite) complete and verified.  
**Design system:** built and applied across all Admin, Customer Portal, and Storefront screens (D15).

---

## What works today

Sign in at `/admin`, enter the morning's rate, press Save — the entire catalog
re-prices itself. Products, categories, metal types, campaign promotions, hero slides, API keys, and every shop setting are
managed from there. Customers browse at `/`, view category listings via the Catalogue Header Dropdown, select product weight options, calculate live estimated prices (including active festive making charge discounts), search the entire catalogue at `/search`, save designs to wishlist at `/wishlist`, authenticate via WhatsApp OTP (Evolution API), book designs with target dates (*"Required-By Date"*), view their placed orders at `/orders`, receive automated WhatsApp order updates, and start conversations on WhatsApp.

Public metal rates display has been completely removed from the storefront (customers see only final computed estimated total prices), and `/rates` permanently redirects to `/`.

Built and verified:

- **Price engine** — pure, no database or framework, supports percentage basis points making charge discounts, dual price breakdowns (`totalPaise` vs `originalTotalPaise`), exhaustively tested
- **Schema** — metal types as rows, not an enum; `shopId` on every shop-owned table; `Promotion`, `ProductPromotion`, `HeroSlide`, `ApiKey` models added
- **Shop context** — one `getShop()`, the single thing multi-tenancy would change
- **Admin** — login, daily rate screen, metal types, categories, products, settings, diary contact import, customer CRM activity timeline, orders management, printable A4 luxury GST invoice generator, Promotions Hub (`/admin/promotions`), Hero Carousel Manager (`/admin/carousel`), and API Keys Manager (`/admin/api-keys`)
- **Phase 6 Hermes Agent Admin API Suite (`/api/agent/v1/...` & `/admin/api-keys`)**:
  - **Secure API Key Auth**: Hashed API key authentication (`ApiKey` Prisma schema) supporting `Authorization: Bearer hermes_live_...` or `X-Hermes-API-Key` headers. Database stores SHA-256 key hash only.
  - **Daily Metal Rates Endpoint (`POST /api/agent/v1/rates`)**: Hermes Agent submits daily Gold & Silver rates programmatically, triggering automatic catalog price cache recomputation.
  - **Sales & Engagement Reporting Endpoint (`GET /api/agent/v1/analytics`)**: Returns orders summary, revenue in paise & formatted INR (`formatINR`), wishlist additions count, and customer category views analytics.
  - **Wishlist Lead Detection Endpoint (`GET /api/agent/v1/leads/wishlist-no-order`)**: Returns high-intent customers who added products to wishlist but haven't placed an order yet.
  - **Targeted WhatsApp Outreach Endpoint (`POST /api/agent/v1/outreach/send`)**: Dispatches targeted WhatsApp messages to specific customers with automatic audit logging in `OutreachLog`.
  - **Admin API Key Manager (`/admin/api-keys`)**: Generate secret keys, 1-click secret copy box, view `lastUsedAt` usage timestamps, and revoke agent keys.
- **Phase 5 Campaign & Festive Offer Engine (`/admin/promotions` & `/admin/carousel`)**:
  - **Dynamic Making Charge Discounts**: Configurable percentage discounts on making charges (e.g. 25% OFF Making Charges).
  - **Flexible Scoping**: Shop-wide, Category-specific, or Product-specific offer rules.
  - **Hybrid Activation**: Start/End datetime scheduling with emergency 1-click manual ON/OFF switch.
  - **Dynamic Hero Carousel**: Database-backed `HeroSlide` entries linked to active promotions with mobile/desktop background fallback.
  - **Storefront Badges & Strikethrough Pricing**: Festive offer ribbons (e.g. `🎉 Dhanteras Special: 25% Off Making Charges`) and strikethrough price displays (~~₹1,42,000~~ **₹1,38,500**).
  - **WhatsApp Outreach Integration**: Outreach Hub (`/admin/customers/outreach`) supports 1-click selection of active campaign promotions with auto-populated template variables (`{{PromotionName}}`, `{{DiscountText}}`, `{{ProductUrl}}`).
- **Phase 4 WhatsApp Automation Engine (`whatsapp-notifications.server.ts` & `whatsapp-cloud.server.ts`)**:
  - **Dual-Track Architecture**: Transactional notifications via Evolution API (0 ban risk, 0 cost) and Marketing broadcasts via Meta WhatsApp Cloud API REST (`v19.0`).
  - **Automated Event Triggers**: Order booking creation (`createOrderBooking`) fires instant Customer Booking Confirmation (`ORDER_BOOKED`) and instant Admin WhatsApp Alert (`ADMIN_NEW_ORDER_ALERT`). Order status updates (`CONFIRMED`, `READY`, `COMPLETED`) fire instant Customer Status Notifications.
  - **Resilient Background Queue (`NotificationQueue`)**: Non-blocking async queue with status tracking (`PENDING`, `DELIVERED`, `FAILED`) and up to 3 exponential backoff retries.
  - **Admin Delivery Audit Log & 1-Click Resend (`/admin/orders/[id]`)**: WhatsApp delivery badges (🟢 Delivered, 🟡 Retrying, 🔴 Failed) and 1-click **"Resend Notification"** button.
  - **Meta Cloud API Settings (`/admin/settings`)**: Form credentials configuration (`metaPhoneNumberId`, `metaAccessToken`, `metaWabaId`) and connection test.
- **Phase 3 CRM & Marketing Suite (`/admin/customers`)**:
  - **Smart Segment Builder & Filter Toolbar**: Live multi-criteria filters by WhatsApp Opt-in consent status, Category interest/views, Upcoming event dates (*Required-By* next 15/30/60 days), Wishlist value (> ₹50,000), and Custom Tags with live segment counter.
  - **Custom Tagging Engine (`CustomerTag`)**: 1-click badge dropdown (`TagBadgeSelect.tsx`) to assign/remove custom tags (e.g. *VIP*, *Bridal 2026*, *Local Palojori*) on customer profiles.
  - **WhatsApp Consent Capture**: Opt-in consent tracking (`marketingOptIn`, `optInSource`, `optInAt`) via WhatsApp OTP Login modal (`AuthModal.tsx`) and Order Booking modal (`BookOrderModal.tsx`).
  - **Outreach & Broadcast Hub (`/admin/customers/outreach`)**: Template selector (`CampaignTemplate`), dynamic variable interpolation engine (`{{CustomerName}}`, `{{WishlistCategory}}`, `{{ShopPhone}}`, `{{ProductName}}`, `{{ProductUrl}}`), 1-click personalized `wa.me` WhatsApp deep-links with background audit logging (`OutreachLog`), and 1-click CSV broadcast exporter.
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

331 tests pass across 45 test files. `tsc --noEmit` clean. Production build succeeds.

Two of those tests enforce rules rather than behaviour:
- `src/lib/no-hardcoded-shop.test.ts` walks `src/` for shop-specific literals.
- `src/lib/design-system.test.ts` fails on a stock Tailwind palette class, a literal hex, an untokenised radius, a raw `<img>` or an emoji, naming the offending line and its replacement.

---

## Next

1. Production Launch Setup (Domain purchase `poddarjewellers.in`, NAS Docker stack deployment via Cloudflare Tunnel).

---

## Blocked on the owner

- Domain not yet purchased (`poddarjewellers.in`)
- Real logo and real product photos — placeholders do not block the build
