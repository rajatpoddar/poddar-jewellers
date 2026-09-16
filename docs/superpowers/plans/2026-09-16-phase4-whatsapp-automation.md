# Phase 4 WhatsApp Automation & Notifications Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 4 WhatsApp Automation Engine (transactional order booking notifications, order status updates, instant shop admin alerts via Evolution API, Meta WhatsApp Cloud API client, notification queue with retries, and admin audit log with manual resend actions).

**Architecture:** Prisma schema migration adding `NotificationQueue` table and Meta Cloud API credentials to `Shop`. Backend modules `whatsapp-notifications.server.ts` and `whatsapp-cloud.server.ts`. Event triggers hooked into `orders.server.ts` for order creation (`PENDING`) and status changes (`CONFIRMED`, `READY`, `COMPLETED`). Admin UI delivery status badges and resend buttons in `/admin/orders` and Meta API settings form in `/admin/settings`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 + Postgres, Evolution API REST, Meta WhatsApp Cloud API REST (`v19.0`), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-phase4-whatsapp-automation-design.md`

## Global Constraints

- **No Hardcoded Credentials or Shop Numbers:** All shop credentials and target admin phone numbers must be resolved via `getShop()` / `Shop` row (Hard Rule 7).
- **Multitenancy Ready:** All new Prisma models (`NotificationQueue`) must include `shopId` (Hard Rule 8).
- **Design System Tokens:** No literal hex codes or stock Tailwind color classes in UI components (Hard Rule 9).
- **Non-blocking Execution:** Notification processing must run asynchronously without blocking customer HTTP requests during order booking.

---

### Task 1: Database Schema Migration for Notification Queue & Meta Settings

**Files:**
- Modify: `prisma/schema.prisma`
- Test: Migration validation via `npx prisma migrate dev`

**Interfaces:**
- Consumes: Prisma datasource & PostgreSQL
- Produces: `NotificationQueue` table and `metaPhoneNumberId`, `metaAccessToken`, `metaWabaId` fields on `Shop`.

- [ ] **Step 1: Update `prisma/schema.prisma`**

Add fields to `Shop`:
```prisma
  metaPhoneNumberId String?
  metaAccessToken   String?
  metaWabaId        String?
  notificationQueues NotificationQueue[]
```

Add model `NotificationQueue`:
```prisma
model NotificationQueue {
  id          String   @id @default(cuid())
  shopId      String
  customerId  String?
  orderId     String?
  type        String   // "ORDER_BOOKED", "ORDER_STATUS_CHANGED", "ADMIN_NEW_ORDER_ALERT", "MARKETING_BROADCAST"
  channel     String   // "EVOLUTION_API", "META_CLOUD_API"
  recipient   String   // Formatted phone number e.g. "917250580175"
  payload     Json     // Dynamic message variables & template metadata
  status      String   @default("PENDING") // "PENDING", "DELIVERED", "FAILED"
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)
  lastError   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  order    Order?    @relation(fields: [orderId], references: [id], onDelete: SetNull)
  shop     Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@index([shopId])
  @@index([status])
  @@index([customerId])
  @@index([orderId])
}
```

Add relations to `Customer` and `Order`:
```prisma
  notificationQueues NotificationQueue[]
```

- [ ] **Step 2: Apply Prisma Migration**

Run: `npx prisma migrate dev --name add_phase4_notification_queue`
Expected: Migration created and applied to database cleanly.

- [ ] **Step 3: Run `npm run typecheck` to verify generated client types**

Run: `npm run typecheck`
Expected: PASS with zero errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add schema migration for Phase 4 NotificationQueue and Meta Cloud API shop settings"
```

---

### Task 2: Meta WhatsApp Cloud API Client & Unit Tests

**Files:**
- Create: `src/lib/whatsapp-cloud.server.ts`
- Create: `src/lib/whatsapp-cloud.test.ts`

