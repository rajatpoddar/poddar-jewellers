# Phase 3 CRM, Direct Marketing & Public Rates Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 3 CRM (customer tags, opt-in consent capture, smart segmentation engine, reusable campaign templates, outreach log history, and broadcast CSV export) while completely removing public metal rates display & `/rates` route from the storefront.

**Architecture:** Prisma schema migration adding `CustomerTag`, `CampaignTemplate`, `OutreachLog`, and `marketingOptIn` on `Customer`. Backend server functions in `src/lib/crm.server.ts`. Frontend admin CRM hub in `/admin/customers` with live smart filters, customer tags manager, template variable interpolation, 1-click `wa.me` links, and CSV export. Storefront cleanup removing `/rates` route, header rate links, and homepage rates strip.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Prisma 7 + Postgres, Tailwind CSS v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-phase3-crm-marketing-design.md`

## Global Constraints

- **No Hardcoded Shop Data:** All shop branding/phone/name in templates and headers must come from `getShop()` / `Shop` row (Hard Rule 7).
- **Multitenancy Ready:** All new Prisma models (`CustomerTag`, `CampaignTemplate`, `OutreachLog`) must include `shopId` (Hard Rule 8).
- **Design System Tokens:** No literal hex codes or stock Tailwind color classes in UI components (Hard Rule 9).
- **No Stored Calculated Prices:** Prices computed live; rates not shown publicly on storefront.

---

### Task 1: Public Metal Rate Removal & Storefront Cleanup

**Files:**
- Modify: `src/proxy.ts`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/app/page.tsx`
- Delete: `src/app/rates/page.tsx`
- Modify: `src/lib/no-hardcoded-shop.test.ts` or add route test

**Interfaces:**
- Consumes: `Header.tsx` navigation items, Next.js routing proxy
- Produces: Clean storefront UI without public metal rates display; permanent redirect from `/rates` to `/`

- [ ] **Step 1: Write failing test for rates route redirection and menu cleanup**

```typescript
// Add test in a new file src/app/storefront-rates-cleanup.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Public Metal Rates Cleanup', () => {
  it('should not have public rates page file', () => {
    const ratesPagePath = join(process.cwd(), 'src/app/rates/page.tsx');
    expect(existsSync(ratesPagePath)).toBe(false);
  });

  it('header navigation should not contain rates link', () => {
    const headerPath = join(process.cwd(), 'src/components/layout/Header.tsx');
    const content = readFileSync(headerPath, 'utf-8');
    expect(content).not.toContain('/rates');
  });

  it('homepage should not render DailyRatesStrip', () => {
    const homePath = join(process.cwd(), 'src/app/page.tsx');
    const content = readFileSync(homePath, 'utf-8');
    expect(content).not.toContain('DailyRatesStrip');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/storefront-rates-cleanup.test.ts`
Expected: FAIL (because `/rates/page.tsx` still exists and `Header.tsx` contains `/rates`)

- [ ] **Step 3: Remove `/rates/page.tsx`, remove rates link from `Header.tsx`, remove rates strip from `page.tsx`, add `/rates` redirect in `src/proxy.ts`**

In `src/proxy.ts`:
Add a check if `request.nextUrl.pathname === '/rates'`, return `NextResponse.redirect(new URL('/', request.url), 301)`.

In `src/components/layout/Header.tsx`:
Remove the navigation item `/rates` ("Daily Rates") from header menu links and remove the rate staleness warning banner.

In `src/app/page.tsx`:
Remove `<DailyRatesStrip />` import and usage.

Delete file: `src/app/rates/page.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/storefront-rates-cleanup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts src/components/layout/Header.tsx src/app/page.tsx src/app/storefront-rates-cleanup.test.ts
git rm src/app/rates/page.tsx
git commit -m "feat(storefront): remove public metal rates page, header link, and homepage rates strip"
```

---

### Task 2: Database Schema Migration for Phase 3 CRM Models

**Files:**
- Modify: `prisma/schema.prisma`
- Test: Database schema verification via `npx prisma migrate dev` or test script

**Interfaces:**
- Consumes: Prisma datasource & PostgreSQL
- Produces: `CustomerTag`, `CampaignTemplate`, `OutreachLog` tables and `marketingOptIn`, `optInSource`, `optInAt` fields on `Customer`.

