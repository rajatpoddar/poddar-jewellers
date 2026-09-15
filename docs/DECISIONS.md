# Decisions Log

Append-only. Newest at the bottom. Every entry records **why**, not just what —
the reason is what lets a future session tell a settled decision from an
accidental one.

Do not edit past entries. To reverse one, add a new entry that supersedes it.

---

### D1 — Rate source: manual daily entry, not an API
**2026-09-13**

Considered paid IBJA/spot rate APIs with auto-refresh. Rejected as the default.

IBJA spot is not the shop's selling rate — the shop's price includes its own
margin and making charges. An auto-updating feed would publish numbers the shop
never agreed to honour, and a customer who walks in quoting a screen is a real
problem. Manual entry also removes a monthly subscription.

Cost: the rate goes stale if nobody updates it. Mitigated by staleness warnings
(spec, Section 7).

---

### D2 — Weight is a fixed list per product, not a range
**2026-09-13**

A slider would let a customer request 21.4g of a design the shop makes at 20g,
23g and 25g. The fixed list matches what the shop actually produces and keeps the
admin form simple, which matters for the handover.

---

### D3 — Making charge: 15% default, with category and product overrides
**2026-09-13**

Most-specific wins: product override, else nearest ancestor category, else the
15% default. The admin always shows where the effective value came from, so the
non-technical admin is never guessing.

---

### D4 — Customer sees a single all-inclusive number
**2026-09-13**

Owner's decision. No metal/making/GST breakdown on the storefront. A breakdown
invites negotiation over each line and makes an estimate look like a quote. The
breakdown is still computed and retained for invoicing in Phase 2.

---

### D5 — Estimates round up
**2026-09-13**

Rs 3,17,240 displays as Rs 3,17,300. An estimate that lands under the real price
creates an argument at the counter; one that lands slightly over does not. Under
Rs 10,000, round up to the nearest Rs 10 so silver items are not distorted.

---

### D6 — Host on the existing Synology NAS, built portable
**2026-09-13**

The NAS already runs Cloudflare Tunnel and Coolify, so public HTTPS costs nothing
and needs no new setup. But it is saturated: IO-bound (load 3.25 of 4.79 is IO)
and swapping 4.6 GB, with 52 containers and Surveillance Station on the same
disks.

Accepted, with three mitigations that keep the NAS out of the hot path: photos
served from Cloudflare's cache, pages pre-rendered with event-driven
revalidation, and a dedicated Postgres container. Deployed as Docker Compose so
moving to a VPS is roughly half an hour.

Accepted risks: the site is down during a power or internet outage at the
premises, and a misbehaving neighbour container can affect it.

---

### D7 — Wishlist ships in Phase 1, browser-local
**2026-09-13**

Accounts are Phase 2, but a wishlist needs no account to be useful. Stored in the
browser, migrated into the account on first login in Phase 2.

---

### D8 — Diamond and stone products are in Phase 1
**2026-09-13**

Gold moves with the daily rate; the stone does not. Storing them separately —
weight options as net gold weight, plus a fixed `stoneValue` — handles this
without complicating the engine. Cheap to include now, awkward to retrofit.

---

### D9 — No WhatsApp automation in Phase 1
**2026-09-13**

Product pages use plain `wa.me` click-to-chat links: no API, no automation, zero
ban risk. Evolution API is an unofficial WhatsApp client, and bulk marketing
through it gets numbers banned. The shop's WhatsApp number is its most valuable
channel, so Phase 4 must keep transactional (Evolution, low volume,
customer-initiated) separate from marketing (official Cloud API, approved
templates, explicit opt-in).

---

### D10 — Everything that describes the shop is a setting, not a constant
**2026-09-13**

The owner's words: *"me jo bol rha hu baad me change karunga ye sab kuch admin
panel se change ho jana chahiye."* Every fact he supplied is provisional — the
phone number is his personal one, the email is his personal one, the logo does not
exist yet, the photos are placeholders.

So the rule is broader than those specific fields: **if a value describes the shop
or the business rather than the system, it is a setting.** Shop identity, contact
details, hours, social links, the 15% making default, GST percent, rounding step,
disclaimer copy, hero content, SEO location terms.

