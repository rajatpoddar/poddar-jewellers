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
