import { randomUUID } from 'crypto';
import type { Server, Socket } from 'socket.io';
import prisma from '../lib/prisma';
import logger from '../utils/logger';
import { TokenPayload } from '../types/auth';
import { canSeeContactDetails, OPEN_EMERGENCY_STATUSES } from '../utils/accessControl';
import { sendNotification } from './notification';
import { NotificationChannel, NotificationType } from '../types/notification';

/**
 * In-app voice/video calls (WebRTC). The server only does signalling over Socket.io;
 * audio and video travel peer-to-peer between the two apps.
 *
 * Client → server: call:invite, call:accept, call:decline, call:cancel, call:end, call:signal
 * Server → client: call:incoming, call:accepted, call:declined, call:cancelled, call:ended,
 *                  call:missed, call:signal
 */

export type CallMedia = 'audio' | 'video';

interface CallSession {
  id: string;
  callerId: string;
  calleeId: string;
  media: CallMedia;
  /** Set for patient/caregiver ↔ responder calls; the call ends with the emergency. */
  emergencyId: string | null;
  state: 'ringing' | 'active';
  createdAt: number;
  answeredAt?: number;
  ringTimer?: NodeJS.Timeout;
}

const RING_TIMEOUT_MS = 45_000;
const DISCONNECT_GRACE_MS = 15_000;
const calls = new Map<string, CallSession>();

let io: Server | null = null;

const userRoom = (userId: string) => `notifications:${userId}`;
const otherParty = (call: CallSession, userId: string) => (call.callerId === userId ? call.calleeId : call.callerId);
const isParticipant = (call: CallSession, userId: string) => call.callerId === userId || call.calleeId === userId;
const callOf = (userId: string) => [...calls.values()].find((c) => isParticipant(c, userId));

type Ack = (response: Record<string, unknown>) => void;
const safeAck = (ack: unknown): Ack => (typeof ack === 'function' ? (ack as Ack) : () => undefined);

/** The open emergency that connects two users through a responder, if any. */
const openEmergencyBetween = async (a: string, b: string): Promise<string | null> => {
  const open = { status: { in: [...OPEN_EMERGENCY_STATUSES] } };
  const request = await prisma.emergencyRequest.findFirst({
    where: {
      status: 'ACCEPTED',
      OR: [
        { responderId: a, emergency: { ...open, OR: [{ patientId: b }, { patient: { caregiverEmployers: { some: { caregiverId: b, status: 'ACCEPTED', isActive: true } } } }] } },
        { responderId: b, emergency: { ...open, OR: [{ patientId: a }, { patient: { caregiverEmployers: { some: { caregiverId: a, status: 'ACCEPTED', isActive: true } } } }] } },
      ],
    },
    select: { emergencyId: true },
  });
  return request?.emergencyId ?? null;
};

const isDeafPatient = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, medicalProfile: { select: { patientType: true } } },
  });
  return user?.role === 'PATIENT' && user.medicalProfile?.patientType === 'DEAF';
};

type Denied = { ok: false; code: string; message: string };
type Permission = { ok: true; emergencyId: string | null } | Denied;

/**
 * Who may call whom:
 *  - patient ↔ linked caregiver
 *  - patient / caregiver ↔ the responder assigned to the patient's open emergency
 *  - a Deaf patient's calls are video only (sign language / showing the situation)
 */
export const checkCallPermission = async (caller: TokenPayload, calleeId: string, media: CallMedia): Promise<Permission> => {
  if (!calleeId || calleeId === caller.userId || caller.role === 'ADMIN') {
    return { ok: false, code: 'NOT_ALLOWED', message: 'You cannot call this user.' };
  }
  const callee = await prisma.user.findUnique({ where: { id: calleeId }, select: { isActive: true } });
  if (!callee?.isActive) return { ok: false, code: 'NOT_ALLOWED', message: 'This user is not available.' };

  if (!(await canSeeContactDetails(caller, calleeId))) {
    return { ok: false, code: 'NOT_ALLOWED', message: 'Calls are only possible with your caregivers, patients or the responder of an active emergency.' };
  }
  if (media === 'audio' && ((await isDeafPatient(caller.userId)) || (await isDeafPatient(calleeId)))) {
    return { ok: false, code: 'VIDEO_ONLY', message: 'Calls with a Deaf patient are video only.' };
  }
  return { ok: true, emergencyId: await openEmergencyBetween(caller.userId, calleeId) };
};

