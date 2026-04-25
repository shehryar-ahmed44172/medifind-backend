import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createLink = async (data: { caregiverId: string, patientId: string, relationship: string, requesterId: string }) => {
  return await prisma.caregiverLink.create({
    data: { 
      caregiverId: data.caregiverId, 
      patientId: data.patientId, 
      relationship: data.relationship, 
      requesterId: data.requesterId, 
      status: 'PENDING' 
    } as any,
  });
};

export const countActiveLinks = async (patientId: string) => {
  return await prisma.caregiverLink.count({
    where: { patientId, status: 'ACCEPTED', isActive: true } as any,
  });
};

export const countTotalLinks = async (patientId: string) => {
  return await prisma.caregiverLink.count({
    where: { patientId, status: { in: ['PENDING', 'ACCEPTED'] }, isActive: true } as any,
  });
};

export const updateLinkStatus = async (caregiverId: string, patientId: string, status: 'ACCEPTED' | 'REJECTED' | 'PENDING') => {
  return await prisma.caregiverLink.update({
    where: { caregiverId_patientId: { caregiverId, patientId } },
    data: { status, isActive: status === 'ACCEPTED' } as any,
  });
};

export const getPendingInvitations = async (userId: string) => {
  return await prisma.caregiverLink.findMany({
    where: { 
      OR: [
        { caregiverId: userId },
        { patientId: userId }
      ],
      status: 'PENDING',
      requesterId: { not: userId } 
    } as any,
    include: {
      patient: { select: { id: true, fullName: true, email: true } },
      caregiver: { select: { id: true, fullName: true, email: true } },
    },
  });
};

export const findLink = async (caregiverId: string, patientId: string) => {
  return await prisma.caregiverLink.findUnique({
    where: {
      caregiverId_patientId: { caregiverId, patientId },
    },
  });
};

export const findLinkById = async (id: string) => {
  return await prisma.caregiverLink.findUnique({
    where: { id },
  });
};

export const getCaregiversForPatient = async (patientId: string) => {
  return await prisma.caregiverLink.findMany({
    where: { patientId, status: 'ACCEPTED', isActive: true } as any,
    include: {
      caregiver: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getPatientsForCaregiver = async (caregiverId: string) => {
  return await prisma.caregiverLink.findMany({
    where: { caregiverId, status: 'ACCEPTED', isActive: true } as any,
    include: {
      patient: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getAllPatientsForCaregiver = async (caregiverId: string) => {
  return await prisma.caregiverLink.findMany({
    where: { caregiverId } as any,
    include: {
      patient: { select: { id: true, fullName: true, email: true, phoneNumber: true, profileImageUrl: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
};

export const getAllCaregiversForPatient = async (patientId: string) => {
  return await prisma.caregiverLink.findMany({
    where: { patientId } as any,
    include: {
      caregiver: { select: { id: true, fullName: true, email: true, phoneNumber: true, profileImageUrl: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
};

export const updateStatusToPending = async (caregiverId: string, patientId: string) => {
  return await prisma.caregiverLink.update({
    where: { caregiverId_patientId: { caregiverId, patientId } },
    data: { status: 'PENDING' } as any,
  });
};

export const removeLink = async (caregiverId: string, patientId: string) => {
  return await prisma.caregiverLink.delete({
    where: {
      caregiverId_patientId: { caregiverId, patientId },
    },
  });
};