**Interfaces:**
- Consumes: Meta Graph API REST specifications (`v19.0`)
- Produces: `sendMetaCloudTemplateMessage({ recipientPhone, templateName, languageCode, components, shopSettings })` and payload formatter helper.

- [ ] **Step 1: Write failing unit test for Meta Cloud API payload formatting**

```typescript
// Create src/lib/whatsapp-cloud.test.ts
import { describe, it, expect } from 'vitest';
import { formatMetaCloudPayload } from './whatsapp-cloud.server';

describe('Meta WhatsApp Cloud API Payload Formatter', () => {
  it('formats template message payload correctly', () => {
    const payload = formatMetaCloudPayload({
      recipientPhone: '917250580175',
      templateName: 'festive_offer_v1',
      languageCode: 'hi',
      parameters: ['Rajat Poddar', 'Bangles'],
    });

    expect(payload.messaging_product).toBe('whatsapp');
    expect(payload.to).toBe('917250580175');
    expect(payload.type).toBe('template');
    expect(payload.template.name).toBe('festive_offer_v1');
    expect(payload.template.language.code).toBe('hi');
    expect(payload.template.components[0].parameters[0].text).toBe('Rajat Poddar');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/lib/whatsapp-cloud.test.ts`
Expected: FAIL with "Cannot find module './whatsapp-cloud.server'"

- [ ] **Step 3: Implement `src/lib/whatsapp-cloud.server.ts`**

```typescript
export interface MetaCloudMessageOptions {
  recipientPhone: string;
  templateName: string;
  languageCode?: string;
  parameters?: string[];
}

export function formatMetaCloudPayload(options: MetaCloudMessageOptions) {
  const { recipientPhone, templateName, languageCode = 'hi', parameters = [] } = options;

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone.replace(/[^0-9]/g, ''),
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        {
          type: 'body',
          parameters: parameters.map((param) => ({
            type: 'text',
            text: param,
          })),
        },
      ],
    },
  };
}

export async function sendMetaCloudTemplateMessage(options: MetaCloudMessageOptions & { phoneNumberId: string; accessToken: string }) {
  const url = `https://graph.facebook.com/v19.0/${options.phoneNumberId}/messages`;
  const body = formatMetaCloudPayload(options);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Meta API error (${res.status}): ${JSON.stringify(errorData)}`);
  }

  return await res.json();
}
```

- [ ] **Step 4: Run unit test to verify it passes**

Run: `npx vitest run src/lib/whatsapp-cloud.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp-cloud.server.ts src/lib/whatsapp-cloud.test.ts
git commit -m "feat(whatsapp): add Meta WhatsApp Cloud API REST client and payload formatter"
```

---

### Task 3: Transactional Notification Engine & Queue Dispatcher

**Files:**
- Create: `src/lib/whatsapp-notifications.server.ts`
- Create: `src/lib/whatsapp-notifications.test.ts`

**Interfaces:**
- Consumes: Prisma DB (`db.ts`), Evolution API REST client (`src/lib/auth/evolution-api.ts`), Meta Cloud API client (`whatsapp-cloud.server.ts`)
- Produces: Server functions `enqueueNotification`, `processNotificationQueue`, `resendNotification`.

- [ ] **Step 1: Write failing unit test for notification payload generation & formatting**

