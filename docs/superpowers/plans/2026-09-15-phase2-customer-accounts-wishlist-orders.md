# Phase 2 — Customer Accounts, Wishlist Sync, Inquiry Cart, Orders & Invoicing Plan

**Goal:** Enable customer authentication via phone, browser-to-account wishlist sync, inquiry cart with custom weight selections, formal order placement with required-by dates, and shop invoice generation from the admin panel.

---

## Architecture & Scope

### 1. Customer Authentication (`/auth/customer`)
- **Phone OTP / Passwordless Sign-in:** Simple, friction-free authentication for South Asian customers.
- **Session Handling:** HTTP-only signed customer cookie separate from admin session.
- **Customer Profile:** Name, Mobile number, Address, City, Pincode, optional GSTIN.

### 2. Wishlist Sync
- **Client State:** `useWishlist` hook reads from LocalStorage when offline/logged-out.
- **Auto-Sync:** On customer sign-in, local wishlist items automatically merge into `CustomerWishlist` table.
- **UI:** Heart button on `ProductCard` & `ProductGallery` with top-nav badge counter.

### 3. Inquiry Cart & Order Placement (`/cart`, `/checkout`)
- **Inquiry Cart:** Holds selected product weight options, live price estimates, and custom notes.
- **Checkout / Order Request:**
  - Pickup vs Delivery option
  - Event / Required-By Date picker (e.g. Wedding date)
  - Address confirmation
  - Generates `Order` record with status `PENDING_CONFIRMATION`
  - WhatsApp deep-link trigger with Order ID summary.

### 4. Admin Order Management & Tax Invoicing (`/admin/orders`)
- **Order Pipeline:** View pending orders, confirm rate lock, update status (`PENDING` → `CONFIRMED` → `FULFILLED`).
- **Tax Invoice Generator:** Clean, printable shop invoice showing itemized breakdown (Metal value + Making charges + Stone value + 3% GST + Shop GSTIN), as required by shop CA (D1).

---

## Schema Changes (`prisma/schema.prisma`)

```prisma
model Customer {
  id        String   @id @default(cuid())
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id], onDelete: Cascade)
  phone     String
  name      String?
  email     String?
  address   String?
  city      String?
  state     String?
  pincode   String?
  gstin     String?
  createdAt DateTime @default(now())

  wishlist  CustomerWishlist[]
  orders    Order[]

  @@unique([shopId, phone])
}

model CustomerWishlist {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([customerId, productId])
}

enum OrderStatus {
  PENDING
  CONFIRMED
  IN_PRODUCTION
  READY_FOR_PICKUP
  FULFILLED
  CANCELLED
}

model Order {
  id             String      @id @default(cuid())
  orderNumber    String      /// e.g. PJ-2026-0001
  shopId         String
  shop           Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  customerId     String
  customer       Customer    @relation(fields: [customerId], references: [id])
  status         OrderStatus @default(PENDING)
  totalPaise     Int
  metalPaise     Int
  makingPaise    Int
  stonePaise     Int
  gstPaise       Int
  requiredByDate DateTime?
  customerNotes  String?
  adminNotes     String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  items OrderItem[]

  @@unique([shopId, orderNumber])
}

model OrderItem {
  id              String  @id @default(cuid())
  orderId         String
  order           Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       String
  product         Product @relation(fields: [productId], references: [id])
  weightMg        Int
  totalPricePaise Int
  metalPaise      Int
  makingPaise     Int
  stonePaise      Int
  gstPaise        Int
}
```

---

## Implementation Tasks

### Task 1: Database Migration & Customer Models
- Update `prisma/schema.prisma` with `Customer`, `CustomerWishlist`, `Order`, `OrderItem`.
- Run `npx prisma migrate dev --name phase2_customer_orders`.

### Task 2: Customer Auth Session & OTP Service
- Create `src/lib/customer-auth.ts` for signed customer session tokens.
- Add phone OTP generation & verification flow in `/api/auth/otp`.

### Task 3: Wishlist Sync & UI Controls
- Build `useWishlist` React hook with LocalStorage + Server sync.
- Add Wishlist Heart button to `ProductCard` and `ProductGallery`.
- Add Nav Wishlist drawer/page (`/wishlist`).

### Task 4: Inquiry Cart & Checkout Flow
- Build `useCart` store for multi-item selection.
- Create `/cart` page with live total estimate and required-by date selector.
- Create server action `createOrder()` that calculates breakdown and saves `Order`.
- Deep-link to WhatsApp with order summary.

### Task 5: Admin Order Management & Tax Invoicing
- Create `/admin/orders` panel: view, filter, and manage customer orders.
- Create `/admin/orders/[id]/invoice` printable Tax Invoice with Shop GSTIN, HSN codes, and 3% GST breakdown.

---

## Verification Plan

- `npm test`: Add Vitest tests for order breakdown calculation, customer session validation, and wishlist sync.
- Playwright E2E: Add product to cart → enter required-by date → place order → verify WhatsApp deep link → verify admin invoice generation.
