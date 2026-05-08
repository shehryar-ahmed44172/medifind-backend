-- Phase 2: Migrate existing rows + recreate enum without old values
-- Relies on Phase 1 (20260508000001) having committed RESCUE_OFFICER, EMT, FIRST_RESPONDER

-- 2a: Migrate rows that had removed enum values to valid new equivalents
UPDATE "Responder"
SET "responderType" = 'FIRST_RESPONDER'::"ResponderType"
WHERE "responderType"::text = 'EMERGENCY_RESPONDER';

UPDATE "Responder"
SET "responderType" = 'EMT'::"ResponderType"
WHERE "responderType"::text = 'AMBULANCE';

UPDATE "Responder"
SET "responderType" = 'PARAMEDIC'::"ResponderType"
WHERE "responderType"::text = 'DOCTOR';

-- 2b: Drop the column default before altering column type
ALTER TABLE "Responder" ALTER COLUMN "responderType" DROP DEFAULT;

-- 2c: Convert column to TEXT so old enum can be dropped
ALTER TABLE "Responder" ALTER COLUMN "responderType" TYPE TEXT;

-- 2d: Drop old enum (AMBULANCE, DOCTOR, EMERGENCY_RESPONDER removed)
DROP TYPE "ResponderType";

-- 2e: Create clean enum with only the 5 correct field-responder types
CREATE TYPE "ResponderType" AS ENUM (
  'PARAMEDIC',
  'RESCUE_OFFICER',
  'EMT',
  'FIRST_RESPONDER',
  'VOLUNTEER'
);

-- 2f: Restore column using new enum type
ALTER TABLE "Responder"
  ALTER COLUMN "responderType" TYPE "ResponderType"
  USING "responderType"::"ResponderType";

-- 2g: Restore column default
ALTER TABLE "Responder"
  ALTER COLUMN "responderType" SET DEFAULT 'FIRST_RESPONDER'::"ResponderType";