```typescript
// Create src/lib/whatsapp-notifications.test.ts
import { describe, it, expect } from 'vitest';
import { formatNotificationText } from './whatsapp-notifications.server';

describe('Notification Text Formatter', () => {
  it('formats ORDER_BOOKED customer message correctly', () => {
    const text = formatNotificationText('ORDER_BOOKED', {
      customerName: 'Rajat Poddar',
      orderRef: 'PJ-ORD-1001',
      productName: '22K Gold Bangle',
      requiredByDate: '25 Sep 2026',
      orderUrl: 'https://poddarjewellers.in/orders',
    });

    expect(text).toContain('Rajat Poddar');
    expect(text).toContain('PJ-ORD-1001');
    expect(text).toContain('22K Gold Bangle');
    expect(text).toContain('25 Sep 2026');
  });

  it('formats ADMIN_NEW_ORDER_ALERT message correctly', () => {
    const text = formatNotificationText('ADMIN_NEW_ORDER_ALERT', {
      customerName: 'Priya Sharma',
      customerPhone: '7250580175',
      orderRef: 'PJ-ORD-1002',
      productName: 'Royal Necklace',
      adminOrderUrl: 'https://poddarjewellers.in/admin/orders/1002',
    });

    expect(text).toContain('NEW ORDER ALERT');
    expect(text).toContain('Priya Sharma');
    expect(text).toContain('7250580175');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/lib/whatsapp-notifications.test.ts`
Expected: FAIL with "Cannot find module './whatsapp-notifications.server'"

- [ ] **Step 3: Implement `src/lib/whatsapp-notifications.server.ts`**

Implement:
- `formatNotificationText(type, payload)`: Formats exact Hinglish text messages for `ORDER_BOOKED`, `ADMIN_NEW_ORDER_ALERT`, `ORDER_STATUS_CHANGED` (`CONFIRMED`, `READY`, `COMPLETED`).
- `enqueueNotification(options: { shopId: string; type: string; recipient: string; payload: Record<string, any>; orderId?: string; customerId?: string; channel?: string })`: Enqueues item into `NotificationQueue` with status `"PENDING"`.
- `processNotificationQueue(shopId: string)`: Fetches PENDING items, sends via Evolution API (or Meta Cloud API if channel is `META_CLOUD_API`), updates `status = "DELIVERED"` or increments `attempts` and sets `status = "FAILED"` after 3 retries.
- `resendNotification(queueId: string)`: Resets `status = "PENDING"`, resets `attempts = 0`, and executes `processNotificationQueue`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/whatsapp-notifications.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/whatsapp-notifications.server.ts src/lib/whatsapp-notifications.test.ts
git commit -m "feat(whatsapp): add transactional notification engine, queue dispatcher, and payload formatters"
```

---

### Task 4: Integration of Event Triggers in Order Booking & Status Updates

**Files:**
- Modify: `src/lib/orders.server.ts`
- Modify: `src/lib/orders/engine.test.ts` or add integration test

**Interfaces:**
- Consumes: `orders.server.ts` server actions (`createOrderBooking`, `updateOrderStatus`), `whatsapp-notifications.server.ts` (`enqueueNotification`, `processNotificationQueue`)
- Produces: Automatic transactional background WhatsApp messages whenever an order is booked or updated.

- [ ] **Step 1: Update `createOrderBooking` in `src/lib/orders.server.ts`**

When an order is successfully created:
1. Enqueue Customer Notification (`ORDER_BOOKED`):
   - Recipient: Customer's phone number
   - Payload: Customer Name, Order Ref ID, Product Name, Target Date, Orders URL.
2. Enqueue Admin Notification (`ADMIN_NEW_ORDER_ALERT`):
   - Recipient: Shop Phone number (`shop.phone`)
   - Payload: Customer Name, Phone, Order Ref ID, Product Name, Admin Order URL.
3. Call `processNotificationQueue(shopId)` asynchronously (catch errors so order booking HTTP response never fails).

- [ ] **Step 2: Update `updateOrderStatus` in `src/lib/orders.server.ts`**

When an order status changes (`CONFIRMED`, `READY`, `COMPLETED`):
1. Enqueue Customer Notification (`ORDER_STATUS_CHANGED`):
   - Recipient: Customer's phone number
   - Payload: Customer Name, Order Ref ID, New Status, Orders URL.
2. Call `processNotificationQueue(shopId)` asynchronously.

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `npm test`
Expected: ALL test files pass cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/lib/orders.server.ts
git commit -m "feat(orders): hook automated WhatsApp notifications and admin alerts into order creation and status updates"
```

---

