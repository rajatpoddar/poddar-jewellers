# Phase 1B — Storefront Design

**Date:** 2026-09-14  
**Status:** Approved for implementation planning

## Purpose

Build the public, mobile-first storefront that takes a customer from browsing a
live catalogue to a plain WhatsApp enquiry. It must feel like a premium jewellery
catalogue, show a realistic all-inclusive estimate, and work with no product
photos yet. It extends the Phase 1A schema, price engine, admin, image pipeline,
and token-based design system; it does not add accounts, carts, payments, or
WhatsApp automation.

## Visual direction

Use the existing **Editorial Grid / Magazine** direction: warm ground, serif
display headings, sans-serif utility text, hairline rules, restrained cards, and
generous whitespace. The typography-first wordmark is used until a logo is
uploaded. Brand colours and fonts always come from the `Shop` row through the
existing token layer.

The interface uses one brand-filled conversion action at a time. It does not
use gradients, decorative shadows, glass effects, auto-playing motion, or fake
jewellery photos. Missing photography gets a reusable code-native editorial
placeholder; real uploaded images replace it automatically.

## Scope and delivery order

### Vertical slice first

1. Public shell and home page (`/`).
2. Category listing (`/c/[...slug]`) with URL-driven filters and sorting.
3. Product detail (`/p/[slug]`) with weight selection, all-inclusive estimate,
   wishlist control, and WhatsApp enquiry.

This is the first usable customer journey: **Home → collection → product →
WhatsApp**.

### Remaining Phase 1B pages

Build on the same public shell and catalog data layer:

- `/rates` — current configured rates and local SEO content.
- `/wishlist` — browser-local saved products.
- `/search` — catalog search with no-results state.
- `/contact` — configured address, maps link, phone, WhatsApp and hours.

## Information architecture

### Shared public shell

`StorefrontHeader` provides the typographic wordmark plus links to Collections,
today's rates, and contact, as well as search and wishlist controls. The desktop
navigation is horizontal and spacious; mobile uses a compact menu exposing the
same actions. A discreet, fixed WhatsApp entry is available on mobile. Footer
content is drawn from the shop record.

### Home

The home page contains, in order:

1. Hero with editable shop hero heading/subheading, editorial placeholder
   composition, and a collection CTA.
2. Today's rate strip.
3. Category tile grid.
4. Featured live products.
5. A visit-or-WhatsApp trust block.

### Category listing

The route supports nested category paths. It displays a category title, product
count, responsive product grid, and filters for metal, gender, occasion and
price band, with sort. On desktop filtering is inline; on mobile it opens in a
focused panel. Product cards show image/fallback, category, product name,
single all-inclusive starting estimate when available, and wishlist control.

### Product detail

The product page uses a gallery or placeholder beside the product information.
The primary interaction is a weight-chip selector. Selecting a weight updates
the single all-inclusive estimate immediately without a network request. The
page shows rate date and configured disclaimer, never component price or
making/GST breakdown. WhatsApp enquiry is the conversion CTA.

## Data and cache model

Create a dedicated server-only public catalog data layer. It is responsible for
resolving the shop with `getShop()`, selecting only `LIVE` products, loading
related categories/metals/images/attributes/weights, and shaping public view
models. Pages and UI components do not issue Prisma queries or reproduce
pricing logic.

Listing cards use `cachedPriceMinPaise` and `cachedPriceMaxPaise` strictly for
filtering, sorting and a rendered starting estimate. Product detail calls the
existing pure price engine to calculate every selectable weight against the
latest rate, then passes that serialized selection table to the client leaf.

Public pages are cacheable/pre-rendered. Existing admin writes revalidate the
root public layout, so rate, product, category, metal and pricing changes refresh
the storefront without a database query on ordinary customer page views. Product
images use the content-hashed AVIF/WebP upload variants via `next/image`.

If no current rate or valid weight is available, the relevant card/detail
explains that the estimate is being updated and renders no invented number. If a
rate is stale according to shop configuration, a storefront banner renders the
configured text; prices remain visible.

## Client interactions

Client components are leaves only:

- Header mobile-menu state.
- Category filter panel; selections synchronize to URL search parameters.
- Product weight selector and price/WhatsApp message update.
- Browser-local wishlist provider and controls.

Filtering and sort values stay in the URL for shareable links and correct back
navigation. Wishlist needs no account in Phase 1. The WhatsApp URL is a plain
`wa.me` link built from configured shop WhatsApp, product name and selected
weight. It contains no price breakdown and calls no API.

## Components

Add a public storefront component layer, reusing existing tokenised UI
primitives where applicable:

- `StorefrontHeader` and public footer
- `RateStrip` and stale-rate banner
- `CategoryTile`, `ProductCard`, `ProductPlaceholder`
- `FilterBar` and sort controls
- `ProductConfigurator`
- Wishlist provider and buttons

No component hardcodes shop identity, colour, font, category name, metal name,
contact details, rate wording, or hero copy. Existing design-system rules remain
in force: semantic colours/radii/shadows, `next/image`, SVG icons rather than
emoji, visible focus, and 44px minimum touch controls.

## Responsive and accessibility requirements

At 375px, catalogue cards are one column, controls do not depend on hover, and
the conversion action is easy to reach. At 768px the catalogue becomes two
columns with a compact header. At 1024px and above the category filters persist
alongside the catalogue and product detail is two-column. At 1440px, whitespace
and imagery expand while copy remains within readable maximum widths.

All displayed rupees and weights use `.numeric`. Screen-reader labels accompany
icon-only controls. Empty, unavailable-price, stale-rate, failed-image, invalid
slug, no-search-result and empty-wishlist states have customer-facing copy.

## Verification

- Unit tests for public query/formatting helpers and WhatsApp link construction.
- Component-level tests for selected weight, filter/sort state and wishlist
  persistence where practical.
- `npm test`, `npm run typecheck`, and `npm run build` pass.
- Manual visual checks at 375, 768, 1024 and 1440 pixels.
- Browser checks for browse → filter → product → select weight → WhatsApp;
  stale-rate, no-rate, missing-photo and empty-catalogue states.

## Explicit non-goals

Customer accounts, synced wishlists, cart/checkout, online payment, orders,
invoicing, photo generation, WhatsApp automation, reviews, promotions and CRM
belong to later phases and are not part of Phase 1B.
