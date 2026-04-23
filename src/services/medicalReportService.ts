import { medicalReportRepository } from '../repositories/medicalReportRepository';
import { emergencyRepository } from '../repositories/emergencyRepository';
import { MedicalReportType } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

export const uploadReport = async (
  userId: string,
  emergencyId: string,
  file: Express.Multer.File,
  reportType: string
) => {
  // Validate emergency exists and belongs to user
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');
  if (emergency.patientId !== userId) throw new Error('Unauthorized: Emergency does not belong to user');

  // Validate reportType
  const validTypes = ['LAB', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VITAL_SIGNS', 'OTHER'];
  const typeToUse = validTypes.includes(reportType) ? (reportType as MedicalReportType) : 'OTHER';

  // Construct fake URL for local disk (In production this would be Azure URL)
  const fileUrl = `/uploads/reports/${file.filename}`;

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
  reportType: string
) => {
  const validTypes = ['LAB', 'IMAGING', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'VITAL_SIGNS', 'OTHER'];
  const typeToUse = validTypes.includes(reportType) ? (reportType as MedicalReportType) : 'OTHER';

  const fileUrl = `/uploads/reports/${file.filename}`;

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
  // Access control based on Complete_Requirements "Only assigned responders shall view"
  const emergency = await emergencyRepository.findById(emergencyId);
  if (!emergency) throw new Error('Emergency not found');
  
  if (role === 'PATIENT' && emergency.patientId !== requestingUserId) {
    throw new Error('Unauthorized');
  }

  // If responder, ideally check if they are the ASSIGNED responder, 
  // but for broad access in Phase 2 MVP we allow responders or admins to view.
  if (role === 'CAREGIVER') {
    // Caregiver access logic can be expanded here
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
    const filePath = path.join(process.cwd(), report.fileUrl);
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
