# Poddar Jewellers

Bringing a jewellery shop in Palojori, Deoghar, Jharkhand online — and built so
it can be sold to other jewellery shops, one deployment each.

A jewellery product has no fixed price. The same payal is made at 20g, 23g or
25g, and the metal rate moves every day. So **price is never stored**. It is
computed from the weight the customer picks and the rate the shop entered this
morning:

```
metal    = weight x today's rate for that metal type
making   = metal x making charge      (metal only, never the stone)
stone    = fixed, does not scale with weight
subtotal = metal + making + stone
total    = subtotal + GST, rounded UP
```

The shop enters four numbers each morning. The entire catalog re-prices itself.

**Status:** Phase 1A — the price engine, database and admin panel — is built and
merged. The customer-facing storefront is Phase 1B and has not started.

---

## Running it locally

You need Node 22+ and PostgreSQL.

```bash
# once
createuser -P poddar                                 # password: poddar
createdb -O poddar poddar_jewellers
psql -d postgres -c "ALTER ROLE poddar CREATEDB;"    # migrate dev needs a shadow database
cp .env.example .env                                 # then fill SESSION_SECRET and SEED_ADMIN_PASSWORD
npm install
npx prisma migrate dev
npm run db:seed

# every time
npm run dev
```

Then open **http://localhost:3000/admin** and sign in with the username and
password from `.env`.

No Postgres installed? `docker compose -f docker-compose.dev.yml up -d` starts
one on port 5544 — point `DATABASE_URL` at it instead.

```bash
npm test         # 79 tests, all pure — no database needed
npm run build    # production build
npx prisma migrate reset   # wipe and re-seed
```

---

## Documentation

| | |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **Start here.** Project map, the rules that must not be broken, code map, gotchas. |
| [`docs/STATUS.md`](docs/STATUS.md) | What is built, what is next, what is blocked |
| [Phase 1 spec](docs/superpowers/specs/2026-09-13-phase1-catalog-price-engine-design.md) | Source of truth: price engine, data model, storefront, deployment, sellability |
| [Phase 1A plan](docs/superpowers/plans/2026-09-13-phase1a-core-price-engine-admin.md) | The 19 tasks that built the admin |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | D1–D14, each with its reason |
| [`docs/PROJECT.md`](docs/PROJECT.md) | Shop facts, roadmap, open questions |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | NAS deploy, cache rules, onboarding another shop |
| [`docs/ADMIN-GUIDE.md`](docs/ADMIN-GUIDE.md) | How to use the admin — written for the shop, in Hinglish |
| [`docs/PHOTOGRAPHY.md`](docs/PHOTOGRAPHY.md) | Shooting guide for the photographer |

---

## Built as a product

Nothing in `src/` names a shop. Shop identity, contact details, branding,
making charge, GST, rounding and **the metal types themselves** all live in the
database and are edited from the admin panel. A shop that deals in 14K or
Silver 925 adds it there, and the daily rate screen grows an input by itself.

`src/lib/no-hardcoded-shop.test.ts` enforces this — it walks `src/` for
shop-specific literals and fails the suite on a hit.

Standing another shop up is in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
