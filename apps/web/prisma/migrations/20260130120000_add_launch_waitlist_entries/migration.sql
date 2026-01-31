-- CreateTable
CREATE TABLE IF NOT EXISTS "launch_waitlist_entries" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "launch_waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "launch_waitlist_entries_email_key" ON "launch_waitlist_entries"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "launch_waitlist_entries_email_idx" ON "launch_waitlist_entries"("email");
