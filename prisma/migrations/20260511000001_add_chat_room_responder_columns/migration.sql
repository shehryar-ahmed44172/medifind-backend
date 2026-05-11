-- ============================================================
-- Migration: add_chat_room_responder_columns
-- Adds roomType, responderId, emergencyId to ChatRoom,
-- makes caregiverId nullable, and wires up indexes/FK.
-- ============================================================

-- 1. Create the ChatRoomType enum
CREATE TYPE "ChatRoomType" AS ENUM ('CAREGIVER_PATIENT', 'EMERGENCY_RESPONDER');

-- 2. Make caregiverId nullable (was NOT NULL in original migration)
ALTER TABLE "ChatRoom" ALTER COLUMN "caregiverId" DROP NOT NULL;

-- 3. Add the three missing columns
ALTER TABLE "ChatRoom"
  ADD COLUMN "roomType"    "ChatRoomType" NOT NULL DEFAULT 'CAREGIVER_PATIENT',
  ADD COLUMN "responderId" TEXT,
  ADD COLUMN "emergencyId" TEXT;

-- 4. Drop the old non-partial unique index on (patientId, caregiverId)
--    and recreate as partial so NULL caregiverId rows don't conflict
DROP INDEX IF EXISTS "ChatRoom_patientId_caregiverId_key";
CREATE UNIQUE INDEX "ChatRoom_patientId_caregiverId_key"
  ON "ChatRoom"("patientId", "caregiverId")
  WHERE "caregiverId" IS NOT NULL;

-- 5. Add composite unique index for emergency rooms
CREATE UNIQUE INDEX "ChatRoom_patientId_responderId_emergencyId_key"
  ON "ChatRoom"("patientId", "responderId", "emergencyId")
  WHERE "responderId" IS NOT NULL AND "emergencyId" IS NOT NULL;

-- 6. Add supporting indexes
CREATE INDEX "ChatRoom_responderId_idx" ON "ChatRoom"("responderId");
CREATE INDEX "ChatRoom_emergencyId_idx"  ON "ChatRoom"("emergencyId");

-- 7. Foreign key: responderId → User(id)
ALTER TABLE "ChatRoom"
  ADD CONSTRAINT "ChatRoom_responderId_fkey"
  FOREIGN KEY ("responderId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