const clearCall = (call: CallSession) => {
  if (call.ringTimer) clearTimeout(call.ringTimer);
  calls.delete(call.id);
};

const logCall = (call: CallSession, action: string, extra: Record<string, unknown> = {}) => {
  prisma.auditLog.create({
    data: {
      userId: call.callerId,
      action,
      entity: 'Call',
      entityId: call.id,
      newValues: {
        calleeId: call.calleeId,
        media: call.media,
        emergencyId: call.emergencyId,
        durationSeconds: call.answeredAt ? Math.round((Date.now() - call.answeredAt) / 1000) : 0,
        ringStartedAt: new Date(call.createdAt).toISOString(),
        answeredAt: call.answeredAt ? new Date(call.answeredAt).toISOString() : null,
        ...extra,
      },
    },
  }).catch((err) => logger.warn(`[Call] audit log failed for ${call.id}: ${err.message}`));
};

const finish = (call: CallSession, event: string, to: string[], reason: string, action: string) => {
  for (const userId of to) io?.to(userRoom(userId)).emit(event, { callId: call.id, reason });
  logCall(call, action, { reason });
  clearCall(call);
};

/** Ends every call tied to an emergency (resolved, cancelled or responder released). */
export const endCallsForEmergency = (emergencyId: string, reason = 'EMERGENCY_ENDED') => {
  for (const call of [...calls.values()]) {
    if (call.emergencyId === emergencyId) {
      finish(call, 'call:ended', [call.callerId, call.calleeId], reason, 'CALL_ENDED');
    }
  }
};

const callerSummary = async (userId: string) =>
  prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, role: true, profileImageUrl: true } });

const incomingPayload = async (call: CallSession) => ({
  callId: call.id,
  media: call.media,
  emergencyId: call.emergencyId,
  from: await callerSummary(call.callerId),
});

