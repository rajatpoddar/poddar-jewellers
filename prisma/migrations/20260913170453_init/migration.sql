-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'LIVE');

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "logoPath" TEXT,
    "brandPrimary" TEXT NOT NULL DEFAULT '#8F621A',
    "brandInk" TEXT NOT NULL DEFAULT '#1A1D1B',
    "brandGround" TEXT NOT NULL DEFAULT '#F4F4F2',
    "fontDisplay" TEXT NOT NULL DEFAULT 'Instrument Serif',
    "fontBody" TEXT NOT NULL DEFAULT 'Karla',
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "mapUrl" TEXT,
    "hoursText" TEXT NOT NULL,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "defaultMakingPercentBp" INTEGER NOT NULL DEFAULT 1500,
    "gstPercentBp" INTEGER NOT NULL DEFAULT 300,
    "roundingStepPaise" INTEGER NOT NULL DEFAULT 10000,
    "roundingSmallStepPaise" INTEGER NOT NULL DEFAULT 1000,
    "roundingThresholdPaise" INTEGER NOT NULL DEFAULT 1000000,
    "priceDisclaimer" TEXT NOT NULL,
    "rateWarnHours" INTEGER NOT NULL DEFAULT 24,
    "rateStaleHours" INTEGER NOT NULL DEFAULT 48,
    "rateBannerText" TEXT NOT NULL,
    "heroHeading" TEXT NOT NULL,
    "heroSubheading" TEXT NOT NULL,
    "seoLocations" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalType" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MetalType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLine" (
    "id" TEXT NOT NULL,
    "rateId" TEXT NOT NULL,
    "metalTypeId" TEXT NOT NULL,
    "pricePerGramPaise" INTEGER NOT NULL,

    CONSTRAINT "RateLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "makingPercentBp" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metalTypeId" TEXT NOT NULL,
    "makingPercentBp" INTEGER,
    "stoneValuePaise" INTEGER NOT NULL DEFAULT 0,
    "stoneDescription" TEXT,
    "categoryId" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "cachedPriceMinPaise" INTEGER,
    "cachedPriceMaxPaise" INTEGER,
    "cachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductWeight" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "weightMg" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "basePath" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributeGroup" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttributeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attribute" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("productId","attributeId")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE INDEX "MetalType_shopId_sortOrder_idx" ON "MetalType"("shopId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MetalType_shopId_key_key" ON "MetalType"("shopId", "key");

-- CreateIndex
CREATE INDEX "Rate_shopId_createdAt_idx" ON "Rate"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "RateLine_metalTypeId_idx" ON "RateLine"("metalTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "RateLine_rateId_metalTypeId_key" ON "RateLine"("rateId", "metalTypeId");

-- CreateIndex
CREATE INDEX "Category_shopId_parentId_idx" ON "Category"("shopId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_shopId_slug_key" ON "Category"("shopId", "slug");

-- CreateIndex
CREATE INDEX "Product_shopId_categoryId_status_idx" ON "Product"("shopId", "categoryId", "status");

-- CreateIndex
CREATE INDEX "Product_shopId_status_cachedPriceMinPaise_idx" ON "Product"("shopId", "status", "cachedPriceMinPaise");

-- CreateIndex
CREATE INDEX "Product_shopId_featured_status_idx" ON "Product"("shopId", "featured", "status");

-- CreateIndex
CREATE INDEX "Product_metalTypeId_idx" ON "Product"("metalTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_shopId_slug_key" ON "Product"("shopId", "slug");

-- CreateIndex
CREATE INDEX "ProductWeight_productId_idx" ON "ProductWeight"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductWeight_productId_weightMg_key" ON "ProductWeight"("productId", "weightMg");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributeGroup_shopId_key_key" ON "AttributeGroup"("shopId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_groupId_slug_key" ON "Attribute"("groupId", "slug");

-- CreateIndex
CREATE INDEX "ProductAttribute_attributeId_idx" ON "ProductAttribute"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- AddForeignKey
ALTER TABLE "MetalType" ADD CONSTRAINT "MetalType_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rate" ADD CONSTRAINT "Rate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLine" ADD CONSTRAINT "RateLine_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "Rate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLine" ADD CONSTRAINT "RateLine_metalTypeId_fkey" FOREIGN KEY ("metalTypeId") REFERENCES "MetalType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_metalTypeId_fkey" FOREIGN KEY ("metalTypeId") REFERENCES "MetalType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductWeight" ADD CONSTRAINT "ProductWeight_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributeGroup" ADD CONSTRAINT "AttributeGroup_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attribute" ADD CONSTRAINT "Attribute_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AttributeGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
