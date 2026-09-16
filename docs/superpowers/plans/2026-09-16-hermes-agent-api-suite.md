# Phase 6 Hermes Agent Admin API Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure REST API suite (`/api/agent/v1/...`) with API key authentication (`ApiKey` Prisma schema) allowing the owner's Hermes Agent to update daily metal rates, fetch sales & customer engagement analytics, retrieve wishlist-added leads without orders, dispatch targeted WhatsApp outreach messages, and manage API keys in Admin.

**Architecture:** Add `ApiKey` Prisma model with SHA-256 hashed keys; implement `authenticateAgentRequest()` middleware; create REST API route handlers at `/api/agent/v1/rates`, `/api/agent/v1/analytics`, `/api/agent/v1/leads/wishlist-no-order`, and `/api/agent/v1/outreach/send`; add Admin API Key management page at `/admin/api-keys`.

**Tech Stack:** Next.js 16 (App Router REST Route Handlers), TypeScript, PostgreSQL + Prisma 7, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-16-hermes-agent-api-suite-design.md`](file:///Users/rajatpoddar/Documents/Projects/poddar-jewellers/docs/superpowers/specs/2026-09-16-hermes-agent-api-suite-design.md)

## Global Constraints

- **Hard Rule #1**: Price is NEVER stored in database.
- **Hard Rule #7**: Zero hardcoded shop facts (`getShop()` or authenticated `shop` must be used).
- **Hard Rule #8**: Multi-tenant additive model (`shopId` on `ApiKey` table).
- **Hard Rule #9**: Design system compliance on Admin UI screens.

---

## File Structure

```
prisma/
  schema.prisma                           (Modify: Add ApiKey model and Shop.apiKeys relation)

src/lib/
  agent-auth.server.ts                    (Create: Agent API Key hashing & auth helper)
  agent-auth.server.test.ts               (Create: Unit tests for agent authentication)

src/app/api/agent/v1/
  rates/route.ts                          (Create: POST daily rates update route)
  analytics/route.ts                      (Create: GET sales & engagement analytics route)
  leads/wishlist-no-order/route.ts        (Create: GET wishlist leads without orders route)
  outreach/send/route.ts                  (Create: POST targeted outreach dispatch route)

src/app/admin/(panel)/
  api-keys/
    page.tsx                              (Create: Admin API Keys management page)
    actions.ts                            (Create: Server Actions for API key generation & deletion)
```

---

### Task 1: `ApiKey` Prisma Model & Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify/Test: `src/lib/schema.test.ts`

**Interfaces:**
- Consumes: Prisma schema.
- Produces: `ApiKey` model linked to `Shop`.

- [ ] **Step 1: Add `ApiKey` model to `prisma/schema.prisma`**

```prisma
model ApiKey {
  id         String    @id @default(cuid())
  shopId     String
  shop       Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  
  name       String
  keyPrefix  String
  keyHash    String    @unique
  
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([shopId, keyHash])
}
```

- [ ] **Step 2: Run Prisma push**

Run: `npx prisma db push`
Expected: Database schema updated successfully.

- [ ] **Step 3: Update `schema.test.ts` to assert `db.apiKey` delegate exists**

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma src/lib/schema.test.ts
git commit -m "feat(db): add ApiKey Prisma model for Hermes Agent integration"
```

---

### Task 2: Agent Authentication Middleware (`src/lib/agent-auth.server.ts`)

**Files:**
- Create: `src/lib/agent-auth.server.ts`
- Create: `src/lib/agent-auth.server.test.ts`

**Interfaces:**
- Consumes: `Request` object and Prisma client (`db`).
- Produces: `authenticateAgentRequest(request: Request)` returning `{ shop: Shop, apiKey: ApiKey } | null`, and `generateApiKey(shopId, name)` returning `{ rawKey: string, apiKey: ApiKey }`.

- [ ] **Step 1: Write failing unit test in `agent-auth.server.test.ts`**

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/agent-auth.server.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/agent-auth.server.ts`**

Implement SHA-256 hashing, key prefix generation (`hermes_live_...`), key lookup by hash, and `lastUsedAt` timestamp update.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/agent-auth.server.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent-auth.server.ts src/lib/agent-auth.server.test.ts
git commit -m "feat(server): add agent API key authentication middleware and hash generation"
```

---

### Task 3: Hermes Agent REST Endpoints (`/api/agent/v1/...`)

**Files:**
- Create: `src/app/api/agent/v1/rates/route.ts`
- Create: `src/app/api/agent/v1/analytics/route.ts`
- Create: `src/app/api/agent/v1/leads/wishlist-no-order/route.ts`
- Create: `src/app/api/agent/v1/outreach/send/route.ts`
- Create: `src/app/api/agent/v1/agent-api.test.ts`

**Interfaces:**
- Consumes: `authenticateAgentRequest()`, rates module, CRM modules, price cache module.
- Produces: 4 secure REST route handlers for Hermes Agent.

- [ ] **Step 1: Write failing API endpoint integration tests in `agent-api.test.ts`**

- [ ] **Step 2: Implement `POST /api/agent/v1/rates`**
Save new rates and trigger `recomputeProductPrices()`.

- [ ] **Step 3: Implement `GET /api/agent/v1/analytics`**
Return order counts, revenue in paise & formatted INR, and customer views.

- [ ] **Step 4: Implement `GET /api/agent/v1/leads/wishlist-no-order`**
Query customers with wishlist items who have not placed an order.

- [ ] **Step 5: Implement `POST /api/agent/v1/outreach/send`**
Dispatch targeted WhatsApp message and log in `OutreachLog`.

- [ ] **Step 6: Run tests to verify all endpoints pass**

Run: `npx vitest run src/app/api/agent/v1/agent-api.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/agent/v1/
git commit -m "feat(api): implement Hermes Agent REST endpoints (rates, analytics, leads, outreach)"
```

---

### Task 4: Admin API Keys Management UI (`/admin/api-keys`)

**Files:**
- Create: `src/app/admin/(panel)/api-keys/page.tsx`
- Create: `src/app/admin/(panel)/api-keys/actions.ts`
- Create: `src/app/admin/(panel)/api-keys/ApiKeysClient.tsx`
- Modify: `src/components/admin/NavLinks.tsx`

**Interfaces:**
- Consumes: `generateApiKey()` & `deleteApiKeyAction()`, design system UI components (`Button`, `Field`, `Input`, `Surface`, `Notice`, `Badge`).
- Produces: Admin panel page at `/admin/api-keys`.

- [ ] **Step 1: Implement Server Actions in `actions.ts`**
`createApiKeyAction(name: string)` and `deleteApiKeyAction(id: string)` verifying `getCurrentAdmin()`.

- [ ] **Step 2: Implement Admin UI in `ApiKeysClient.tsx` & `page.tsx`**
Form to generate API key, display raw secret key ONCE in a highlighted toast/box, and list active keys with `lastUsedAt` timestamps and revoke buttons. Add "API Keys" link to `NavLinks.tsx`.

- [ ] **Step 3: Verify with Design System & No Hardcoded Shop tests**

Run: `npx vitest run src/lib/design-system.test.ts src/lib/no-hardcoded-shop.test.ts`
Expected: PASS

- [ ] **Step 4: Run full build and test suite**

Run: `npm test && npm run typecheck && npm run build`
Expected: Clean exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/\(panel\)/api-keys/ src/components/admin/NavLinks.tsx
git commit -m "feat(admin): add API Keys management screen for Hermes Agent"
```
