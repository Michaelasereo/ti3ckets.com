-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "organizerProfileId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paystackRef" TEXT,
    "bankAccount" JSONB,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payouts_paystackRef_key" ON "payouts"("paystackRef");

-- CreateIndex
CREATE INDEX "payouts_organizerId_idx" ON "payouts"("organizerId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_createdAt_idx" ON "payouts"("createdAt");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_organizerProfileId_fkey" FOREIGN KEY ("organizerProfileId") REFERENCES "organizer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
