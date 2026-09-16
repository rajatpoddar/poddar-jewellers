-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "optInAt" TIMESTAMP(3),
ADD COLUMN     "optInSource" TEXT;

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTemplate" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "templateId" TEXT,
    "messageText" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CustomerToCustomerTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomerToCustomerTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "CustomerTag_shopId_idx" ON "CustomerTag"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerTag_shopId_name_key" ON "CustomerTag"("shopId", "name");

-- CreateIndex
CREATE INDEX "CampaignTemplate_shopId_idx" ON "CampaignTemplate"("shopId");

-- CreateIndex
CREATE INDEX "OutreachLog_shopId_idx" ON "OutreachLog"("shopId");

-- CreateIndex
CREATE INDEX "OutreachLog_customerId_idx" ON "OutreachLog"("customerId");

-- CreateIndex
CREATE INDEX "_CustomerToCustomerTag_B_index" ON "_CustomerToCustomerTag"("B");

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTemplate" ADD CONSTRAINT "CampaignTemplate_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachLog" ADD CONSTRAINT "OutreachLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachLog" ADD CONSTRAINT "OutreachLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CampaignTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachLog" ADD CONSTRAINT "OutreachLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToCustomerTag" ADD CONSTRAINT "_CustomerToCustomerTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToCustomerTag" ADD CONSTRAINT "_CustomerToCustomerTag_B_fkey" FOREIGN KEY ("B") REFERENCES "CustomerTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