### Task 5: Admin Notification Audit Log & Manual Resend UI

**Files:**
- Modify: `src/app/admin/(panel)/orders/page.tsx`
- Modify: `src/app/admin/(panel)/orders/[id]/page.tsx`
- Create: `src/components/admin/NotificationStatusBadge.tsx`
- Modify: `src/app/admin/(panel)/orders/actions.ts`

**Interfaces:**
- Consumes: `NotificationQueue` records for an order, `resendNotification` server action
- Produces: WhatsApp delivery status badges (🟢 Delivered, 🟡 Retrying, 🔴 Failed) and 1-click **"Resend WhatsApp Notification"** button.

- [ ] **Step 1: Create `NotificationStatusBadge.tsx` component**

Renders badge pill showing delivery status. If status is `FAILED`, renders a 1-click **"Resend"** button that calls `resendNotificationAction`.
Strictly uses design system tokens (Hard Rule 9).

- [ ] **Step 2: Update `/admin/orders/page.tsx` & `/admin/orders/[id]/page.tsx`**

Display `NotificationStatusBadge` on order table rows and order detail header view.

- [ ] **Step 3: Verify Design System and Typecheck**

Run: `npm run typecheck && npx vitest run src/lib/design-system.test.ts`
Expected: PASS with 0 errors or violations.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/NotificationStatusBadge.tsx src/app/admin/\(panel\)/orders/page.tsx src/app/admin/\(panel\)/orders/\[id\]/page.tsx src/app/admin/\(panel\)/orders/actions.ts
git commit -m "feat(admin): add WhatsApp notification delivery badges and 1-click resend action to admin order dashboard"
```

---

### Task 6: Settings Meta Cloud API Credentials Form

**Files:**
- Modify: `src/app/admin/(panel)/settings/page.tsx`
- Modify: `src/app/admin/(panel)/settings/actions.ts`
- Create: `src/components/admin/MetaSettingsForm.tsx`

**Interfaces:**
- Consumes: `Shop` meta settings (`metaPhoneNumberId`, `metaAccessToken`, `metaWabaId`), `updateShopSettings` action
- Produces: Meta Cloud API credentials configuration UI and connectivity test action.

- [ ] **Step 1: Create `MetaSettingsForm.tsx` component**

Renders form inputs for Meta Cloud API credentials (`metaPhoneNumberId`, `metaAccessToken`, `metaWabaId`) with a **"Test Meta Connection"** action button.
Uses design system component vocabulary (`Field`, `Input`, `Button`, `Notice`).

- [ ] **Step 2: Update `/admin/settings/page.tsx` and server actions**

Integrate `MetaSettingsForm` into Settings page. Update server action to save Meta credentials to `Shop` record.

- [ ] **Step 3: Verify tests and Rule 7 / Rule 9 compliance**

Run: `npm test && npm run typecheck`
Expected: ALL tests pass cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/MetaSettingsForm.tsx src/app/admin/\(panel\)/settings/page.tsx src/app/admin/\(panel\)/settings/actions.ts
git commit -m "feat(admin): add Meta WhatsApp Cloud API credentials form to shop settings"
```

---

### Task 7: Final End-to-End Verification & Production Build Check

**Files:**
- None (Verification phase across entire project)

**Interfaces:**
- Consumes: Complete project codebase & test suite
- Produces: Clean build output and 100% passing test verification

- [ ] **Step 1: Run complete test suite**

Run: `npm test`
Expected: All 208+ tests pass, including `no-hardcoded-shop.test.ts` and `design-system.test.ts`.

- [ ] **Step 2: Run TypeScript compiler check**

Run: `npm run typecheck`
Expected: Clean output with 0 errors.

- [ ] **Step 3: Run Next.js production build**

Run: `npm run build`
Expected: Production build succeeds, producing standalone output.

- [ ] **Step 4: Final commit & status update**

Commit any remaining changes and update `docs/STATUS.md` to reflect Phase 4 completion.
