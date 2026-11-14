-- Brings a database built only from the migrations in line with schema.prisma.
-- Earlier changes reached the development and Neon databases with `prisma db push`,
-- so a fresh `prisma migrate deploy` was missing them (for example the admin
-- dashboard failed with: invalid input value for enum "EmergencyStatus": "ARRIVED").
-- Every statement is written so it is a no-op on a database that already has the change.

ALTER TYPE "EmergencyStatus" ADD VALUE IF NOT EXISTS 'ARRIVED';
ALTER TYPE "EmergencyStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

ALTER TYPE "ResponderType" ADD VALUE IF NOT EXISTS 'AMBULANCE';
ALTER TYPE "ResponderType" ADD VALUE IF NOT EXISTS 'DOCTOR';
ALTER TYPE "ResponderType" ADD VALUE IF NOT EXISTS 'EMERGENCY_RESPONDER';

ALTER TABLE "MedicalReport" ALTER COLUMN "userId" DROP NOT NULL;

ALTER TABLE "Responder" ALTER COLUMN "vehicleType" SET DEFAULT 'MOTORBIKE_AMBULANCE';

CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoom_patientId_caregiverId_key" ON "ChatRoom"("patientId", "caregiverId");
CREATE UNIQUE INDEX IF NOT EXISTS "ChatRoom_patientId_responderId_emergencyId_key" ON "ChatRoom"("patientId", "responderId", "emergencyId");

-- A deleted user takes their chat messages with them instead of blocking the delete.
ALTER TABLE "ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_senderId_fkey";
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
