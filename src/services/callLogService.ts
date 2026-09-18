import prisma from '../lib/prisma';

/**
 * Call records for the admin console: only calls between a responder and a
 * patient or caregiver of an emergency. Patient ↔ caregiver (family) calls are
 * private and never listed. Metadata only — MediFind does not record audio/video.
 */
const FINAL_ACTIONS = ['CALL_ENDED', 'CALL_MISSED', 'CALL_DECLINED', 'CALL_CANCELLED'] as const;
const OUTCOME: Record<string, string> = {
  CALL_MISSED: 'MISSED',
  CALL_DECLINED: 'DECLINED',
  CALL_CANCELLED: 'CANCELLED',
};
const SCAN_LIMIT = 2000;

export type CallPartyKind = 'PATIENT' | 'CAREGIVER';

export interface CallLogQuery {
  kind?: string;      // PATIENT | CAREGIVER
  outcome?: string;   // COMPLETED | MISSED | DECLINED | CANCELLED
  media?: string;     // audio | video
  search?: string;
  page?: number;
  limit?: number;
}

export const getEmergencyCallLogs = async (query: CallLogQuery) => {
  const finals = await prisma.auditLog.findMany({
    where: { entity: 'Call', action: { in: [...FINAL_ACTIONS] } },
    orderBy: { createdAt: 'desc' },
    take: SCAN_LIMIT,
  });

  const values = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, any>) : {});
  const userIds = new Set<string>();
  const emergencyIds = new Set<string>();
  for (const log of finals) {
    const v = values(log.newValues);
    if (log.userId) userIds.add(log.userId);
    if (v.calleeId) userIds.add(String(v.calleeId));
    if (v.emergencyId) emergencyIds.add(String(v.emergencyId));
  }

  const [users, emergencies] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, fullName: true, role: true, profileImageUrl: true, medicalProfile: { select: { patientType: true } } },
    }),
    prisma.emergency.findMany({
      where: { id: { in: [...emergencyIds] } },
      select: { id: true, emergencyType: true, status: true, createdAt: true },
    }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const emergencyById = new Map(emergencies.map((e) => [e.id, e]));

  const rows = [];
  for (const log of finals) {
    const v = values(log.newValues);
    const caller = log.userId ? userById.get(log.userId) : undefined;
    const callee = v.calleeId ? userById.get(String(v.calleeId)) : undefined;
    if (!caller || !callee) continue;

    const responder = caller.role === 'RESPONDER' ? caller : callee.role === 'RESPONDER' ? callee : undefined;
    const other = responder === caller ? callee : caller;
    if (!responder || other.role === 'RESPONDER') continue;
    // Responder ↔ caregiver, or responder ↔ (hearing) patient only
    let kind: CallPartyKind;
    if (other.role === 'CAREGIVER') kind = 'CAREGIVER';
    else if (other.role === 'PATIENT' && other.medicalProfile?.patientType !== 'DEAF') kind = 'PATIENT';
    else continue;

    const durationSeconds = Number(v.durationSeconds) || 0;
    const outcome = OUTCOME[log.action] ?? (v.answeredAt || durationSeconds > 0 ? 'COMPLETED' : 'NOT_CONNECTED');
    const emergency = v.emergencyId ? emergencyById.get(String(v.emergencyId)) : undefined;
    const person = (u: typeof caller) => ({ id: u.id, fullName: u.fullName, role: u.role, profileImageUrl: u.profileImageUrl });

    rows.push({
      id: log.entityId,
      media: v.media === 'video' ? 'video' : 'audio',
      kind,
      outcome,
      endReason: v.reason ?? null,
      calledBy: caller.role,
      responder: person(responder),
      party: person(other),
      startedAt: v.ringStartedAt ?? (v.answeredAt ?? log.createdAt),
      answeredAt: v.answeredAt ?? null,
      endedAt: log.createdAt,
      durationSeconds,
      emergency: emergency
        ? { id: emergency.id, type: emergency.emergencyType, status: emergency.status, createdAt: emergency.createdAt }
        : null,
    });
  }

  const search = (query.search || '').trim().toLowerCase();
  const filtered = rows.filter((r) =>
    (!query.kind || r.kind === query.kind) &&
    (!query.outcome || r.outcome === query.outcome) &&
    (!query.media || r.media === query.media) &&
    (!search || [r.responder.fullName, r.party.fullName, r.emergency?.type, r.id].some((x) => String(x || '').toLowerCase().includes(search))));

  const limit = Math.min(Math.max(Number(query.limit) || 25, 1), 100);
  const page = Math.max(Number(query.page) || 1, 1);
  const completed = rows.filter((r) => r.outcome === 'COMPLETED');

  return {
    summary: {
      total: rows.length,
      completed: completed.length,
      missedOrDeclined: rows.filter((r) => r.outcome === 'MISSED' || r.outcome === 'DECLINED').length,
      talkSeconds: completed.reduce((sum, r) => sum + r.durationSeconds, 0),
      withPatients: rows.filter((r) => r.kind === 'PATIENT').length,
      withCaregivers: rows.filter((r) => r.kind === 'CAREGIVER').length,
    },
    calls: filtered.slice((page - 1) * limit, page * limit),
    pagination: { page, limit, total: filtered.length, pages: Math.max(Math.ceil(filtered.length / limit), 1) },
  };
};