Implemented as a single-row `settings` table with typed columns, not a key-value
store. Typed columns keep the price engine's inputs type-safe and let the admin
form be explicit and grouped, which matters more here than the flexibility of
key-value — the admin is going to be a non-technical user.

Seed values come from `PROJECT.md` on first run and are never read from code again.

---

### D11 — Sold as one deployment per shop, not as multi-tenant SaaS
**2026-09-13**

The owner intends to sell this to other jewellery shops. Two ways to do that:

**A. One deployment per shop** — own container, own database, own domain. Chosen.
**B. One deployment, every shop, rows separated by `tenantId`** — rejected for now.

B was rejected on two grounds. A single query missing its tenant filter shows one
jeweller another jeweller's catalog, pricing and eventually customer list; that
class of bug is not acceptable here. And B demands billing, self-serve signup and
domain routing before there is a second customer to justify any of it.

Three things are built now anyway, because they are cheap today and painful to
retrofit:

1. **Metal types become rows, not an enum.** Which purities a shop deals in is a
   fact about the shop. A shop adds Silver 925 from the admin panel and the daily
   rate screen grows an input on its own. This also removes the enum from the
   price engine: rates are a `Record<string, number>` keyed by metal-type key.
2. **`Shop` is a real row with a real id**, and all access goes through one
   `getShop()` helper. Every shop-owned table carries `shopId`. The day
   multi-tenancy is wanted, only `getShop()` changes — resolving from the request
   domain instead of returning the single shop. The expensive half of the
   retrofit, the migration and the audit of every query, is already paid for.
3. **Branding — logo, colours, typefaces — moves into settings**, so two
   customers do not get the same site with a different name at the top.

Deliberately not built: billing, self-serve signup, subdomain routing, tenant
isolation. The first customer is the owner's own shop. It has to work there
before it is worth selling anywhere.

---

### D12 — Dependency versions, and four accepted Prisma CLI advisories
**2026-09-13**

The plan was drafted against Next 15, Prisma 6, Vitest 3 and sharp 0.33. The
registry was checked at install time and the ecosystem had moved on; those
versions carried live advisories. Current stable versions were adopted instead:

| | Plan | Installed |
|---|---|---|
| next | 15 | **16.3.5** |
| prisma / @prisma/client | 6 | **7.10.0** |
| sharp | 0.33.5 | **0.35.4** |
| vitest | 3 | **5.0.0** |

`sharp` mattered most: 0.33.5 inherits four libvips CVEs, and sharp is what
processes every photo a shop uploads. Upgrading it closed those, and the Next
upgrade also cleared a transitive PostCSS XSS advisory.

**Deliberately not taken:** `prisma`'s `latest` dist-tag points at `8.0.0-rc.14`.
A release candidate is not what a shop's catalog should run on; the stable
`7.10.0` (`prev` tag) is used instead. TypeScript stays on 5.x — 7.x is a
ground-up rewrite and carries risk this project has no reason to take. zod stays
on 3.x and jose on 5.x: neither has an advisory, and both are pinned by working
code.

**Four high advisories remain, accepted.** All four sit inside the `prisma` CLI
devDependency — `@prisma/config`, `deepmerge-ts`, `mysql2`, and the `prisma`
umbrella entry. `npm audit` proposes "fixing" them by downgrading to prisma
6.19.3, which reintroduces what was just closed. They are not reachable here:
`mysql2` is a MySQL driver the CLI bundles and a PostgreSQL project never loads,
and `deepmerge-ts` merges our own schema config, not untrusted input. Recheck
when Prisma 8 goes stable.

Local development runs PostgreSQL 14 (already installed via Homebrew) rather than
16; production is 16 in the container. The schema uses nothing version-specific.
Docker is not installed on the development machine — it is needed only for the
production image, which is built on the NAS.

---

### D13 — Prisma 7 config and driver adapter
**2026-09-13**

Prisma 7 removed `url` from the schema's `datasource` block. Two consequences,
both adopted rather than worked around:

1. **`prisma.config.ts`** now holds the migrate/introspect connection string and
   the seed command (which supersedes the `prisma.seed` key in `package.json`).
   Prisma 7 does not read `.env` on its own, so the config calls Node's built-in
   `process.loadEnvFile()` inside a try/catch — no `dotenv` dependency, and a
   missing file in a container is not an error.
2. **The runtime client takes a driver adapter**: `@prisma/adapter-pg` wrapping
   a `pg` pool, passed as `new PrismaClient({ adapter })`.

Local development also needs `ALTER ROLE poddar CREATEDB`, because
`prisma migrate dev` builds a shadow database to diff against. Production uses
`prisma migrate deploy`, which does not.

One testing note worth keeping: `npx tsx -e` compiles as CommonJS and rejects
top-level `await`. Ad-hoc database checks go in a file, not in `-e`.

---

### D14 — Next 16 proxy, and where the admin gate actually lives
**2026-09-14**

Next 16 renamed the `middleware` file convention to `proxy`. `src/proxy.ts`
exports a function named `proxy`; the API is otherwise identical.

Reading Next's own guide on it changed the design. It says plainly that proxy
"should not be used as a full session management or authorization solution" —
it is for optimistic checks. The original plan had it as the only gate in front
of the admin pages, with the layout merely rendering children bare when signed
out. A bypassed proxy would then have rendered admin data.

So the admin panel moved into a `(panel)` route group with the login page
outside it. Route groups do not change URLs, so `/admin`, `/admin/metals` and
the rest are untouched, but the panel now has its own layout that can
`redirect('/admin/login')` outright. That layout runs on the server beneath
every admin page, which makes it the authoritative gate; the proxy stays as the
optimistic check that saves a round trip. Server actions check `getCurrentAdmin()`
independently, so authorization holds at three layers.

Two smaller things from the same session:

- Next 16's `next dev` appends a block to `CLAUDE.md` on every run and re-adds it
  if removed. It is committed rather than fought.
- Destructive admin actions (deactivating a metal type, deleting a category)
  redirect back with a readable message instead of throwing. The plan had them
  throw; a stack trace is not an answer for the non-technical admin this is being
  handed to.

---

### D15 — A design system, and fonts as a registry rather than a string
**2026-09-14**

The admin worked and looked like nothing. Every screen wrote its own
`bg-stone-900 text-white rounded px-8 py-3`, `globals.css` was a single
`@import "tailwindcss"`, and the five branding values already sitting on the
`Shop` row — `brandPrimary`, `brandInk`, `brandGround`, `fontDisplay`,
`fontBody` — were read by nothing. Hard Rule 7 was satisfied in the database and
ignored by the interface: a second customer would have got the first customer's
greys.

So the interface now goes through a token layer. `brandStyle()` writes the five
shop values onto `<html>` as custom properties; `globals.css` derives about
twenty semantic tokens from them with `color-mix`; screens only ever name
meanings — `bg-surface`, `text-ink-muted`, `intent="danger"`. `@theme inline` is
the load-bearing part: `inline` makes Tailwind emit `var(--color-ink)` into each
utility instead of copying today's hex in at build time, which is what lets one
build serve a second shop's colours. Status hues are deliberately not derived —
red has to stay red whatever primary a shop picks.

The full direction is in `docs/DESIGN-SYSTEM.md`, and
`src/lib/design-system.test.ts` enforces it the way
`no-hardcoded-shop.test.ts` enforces Rule 7: it walks `src/` and fails on a
stock palette class, a literal hex, an untokenised radius, a raw `<img>` or an
emoji, naming the line and the replacement. It was checked against a deliberate
violation before being trusted.

**Fonts could not work the same way.** `next/font/google` self-hosts its files
at build time, so it cannot accept a family name that only exists in a database
row at request time. Three options: drop `next/font` and load Google's CSS at
runtime (a render-blocking third-party request on every page, and it puts the
customer's IP at Google — both against Hard Rule 6), rebuild per shop (a code
edit per customer, against Hard Rule 8), or ship a registry.

The registry won. `src/lib/branding.ts` imports a fixed set of faces and maps
them by name; `Shop.fontDisplay` picks one of those names, and the settings
screen offers exactly them as a dropdown instead of the free-text box it had.
An unknown name falls back to the first registered face rather than to Times New
Roman. Adding a font for a new customer is one entry and one build — additive,
not a branch.

