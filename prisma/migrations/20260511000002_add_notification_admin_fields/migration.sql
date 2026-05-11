-- ============================================================
-- Migration: add_notification_admin_fields
-- Adds sentByAdminId and recipientGroup to NotificationLog.
-- These columns support admin broadcast notifications.
-- ============================================================

-- 1. Add the two missing columns
ALTER TABLE "NotificationLog"
  ADD COLUMN "sentByAdminId"  TEXT,
  ADD COLUMN "recipientGroup" TEXT;

-- 2. Add index on sentByAdminId for admin dashboard queries
CREATE INDEX "NotificationLog_sentByAdminId_idx" ON "NotificationLog"("sentByAdminId");
