import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/authMiddleware';
import prisma from '../lib/prisma';

const router = Router();

// All file downloads require authentication
router.use(authMiddleware);

/**
 * GET /api/files/reports/:filename
 *
 * Serves medical report PDFs only to users with access:
 *   - ADMIN: always
 *   - PATIENT: own reports only
 *   - RESPONDER: only while actively responding to the patient's emergency
 *   - CAREGIVER: only if linked to the patient
 */
router.get('/reports/:filename', async (req: Request, res: Response) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(process.cwd(), 'uploads', 'reports', safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const user = req.user!;

  if (user.role === 'ADMIN') {
    return res.sendFile(filePath);
  }

  const report = await prisma.medicalReport.findFirst({
    where: { fileUrl: { contains: safeName } },
    select: {
      userId: true,
      emergencyId: true,
      emergency: { select: { patientId: true } },
    },
  });

  if (!report) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const ownerId = report.userId ?? report.emergency?.patientId;

  if (user.role === 'PATIENT') {
    if (ownerId !== user.userId) return res.status(403).json({ error: 'Access denied' });
    return res.sendFile(filePath);
  }

  if (user.role === 'RESPONDER' && report.emergencyId) {
    const activeRequest = await prisma.emergencyRequest.findFirst({
      where: {
        responderId: user.userId,
        emergencyId: report.emergencyId,
        status: 'ACCEPTED',
        emergency: { status: { notIn: ['RESOLVED', 'COMPLETED', 'CANCELLED'] } },
      },
    });
    if (activeRequest) return res.sendFile(filePath);
  }

  if (user.role === 'CAREGIVER' && ownerId) {
    const link = await prisma.caregiverLink.findFirst({
      where: { caregiverId: user.userId, patientId: ownerId, status: 'ACCEPTED', isActive: true },
    });
    if (link) return res.sendFile(filePath);
  }

  return res.status(403).json({ error: 'Access denied' });
});

export default router;
