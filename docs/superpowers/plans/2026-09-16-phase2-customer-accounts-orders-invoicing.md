# Phase 2 Customer Accounts, CRM, WhatsApp Auth & Luxury Invoicing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Phase 2 for Poddar Jewellers: WhatsApp OTP Authentication via Evolution API, Browser Wishlist DB Sync, Diary Bulk Customer Import (100+ offline contacts), Real-time CRM Customer Activity Tracking, Order Booking with Required-By Target Date, and A4 Luxury Printable GST Invoicing.

**Architecture:** Extend Prisma schema with `Customer`, `CustomerSession`, `OtpVerification`, `WishlistItem`, `CustomerActivity`, `Order`, and `OrderItem` models. Implement an Evolution API WhatsApp service for OTP dispatching, signed customer session cookies, a bulk contact import parser for offline diary records, background activity logging for CRM intelligence, and an itemized A4 print-optimized luxury invoice template.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 + PostgreSQL, Tailwind v4 + CSS Tokens, Vitest, Jose (JWT session signing), Evolution API (WhatsApp HTTP REST client).

**Spec:** [docs/superpowers/specs/2026-09-16-phase2-customer-accounts-orders-invoicing-design.md](file:///Users/rajatpoddar/Documents/Projects/poddar-jewellers/docs/superpowers/specs/2026-09-16-phase2-customer-accounts-orders-invoicing-design.md)

## Global Constraints

- **Price Engine Integrity:** Price is NEVER stored on Product. Itemized order snapshots (`metalPaise`, `makingPaise`, `stonePaise`, `gstPaise`, `totalPaise`) are calculated server-side using `estimate()` at order time.
- **Shop Fact Rule (Hard Rule 7):** No hardcoded shop names, phones, or URLs. Every database query resolves its shop via `getShop()`. Evolution API config (`evolutionApiUrl`, `evolutionApiKey`, `evolutionInstance`) lives on the `Shop` row. Enforced by `src/lib/no-hardcoded-shop.test.ts`.
- **Design System Rule (Hard Rule 9):** Interface uses design tokens (`bg-surface`, `text-ink`, `border-line`, `intent="primary"`) from `src/app/globals.css`. Zero literal hexes, stock Tailwind palette classes, or raw emojis. Enforced by `src/lib/design-system.test.ts`.
- **Additive Multi-Tenancy:** Every shop-owned table carries `shopId`.

---

### Task 1: Database Schema Expansion & Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `src/lib/schema.test.ts`

**Interfaces:**
- Consumes: Existing Prisma models (`Shop`, `Product`, `Category`)
- Produces: New Prisma Client types (`Customer`, `CustomerSession`, `OtpVerification`, `WishlistItem`, `CustomerActivity`, `Order`, `OrderItem`)

- [ ] **Step 1: Write failing schema integration test**

```typescript
import { describe, it, expect } from 'vitest';
import { db } from '@/lib/db';

describe('Phase 2 Schema Integrity', () => {
  it('has customer, order and activity tables configured', () => {
    expect(db.customer).toBeDefined();
    expect(db.customerSession).toBeDefined();
    expect(db.otpVerification).toBeDefined();
    expect(db.customerActivity).toBeDefined();
    expect(db.order).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: FAIL with "db.customer is undefined"

- [ ] **Step 3: Update `prisma/schema.prisma` with Phase 2 models**

Add `OrderStatus`, `ActivityType` enums and `Customer`, `CustomerSession`, `OtpVerification`, `WishlistItem`, `CustomerActivity`, `Order`, `OrderItem` models with `shopId` relations. Update `Shop` model with `evolutionApiUrl`, `evolutionApiKey`, `evolutionInstance` fields.

- [ ] **Step 4: Run Prisma Migration**

Run: `npx prisma migrate dev --name phase2_schema_and_crm`
Expected: Migration created and applied cleanly to PostgreSQL.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/schema.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/schema.test.ts
git commit -m "feat(db): add phase 2 customer, crm, order and invoice models"
```

---

### Task 2: Evolution API WhatsApp OTP Service & Verification Engine

**Files:**
- Create: `src/lib/whatsapp/evolution.ts`
- Create: `src/lib/auth/otp.ts`
- Test: `src/lib/whatsapp/evolution.test.ts`
- Test: `src/lib/auth/otp.test.ts`

**Interfaces:**
- Consumes: `getShop()`, `db.otpVerification`
- Produces: `sendWhatsAppOtp(shopId, phone, otp)`, `generateAndSendOtp(shopId, phone)`, `verifyOtp(shopId, phone, code)`

- [ ] **Step 1: Write failing test for Evolution API payload builder & phone sanitizer**

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizeIndianPhone, buildEvolutionPayload } from './evolution';

