# Poddar Jewellers — Session Primer

**Read this file first, every session. It is the map.**

Poddar Jewellers is a real jewellery shop in Palojori, Deoghar, Jharkhand. This
repo brings the shop online: a premium catalog where customers browse from home,
see a realistic all-inclusive price, and continue the conversation on WhatsApp.

The owner (Rajat) runs the admin panel today and will hand it to his father — a
non-technical user — once it is simple enough. That handover is a design
constraint, not a nice-to-have.

---

## Hard rules — never break these

1. **Price is never stored.** No `price` column, ever. Price is computed from
   `selected weight x today's metal rate` + making charge + stone value + GST.
   The only cached prices are `cachedPriceMin`/`cachedPriceMax` on `products`,
   used purely for filtering and sorting, recomputed on every rate save.

2. **The customer sees one number.** No metal/making/GST breakdown on the
   storefront, ever. The breakdown is computed and retained server-side for
   invoicing, and shown nowhere else. This was an explicit owner decision.

3. **Estimates round up, never down.** An estimate must never undercut what the
   shop will actually charge.

4. **The daily admin screen stays a 30-second job.** Four rate inputs and a Save
   button. Nothing destructive is reachable from it. Every new admin feature goes
   somewhere else.

5. **No WhatsApp automation in Phase 1.** Product pages use plain `wa.me`
   click-to-chat links. Automation arrives in Phase 4 with the transactional and
   marketing paths kept strictly separate — see the standing risk in the spec.

6. **The NAS stays out of the request hot path.** Photos are Cloudflare-cached,
   pages are pre-rendered, revalidation is event-driven off rate saves. Anything
   that puts a database query on a normal page view is a regression.

7. **No shop fact is hardcoded.** Shop name, address, phone, WhatsApp, email,
   logo, hours, social links, making-charge default, GST percent, rounding step,
   disclaimer copy, hero content, SEO location terms — all of it lives in
   `settings` and is editable from the admin panel. If a value describes the shop
   or the business rather than the system, it is a setting. The owner stated this
   directly: everything he has told us, he expects to change himself later.

---

## Where things are

| File | What it holds | When to read |
|---|---|---|
| `CLAUDE.md` | This map, plus the hard rules | Always, first |
| `docs/STATUS.md` | What is built, what is next, what is blocked | Always, second |
| `docs/superpowers/specs/2026-09-13-phase1-catalog-price-engine-design.md` | **Source of truth** for Phase 1 design: price engine, data model, pages, deployment, testing | Before any Phase 1 work |
| `docs/PROJECT.md` | Shop facts, contact details, roadmap, open questions | When you need a real-world fact |
| `docs/DECISIONS.md` | Append-only log of decisions and their reasons | Before revisiting a settled choice |
| `docs/PHOTOGRAPHY.md` | Shooting guide, written for the photographer | Photo/asset work |

**Do not duplicate the spec into other docs.** If a design fact changes, change
it in the spec and link to it. Duplicated facts go stale and then mislead.

---

## Current phase

**Phase 1 — Catalog + Price Engine.** Roadmap and phase boundaries are in the
spec, Section 12. Do not pull Phase 2+ work forward without saying so explicitly:
the phases exist so the shop gets something usable early.

---

## Conventions

- **Stack:** Next.js 15 (App Router) + TypeScript, Tailwind, PostgreSQL 16 +
  Prisma, Vitest, Playwright
- **Price engine is a pure function**, written test-first. It is the one place a
  bug shows a customer a wrong number, so it carries the heaviest coverage.
- **Money is computed in paise (integers).** Never accumulate rupees in floats.
- **Customer-facing copy is Hinglish in Latin script** — the way the shop's
  customers actually read. Admin labels are bilingual.
- **Currency renders as Indian digit grouping** (`Rs 3,18,000`), never
  `Rs 318,000`.

---

## Update discipline

At the end of a working session, update `docs/STATUS.md`. A new session should be
productive from `CLAUDE.md` + `STATUS.md` + the spec alone, without re-reading
the codebase or re-deriving decisions.

New decisions go in `docs/DECISIONS.md` with the reason, not just the choice.
