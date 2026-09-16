-- Patient rating of the responder, stored per request to prevent double rating
ALTER TABLE "EmergencyRequest" ADD COLUMN IF NOT EXISTS "patientRating" INTEGER;
ALTER TABLE "EmergencyRequest" ADD COLUMN IF NOT EXISTS "ratedAt" TIMESTAMP(3);

-- Columns added to the schema earlier without a migration
ALTER TABLE "Responder" ADD COLUMN IF NOT EXISTS "motorbikeNumber" TEXT;
ALTER TABLE "Responder" ADD COLUMN IF NOT EXISTS "drivingLicenseUrl" TEXT;
ALTER TABLE "Responder" ADD COLUMN IF NOT EXISTS "motorbikeDocUrl" TEXT;
