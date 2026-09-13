# Project Facts — Poddar Jewellers

Real-world facts about the shop and the project. Design and architecture live in
the Phase 1 spec; this file holds the things the spec references but does not own.

---

## The shop

| | |
|---|---|
| Name | Poddar Jewellers |
| Location | Palojori, Deoghar, Jharkhand |
| Phone | 7250580175 |
| WhatsApp | 7250580175 (same number) |
| Owner | Rajat Poddar — runs admin today |
| Future admin | Rajat's father — non-technical, handover planned |

**Phone number is temporary.** 7250580175 is Rajat's personal number, standing in
until the shop number is ready. It must be a single config value, referenced
nowhere else, so the switch is a one-line change.

### Market context

The shop is in Palojori, Deoghar district, Jharkhand. The owner tracks Asansol
bullion rates as the nearby reference market. Local SEO on `/rates` should target
Palojori, Deoghar and Jharkhand, with Asansol as a secondary term.

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

Answers go here as they arrive; each one that stays open is marked in the code
with a `TODO(project)` comment pointing at this file.

| # | Question | Needed by | Status |
|---|---|---|---|
| 1 | GST treatment — 3% on the full value (metal + making + stone)? | Before launch | **Ask the CA** |
| 2 | Actual making-charge percentages, per category | Before catalog entry | Open |
| 3 | Shop opening hours | Before contact page | Open |
| 4 | Does a logo exist? | Before visual design | Open |
| 5 | Full postal address + pincode | Before contact page and local SEO | Open |
| 6 | Shop email address | Before contact page | Open |
| 7 | GSTIN | Phase 2 (invoicing) | Open |
| 8 | Existing Instagram / Facebook page | Before footer links | Open |
| 9 | Domain purchased? | Before deployment | Open |

---

## Assets needed

- 2-3 real product photos, to design against rather than guessing with stock
- Logo, if one exists
- Eventually: the full catalog shot to the standard in `PHOTOGRAPHY.md`