The default pairing stays Instrument Serif + Karla, already in the seed.
Cormorant/Montserrat and Playfair Display/Inter are registered beside it as the
conventional luxury pairings, available to the next shop without a code change.

Two UX defects were fixed in the same pass, both consequences of having no
component vocabulary. Destructive actions were `text-sm underline text-stone-500`
— pixel-identical to Save; delete is now the only red thing on its screen, with
a trash icon, away from the primary button. And the admin nav had no active
state at all, so no screen told you where you were.

---

### D16 — Image prompts are keyed to a shot type, not to a category
**2026-09-14**

The admin has a screen that hands the shop three ready prompts for turning a
supplier's tray photo into one product's three website photos. The question was
what the shop picks from to get them.

The obvious answer was the `Category` rows it already has. It was wrong. A
category is a row the shop edits itself: this one seeded Necklaces, Rings,
Earrings, Bangles, Payal and Mangalsutra, and the trays it actually shoots hold
jhumka, tops, lockets, bali, rani haar, two thicknesses of chain, bracelets and
shakha. Those are not the same list and never will be, and a second shop's list
will differ again. Keying the prompts to categories would mean a shop adding one
gets an empty screen until someone edits code — exactly the failure Hard Rule 8
names as a bug.

What does not vary between shops is how a kind of jewellery is photographed. A
hoop is shot on an ear whoever sells it; a conch-shell bangle has to be stopped
from turning gold in any catalogue. So `src/lib/ai-prompts.ts` carries a fixed
list of shot types, and the screen's dropdown is that list. No schema change, no
migration, and nothing for a new shop to configure.

Everything that *is* shop-specific is injected: the background colour comes from
`Shop.brandGround` and the metal name from the shop's own `MetalType` rows, so
a shop with a near-black ground or a silver line gets correct prompts with no
edit. `design-system.test.ts` enforces half of that for free — a literal hex
anywhere under `src/` fails the suite, so the colour *cannot* be baked in.

The cost is that the shop picks the shot type itself rather than having it
implied by the product's category. For a nine-item dropdown on a screen used
during catalogue entry, that is cheaper than a migration and a per-category
setting a non-technical user would have to understand.

The method these prompts implement — isolate in one pass, then shoot the
isolated image in a second — is in `docs/AI-IMAGERY.md`, which is the long form
and the place to change the wording. The module is what the screen reads.

---

### D17 — Phase 1B Storefront, Hero Carousel & ui-ux-pro-max luxury design direction
**2026-09-15**

Built the complete customer storefront (Phase 1B) for Poddar Jewellers: Homepage, Category listing with filters & sorting (`/c/[...slug]`), Product Detail Page (`/p/[slug]`) with live weight selector & dynamic price calculation (`estimate()`), 1-tap WhatsApp Enquiry deep-links (`wa.me`), Certified Rates page (`/rates`), and Shop Contact & Location page (`/contact`).

Two key UX/Design decisions were made during storefront implementation:

1. **Daily Metal Rates Strip removed from Public Homepage**:
   Owner decision. Daily metal rates are updated by the admin to drive the price engine, but showing a rate ticker on the main storefront homepage diluted the luxury shopping feel. Daily rates remain accessible on the dedicated local SEO `/rates` page and in `/admin`.
   
2. **`ui-ux-pro-max` Luxury Visual Direction + Hero Carousel**:
   Upgraded the storefront from a basic catalog grid to an immersive high-end luxury showcase using `ui-ux-pro-max` design intelligence. Added an interactive 3-slide `HeroCarousel` (Royal Heritage, Bridal Masterpieces, Showroom Craftsmanship), luxury trust pillars ("The Poddar Promise"), magazine-style category tiles with gradient overlays, and AI-generated luxury imagery mapped from `public/images/`.

All 124 unit tests, `design-system.test.ts` (zero hex/palette/emoji violations) and `no-hardcoded-shop.test.ts` pass cleanly. Prompts documented in `COMPLETE_IMAGE_PROMPTS.md`.
