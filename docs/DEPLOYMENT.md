# Deployment

Target: the Synology NAS, through Coolify, published by the Cloudflare Tunnel
already running there. Spec Section 9 has the survey of that box and why the
caching decisions below matter.

## What runs where

| | |
|---|---|
| `app` | The Next.js standalone server. Published on a host port the tunnel points at. |
| `db` | PostgreSQL 16. **Not published** — nothing outside the compose network reaches it. |
| `migrate` | One-shot. Never starts with `up`; run it explicitly. |

## First deploy

1. In Coolify, create a Docker Compose resource from this repository.
2. Set the environment variables from `.env.docker.example`:
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `SESSION_SECRET` — 32+ characters (`openssl rand -base64 32`)
   - `APP_PORT` — a free host port. **Check first**, the NAS runs 52 containers:
     `sudo /usr/local/bin/docker ps --format '{{.Ports}}' | tr ',' '\n' | grep -o '0.0.0.0:[0-9]*'`
   - `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`
3. Deploy, then migrate and seed:
   ```bash
   docker compose run --rm migrate
   ```
   This runs `prisma migrate deploy` followed by the seed. It is safe to re-run:
   migrations are idempotent and so is the seed.
4. Add a public hostname in the Cloudflare Tunnel pointing at
   `http://<nas-ip>:<APP_PORT>`.
5. Sign in at `/admin/login` and change the seeded password.

On later deploys, run `docker compose run --rm migrate` again only when
`prisma/migrations/` has gained a directory.

## Cloudflare cache rules

These are what keep the NAS out of the request path. Without them the site is as
slow as the disk it sits on, and that disk is already busy.

| Path | Rule |
|---|---|
| `/_next/static/*` | Cache everything, edge TTL 1 year |
| `/uploads/*` | Cache everything, edge TTL 1 year |
| `/admin/*` | Bypass cache entirely |

Both cached paths use content-hashed filenames, so a stale cache is impossible —
a changed file is a different URL.

## Setting this up for another jewellery shop

This software is sold one deployment per shop.

1. Deploy the same compose stack with its own `POSTGRES_*`, `SESSION_SECRET` and
   `APP_PORT`.
2. Copy `prisma/seed.ts`, and change two blocks: the shop's own details, and its
   metal types. A shop dealing in 14K or Silver 925 seeds those keys instead.
   Everything else in the seed is generic.
3. `docker compose run --rm migrate`.
4. Point that shop's domain at the new port through the tunnel.
5. Hand over the admin credentials.

Everything else — name, address, phone, WhatsApp, email, colours, fonts, making
charge, GST, rounding, metal types, categories — that shop changes itself from
the admin panel.

> **If a change for one shop ever needs a code edit, that is a bug.** The value
> belongs on the `Shop` row or in `MetalType`. Nothing in `src/` mentions Poddar
> Jewellers; `prisma/seed.ts` is the only file that names a shop.

## Moving off the NAS

Plain Docker Compose, so: copy `docker-compose.yml` and the environment to the
new host, restore the `pgdata` and `uploads` volumes, `docker compose up -d`,
repoint the tunnel hostname. About half an hour.

The trigger to move: page loads that stay slow, or the point where an outage at
the premises stops being acceptable.

## Backups

Two volumes hold everything that cannot be rebuilt:

- **`pgdata`** — the catalog, rate history and shop settings
- **`uploads`** — the product photography

Add both to the NAS's existing backup job. The rest of the stack rebuilds from
this repository.

## Local development

No Docker needed if Postgres is already installed:

```bash
createuser -P poddar                                 # password: poddar
createdb -O poddar poddar_jewellers
psql -d postgres -c "ALTER ROLE poddar CREATEDB;"    # migrate dev needs a shadow database
cp .env.example .env                                 # then fill SESSION_SECRET and SEED_ADMIN_PASSWORD
npm install && npx prisma migrate dev && npm run db:seed && npm run dev
```

With Docker: `docker compose -f docker-compose.dev.yml up -d` and point
`DATABASE_URL` at port 5544 instead.
