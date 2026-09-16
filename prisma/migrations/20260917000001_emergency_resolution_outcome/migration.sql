-- False-SOS control: how the responder closed the emergency, and mock-GPS flag
ALTER TABLE "Emergency" ADD COLUMN IF NOT EXISTS "resolutionOutcome" TEXT;
ALTER TABLE "Emergency" ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT;
ALTER TABLE "Emergency" ADD COLUMN IF NOT EXISTS "locationMocked" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "Emergency_patientId_resolutionOutcome_idx" ON "Emergency"("patientId", "resolutionOutcome");