describe('Evolution API WhatsApp Helper', () => {
  it('formats 10-digit Indian phone numbers to 91XXXXXXXXXX', () => {
    expect(sanitizeIndianPhone('7250580175')).toBe('917250580175');
    expect(sanitizeIndianPhone('+91 72505 80175')).toBe('917250580175');
  });

  it('builds text message payload for Evolution API', () => {
    const payload = buildEvolutionPayload('917250580175', 'Aapka OTP hai 123456');
    expect(payload).toEqual({
      number: '917250580175',
      text: 'Aapka OTP hai 123456',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/whatsapp/evolution.test.ts`
Expected: FAIL ("Cannot find module ./evolution")

- [ ] **Step 3: Implement `src/lib/whatsapp/evolution.ts`**

Implement `sanitizeIndianPhone`, `buildEvolutionPayload`, and `sendWhatsAppOtp(shopId, phone, otp)` with HTTP fetch call to `${evolutionApiUrl}/message/sendText/${evolutionInstance}` and stdout fallback logging.

- [ ] **Step 4: Write failing test for OTP generation & verification engine**

```typescript
import { describe, it, expect } from 'vitest';
import { generateOtpCode, isOtpExpired } from './otp';

describe('OTP Verification Engine', () => {
  it('generates 6-digit numeric OTP code', () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('correctly calculates OTP expiration', () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 300000);
    expect(isOtpExpired(past)).toBe(true);
    expect(isOtpExpired(future)).toBe(false);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/otp.test.ts`
Expected: FAIL ("Cannot find module ./otp")

- [ ] **Step 6: Implement `src/lib/auth/otp.ts`**

Implement `generateOtpCode`, `isOtpExpired`, `createOtpRecord(shopId, phone)`, and `verifyOtpCode(shopId, phone, code)`.

- [ ] **Step 7: Run tests to verify all pass**

Run: `npx vitest run src/lib/whatsapp/evolution.test.ts src/lib/auth/otp.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/whatsapp src/lib/auth
git commit -m "feat(auth): add Evolution API WhatsApp OTP service and verification engine"
```

---

### Task 3: Customer Session Management & Auth Modal UI

**Files:**
- Create: `src/lib/auth/customer-session.ts`
- Create: `src/app/(store)/login/actions.ts`
- Create: `src/components/store/AuthModal.tsx`
- Modify: `src/components/store/Header.tsx`
- Test: `src/lib/auth/customer-session.test.ts`

**Interfaces:**
- Consumes: `jose` JWT signing, `db.customer`, `db.customerSession`, `db.wishlistItem`
- Produces: `getCurrentCustomer()`, `createCustomerSession()`, `syncWishlistToDatabase(customerId, productIds)`

- [ ] **Step 1: Write failing test for customer session token signing & verification**

```typescript
import { describe, it, expect } from 'vitest';
import { signCustomerToken, verifyCustomerToken } from './customer-session';

describe('Customer Session Token', () => {
  it('signs and verifies customer JWT payload', async () => {
    const token = await signCustomerToken({ customerId: 'cust-123', shopId: 'shop-1' }, 'secret-key-min-32-chars-test-secret');
    const payload = await verifyCustomerToken(token, 'secret-key-min-32-chars-test-secret');
    expect(payload).toMatchObject({ customerId: 'cust-123', shopId: 'shop-1' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/customer-session.test.ts`
Expected: FAIL ("Cannot find module ./customer-session")

- [ ] **Step 3: Implement `src/lib/auth/customer-session.ts`**

Implement `signCustomerToken`, `verifyCustomerToken`, `createCustomerSessionCookie`, `getCurrentCustomer`, and `syncWishlistToDatabase`.

- [ ] **Step 4: Implement Server Actions `src/app/(store)/login/actions.ts`**

Implement `requestOtpAction(phone)`, `verifyOtpAction(phone, otp)`, and `completeCustomerRegistrationAction(phone, name, addressLine1, city, pincode)`.

- [ ] **Step 5: Implement `AuthModal.tsx` Client Component & update Header**

Create `AuthModal.tsx` (Step 1: Mobile Input, Step 2: 6-digit OTP Input, Step 3: Registration Profile Form if new customer). Update `Header.tsx` to display Customer Name / Sign In button. Trigger automatic wishlist migration (`syncWishlistToDatabase`) on sign-in.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/customer-session.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth src/app/\(store\)/login src/components/store
git commit -m "feat(auth): customer sign-in modal, session management, and wishlist sync"
```

---

### Task 4: Offline Diary Bulk Contact Import & Admin CRM (`/admin/customers`)

**Files:**
- Create: `src/lib/crm/import.ts`
- Create: `src/lib/crm/activity.ts`
- Create: `src/app/admin/(panel)/customers/page.tsx`
- Create: `src/app/admin/(panel)/customers/import/page.tsx`
- Create: `src/app/admin/(panel)/customers/[id]/page.tsx`
- Test: `src/lib/crm/import.test.ts`

**Interfaces:**
- Consumes: `db.customer`, `db.customerActivity`
- Produces: `parseDiaryContacts(rawInput)`, `importDiaryContacts(shopId, contacts)`, `logCustomerActivity(shopId, eventType, metadata)`

- [ ] **Step 1: Write failing test for diary CSV / multi-line text contact parser**

```typescript
import { describe, it, expect } from 'vitest';
import { parseDiaryContacts } from './import';

describe('Diary Contact Parser', () => {
  it('parses multi-line diary text into structured customer records', () => {
    const raw = `Ramesh Kumar, 7250580175, Main Road Palojori
Sita Devi, +91 98351 12345, Cinema Hall Chowk Deoghar`;
    const parsed = parseDiaryContacts(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({
      name: 'Ramesh Kumar',
      phone: '7250580175',
      addressLine1: 'Main Road Palojori',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/crm/import.test.ts`
Expected: FAIL ("Cannot find module ./import")

- [ ] **Step 3: Implement `src/lib/crm/import.ts` & `src/lib/crm/activity.ts`**

Implement `parseDiaryContacts`, `importDiaryContacts`, and `logCustomerActivity` with JSON metadata support.

- [ ] **Step 4: Build Admin CRM Screens**

- `/admin/customers/page.tsx`: Customer table listing phone, name, address, orders count, and last active timestamp.
- `/admin/customers/import/page.tsx`: Bulk contact import form with CSV preview and 1-click import.
- `/admin/customers/[id]/page.tsx`: Detailed customer profile showing Activity Timeline (product views, wishlist items, searches) and 1-tap WhatsApp outreach button.

- [ ] **Step 5: Run tests to verify all pass**

Run: `npx vitest run src/lib/crm/import.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/crm src/app/admin/\(panel\)/customers
git commit -m "feat(crm): diary bulk contact import and customer activity intelligence dashboard"
```

---

### Task 5: Order Booking & A4 Luxury Printable Color Invoicing (`/admin/orders` & `/orders`)

**Files:**
- Create: `src/lib/orders/engine.ts`
- Create: `src/app/(store)/orders/page.tsx`
- Create: `src/app/admin/(panel)/orders/page.tsx`
- Create: `src/app/admin/(panel)/orders/[id]/invoice/page.tsx`
- Test: `src/lib/orders/engine.test.ts`

**Interfaces:**
- Consumes: `estimate()`, `db.order`, `db.orderItem`, `getShop()`, `getPricingConfig()`
- Produces: `createOrderSnapshot(shopId, customerId, productId, weightMg, requiredByDate, notes)`, `updateOrderStatus(orderId, status)`

- [ ] **Step 1: Write failing test for order price breakdown snapshot generator**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateOrderSnapshot } from './engine';

describe('Order Snapshot Calculation', () => {
  it('creates immutable itemized order price snapshot with GST and rounding', () => {
    const snapshot = calculateOrderSnapshot({
      weightMg: 20000,
      metalRatePaise: 750000, // Rs 7,500 / g
      makingPercentBp: 1500, // 15%
      stoneValuePaise: 0,
      gstPercentBp: 300, // 3%
    });

    expect(snapshot.metalPaise).toBe(15000000); // Rs 1,50,000
    expect(snapshot.makingPaise).toBe(2250000);  // Rs 22,500
    expect(snapshot.gstPaise).toBe(517500);     // Rs 5,175
    expect(snapshot.totalPaise).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/orders/engine.test.ts`
Expected: FAIL ("Cannot find module ./engine")

- [ ] **Step 3: Implement `src/lib/orders/engine.ts`**

Implement `calculateOrderSnapshot`, `createOrder`, and `updateOrderStatus`.

- [ ] **Step 4: Build Order Booking Modal & Customer Orders Page**

Add "Book / Reserve Design" button on PDP and Wishlist. Render modal prompting for optional `requiredByDate` ("Shaadi / Festival date"). Render `/orders` page for logged-in customers to view their placed bookings.

- [ ] **Step 5: Build Admin Orders Dashboard & A4 Luxury Printable Color Invoice**

- `/admin/orders/page.tsx`: Admin order list with status dropdown (`PENDING`, `CONFIRMED`, `READY`, `COMPLETED`), search filter, and WhatsApp receipt sender.
- `/admin/orders/[id]/invoice/page.tsx`: Printable A4 color invoice template featuring double gold border, shop logo/GSTIN, customer details, itemized HSN 7113 breakdown, 3% GST (CGST 1.5% + SGST 1.5%), and signatory box. Formatted with `@media print` rules for A4 output.

- [ ] **Step 6: Run tests to verify all pass**

Run: `npx vitest run src/lib/orders/engine.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/orders src/app/\(store\)/orders src/app/admin/\(panel\)/orders
git commit -m "feat(orders): order booking with required-by date and printable A4 luxury GST invoice"
```

---

### Task 6: Full System Integration, Rule Audit & Verification

**Files:**
- Audit: `src/lib/no-hardcoded-shop.test.ts`
- Audit: `src/lib/design-system.test.ts`
- Audit: `docs/STATUS.md`

- [ ] **Step 1: Run full Vitest test suite**

Run: `npm test`
Expected: PASS (All test files green, 0 failures)

- [ ] **Step 2: Run TypeScript compiler check**

Run: `npm run typecheck`
Expected: PASS (0 type errors)

- [ ] **Step 3: Run production build check**

Run: `npm run build`
Expected: PASS (Next.js build succeeds with 0 errors)

- [ ] **Step 4: Update `docs/STATUS.md`**

Record Phase 2 completion, updated test count, and new features.

- [ ] **Step 5: Commit final state**

```bash
git add docs/STATUS.md
git commit -m "chore: complete phase 2 customer portal, crm and luxury invoicing"
```

---

## Execution Handoff Choice

Plan complete and saved to `docs/superpowers/plans/2026-09-16-phase2-customer-accounts-orders-invoicing.md`.

Two execution options:
1. **Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach would you like to take?
