import { PrismaClient, MedicalReportType } from '@prisma/client';

const prisma = new PrismaClient();

export const medicalReportRepository = {
  /**
   * Create a new medical report record
   */
  create: async (data: {
    emergencyId: string;
    userId: string;
    reportType: MedicalReportType;
    fileName: string;
    fileUrl: string;
    fileSizeBytes: number;
  }) => {
    return await prisma.medicalReport.create({
      data,
    });
  },

  /**
   * Find reports by emergency ID
   */
  findByEmergencyId: async (emergencyId: string) => {
    return await prisma.medicalReport.findMany({
      where: { emergencyId },
      orderBy: { uploadedAt: 'desc' },
    });
  },

  /**
   * Find report by ID
   */
  findById: async (id: string) => {
    return await prisma.medicalReport.findUnique({
      where: { id },
    });
  },

  /**
   * Delete a report
   */
  delete: async (id: string) => {
    return await prisma.medicalReport.delete({
      where: { id },
    });
  },
};