- [ ] **Step 1: Update `prisma/schema.prisma`**

Add fields to `Customer`:
```prisma
  marketingOptIn  Boolean       @default(false)
  optInSource     String?
  optInAt         DateTime?
  tags            CustomerTag[]
  outreachLogs    OutreachLog[]
```

Add models:
```prisma
model CustomerTag {
  id        String     @id @default(cuid())
  shopId    String
  name      String
  color     String?
  createdAt DateTime   @default(now())
  customers Customer[]

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@unique([shopId, name])
  @@index([shopId])
}

model CampaignTemplate {
  id           String        @id @default(cuid())
  shopId       String
  name         String
  bodyText     String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  shop         Shop          @relation(fields: [shopId], references: [id], onDelete: Cascade)
  outreachLogs OutreachLog[]

  @@index([shopId])
}

model OutreachLog {
  id          String   @id @default(cuid())
  shopId      String
  customerId  String
  templateId  String?
  messageText String
  channel     String   @default("WHATSAPP")
  sentAt      DateTime @default(now())

  customer Customer          @relation(fields: [customerId], references: [id], onDelete: Cascade)
  template CampaignTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
  shop     Shop              @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@index([shopId])
  @@index([customerId])
}
```

Add relations to `Shop`:
```prisma
  customerTags      CustomerTag[]
  campaignTemplates CampaignTemplate[]
  outreachLogs      OutreachLog[]
```

- [ ] **Step 2: Apply Prisma Migration**

Run: `npx prisma migrate dev --name add_phase3_crm_tables`
Expected: Migration created and applied to database cleanly.

- [ ] **Step 3: Run `npm run typecheck` to verify generated client types**

Run: `npm run typecheck`
Expected: PASS with zero errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add schema migration for Phase 3 CRM tags, campaign templates, and outreach logs"
```

---

### Task 3: Marketing Consent Capture in Auth & Booking Modals

**Files:**
- Modify: `src/components/auth/AuthModal.tsx`
- Modify: `src/components/orders/BookOrderModal.tsx`
- Modify: `src/lib/auth.server.ts`
- Modify: `src/lib/orders.server.ts`
- Create: `src/lib/consent.test.ts`

**Interfaces:**
- Consumes: Customer registration & order booking forms
- Produces: Persisted `marketingOptIn`, `optInSource`, and `optInAt` on `Customer`

- [ ] **Step 1: Write failing test for consent update logic**

```typescript
// Create src/lib/consent.test.ts
import { describe, it, expect } from 'vitest';
import { updateMarketingConsentLogic } from './crm-consent-helpers';

