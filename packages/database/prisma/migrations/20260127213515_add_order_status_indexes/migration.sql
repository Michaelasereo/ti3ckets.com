-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orders_eventId_status_idx" ON "orders"("eventId", "status");
