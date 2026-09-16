# Phase 6 Design Spec — Hermes Agent Admin API & Automation Suite

**Date:** 2026-09-16  
**Status:** Approved  
**Phase:** Phase 6 (Hermes Agent Integration & Automation API)  
**Target:** Hermes AI Agent, Admin Panel, Database Schema, Pricing Cache, WhatsApp Outreach Hub

---

## 1. Overview & Goals

The **Hermes Agent Admin API & Automation Suite** allows the shop owner's autonomous **Hermes Agent** to interact programmatically with the Poddar Jewellers system via secure REST API endpoints.

Key Objectives:
1. **Secure API Key Authentication**: Hashed API key authentication model (`ApiKey` Prisma schema) providing bearer token authorization (`X-Hermes-API-Key` or `Authorization: Bearer hermes_live_...`).
2. **Programmatic Daily Rate Updates**: Endpoint `POST /api/agent/v1/rates` allowing Hermes Agent to submit daily Gold & Silver bullion rates, immediately re-pricing the catalog.
3. **Sales & Customer Engagement Analytics**: Endpoint `GET /api/agent/v1/analytics` returning order totals, revenue figures, category views, and customer engagement metrics.
4. **Wishlist Abandoned Lead Detection**: Endpoint `GET /api/agent/v1/leads/wishlist-no-order` returning customers with wishlisted items who have not placed an order yet.
5. **Targeted WhatsApp Outreach Dispatch**: Endpoint `POST /api/agent/v1/outreach/send` allowing Hermes Agent to dispatch personalized promotional or follow-up WhatsApp messages with background audit logging.
6. **Admin API Key Management UI**: Screen at `/admin/api-keys` allowing the owner to generate, view usage timestamps, and revoke agent API keys.

---

## 2. Data Model (`prisma/schema.prisma`)

```prisma
model ApiKey {
  id         String    @id @default(cuid())
  shopId     String
  shop       Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  
  name       String    // e.g. "Hermes Primary Agent Key"
  keyPrefix  String    // e.g. "hermes_live_a1b2"
  keyHash    String    @unique // SHA-256 hash of the raw secret key
  
  lastUsedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  @@index([shopId, keyHash])
}
```

- Multi-tenant additive model (`shopId` on every shop-owned table).
- Security: Raw secret key (e.g. `hermes_live_8f7b...`) is shown ONCE to the user upon creation. Database stores only the SHA-256 `keyHash`.

---

## 3. Agent Authentication Middleware (`src/lib/agent-auth.server.ts`)

```ts
export async function authenticateAgentRequest(request: Request): Promise<{
  shop: Shop;
  apiKey: ApiKey;
} | null> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('X-Hermes-API-Key');
  if (!authHeader) return null;

  const rawKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash },
    include: { shop: true },
  });

  if (!apiKey) return null;

  // Asynchronously update lastUsedAt
  db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { shop: apiKey.shop, apiKey };
}
```

---

## 4. Agent REST API Endpoints Specification

### 4.1 `POST /api/agent/v1/rates`
- **Request Headers**: `X-Hermes-API-Key: hermes_live_...`
- **Request Body**:
  ```json
  {
    "rates": [
      { "metalKey": "GOLD_24K", "ratePerGramRupees": 8150 },
      { "metalKey": "GOLD_22K", "ratePerGramRupees": 7470 },
      { "metalKey": "SILVER_999", "ratePerGramRupees": 98 }
    ]
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Daily rates updated successfully",
    "effectiveAt": "2026-09-16T21:20:00.000Z",
    "ratesUpdatedCount": 3
  }
  ```

### 4.2 `GET /api/agent/v1/analytics`
- **Request Headers**: `X-Hermes-API-Key: hermes_live_...`
- **Query Params**: `?period=today` | `week` | `month`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "period": "today",
    "orders": {
      "count": 5,
      "totalValuePaise": 164500000,
      "formattedTotalValue": "Rs 16,45,000",
      "statusBreakdown": { "PENDING": 2, "CONFIRMED": 2, "COMPLETED": 1 }
    },
    "engagement": {
      "activeCustomersCount": 14,
      "wishlistAdditionsCount": 8,
      "productViewsCount": 42
    }
  }
  ```

### 4.3 `GET /api/agent/v1/leads/wishlist-no-order`
- **Request Headers**: `X-Hermes-API-Key: hermes_live_...`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "count": 3,
    "leads": [
      {
        "customerId": "cust_123",
        "name": "Ramesh Kumar",
        "phone": "+917250580175",
        "marketingOptIn": true,
        "wishlistItems": [
          {
            "productId": "prod_456",
            "productName": "22K Floral Gold Necklace",
            "categoryName": "Gold Necklaces",
            "estimatedDisplayPrice": "Rs 1,42,000"
          }
        ]
      }
    ]
  }
  ```

### 4.4 `POST /api/agent/v1/outreach/send`
- **Request Headers**: `X-Hermes-API-Key: hermes_live_...`
- **Request Body**:
  ```json
  {
    "customerPhone": "+917250580175",
    "messageText": "Namaste Ramesh ji! Aapke wishlist wale Gold Necklace par special discount active hai...",
    "productId": "prod_456"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "deliveryMethod": "EVOLUTION_API",
    "whatsappDeepLink": "https://wa.me/917250580175?text=...",
    "loggedAt": "2026-09-16T21:20:00.000Z"
  }
  ```

---

## 5. Admin API Keys UI (`/admin/api-keys`)

- **Generate API Key**: Modal/Form accepting key name (*"Hermes Primary Agent"*). Generates random string `hermes_live_<random32>`, computes SHA-256 `keyHash`, stores `keyPrefix` & `keyHash` in `ApiKey` model, and returns raw key ONCE.
- **Key List View**: Displays key name, prefix, `createdAt`, `lastUsedAt`, and a **Revoke** button (`deleteApiKeyAction`).

---

## 6. Testing & Rules Verification

1. **Agent Auth Tests (`src/lib/agent-auth.server.test.ts`)**:
   - Verify valid bearer token / `X-Hermes-API-Key` returns shop context and updates `lastUsedAt`.
   - Verify invalid or missing API key returns `null` (HTTP 401 Unauthorized).
2. **API Endpoint Integration Tests (`src/app/api/agent/v1/...`)**:
   - Test `POST /api/agent/v1/rates` updates rates & price cache.
   - Test `GET /api/agent/v1/analytics` calculates correct order totals.
   - Test `GET /api/agent/v1/leads/wishlist-no-order` returns un-ordered wishlist leads.
   - Test `POST /api/agent/v1/outreach/send` logs outreach event.
3. **Design System & Rule Guardrails**:
   - `no-hardcoded-shop.test.ts` & `design-system.test.ts` pass cleanly.
