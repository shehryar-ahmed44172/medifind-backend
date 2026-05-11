import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar, Shield,
  Activity, AlertTriangle, CheckCircle, XCircle, Clock,
  Heart, Zap, Crown, Star, EarOff, FileText, Lock,
  RefreshCw, Trash2, ShieldOff, ShieldCheck, Stethoscope,
  AlertCircle, TrendingUp, Users, ClipboardList, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { useAlert } from '../../context/AlertContext';

/* ─── Theme ─────────────────────────────────────────────────────────────── */
const C = {
  primary:  '#0C637E',
  accent:   '#2891C2',
  bg:       '#F3F7FA',
  card:     '#FFFFFF',
  border:   '#E4EEF3',
  text:     '#0F1A22',
  textSub:  '#3D5360',
  textMuted:'#7A96A3',
  red:      '#DC2626',
  green:    '#059669',
  amber:    '#D97706',
  purple:   '#7C3AED',
};

/* ─── Media URL resolver ─────────────────────────────────────────────────── */
const BACKEND_ORIGIN = import.meta.env.VITE_API_URL || '';
const resolveMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BACKEND_ORIGIN}${path}`;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDuration = (seconds) => {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
};

const EMERGENCY_STATUS_STYLE = {
  ACTIVE:    { label: 'Active',     color: C.amber,   bg: '#FEF3C7', Icon: Clock       },
  ASSIGNED:  { label: 'Assigned',   color: C.accent,  bg: '#E0F2FE', Icon: ShieldCheck },
  ARRIVED:   { label: 'Arrived',    color: C.purple,  bg: '#EDE9FE', Icon: CheckCircle },
  RESOLVED:  { label: 'Resolved',   color: C.green,   bg: '#D1FAE5', Icon: CheckCircle },
  COMPLETED: { label: 'Completed',  color: C.green,   bg: '#D1FAE5', Icon: CheckCircle },
  CANCELLED: { label: 'Cancelled',  color: C.red,     bg: '#FEE2E2', Icon: XCircle     },
};

const ER_REQUEST_STATUS = {
  PENDING:   { label: 'Notified',  color: C.amber, bg: '#FEF3C7' },
  ACCEPTED:  { label: 'Accepted',  color: C.green, bg: '#D1FAE5' },
  REJECTED:  { label: 'Rejected',  color: C.red,   bg: '#FEE2E2' },
  COMPLETED: { label: 'Completed', color: C.green, bg: '#D1FAE5' },
};

const PLAN_META = {
  FREE:         { label: 'Free',       color: '#64748B', bg: '#F1F5F9', Icon: Zap   },
  PROFESSIONAL: { label: 'Pro',        color: C.primary, bg: '#E2F0F3', Icon: Star  },
  EXECUTIVE:    { label: 'Enterprise', color: '#04364E', bg: '#C4DDE6', Icon: Crown },
};

const ROLE_META = {
  PATIENT:   { label: 'Patient',   color: C.accent,  bg: '#E0F2FE', Icon: User        },
  RESPONDER: { label: 'Responder', color: C.green,   bg: '#D1FAE5', Icon: ShieldCheck },
  CAREGIVER: { label: 'Caregiver', color: C.purple,  bg: '#EDE9FE', Icon: Users       },
  ADMIN:     { label: 'Admin',     color: '#991B1B', bg: '#FEE2E2', Icon: Shield      },
};

const TABS = [
  { key: 'overview',   label: 'Overview',          Icon: Info         },
  { key: 'history',    label: 'Emergency History',  Icon: Activity     },
  { key: 'medical',    label: 'Medical Profile',    Icon: Stethoscope  },
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12,
        background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={iconColor} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeading({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, color: C.textMuted,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      marginBottom: 12, marginTop: 4,
    }}>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <Icon size={15} color={C.textMuted} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 13.5, color: C.text, fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
      </div>
    </div>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 99, color, background: bg,
    }}>
      {label}
    </span>
  );
}

function TagList({ items, color, bg }) {
  if (!items?.length) return <span style={{ fontSize: 13, color: C.textMuted }}>None recorded</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item, i) => (
        <span key={i} style={{
          fontSize: 12, fontWeight: 600, padding: '4px 10px',
          borderRadius: 8, color, background: bg,
          border: `1px solid ${color}30`,
        }}>{item}</span>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function AdminUserProfile() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const { showAlert, showConfirm } = useAlert();

  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [tab,      setTab]      = useState('overview');
  const [actioning,setActioning]= useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/api/admin/users/${userId}`);
      if (res.data.success) setProfile(res.data.data);
      else setError(res.data.message || 'Failed to load profile');
    } catch {
      setError('Could not reach the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  /* ── Actions ──────────────────────────────────────────────────────────── */
  const handleToggleActive = async () => {
    const isActive = profile.isActive;
    const confirmed = await showConfirm({
      title:   isActive ? 'Deactivate Account' : 'Reactivate Account',
      message: isActive
        ? `This will prevent ${profile.fullName} from logging in.`
        : `This will restore ${profile.fullName}'s access.`,
      confirmLabel: isActive ? 'Deactivate' : 'Reactivate',
      danger: isActive,
    });
    if (!confirmed) return;
    setActioning(true);
    try {
      const endpoint = isActive ? 'deactivate' : 'activate';
      await api.patch(`/api/admin/users/${userId}/${endpoint}`);
      showAlert('success', isActive ? 'Account deactivated' : 'Account reactivated');
      load();
    } catch {
      showAlert('error', 'Action failed');
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm({
      title:   'Delete Account',
      message: `Permanently delete ${profile?.fullName}'s account and all their data? This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      danger: true,
    });
    if (!confirmed) return;
    setActioning(true);
    try {
      await api.delete(`/api/admin/users/${userId}`);
      showAlert('success', 'Account deleted');
      navigate('/admin/users');
    } catch {
      showAlert('error', 'Delete failed');
      setActioning(false);
    }
  };

  /* ── Render: loading / error ──────────────────────────────────────────── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 10 }}>
      <RefreshCw size={18} color={C.accent} className="spin" />
      <span style={{ color: C.textMuted, fontSize: 14 }}>Loading profile…</span>
    </div>
  );
  if (error || !profile) return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <AlertCircle size={32} color={C.red} />
      <div style={{ marginTop: 12, fontSize: 14, color: C.textMuted }}>{error || 'User not found'}</div>
      <button onClick={() => navigate('/admin/users')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', fontSize: 13 }}>
        ← Back to Users
      </button>
    </div>
  );

  const roleMeta   = ROLE_META[profile.role]   || ROLE_META.PATIENT;
  const planMeta   = PLAN_META[profile.subscriptionPlan] || PLAN_META.FREE;
  const initials   = profile.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const isPatient  = profile.role === 'PATIENT';
  const isResponder= profile.role === 'RESPONDER';
  const isCaregiver= profile.role === 'CAREGIVER';
  const stats      = profile.emergencyStats;
  const linkedPatients = profile.linkedPatients ?? [];

  /* visible tabs based on role */
  const visibleTabs = TABS.filter(t => {
    if (t.key === 'history') return isPatient || isResponder || isCaregiver;
    if (t.key === 'medical') return isPatient;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

      {/* ── Back nav ──────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate('/admin/users')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: C.textSub,
          padding: '6px 10px', borderRadius: 8,
        }}
      >
        <ArrowLeft size={15} /> Back to Users
      </button>

      {/* ── Profile header ────────────────────────────────────────────── */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 18, padding: '24px 28px',
        display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {profile.profileImageUrl ? (
            <img src={resolveMediaUrl(profile.profileImageUrl)} alt={profile.fullName}
              style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.border}` }} />
          ) : (
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0C637E, #2891C2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 800, color: '#fff',
            }}>{initials}</div>
          )}
          {/* Online dot */}
          <div style={{
            position: 'absolute', bottom: 3, right: 3,
            width: 14, height: 14, borderRadius: '50%',
            background: profile.isActive ? C.green : '#94A3B8',
            border: '2px solid white',
          }} />
        </div>

        {/* Name + badges */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text }}>{profile.fullName}</h1>
            <Badge label={roleMeta.label} color={roleMeta.color} bg={roleMeta.bg} />
            <Badge
              label={profile.isActive ? 'Active' : 'Inactive'}
              color={profile.isActive ? C.green : C.red}
              bg={profile.isActive ? '#D1FAE5' : '#FEE2E2'}
            />
            {profile.medicalProfile?.patientType === 'DEAF' && (
              <Badge label="Deaf / Mute" color={C.amber} bg="#FEF3C7" />
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Mail size={13} />{profile.email}
            </span>
            {profile.phoneNumber && (
              <span style={{ fontSize: 13, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={13} />{profile.phoneNumber}
              </span>
            )}
            <span style={{ fontSize: 13, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={13} />Joined {fmtDate(profile.createdAt)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleToggleActive}
            disabled={actioning}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.border}`,
              background: profile.isActive ? '#FEF3C7' : '#D1FAE5',
              color: profile.isActive ? C.amber : C.green,
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            {profile.isActive ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
            {profile.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
          <button
            onClick={handleDelete}
            disabled={actioning}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 10, border: `1px solid #FECACA`,
              background: '#FEF2F2', color: C.red,
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 20,
      }}>
        {isPatient && stats && (
          <>
            <StatCard icon={Activity}  iconColor={C.red}   iconBg="#FEE2E2" label="Total SOS Triggers"   value={stats.total}     />
            <StatCard icon={CheckCircle} iconColor={C.green} iconBg="#D1FAE5" label="Resolved / Completed" value={stats.resolved + stats.completed} />
            <StatCard icon={XCircle}   iconColor={C.red}   iconBg="#FEE2E2" label="Cancelled"             value={stats.cancelled} />
            <StatCard icon={Clock}     iconColor={C.amber} iconBg="#FEF3C7" label="Currently Active"      value={stats.active}    />
          </>
        )}
        {isResponder && profile.responder && (
          <>
            <StatCard icon={Activity}    iconColor={C.green}  iconBg="#D1FAE5" label="Total Responses"         value={profile.responder.totalResponsesHandled} />
            <StatCard icon={Clock}       iconColor={C.accent} iconBg="#E0F2FE" label="Avg Response Time"       value={fmtDuration(profile.responder.averageResponseTime)} />
            <StatCard icon={Star}        iconColor={C.amber}  iconBg="#FEF3C7" label="Rating"                  value={`${profile.responder.rating?.toFixed(1) ?? '—'} ★`} sub={`${profile.responder.totalRatings} ratings`} />
            <StatCard icon={ShieldCheck} iconColor={profile.responder.verificationStatus === 'VERIFIED' ? C.green : C.red} iconBg={profile.responder.verificationStatus === 'VERIFIED' ? '#D1FAE5' : '#FEE2E2'} label="Verification" value={profile.responder.verificationStatus} />
          </>
        )}
        {isCaregiver && (
          <>
            <StatCard
              icon={Users}
              iconColor={C.purple} iconBg="#EDE9FE"
              label="Linked Patients"
              value={linkedPatients.length}
              sub="total monitored"
            />
            <StatCard
              icon={CheckCircle}
              iconColor={C.green} iconBg="#D1FAE5"
              label="Active Patients"
              value={linkedPatients.filter(p => p.isActive !== false).length}
              sub="currently active"
            />
            <StatCard
              icon={Activity}
              iconColor={C.accent} iconBg="#E0F2FE"
              label="Emergencies Seen"
              value={profile.caregiverStats?.totalEmergenciesMonitored ?? linkedPatients.reduce((a, p) => a + (p._count?.emergencies ?? 0), 0)}
              sub="across all patients"
            />
          </>
        )}
        <StatCard icon={planMeta.Icon} iconColor={planMeta.color} iconBg={planMeta.bg} label="Subscription" value={planMeta.label} />
        <StatCard icon={ClipboardList} iconColor={C.textSub} iconBg="#F1F5F9" label="Audit Log Entries" value={profile.auditCount ?? 0} sub="system access records" />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${C.border}`, marginBottom: 20 }}>
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            color: tab === t.key ? C.primary : C.textMuted,
            borderBottom: tab === t.key ? `2px solid ${C.primary}` : '2px solid transparent',
            marginBottom: -2, transition: 'color 0.15s',
          }}>
            <t.Icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>

          {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>

              {/* Personal Information */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
                <SectionHeading>Personal Information</SectionHeading>
                <InfoRow icon={User}     label="Full Name"    value={profile.fullName} />
                <InfoRow icon={Mail}     label="Email"        value={profile.email} mono />
                <InfoRow icon={Phone}    label="Phone"        value={profile.phoneNumber} />
                <InfoRow icon={Calendar} label="Date of Birth" value={fmtDate(profile.dateOfBirth)} />
                <InfoRow icon={MapPin}   label="City"         value={profile.city} />
                <InfoRow icon={MapPin}   label="Address"      value={profile.address} />
                <InfoRow icon={FileText} label="CNIC"         value={profile.cnic} mono />
                {profile.role === 'RESPONDER' && (
                  <>
                    <InfoRow icon={Shield}      label="Organization"  value={profile.organization} />
                    <InfoRow icon={FileText}    label="License No."   value={profile.licenseNumber} mono />
                    <InfoRow icon={ShieldCheck} label="Responder Type" value={profile.responderType?.replace('_', ' ')} />
                    <InfoRow icon={Activity}    label="Vehicle Type"  value={profile.vehicleType} />
                  </>
                )}
              </div>

              {/* Account & Security */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
                <SectionHeading>Account & Security</SectionHeading>
                <InfoRow icon={Calendar}     label="Joined"              value={fmtDateTime(profile.createdAt)} />
                <InfoRow icon={Calendar}     label="Last Login"           value={fmtDateTime(profile.lastLogin || profile.lastLoginAt)} />
                <InfoRow icon={MapPin}       label="Last Login IP"        value={profile.lastLoginIp} mono />
                <InfoRow icon={AlertTriangle} label="Failed Login Attempts" value={profile.failedLoginAttempts ?? 0} />
                <InfoRow icon={CheckCircle}  label="Email Verified"       value={profile.isEmailVerified ? '✓ Verified' : '✗ Not Verified'} />
                <InfoRow icon={Lock}         label="Account Status"       value={profile.isActive ? 'Active' : 'Deactivated'} />
                {profile.accountLockedUntil && (
                  <InfoRow icon={Lock} label="Locked Until" value={fmtDateTime(profile.accountLockedUntil)} />
                )}
                <div style={{ marginTop: 14 }}>
                  <SectionHeading>Subscription</SectionHeading>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 13, fontWeight: 700, padding: '6px 14px',
                      borderRadius: 10, color: planMeta.color, background: planMeta.bg,
                    }}>
                      <planMeta.Icon size={14} />{planMeta.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Caregiver Monitoring Overview */}
              {isCaregiver && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px', gridColumn: 'span 2' }}>
                  <SectionHeading>Linked Patients</SectionHeading>
                  {linkedPatients.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: C.textMuted, fontSize: 13 }}>
                      No patients linked to this caregiver yet.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginTop: 4 }}>
                      {linkedPatients.map((p, i) => (
                        <div
                          key={p.id || i}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 14px', borderRadius: 12,
                            background: C.bg, border: `1px solid ${C.border}`,
                          }}
                        >
                          {/* Mini avatar */}
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, #0C637E, #2891C2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, fontWeight: 800, color: '#fff', overflow: 'hidden',
                          }}>
                            {p.profileImageUrl
                              ? <img src={resolveMediaUrl(p.profileImageUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : (p.fullName?.[0] || '?').toUpperCase()
                            }
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.fullName || '—'}
                            </div>
                            <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.email}
                            </div>
                          </div>
                          <span style={{
                            fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 99, flexShrink: 0,
                            color: p.isActive !== false ? C.green : C.red,
                            background: p.isActive !== false ? '#D1FAE5' : '#FEE2E2',
                          }}>
                            {p.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Responder Credentials */}
              {isResponder && profile.responder && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
                  <SectionHeading>Responder Details</SectionHeading>
                  <InfoRow icon={ShieldCheck} label="Verification Status" value={profile.responder.verificationStatus} />
                  <InfoRow icon={Activity}    label="Currently Available"  value={profile.responder.isAvailable ? 'Yes' : 'No'} />
                  <InfoRow icon={TrendingUp}  label="Total Handled"        value={profile.responder.totalResponsesHandled} />
                  <InfoRow icon={Clock}       label="Avg Response Time"    value={fmtDuration(profile.responder.averageResponseTime)} />
                  <InfoRow icon={Star}        label="Rating"               value={`${profile.responder.rating?.toFixed(2)} / 5.00`} />
                  {profile.responder.rejectionReason && (
                    <InfoRow icon={AlertTriangle} label="Rejection Reason" value={profile.responder.rejectionReason} />
                  )}
                  {profile.responder.specialization?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 8 }}>SPECIALIZATIONS</div>
                      <TagList items={profile.responder.specialization} color={C.green} bg="#D1FAE5" />
                    </div>
                  )}
                  {/* Credential images */}
                  {(profile.responder.cnicImageUrl || profile.responder.employeeCardImageUrl) && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginBottom: 10 }}>CREDENTIAL DOCUMENTS</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {[
                          { url: profile.responder.cnicImageUrl,        label: 'CNIC Front' },
                          { url: profile.responder.cnicBackImageUrl,     label: 'CNIC Back'  },
                          { url: profile.responder.employeeCardImageUrl, label: 'Employee Card' },
                        ].filter(d => d.url).map(doc => (
                          <a key={doc.label} href={resolveMediaUrl(doc.url)} target="_blank" rel="noopener noreferrer"
                            style={{
                              display: 'block', textDecoration: 'none',
                              border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden',
                              width: 110,
                            }}>
                            <img src={resolveMediaUrl(doc.url)} alt={doc.label} style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} />
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.textSub, padding: '5px 8px', textAlign: 'center' }}>{doc.label}</div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── HISTORY TAB ───────────────────────────────────────────── */}
          {tab === 'history' && (
            <div>
              {isPatient && (
                <>
                  {/* Stat chips */}
                  {stats && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
                      {[
                        { label: 'Total',     value: stats.total,                     color: C.accent,  bg: '#E0F2FE' },
                        { label: 'Resolved',  value: stats.resolved + stats.completed, color: C.green,   bg: '#D1FAE5' },
                        { label: 'Cancelled', value: stats.cancelled,                 color: C.red,     bg: '#FEE2E2' },
                        { label: 'Active',    value: stats.active,                    color: C.amber,   bg: '#FEF3C7' },
                      ].map(s => (
                        <div key={s.label} style={{
                          padding: '8px 16px', borderRadius: 10,
                          background: s.bg, color: s.color, fontWeight: 700, fontSize: 13,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ fontSize: 18, fontWeight: 900 }}>{s.value}</span>
                          <span>{s.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Emergency table */}
                  {!profile.emergencyHistory?.length ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted, fontSize: 14 }}>
                      No emergency records found.
                    </div>
                  ) : (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                          <thead>
                            <tr style={{ background: C.bg }}>
                              {['TYPE', 'STATUS', 'RESPONDER', 'TRIGGERED', 'RESOLVED', 'LOCATION'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', fontSize: 10.5, fontWeight: 800, color: C.textMuted, letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {profile.emergencyHistory.map((em, i) => {
                              const sm = EMERGENCY_STATUS_STYLE[em.status] || EMERGENCY_STATUS_STYLE.ACTIVE;
                              const accepted = em.emergencyRequests?.find(r => r.status === 'ACCEPTED');
                              return (
                                <tr key={em.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : '#FAFCFD' }}>
                                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: C.text }}>
                                    {em.emergencyType?.replace('_', ' ')}
                                  </td>
                                  <td style={{ padding: '13px 16px' }}>
                                    <Badge label={sm.label} color={sm.color} bg={sm.bg} />
                                  </td>
                                  <td style={{ padding: '13px 16px', fontSize: 13, color: C.textSub }}>
                                    {accepted?.responder?.user?.fullName || <span style={{ color: C.textMuted }}>—</span>}
                                  </td>
                                  <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
                                    {fmtDateTime(em.createdAt)}
                                  </td>
                                  <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
                                    {fmtDateTime(em.resolvedAt)}
                                  </td>
                                  <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted, fontFamily: 'monospace' }}>
                                    {em.latitude?.toFixed(4)}, {em.longitude?.toFixed(4)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {isCaregiver && (
                <div>
                  <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ padding: '6px 14px', borderRadius: 10, background: '#EDE9FE', color: C.purple, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 900 }}>{linkedPatients.length}</span>
                      <span>Linked Patients</span>
                    </div>
                    <div style={{ padding: '6px 14px', borderRadius: 10, background: '#D1FAE5', color: C.green, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 900 }}>{linkedPatients.filter(p => p.isActive !== false).length}</span>
                      <span>Active</span>
                    </div>
                  </div>

                  {!linkedPatients.length ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted, fontSize: 14 }}>
                      No linked patients found.
                    </div>
                  ) : (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                          <thead>
                            <tr style={{ background: C.bg }}>
                              {['PATIENT', 'EMAIL', 'PHONE', 'STATUS', 'LINKED SINCE'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', fontSize: 10.5, fontWeight: 800, color: C.textMuted, letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {linkedPatients.map((p, i) => (
                              <tr key={p.id || i} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : '#FAFCFD' }}>
                                <td style={{ padding: '13px 16px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                      background: 'linear-gradient(135deg, #0C637E, #2891C2)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 13, fontWeight: 800, color: '#fff',
                                    }}>
                                      {(p.fullName?.[0] || '?').toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.fullName || '—'}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted }}>{p.email || '—'}</td>
                                <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted }}>{p.phoneNumber || '—'}</td>
                                <td style={{ padding: '13px 16px' }}>
                                  <Badge
                                    label={p.isActive !== false ? 'Active' : 'Inactive'}
                                    color={p.isActive !== false ? C.green : C.red}
                                    bg={p.isActive !== false ? '#D1FAE5' : '#FEE2E2'}
                                  />
                                </td>
                                <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
                                  {fmtDate(p.linkedAt || p.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isResponder && (
                <>
                  {!profile.responderHistory?.length ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted, fontSize: 14 }}>
                      No response records found.
                    </div>
                  ) : (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                          <thead>
                            <tr style={{ background: C.bg }}>
                              {['PATIENT', 'EMERGENCY TYPE', 'STATUS', 'DISTANCE', 'DISPATCHED', 'RESPONDED'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', fontSize: 10.5, fontWeight: 800, color: C.textMuted, letterSpacing: '0.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {profile.responderHistory.map((rr, i) => {
                              const sm = ER_REQUEST_STATUS[rr.status] || ER_REQUEST_STATUS.PENDING;
                              return (
                                <tr key={rr.id} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? '#fff' : '#FAFCFD' }}>
                                  <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: C.text }}>
                                    {rr.emergency?.patient?.fullName || '—'}
                                  </td>
                                  <td style={{ padding: '13px 16px', fontSize: 13, color: C.textSub }}>
                                    {rr.emergency?.emergencyType?.replace('_', ' ') || '—'}
                                  </td>
                                  <td style={{ padding: '13px 16px' }}>
                                    <Badge label={sm.label} color={sm.color} bg={sm.bg} />
                                  </td>
                                  <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted }}>
                                    {rr.distanceKm ? `${rr.distanceKm.toFixed(1)} km` : '—'}
                                  </td>
                                  <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
                                    {fmtDateTime(rr.sentAt)}
                                  </td>
                                  <td style={{ padding: '13px 16px', fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
                                    {fmtDateTime(rr.acceptedAt || rr.rejectedAt)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── MEDICAL PROFILE TAB ───────────────────────────────────── */}
          {tab === 'medical' && (
            <div>
              {!profile.medicalProfile ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Heart size={32} color={C.textMuted} />
                  <div style={{ marginTop: 12, fontSize: 14, color: C.textMuted }}>No medical profile created yet.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* Core health */}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
                    <SectionHeading>Core Health Info</SectionHeading>
                    <InfoRow icon={Heart}    label="Blood Type"    value={profile.medicalProfile.bloodType || 'Not recorded'} />
                    <InfoRow icon={EarOff}   label="Patient Mode"  value={profile.medicalProfile.patientType === 'DEAF' ? 'Deaf & Mute Mode' : 'Standard Mode'} />
                    <InfoRow icon={FileText} label="Medical History" value={profile.medicalProfile.medicalHistory} />
                    <InfoRow icon={Calendar} label="Last Updated"  value={fmtDateTime(profile.medicalProfile.updatedAt)} />
                  </div>

                  {/* Allergies & conditions */}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
                    <SectionHeading>Allergies</SectionHeading>
                    <div style={{ marginBottom: 16 }}>
                      <TagList items={profile.medicalProfile.allergies} color={C.red} bg="#FEE2E2" />
                    </div>
                    <SectionHeading>Chronic Conditions</SectionHeading>
                    <TagList items={profile.medicalProfile.chronicDiseases} color={C.amber} bg="#FEF3C7" />
                  </div>

                  {/* Medications */}
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
                    <SectionHeading>Current Medications</SectionHeading>
                    <TagList items={profile.medicalProfile.medications} color={C.primary} bg="#E2F0F3" />
                    <div style={{ marginTop: 16 }}>
                      <SectionHeading>Disabilities</SectionHeading>
                      <TagList items={profile.medicalProfile.disabilities} color={C.purple} bg="#EDE9FE" />
                    </div>
                  </div>

                  {/* Emergency contacts */}
                  {profile.medicalProfile.emergencyContacts?.length > 0 && (
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
                      <SectionHeading>Emergency Contacts</SectionHeading>
                      {profile.medicalProfile.emergencyContacts.map((ec, i) => (
                        <div key={i} style={{ padding: '10px 0', borderBottom: i < profile.medicalProfile.emergencyContacts.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{ec.name || '—'}</div>
                          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{ec.relationship} · {ec.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
