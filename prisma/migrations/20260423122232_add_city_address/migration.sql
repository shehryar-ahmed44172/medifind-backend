/*
  Warnings:

  - A unique constraint covering the columns `[cnic]` on the table `MedicalProfile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cnic]` on the table `Responder` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PatientType" AS ENUM ('NORMAL', 'DEAF');

-- CreateEnum
CREATE TYPE "ResponderType" AS ENUM ('AMBULANCE', 'PARAMEDIC', 'DOCTOR', 'VOLUNTEER', 'EMERGENCY_RESPONDER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PROFESSIONAL', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterEnum
ALTER TYPE "EmergencyStatus" ADD VALUE 'ASSIGNED';

-- DropForeignKey
ALTER TABLE "MedicalReport" DROP CONSTRAINT "MedicalReport_emergencyId_fkey";

-- AlterTable
ALTER TABLE "CaregiverLink" ADD COLUMN     "requesterId" TEXT,
ADD COLUMN     "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Emergency" ADD COLUMN     "voiceSummary" TEXT;

-- AlterTable
ALTER TABLE "MedicalProfile" ADD COLUMN     "cnic" TEXT,
ADD COLUMN     "patientType" "PatientType" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "predefinedMessages" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "MedicalReport" ALTER COLUMN "emergencyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Responder" ADD COLUMN     "cnic" TEXT,
ADD COLUMN     "cnicImageUrl" TEXT,
ADD COLUMN     "employeeCardImageUrl" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organization" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "responderType" "ResponderType" NOT NULL DEFAULT 'VOLUNTEER',
ADD COLUMN     "vehicleType" TEXT,
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "fcmTokens" JSONB DEFAULT '[]',
ADD COLUMN     "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "CaregiverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cnic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channels" JSONB NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverProfile_userId_key" ON "CaregiverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverProfile_cnic_key" ON "CaregiverProfile"("cnic");

-- CreateIndex
CREATE INDEX "CaregiverProfile_userId_idx" ON "CaregiverProfile"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalProfile_cnic_key" ON "MedicalProfile"("cnic");

-- CreateIndex
CREATE UNIQUE INDEX "Responder_cnic_key" ON "Responder"("cnic");

-- AddForeignKey
ALTER TABLE "CaregiverProfile" ADD CONSTRAINT "CaregiverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
