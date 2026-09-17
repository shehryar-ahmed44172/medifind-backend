-- Requests that were closed because another responder accepted were stored as COMPLETED.
-- They were never accepted, so mark them as rejected (taken by another responder).
UPDATE "EmergencyRequest"
SET "status" = 'REJECTED',
    "rejectedAt" = COALESCE("rejectedAt", "updatedAt"),
    "rejectionReason" = COALESCE("rejectionReason", 'ASSIGNED_TO_ANOTHER_RESPONDER')
WHERE "status" = 'COMPLETED' AND "acceptedAt" IS NULL;
