-- Phase 1: ADD new enum values to existing ResponderType
-- (Must be a separate committed transaction before Phase 2 can use them)
ALTER TYPE "ResponderType" ADD VALUE IF NOT EXISTS 'RESCUE_OFFICER';
ALTER TYPE "ResponderType" ADD VALUE IF NOT EXISTS 'EMT';
ALTER TYPE "ResponderType" ADD VALUE IF NOT EXISTS 'FIRST_RESPONDER';
