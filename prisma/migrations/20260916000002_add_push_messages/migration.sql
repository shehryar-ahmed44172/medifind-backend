-- Self-hosted push delivery queue (replaces Firebase Cloud Messaging)
CREATE TABLE IF NOT EXISTS "PushMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationLogId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PushMessage_userId_status_idx" ON "PushMessage"("userId", "status");
CREATE INDEX IF NOT EXISTS "PushMessage_status_sentAt_idx" ON "PushMessage"("status", "sentAt");
CREATE INDEX IF NOT EXISTS "PushMessage_expiresAt_idx" ON "PushMessage"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "PushMessage" ADD CONSTRAINT "PushMessage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
