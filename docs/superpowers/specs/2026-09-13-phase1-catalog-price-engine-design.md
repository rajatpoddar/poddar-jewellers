# Poddar Jewellers — Phase 1 Design: Catalog + Price Engine

**Date:** 2026-09-13
**Status:** Approved for planning
**Phase:** 1 of 6

---

## 1. Context

Poddar Jewellers is a physical jewellery shop. The owner wants the whole shop
online: a premium browsing experience where customers explore products from
home and see a realistic price, even though gold and silver rates change daily.

This document specifies **Phase 1 only**. The full roadmap is in Section 12.

### The core problem

A jewellery product has no fixed price. The same payal design can be made at
20g, 23g or 25g, and the metal rate changes every day. A stored `price` column
would be wrong within hours.

**Therefore: price is never stored. Price is always computed** from
(selected weight x today's rate) + making charge + stone value + GST.

The owner updates the rate once a day. That single action re-prices the entire
catalog.

---

## 2. Goals and non-goals

### Goals
- Premium, mobile-first storefront that feels like walking into the shop
- Every product shows a realistic, all-inclusive estimated price
- Customer picks a weight; price updates instantly
- Owner's daily work is one screen and under 30 seconds
- Admin usable by a non-technical person (handover to owner's father planned)
- Fast on mobile data (jewellery photography is heavy)

### Non-goals for Phase 1
- Customer login / accounts (Phase 2)
- Order placement (Phase 2)
- CRM, contact import (Phase 3)
- WhatsApp automation (Phase 4)
- Campaigns, festival marketing (Phase 5)
- AI agent (Phase 6, only if justified)

---

## 3. Price engine

The heart of the system. A **pure function**, written test-first.

### Inputs
- `product` — purity, making-charge override, stone value, category
- `selectedWeight` — grams, chosen by the customer from the product's weight list
- `rates` — today's per-gram rates

### Resolution of making charge (cascade, most specific wins)

```
makingPercent = product.makingPercent
             ?? nearestAncestorCategory.makingPercent
             ?? settings.defaultMakingPercent   // 15
```

The admin UI always shows where the effective value came from, e.g.
`15% (from default)` or `12% (from Payal category)`.

### Calculation

```
metalValue = selectedWeight * rates[product.purity]
making     = metalValue * makingPercent / 100
stone      = product.stoneValue ?? 0          // fixed rupee amount
subtotal   = metalValue + making + stone
gst        = subtotal * 0.03
total      = subtotal + gst
displayPrice = total < 10000 ? roundUpToNearest(total, 10)
                             : roundUpToNearest(total, 100)
```

### Rounding

`roundUpToNearest(total, 100)` — always rounds **up**. The estimate must never
undercut what the shop will actually charge. For items under Rs 10,000 round up
to the nearest Rs 10 instead, so cheap silver items do not look distorted.

### What the customer sees

Only the final number.

```
Rs 3,18,000 (approx.)
Aaj ke rate par anumaanit, sab tax shaamil
```

**No breakdown is ever shown on the storefront.** Metal value, making charge and
GST are computed and retained server-side for invoicing (Phase 2) but never
rendered to the customer.

### Purities supported

Rates entered daily: `GOLD_24K`, `GOLD_22K`, `GOLD_18K`, `SILVER_999` (Rs per gram).
Every product references exactly one of these. Adding a purity later (e.g.
SILVER_925) means one new rate field and one new enum value — the engine itself
does not change.

### Diamond and stone products

Gold moves with the daily rate; the stone does not. These are stored separately:
the product's weight options are the **net gold weight**, and `stoneValue` is a
fixed rupee amount the admin enters. Display shows the composition
(`18K gold 4.2g + 0.50ct diamond`) but still a single price.

### Open question for the owner

GST is applied at 3% on the full value (metal + making + stone), which is the
standard treatment for a composite supply of jewellery. **This should be
confirmed with the shop's CA** before launch. The rate lives in settings, so
changing it is a config change, not a code change.

---

## 4. Data model

| Table | Purpose |
|---|---|
| `rates` | One row per rate update: gold24k, gold22k, gold18k, silver999 (Rs/gram), updatedBy, updatedAt. Latest row is live; older rows are history (feeds the rate chart in Phase 5). |
| `products` | name, slug, description, metalType (GOLD/SILVER/DIAMOND — a filter facet, distinct from purity: a diamond ring is metalType DIAMOND with purity GOLD_18K), purity, makingPercent (nullable override), stoneValue, stoneDescription, categoryId, status (draft/live), featured, cachedPriceMin, cachedPriceMax, cachedAt |
| `product_weights` | productId, weightGrams, sortOrder. A payal with 20/23/25g has three rows. |
| `product_images` | productId, path, variants, alt, sortOrder, isPrimary |
| `categories` | Tree (parentId). Also carries an optional `makingPercent` override. |
| `attributes` | Grouped tags: OCCASION (wedding, daily-wear, gifting, festive), GENDER (women, men, kids, teens), STYLE |
| `product_attributes` | Many-to-many join |
| `settings` | defaultMakingPercent (15), gstPercent (3), shop details, staleness thresholds |

### Price cache

Filtering and sorting by price cannot recompute every product on every request.
So `products.cachedPriceMin` / `cachedPriceMax` (across that product's weight
options) are recomputed in a batch **every time a rate is saved**. At 20-50
products this is milliseconds; it stays fine into the thousands.

Listing pages filter and sort on the cache. Product detail pages compute live.

---

## 5. Storefront

| Route | Page |
|---|---|
| `/` | Home — hero, featured collections, today's rate strip, category tiles, new arrivals |
| `/c/[...slug]` | Category listing with filters (metal, gender, occasion, price band) and sort |
| `/p/[slug]` | Product detail — photo gallery, weight selector, live price, wishlist, WhatsApp enquire |
| `/rates` | Today's gold and silver rates |
| `/wishlist` | Browser-local wishlist |
| `/search` | Search |
| `/contact` | Address, map, phone, WhatsApp, timings |

### Weight selector

The primary interaction. Weight chips (`20g` `23g` `25g`); tapping one updates
the price immediately with a subtle transition. No page reload, no spinner —
all weight/price combinations are computed server-side and shipped with the page.

### WhatsApp enquire

A plain `wa.me` click-to-chat deep link, pre-filled with the product name and
selected weight. **No automation, no API, zero ban risk.** This is the Phase 1
conversion path: browse at home, talk on WhatsApp, buy at the shop.

### Wishlist

Stored in the browser (no login). Half a day of work, immediate value. Phase 2
migrates it into the customer's account on first login.

### /rates as an acquisition channel

`bullions.co.in` ranks for "gold rate Asansol" and gets steady organic traffic
from it. A well-built `/rates` page with proper local SEO is a genuine, free
customer-acquisition channel for the shop, not just a utility page.

---

## 6. Admin panel

Deliberately split into two halves.

### Daily (the landing screen after login)

**"Aaj ka Rate"** — four inputs, one Save button.

On save:
1. Show a confirmation with the change vs the previous rate
   (`Kal Rs 12,000 → aaj Rs 12,400 (+3.3%)`)
2. Any single rate moving more than 10% requires a second confirmation — this
   catches typos before they reach customers
3. Recompute the price cache for all products
4. Revalidate all cached pages

### Occasional

- Products — list, create, edit. Form: name, category, purity, weight options,
  making % (blank = inherit, with the inherited value shown), stone value,
  photos, attributes, status
- Categories — tree management, per-category making % override
- Settings — default making %, GST %, shop details

### Non-technical usability

The handover to the owner's father is a hard design constraint:
- Large touch targets, bilingual labels (Hindi + English)
- Destructive actions are not reachable from the daily screen
- Nothing on the daily screen can be triggered accidentally
- Prominent banner if the rate is stale

---

## 7. Rate staleness

| Age | Behaviour |
|---|---|
| < 24h | Normal. Rate date shown on product pages. |
| > 24h | Large warning in admin |
| > 48h | Soft banner on the storefront: *"Rate 2 din se update nahi hua — confirm karne ke liye call kariye"* |

Prices are **never hidden**. Hiding them makes the site useless. The rate's date
is always visible on product pages instead.

---

## 8. Tech stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS**
- **PostgreSQL 16** — own container, isolated from the NAS's existing MariaDB
- **Prisma** ORM
- **sharp** — image resize/compress at upload into AVIF/WebP at several widths
- **jose** — signed httpOnly session cookie for admin auth (single user in
  Phase 1; roles arrive in Phase 2)
- **Vitest** (unit) + **Playwright** (browser)

---

## 9. Deployment

**Target: the existing Synology NAS. Built to be portable.**

### Server survey (2026-09-13)

| | |
|---|---|
| Model | Synology RS3617xs+, DSM 7.3.1 |
| CPU | Intel i3-6100 — 2 cores / 4 threads |
| RAM | 11.65 GB; 5.6 GB used, 287 MB free |
| Swap | 4.6 GB of 9 GB in use |
| Load avg | 4.79 (IO 3.25, CPU 1.55) |
| Disk | volume1 1.4 TB free of 3.5 TB; volume2 410 GB free |
| Containers | 52 running |

Already present and reused: **Cloudflare Tunnel** (~20 domains already served
through it) and **Coolify**. Public HTTPS therefore needs no port forwarding,
no static IP and no certificate management.

### The constraint

The NAS is saturated: IO-bound (load 3.25 of 4.79 is IO) and under memory
pressure (4.6 GB swapped). Surveillance Station and ActiveBackup keep the disks
busy continuously. A customer-facing site that must feel fast is in direct
tension with this.

### Mitigation — three decisions that keep the NAS out of the hot path

1. **Photos are served from Cloudflare's cache, not the NAS.** Photography is
   ~90% of the bytes on a jewellery site. Long cache lifetimes, immutable
   filenames.
2. **Pages are pre-rendered and cached.** Normal browsing never queries the
   database. Saving a rate triggers on-demand revalidation
   (`revalidateTag('rates')`), so freshness is event-driven, not per-request.
3. **A dedicated Postgres container**, so no other project on the box can
   contend with it.

With these, Phase 1 traffic against a 20-50 product catalog is comfortable.

### Portability

Deployed as Docker Compose through Coolify. Moving to a VPS is a compose-up plus
a DNS/tunnel change — roughly half an hour. The trigger to move: sustained slow
page loads, or the business reaching a point where an ISP or power outage at the
premises is unacceptable.

Accepted risks of NAS hosting, acknowledged by the owner:
- Site is down during a power or internet outage at the premises
- A misbehaving neighbour container can affect the site

### Security note

The Cloudflare Tunnel token is visible in the cloudflared container's command
arguments to anyone with docker access on the NAS. Normal for cloudflared, worth
knowing.

---

## 10. Performance targets

- LCP under 2.5s on 4G mobile
- Product detail pages served from the Cloudflare edge
- The NAS handles admin writes and revalidation only
- Every image served as AVIF/WebP, correctly sized, lazy below the fold

---

## 11. Testing

### Unit (Vitest) — written before implementation

The price engine is where a bug shows a customer the wrong number, so it carries
the most coverage:
- Each purity against known rates
- Making-charge cascade: product override, category override, inherited default
- Stone/diamond products (fixed component does not scale with weight)
- Rounding, including the sub-Rs 10,000 tier
- Missing or stale rate handling
- Price cache min/max across weight options

### Browser (Playwright)

- Browse → category filter → product → change weight → price updates
- Admin saves a rate → storefront price changes
- Large rate change triggers the second confirmation
- Wishlist survives a reload

---

## 12. Roadmap context

| Phase | Scope | Estimate |
|---|---|---|
| **1** | **Catalog + price engine + storefront + admin** | **3-4 weeks** |
| 2 | Customer accounts, wishlist sync, orders with required-by date, invoicing | 3 weeks |
| 3 | CRM: diary contact import, profiles, purchase history, opt-in capture, segments | 2 weeks |
| 4 | WhatsApp: transactional via Evolution API; marketing via official Cloud API on an opted-in list | 2-3 weeks |
| 5 | Campaign engine: festival calendar, offers, scheduling, performance data | 3 weeks |
| 6 | AI agent — only if Phases 4-5 show a real need | TBD |

### Standing risk, carried into Phase 4

Evolution API is an unofficial WhatsApp client. Bulk marketing through it gets
numbers banned, and the shop's WhatsApp number is its most valuable channel.
Phase 4 must keep transactional messages (low volume, customer-initiated,
Evolution) separate from marketing broadcasts (official Cloud API, approved
templates, explicit opt-in). Contact import in Phase 3 must capture consent
rather than assume it — required under the DPDP Act, and opted-in lists convert
better regardless.

---

## 13. Inputs still needed from the owner

- Domain name (registered, or to be registered)
- Shop details: legal name, address, phone, WhatsApp number, opening hours
- Logo, if one exists
- 2-3 real product photos to design against
- Actual making-charge range in practice, to validate the 15% default
- CA's confirmation on the 3% GST treatment

### Photography

Photography is the larger part of whether this site reads as premium. The
requirement is consistency: one background, one angle, one lighting setup across
the whole catalog. A phone camera is sufficient. A short shooting guide will be
produced alongside implementation.

---

## 14. Decisions log

| Decision | Choice | Why |
|---|---|---|
| Rate source | Manual daily entry by owner | The shop's own selling rate, not IBJA spot. No subscription, no liability from a number the shop would not honour. |
| Weight options | Fixed list per product | Matches what the shop actually makes. Simpler admin than a range slider. |
| Making charge | 15% default, category and product overrides | Owner's actual practice |
| Price display | Single all-inclusive number, no breakdown | Owner's decision. Breakdown belongs on the invoice. |
| Rounding | Always up | An estimate must never undercut the real price |
| Hosting | NAS first, built portable | Rs 0 marginal cost, infrastructure already present; escape hatch retained |
| Wishlist | Browser-local in Phase 1 | Real value without waiting for accounts |
| Diamond products | In scope for Phase 1 | Separate fixed stone value; the engine handles it cleanly |
