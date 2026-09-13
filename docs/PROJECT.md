# Project Facts — Poddar Jewellers

Real-world facts about the shop and the project. Design and architecture live in
the Phase 1 spec; this file holds the things the spec references but does not own.

> **Every fact on this page is a seed value, not a constant.** All of it is
> editable from the admin panel. Nothing here may be hardcoded anywhere in the
> codebase — see Hard Rule 7 in `CLAUDE.md`.

---

## The shop

| | |
|---|---|
| Name | Poddar Jewellers |
| Address | Main Road Palojori, Deoghar, Jharkhand 814146 |
| Phone | 7250580175 |
| WhatsApp | 7250580175 (same number) |
| Email | rajatpoddar17@gmail.com |
| Availability | Website live 24x7 |
| Social | None yet |
| Logo | Not made yet |
| Owner | Rajat Poddar — runs admin today |
| Future admin | Rajat's father — non-technical, handover planned |

### Temporary values

These are stand-ins and **will** change. They are seeded into settings on first
run and changed from the admin panel afterwards — no code change, no deploy.

- **Phone / WhatsApp 7250580175** — Rajat's personal number, until the shop number is ready
- **Email rajatpoddar17@gmail.com** — Rajat's personal email, until the shop has one
- **Logo** — until one exists, the shop name is set as a typographic wordmark in the
  display face. The admin panel accepts a logo upload that replaces it.
- **Product photos** — placeholders until the real catalog is shot to the standard
  in `PHOTOGRAPHY.md`
- **Counter hours** — the site shows "Online 24x7". If the physical shop's counter
  timings should appear on the contact page, they go in the admin panel.

### Market context

The shop is in Palojori, Deoghar district, Jharkhand. The owner tracks Asansol
bullion rates as the nearby reference market. Local SEO on `/rates` should target
Palojori, Deoghar and Jharkhand, with Asansol as a secondary term. These terms are
settings, not constants.

---

## Pricing

| | |
|---|---|
| Default making charge | **15%**, on every product |
| Category override | Set from admin, per category |
| Product override | Set from admin, per product |
| GST | 3% on the full value — **pending CA confirmation** |
| Rounding | Always up, to the nearest Rs 100 (Rs 10 under Rs 10,000) |

The owner confirmed 15% applies across the board today. Category and product
overrides exist for when that changes, and changing the 15% default itself is an
admin field, not a deploy.

---

## People this is being built for

**Customers** — mostly buying for weddings, festivals and gifting. They browse on
a phone, often on mobile data, and they want an idea of cost before walking in.
They are not going to complete a card payment for a gold necklace online; the
site's job is to make them want to come to the shop, or to start a WhatsApp
conversation.

**Rajat** — technical, runs a Synology NAS with 52 containers. Handles admin now.

**Rajat's father** — will take over the daily rate update. Non-technical. If he
cannot do the daily task without being shown twice, the admin design has failed.

---

## Domain

Not yet purchased. Recommended:

- **Production:** `poddarjewellers.in` (or `.com`). Short, exact-match, easy to
  say over the phone — which matters for a shop whose customers hear the name
  before they type it.
- **Staging:** a subdomain on the already-owned `palojori.in`, routed through the
  existing Cloudflare Tunnel. No extra cost, no extra setup.

Buy the production domain **inside the same Cloudflare account** that runs the
existing tunnel. That keeps DNS, caching and the tunnel in one place.

---

## Roadmap

Phase boundaries and estimates are in the spec, Section 12. Summary:

1. **Catalog + price engine** ← current
2. Accounts, wishlist sync, orders, invoicing
3. CRM: diary contact import, segments, opt-in capture
4. WhatsApp: transactional + marketing, kept separate
5. Campaign engine: festivals, offers, scheduling
6. AI agent, only if Phases 4-5 prove the need

---

## Open questions

| # | Question | Needed by | Status |
|---|---|---|---|
| 1 | GST treatment — 3% on the full value (metal + making + stone)? | Before launch | **Ask the CA** |
| 2 | GSTIN | Phase 2 (invoicing) | Open |
| 3 | Domain purchased? | Before deployment | Open |
| 4 | Real logo | Whenever ready — wordmark until then | Open |
| 5 | Real product photos | Before launch — placeholders until then | Open |
| 6 | Physical counter hours, if they should be shown | Before launch | Open |

Resolved: making charge (15% default), address, phone, email, social (none yet).
