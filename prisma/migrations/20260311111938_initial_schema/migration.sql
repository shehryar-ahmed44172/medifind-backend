-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'RESPONDER', 'CAREGIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmergencyRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('EN_ROUTE', 'ARRIVED', 'TREATING', 'TRANSPORTED');

-- CreateEnum
CREATE TYPE "MedicalReportType" AS ENUM ('LAB', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VITAL_SIGNS', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "profileImageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bloodType" TEXT,
    "chronicDiseases" JSONB DEFAULT '[]',
    "allergies" JSONB DEFAULT '[]',
    "medications" JSONB DEFAULT '[]',
    "emergencyContacts" JSONB DEFAULT '[]',
    "disabilities" JSONB DEFAULT '[]',
    "medicalHistory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emergency" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "emergencyType" TEXT NOT NULL DEFAULT 'MEDICAL',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'ACTIVE',
    "voiceAlertGenerated" BOOLEAN NOT NULL DEFAULT false,
    "additionalInfo" TEXT,
    "cancellationDeadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Emergency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "specialization" JSONB DEFAULT '[]',
    "currentLatitude" DOUBLE PRECISION,
    "currentLongitude" DOUBLE PRECISION,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "averageResponseTime" INTEGER,
    "totalResponsesHandled" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Responder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyRequest" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "status" "EmergencyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "distanceKm" DOUBLE PRECISION,
    "estimatedArrivalMinutes" INTEGER,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmergencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyTracking" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "status" "TrackingStatus" NOT NULL DEFAULT 'EN_ROUTE',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmergencyTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverLink" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalReport" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportType" "MedicalReportType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phoneNumber_idx" ON "User"("phoneNumber");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalProfile_userId_key" ON "MedicalProfile"("userId");

-- CreateIndex
CREATE INDEX "MedicalProfile_userId_idx" ON "MedicalProfile"("userId");

-- CreateIndex
CREATE INDEX "Emergency_patientId_idx" ON "Emergency"("patientId");

-- CreateIndex
CREATE INDEX "Emergency_status_idx" ON "Emergency"("status");

-- CreateIndex
CREATE INDEX "Emergency_createdAt_idx" ON "Emergency"("createdAt");

-- CreateIndex
CREATE INDEX "Emergency_cancellationDeadline_idx" ON "Emergency"("cancellationDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "Responder_userId_key" ON "Responder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Responder_licenseNumber_key" ON "Responder"("licenseNumber");

-- CreateIndex
CREATE INDEX "Responder_userId_idx" ON "Responder"("userId");

-- CreateIndex
CREATE INDEX "Responder_isAvailable_idx" ON "Responder"("isAvailable");

-- CreateIndex
CREATE INDEX "Responder_currentLatitude_currentLongitude_idx" ON "Responder"("currentLatitude", "currentLongitude");

-- CreateIndex
CREATE INDEX "Responder_createdAt_idx" ON "Responder"("createdAt");

-- CreateIndex
CREATE INDEX "EmergencyRequest_emergencyId_idx" ON "EmergencyRequest"("emergencyId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_responderId_idx" ON "EmergencyRequest"("responderId");

-- CreateIndex
CREATE INDEX "EmergencyRequest_status_idx" ON "EmergencyRequest"("status");

-- CreateIndex
CREATE INDEX "EmergencyRequest_sentAt_idx" ON "EmergencyRequest"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyRequest_emergencyId_responderId_key" ON "EmergencyRequest"("emergencyId", "responderId");

-- CreateIndex
CREATE INDEX "EmergencyTracking_emergencyId_idx" ON "EmergencyTracking"("emergencyId");

-- CreateIndex
CREATE INDEX "EmergencyTracking_responderId_idx" ON "EmergencyTracking"("responderId");

-- CreateIndex
CREATE INDEX "EmergencyTracking_status_idx" ON "EmergencyTracking"("status");

-- CreateIndex
CREATE INDEX "EmergencyTracking_timestamp_idx" ON "EmergencyTracking"("timestamp");

-- CreateIndex
CREATE INDEX "CaregiverLink_caregiverId_idx" ON "CaregiverLink"("caregiverId");

-- CreateIndex
CREATE INDEX "CaregiverLink_patientId_idx" ON "CaregiverLink"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverLink_caregiverId_patientId_key" ON "CaregiverLink"("caregiverId", "patientId");

-- CreateIndex
CREATE INDEX "MedicalReport_emergencyId_idx" ON "MedicalReport"("emergencyId");

-- CreateIndex
CREATE INDEX "MedicalReport_userId_idx" ON "MedicalReport"("userId");

-- CreateIndex
CREATE INDEX "MedicalReport_reportType_idx" ON "MedicalReport"("reportType");

-- CreateIndex
CREATE INDEX "MedicalReport_uploadedAt_idx" ON "MedicalReport"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_revokedAt_idx" ON "RefreshToken"("revokedAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "MedicalProfile" ADD CONSTRAINT "MedicalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emergency" ADD CONSTRAINT "Emergency_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Responder" ADD CONSTRAINT "Responder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyRequest" ADD CONSTRAINT "EmergencyRequest_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "Responder"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyTracking" ADD CONSTRAINT "EmergencyTracking_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyTracking" ADD CONSTRAINT "EmergencyTracking_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "Responder"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverLink" ADD CONSTRAINT "CaregiverLink_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverLink" ADD CONSTRAINT "CaregiverLink_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalReport" ADD CONSTRAINT "MedicalReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
