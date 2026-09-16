# Phase 4 Design Spec: WhatsApp Automation & Notifications Engine

**Date:** 2026-09-16  
**Status:** Approved / Drafted  
**Phase:** Phase 4 (WhatsApp Automation & Notifications Engine)  
**Target File Path:** `docs/superpowers/specs/2026-09-16-phase4-whatsapp-automation-design.md`

---

## 1. Overview & Objectives

Phase 4 builds the automated WhatsApp notifications and campaign execution engine for Poddar Jewellers.

To eliminate phone number ban risks while maintaining high deliverability, Phase 4 employs a strict **Dual-Track Channel Architecture**:
1. **Track 1 — Transactional Engine (Evolution API / REST Client):** Low-volume, customer-initiated transactional messages (Order Booking Confirmations, Order Status Updates, and Instant Admin Alerts). Zero ban risk, instant delivery, zero per-message cost.
2. **Track 2 — Marketing Broadcast Engine (Official Meta WhatsApp Cloud API + `wa.me` Fallback):** Automated bulk marketing broadcasts using Meta's official Graph API (`v19.0`) with pre-approved template messages and fallback to Phase 3's 1-click `wa.me` broadcast engine.

---

## 2. Architecture & Data Model

All new models strictly include `shopId` to comply with **Hard Rule 8** (multitenancy ready).

### 2.1 `NotificationQueue` Model
Stores background notification jobs with status tracking and automatic exponential backoff retries.

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

### 2.2 `Shop` Model Updates for Meta Cloud API
Add fields to `Shop` model (editable via `/admin/settings`):
```prisma
model Shop {
  // Existing fields...
  metaPhoneNumberId String?
  metaAccessToken   String?
  metaWabaId        String?

  notificationQueues NotificationQueue[]
}
```

---

## 3. Transactional Event Triggers & Notification Engine

Location: `src/lib/whatsapp-notifications.server.ts`

### 3.1 Event Trigger 1: New Order Booking (`ORDER_BOOKED` & `ADMIN_NEW_ORDER_ALERT`)
When a customer submits an order booking in `createOrderBooking` (`orders.server.ts`), two background jobs are enqueued:
1. **Customer Booking Confirmation (`ORDER_BOOKED` via Evolution API):**
   * **Recipient:** Customer Phone Number (`Customer.phone`)
   * **Payload:** `{ customerName, orderRef, productName, requiredByDate, orderUrl }`
   * **Message Template:**
     *"Namaste {{customerName}}! Poddar Jewellers par aapka design booking receive ho gaya hai.\n\n📌 Booking Ref: #{{orderRef}}\n💍 Item: {{productName}}\n📅 Target Date: {{requiredByDate}}\n\nAapke order ka status dekhne ke liye yahan click karein: {{orderUrl}}\n\nDhanyawad!"*

2. **Admin Instant New Order Alert (`ADMIN_NEW_ORDER_ALERT` via Evolution API):**
   * **Recipient:** `Shop.phone` / Shop WhatsApp Number
   * **Payload:** `{ customerName, customerPhone, orderRef, productName, adminOrderUrl }`
   * **Message Template:**
     *"🔔 NEW ORDER ALERT!\nCustomer {{customerName}} ({{customerPhone}}) ne naya design book kiya hai.\n\n📌 Ref: #{{orderRef}}\n💍 Item: {{productName}}\n\nAdmin Order Dashboard: {{adminOrderUrl}}"*

### 3.2 Event Trigger 2: Order Status Change (`ORDER_STATUS_CHANGED`)
When an admin updates an order status in `updateOrderStatus` (`orders.server.ts`), a notification job is enqueued:
* **Recipient:** Customer Phone Number (`Customer.phone`)
* **Messages by Status:**
  * **`CONFIRMED`:** *"Namaste {{customerName}}! Aapka order #{{orderRef}} confirm ho gaya hai."*
  * **`READY`:** *"Namaste {{customerName}}! Aapka booked design #{{orderRef}} counter par visit karne ke liye ready hai!"*
  * **`COMPLETED`:** *"Namaste {{customerName}}! Order #{{orderRef}} complete ho gaya hai. Poddar Jewellers se shopping karne ke liye dhanyawad!"*

### 3.3 Async Dispatcher & Retry Logic (`processNotificationQueue`)
* Operates asynchronously in non-blocking background tasks.
* Attempts delivery up to `maxAttempts` (default 3) with backoff.
* On success, sets `status = "DELIVERED"`.
* On failure, logs `lastError` and sets `status = "FAILED"` after max attempts.

---

## 4. Meta WhatsApp Cloud API Client

Location: `src/lib/whatsapp-cloud.server.ts`

Official Meta Graph API REST integration (`v19.0`):
* `sendMetaCloudTemplateMessage({ recipientPhone, templateName, languageCode, components })`:
  Sends HTTP POST to `https://graph.facebook.com/v19.0/${metaPhoneNumberId}/messages` with `Authorization: Bearer ${metaAccessToken}`.
* Used for sending pre-approved marketing broadcast campaign templates to opted-in customer lists.

---

## 5. Admin Audit Log & Settings UI

### 5.1 Order Notification Status & Manual Resend (`/admin/orders` & `/admin/orders/[id]`)
* Customer order details present a **WhatsApp Delivery Badge**:
  * 🟢 `WhatsApp: Delivered`
  * 🟡 `WhatsApp: Retrying (Attempt X/3)`
  * 🔴 `WhatsApp: Failed`
* Includes a **"Resend Notification"** 1-click button allowing admins to retry failed messages manually.

### 5.2 Meta Cloud API Settings Form (`/admin/settings`)
* Inputs for `metaPhoneNumberId`, `metaAccessToken`, and `metaWabaId`.
* **"Test Meta Connection"** action button to verify API connectivity.

---

## 6. Verification & Quality Assurance

1. **Unit Tests (`src/lib/whatsapp-notifications.test.ts`):**
   * Queue item payload construction test.
   * Event trigger integration test (`ORDER_BOOKED`, `ADMIN_ALERT`, `STATUS_CHANGED`).
   * Retry count & error handling logic test.
   * Meta Cloud API payload formatting test.
2. **Rule Enforcement:**
   * Run `npm test` to verify `src/lib/no-hardcoded-shop.test.ts` and `src/lib/design-system.test.ts` pass cleanly.
3. **Build Verification:**
   * `npm run typecheck` and `npm run build` pass cleanly with zero errors.