describe('Marketing Consent Logic', () => {
  it('prepares consent update payload correctly when opted in', () => {
    const payload = updateMarketingConsentLogic(true, 'LOGIN_MODAL');
    expect(payload.marketingOptIn).toBe(true);
    expect(payload.optInSource).toBe('LOGIN_MODAL');
    expect(payload.optInAt).toBeInstanceOf(Date);
  });

  it('handles non-opted-in state', () => {
    const payload = updateMarketingConsentLogic(false, 'LOGIN_MODAL');
    expect(payload.marketingOptIn).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/lib/consent.test.ts`
Expected: FAIL with "Cannot find module './crm-consent-helpers'"

- [ ] **Step 3: Implement consent helper, update server actions and modal components**

Create `src/lib/crm-consent-helpers.ts`:
```typescript
export function updateMarketingConsentLogic(optIn: boolean, source: string) {
  return {
    marketingOptIn: optIn,
    optInSource: optIn ? source : null,
    optInAt: optIn ? new Date() : null,
  };
}
```

In `src/lib/auth.server.ts`:
In `registerCustomerProfile` server action, accept `marketingOptIn?: boolean`. If true, update customer with `marketingOptIn: true`, `optInSource: 'LOGIN_MODAL'`, `optInAt: new Date()`.

In `src/components/auth/AuthModal.tsx`:
Add a checkbox on profile setup step:
```tsx
<label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer mt-2">
  <input
    type="checkbox"
    checked={marketingOptIn}
    onChange={(e) => setMarketingOptIn(e.target.checked)}
    className="rounded border-border accent-brandPrimary"
  />
  <span>WhatsApp par festive offers aur design updates receive karein</span>
</label>
```

In `src/lib/orders.server.ts`:
When booking order, if customer has not opted-in yet and `marketingOptIn` parameter is passed as `true`, update customer record.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/consent.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/crm-consent-helpers.ts src/lib/consent.test.ts src/lib/auth.server.ts src/lib/orders.server.ts src/components/auth/AuthModal.tsx src/components/orders/BookOrderModal.tsx
git commit -m "feat(crm): add marketing consent capture to auth and order booking modals"
```

---

### Task 4: Backend CRM Server Module & Unit Tests

**Files:**
- Create: `src/lib/crm.server.ts`
- Create: `src/lib/crm.test.ts`

**Interfaces:**
- Consumes: Prisma DB client (`db.ts`), `Shop` context (`shop.ts`)
- Produces: Server functions: `getFilteredCustomers`, `createCustomerTag`, `assignTagToCustomer`, `removeTagFromCustomer`, `getCampaignTemplates`, `saveCampaignTemplate`, `deleteCampaignTemplate`, `logOutreachSent`, `interpolateTemplateVariables`.

- [ ] **Step 1: Write failing unit test for CRM helper functions**

```typescript
// Create src/lib/crm.test.ts
import { describe, it, expect } from 'vitest';
import { interpolateTemplateVariables } from './crm-template-helpers';

describe('CRM Template Interpolation', () => {
  it('interpolates customer name and shop details correctly', () => {
    const template = 'Namaste {{CustomerName}}, {{ShopName}} me aapka swagat hai! Contact: {{ShopPhone}}';
    const result = interpolateTemplateVariables(template, {
      customerName: 'Rajat Poddar',
      shopName: 'Poddar Jewellers',
      shopPhone: '7250580175',
      wishlistCategory: 'Bangles',
    });

    expect(result).toBe('Namaste Rajat Poddar, Poddar Jewellers me aapka swagat hai! Contact: 7250580175');
  });

  it('uses fallback for missing customer name', () => {
    const template = 'Namaste {{CustomerName}}!';
    const result = interpolateTemplateVariables(template, {
      customerName: '',
      shopName: 'Poddar Jewellers',
      shopPhone: '7250580175',
    });

    expect(result).toBe('Namaste Grahak!');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/lib/crm.test.ts`
Expected: FAIL with "Cannot find module './crm-template-helpers'"

- [ ] **Step 3: Implement `crm-template-helpers.ts` & `src/lib/crm.server.ts`**

Create `src/lib/crm-template-helpers.ts`:
```typescript
export interface TemplateVariables {
  customerName?: string | null;
  shopName?: string;
  shopPhone?: string;
  wishlistCategory?: string | null;
}

export function interpolateTemplateVariables(templateText: string, vars: TemplateVariables): string {
  const name = vars.customerName && vars.customerName.trim() !== '' ? vars.customerName.trim() : 'Grahak';
  const shopName = vars.shopName || '';
  const shopPhone = vars.shopPhone || '';
  const category = vars.wishlistCategory || 'Jewellery';

  return templateText
    .replace(/\{\{\s*CustomerName\s*\}\}/g, name)
    .replace(/\{\{\s*ShopName\s*\}\}/g, shopName)
    .replace(/\{\{\s*ShopPhone\s*\}\}/g, shopPhone)
    .replace(/\{\{\s*WishlistCategory\s*\}\}/g, category);
}
```

Create `src/lib/crm.server.ts`:
Implement:
- `getFilteredCustomers(filters: { optIn?: boolean; tagId?: string; categorySlug?: string; eventWithinDays?: number; search?: string })`: Performs Prisma query filtering on `Customer`.
- `createCustomerTag(name: string, color?: string)`
- `assignTagToCustomer(customerId: string, tagId: string)`
- `removeTagFromCustomer(customerId: string, tagId: string)`
- `getAllCustomerTags()`
- `getCampaignTemplates()`
- `saveCampaignTemplate(name: string, bodyText: string, id?: string)`
- `deleteCampaignTemplate(id: string)`
- `logOutreachSent(customerId: string, templateId: string | null, messageText: string)`

- [ ] **Step 4: Run unit test to verify it passes**

Run: `npx vitest run src/lib/crm.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/crm-template-helpers.ts src/lib/crm.test.ts src/lib/crm.server.ts
git commit -m "feat(crm): add CRM backend server actions and template variable interpolation engine"
```

---

### Task 5: Admin Smart CRM Segmentation & Customer Tagging UI

**Files:**
- Modify: `src/app/admin/(panel)/customers/page.tsx`
- Modify: `src/app/admin/(panel)/customers/[id]/page.tsx`
- Create: `src/components/admin/TagBadgeSelect.tsx`
- Create: `src/components/admin/CustomerSegmentFilters.tsx`

**Interfaces:**
- Consumes: `crm.server.ts` server actions, `Customer` & `CustomerTag` data
- Produces: Interactive filter bar, live customer segment counts, tag management badges, and outreach history timeline on customer profile.

- [ ] **Step 1: Create `TagBadgeSelect.tsx` component**

Interactive component for assigning/removing tags on a customer profile with design system tokens (`Badge`, `Select`, `Button`).

- [ ] **Step 2: Create `CustomerSegmentFilters.tsx` component**

Filter toolbar for `/admin/customers` with dropdowns for Opt-In status (`All` | `Opt-In Only` | `Non-Opt-In`), Tags, Event date range (`Next 15d`, `Next 30d`), and Search input.

- [ ] **Step 3: Update `/admin/customers/page.tsx`**

Integrate `CustomerSegmentFilters`, display tag pills on customer table rows, show consent status badge (`WhatsApp Opt-In: Yes/No`), and add link/button to Outreach Broadcast Hub.

- [ ] **Step 4: Update `/admin/customers/[id]/page.tsx`**

Add `TagBadgeSelect` component, consent information badge, and `OutreachLog` timeline history section showing sent marketing messages.

- [ ] **Step 5: Run typecheck and design system lint test**

Run: `npm run typecheck && npx vitest run src/lib/design-system.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/TagBadgeSelect.tsx src/components/admin/CustomerSegmentFilters.tsx src/app/admin/\(panel\)/customers/page.tsx src/app/admin/\(panel\)/customers/\[id\]/page.tsx
git commit -m "feat(admin): add smart customer segment filters, tag badge management, and outreach history timeline"
```

---

### Task 6: Outreach & Broadcast Hub Page (`/admin/customers/outreach`)

**Files:**
- Create: `src/app/admin/(panel)/customers/outreach/page.tsx`
- Create: `src/components/admin/OutreachWorkspace.tsx`
- Create: `src/lib/export-csv.ts`

**Interfaces:**
- Consumes: `crm.server.ts` templates & customer segment data
- Produces: Full campaign workspace with template selector, live variable preview, 1-click WhatsApp deep-links (`wa.me`), outreach logger, and CSV broadcast list exporter.

- [ ] **Step 1: Implement `src/lib/export-csv.ts` helper**

Function `exportCustomersToCSV(customers)` that formats customer array to clean UTF-8 CSV string and triggers browser download.

- [ ] **Step 2: Create `OutreachWorkspace.tsx` component**

Includes:
- Template picker dropdown and "New Template" modal form.
- Live preview pane showing interpolated text for selected customer.
- Customer broadcast table with **"Send WhatsApp Message"** button for each customer.
- **"Export Broadcast CSV"** button for downloading broadcast lists.

- [ ] **Step 3: Create `/admin/customers/outreach/page.tsx`**

Renders the `OutreachWorkspace` wrapped in admin panel layout.

- [ ] **Step 4: Run full test suite & design system verification**

Run: `npm test && npm run typecheck`
Expected: ALL tests pass cleanly with zero lint or design system token violations.

- [ ] **Step 5: Commit**

```bash
git add src/lib/export-csv.ts src/components/admin/OutreachWorkspace.tsx src/app/admin/\(panel\)/customers/outreach/page.tsx
git commit -m "feat(admin): add Outreach and Broadcast Hub with template preview, 1-click wa.me links, and CSV export"
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
Expected: All 152+ tests pass, including `no-hardcoded-shop.test.ts` and `design-system.test.ts`.

- [ ] **Step 2: Run TypeScript compiler check**

Run: `npm run typecheck`
Expected: Clean output with 0 errors.

- [ ] **Step 3: Run Next.js production build**

Run: `npm run build`
Expected: Production build succeeds, producing standalone output.

- [ ] **Step 4: Final commit & status update**

Commit any remaining changes and update `docs/STATUS.md` to reflect Phase 3 completion.
