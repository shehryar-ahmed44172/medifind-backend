import { medicalReportRepository } from '../repositories/medicalReportRepository';
import { emergencyRepository } from '../repositories/emergencyRepository';
import { MedicalReportType } from '@prisma/client';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export const uploadReport = async (
  userId: string,
  emergencyId: string,
  file: Express.Multer.File,
  reportType: string,
  baseUrl: string = ''
) => {
  // Validate emergency exists and belongs to user
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');
  if (emergency.patientId !== userId) throw new Error('Unauthorized: Emergency does not belong to user');

  // Validate reportType
  const validTypes = ['LAB', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VITAL_SIGNS', 'OTHER'];
  const typeToUse = validTypes.includes(reportType) ? (reportType as MedicalReportType) : 'OTHER';

  // Route through the authenticated file endpoint — /uploads is no longer public
  const fileUrl = `${baseUrl}/api/files/reports/${file.filename}`;

  const report = await medicalReportRepository.create({
    emergencyId,
    userId,
    reportType: typeToUse,
    fileName: file.originalname,
    fileUrl,
    fileSizeBytes: file.size,
  });

  logger.info(`User ${userId} uploaded report ${report.id} for emergency ${emergencyId}`);
  return report;
};

export const uploadProfileReport = async (
  userId: string,
  file: Express.Multer.File,
  reportType: string,
  baseUrl: string = ''
) => {
  const validTypes = ['LAB', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VITAL_SIGNS', 'OTHER'];
  const typeToUse = validTypes.includes(reportType) ? (reportType as MedicalReportType) : 'OTHER';

  const fileUrl = `${baseUrl}/api/files/reports/${file.filename}`;

  const report = await medicalReportRepository.create({
    emergencyId: null,
    userId,
    reportType: typeToUse,
    fileName: file.originalname,
    fileUrl,
    fileSizeBytes: file.size,
  });

  logger.info(`User ${userId} uploaded profile report ${report.id}`);
  return report;
};

export const getReportsForEmergency = async (emergencyId: string, requestingUserId: string, role: string) => {
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');

  if (role === 'PATIENT') {
    if (emergency.patientId !== requestingUserId) throw new Error('Unauthorized');
  } else if (role === 'RESPONDER') {
    // Only allowed while they have an ACCEPTED request for this emergency that is not yet resolved
    const activeRequest = await prisma.emergencyRequest.findFirst({
      where: {
        responderId: requestingUserId,
        emergencyId,
        status: 'ACCEPTED',
        emergency: {
          status: { notIn: ['RESOLVED', 'COMPLETED', 'CANCELLED'] },
        },
      },
    });
    if (!activeRequest) {
      throw new Error('You can only view reports while actively responding to this emergency.');
    }
  } else if (role === 'CAREGIVER') {
    // Caregiver must be linked to the patient
    const { isLinked } = await import('./caregiverService');
    const linked = await isLinked(requestingUserId, emergency.patientId);
    if (!linked) throw new Error('Unauthorized');
  } else if (role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  return await medicalReportRepository.findByEmergencyId(emergencyId);
};

export const getProfileReports = async (userId: string) => {
  return await medicalReportRepository.findByUserId(userId);
};

export const deleteReport = async (reportId: string, userId: string) => {
  const report = await medicalReportRepository.findById(reportId);
  if (!report) throw new Error('Report not found');
  if (report.userId !== userId) throw new Error('Unauthorized');

  // Attempt to delete file from disk
  try {
    // Resolve the filename from the stored URL, handling both old /uploads/ and new /api/files/ formats
    let filename: string;
    try {
      const urlPath = report.fileUrl.startsWith('http')
        ? new URL(report.fileUrl).pathname
        : report.fileUrl;
      filename = path.basename(urlPath);
    } catch {
      filename = path.basename(report.fileUrl);
    }
    const filePath = path.join(process.cwd(), 'uploads', 'reports', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err: any) {
    logger.error(`Failed to delete file from disk: ${err.message}`);
  }

  return await medicalReportRepository.delete(reportId);
};

export const renameReport = async (reportId: string, userId: string, newName: string) => {
  const report = await medicalReportRepository.findById(reportId);
  if (!report) throw new Error('Report not found');
  if (report.userId !== userId) throw new Error('Unauthorized');

  return await medicalReportRepository.update(reportId, { fileName: newName });
};