export const registerCallHandlers = (server: Server, socket: Socket) => {
  io = server;
  const user = socket.data.user as TokenPayload;
  const userId = user.userId;

  // App opened from the "incoming call" notification: deliver the call that is still ringing
  for (const call of calls.values()) {
    if (call.calleeId === userId && call.state === 'ringing') {
      incomingPayload(call).then((payload) => socket.emit('call:incoming', payload)).catch(() => undefined);
    }
  }

  socket.on('call:invite', async (data: any, ack: unknown) => {
    const reply = safeAck(ack);
    try {
      const calleeId = String(data?.toUserId || '');
      const media: CallMedia = data?.media === 'video' ? 'video' : 'audio';
      const permission = await checkCallPermission(user, calleeId, media);
      if (!permission.ok) {
        const denied = permission as Denied;
        return reply({ ok: false, code: denied.code, message: denied.message });
      }
      if (callOf(userId)) return reply({ ok: false, code: 'BUSY_SELF', message: 'You are already in a call.' });
      if (callOf(calleeId)) return reply({ ok: false, code: 'BUSY', message: 'The other person is on another call.' });

      const call: CallSession = {
        id: randomUUID(),
        callerId: userId,
        calleeId,
        media,
        emergencyId: permission.emergencyId,
        state: 'ringing',
        createdAt: Date.now(),
      };
      call.ringTimer = setTimeout(() => {
        if (calls.get(call.id)?.state === 'ringing') {
          finish(call, 'call:missed', [call.callerId, call.calleeId], 'NO_ANSWER', 'CALL_MISSED');
        }
      }, RING_TIMEOUT_MS);
      calls.set(call.id, call);

      const payload = await incomingPayload(call);
      io?.to(userRoom(calleeId)).emit('call:incoming', payload);
      // Store-and-forward push so a phone with the app in the background still rings
      sendNotification(calleeId, {
        type: NotificationType.CALL_INCOMING,
        title: media === 'video' ? 'Incoming video call' : 'Incoming call',
        body: `${payload.from?.fullName || 'Someone'} is calling you on MediFind`,
        channels: [NotificationChannel.PUSH],
        priority: 'high',
        data: { callId: call.id, callerId: userId, media },
      }).catch((err) => logger.warn(`[Call] push failed: ${err.message}`));

      logger.info(`[Call] ${call.id} ${media} ${userId} → ${calleeId}${call.emergencyId ? ` (emergency ${call.emergencyId})` : ''}`);
      reply({ ok: true, callId: call.id });
    } catch (err: any) {
      logger.error(`[Call] invite failed: ${err.message}`);
      reply({ ok: false, code: 'ERROR', message: 'Could not start the call.' });
    }
  });

  socket.on('call:accept', (data: any, ack: unknown) => {
    const reply = safeAck(ack);
    const call = calls.get(String(data?.callId || ''));
    if (!call || call.calleeId !== userId || call.state !== 'ringing') {
      return reply({ ok: false, code: 'GONE', message: 'This call is no longer available.' });
    }
    if (call.ringTimer) clearTimeout(call.ringTimer);
    call.state = 'active';
    call.answeredAt = Date.now();
    io?.to(userRoom(call.callerId)).emit('call:accepted', { callId: call.id });
    // Other devices of the callee stop ringing
    socket.to(userRoom(userId)).emit('call:cancelled', { callId: call.id, reason: 'ANSWERED_ELSEWHERE' });
    logCall(call, 'CALL_STARTED');
    reply({ ok: true });
  });

  socket.on('call:decline', (data: any) => {
    const call = calls.get(String(data?.callId || ''));
    if (call && call.calleeId === userId && call.state === 'ringing') {
      finish(call, 'call:declined', [call.callerId], 'DECLINED', 'CALL_DECLINED');
      io?.to(userRoom(userId)).emit('call:cancelled', { callId: call.id, reason: 'DECLINED' });
    }
  });

  socket.on('call:cancel', (data: any) => {
    const call = calls.get(String(data?.callId || ''));
    if (call && call.callerId === userId && call.state === 'ringing') {
      finish(call, 'call:cancelled', [call.calleeId], 'CANCELLED', 'CALL_CANCELLED');
    }
  });

  socket.on('call:end', (data: any) => {
    const call = calls.get(String(data?.callId || ''));
    if (call && isParticipant(call, userId)) {
      finish(call, 'call:ended', [otherParty(call, userId)], 'HANGUP', 'CALL_ENDED');
    }
  });

  // WebRTC offer / answer / ICE candidates, relayed only between the two participants
  socket.on('call:signal', (data: any) => {
    const call = calls.get(String(data?.callId || ''));
    if (!call || !isParticipant(call, userId) || call.state !== 'active') return;
    io?.to(userRoom(otherParty(call, userId))).emit('call:signal', { callId: call.id, signal: data?.signal });
  });

  socket.on('disconnect', () => {
    const call = callOf(userId);
    if (!call) return;
    // Give the app a moment to reconnect (network switch, screen change)
    setTimeout(async () => {
      const current = calls.get(call.id);
      if (!current) return;
      const sockets = await server.in(userRoom(userId)).fetchSockets();
      if (sockets.length > 0) return;
      if (current.state === 'ringing' && current.callerId === userId) {
        finish(current, 'call:cancelled', [current.calleeId], 'CALLER_OFFLINE', 'CALL_CANCELLED');
      } else if (current.state === 'active') {
        finish(current, 'call:ended', [otherParty(current, userId)], 'CONNECTION_LOST', 'CALL_ENDED');
      }
    }, DISCONNECT_GRACE_MS);
  });
};

/** STUN (and optional TURN from env) servers for the apps' RTCPeerConnection. */
export const getIceServers = () => {
  const servers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  ];
  if (process.env.TURN_URL) {
    servers.push({
      urls: process.env.TURN_URL.split(',').map((u) => u.trim()),
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  return servers;
};
