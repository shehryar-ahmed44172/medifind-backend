import React, { useState } from 'react';
import { Mail, MessageSquare, Bell, Search, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_COMMS = [
  { id: 1, type: 'EMAIL', recipient: 'sara.malik@gmail.com', subject: 'Welcome to MediFind', status: 'DELIVERED', sentAt: new Date(Date.now() - 2 * 3600000).toISOString(), channel: 'Registration' },
  { id: 2, type: 'PUSH', recipient: 'Patient #P-1098', subject: 'Responder is 2 min away', status: 'DELIVERED', sentAt: new Date(Date.now() - 3 * 3600000).toISOString(), channel: 'SOS Alert' },
  { id: 3, type: 'PUSH', recipient: 'Responder #R-0241', subject: 'New SOS nearby — 0.4 km', status: 'DELIVERED', sentAt: new Date(Date.now() - 3 * 3600000 - 30000).toISOString(), channel: 'SOS Alert' },
  { id: 4, type: 'EMAIL', recipient: 'ahmed.k@rescue1122.pk', subject: 'Account Verified — Welcome to the Network', status: 'DELIVERED', sentAt: new Date(Date.now() - 6 * 3600000).toISOString(), channel: 'Verification' },
  { id: 5, type: 'EMAIL', recipient: 'unknown@badomain.x', subject: 'Email Verification', status: 'FAILED', sentAt: new Date(Date.now() - 8 * 3600000).toISOString(), channel: 'Registration' },
  { id: 6, type: 'PUSH', recipient: 'Caregiver #C-0087', subject: 'Your family member triggered an SOS', status: 'DELIVERED', sentAt: new Date(Date.now() - 9 * 3600000).toISOString(), channel: 'SOS Alert' },
  { id: 7, type: 'PUSH', recipient: 'Patient #P-2201', subject: 'Invitation from Caregiver accepted', status: 'DELIVERED', sentAt: new Date(Date.now() - 12 * 3600000).toISOString(), channel: 'Caregiver' },
  { id: 8, type: 'EMAIL', recipient: 'admin@medifind.pk', subject: 'Daily System Health Report', status: 'DELIVERED', sentAt: new Date(Date.now() - 24 * 3600000).toISOString(), channel: 'System' },
  { id: 9, type: 'PUSH', recipient: 'Patient #P-3310', subject: 'Your SOS has been resolved', status: 'PENDING', sentAt: new Date(Date.now() - 25 * 3600000).toISOString(), channel: 'SOS Alert' },
  { id: 10, type: 'EMAIL', recipient: 'dr.zara@medinet.pk', subject: 'Application Under Review', status: 'DELIVERED', sentAt: new Date(Date.now() - 30 * 3600000).toISOString(), channel: 'Verification' },
];

const STATUS_CONFIG = {
  DELIVERED: { color: '#10b981', bg: '#d1fae5', icon: CheckCircle },
  PENDING:   { color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  FAILED:    { color: '#ef4444', bg: '#fee2e2', icon: XCircle },
};

const TYPE_CONFIG = {
  EMAIL: { color: 'var(--primary)', bg: '#ebf8ff', icon: Mail },
  PUSH:  { color: '#8b5cf6', bg: '#ede9fe', icon: Bell },
  SMS:   { color: '#10b981', bg: '#d1fae5', icon: MessageSquare },
};

const formatTime = (iso) =>
  new Date(iso).toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

const CommunicationAudit = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = MOCK_COMMS.filter((c) => {
    const matchType = typeFilter === 'ALL' || c.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchSearch = !search ||
      c.recipient.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.channel.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  const summary = {
    total: MOCK_COMMS.length,
    delivered: MOCK_COMMS.filter(c => c.status === 'DELIVERED').length,
    failed: MOCK_COMMS.filter(c => c.status === 'FAILED').length,
    pending: MOCK_COMMS.filter(c => c.status === 'PENDING').length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Communication Audit</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Full audit trail of every email and push notification sent by the system.</p>
      </div>

      {/* Demo data notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.875rem', color: '#92400e' }}>
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <span><strong>Demo data</strong> — This page displays sample records. A live notification-log API endpoint will be connected in the next release.</span>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Total Sent', value: summary.total, color: 'var(--primary)', bg: '#ebf8ff' },
          { label: 'Delivered', value: summary.delivered, color: '#10b981', bg: '#d1fae5' },
          { label: 'Pending', value: summary.pending, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'Failed', value: summary.failed, color: '#ef4444', bg: '#fee2e2' },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card"
            style={{ padding: '1.75rem 2rem', border: '1px solid var(--border)' }}
          >
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{card.label}</p>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: card.color }}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '1.25rem 2rem', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {['ALL', 'EMAIL', 'PUSH'].map((t) => {
            const cfg = TYPE_CONFIG[t];
            const active = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', border: active ? 'none' : '1px solid var(--border)', background: active ? (cfg?.bg || 'var(--secondary)') : 'white', color: active ? (cfg?.color || 'white') : 'var(--text-muted)', cursor: 'pointer' }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          {['ALL', 'DELIVERED', 'PENDING', 'FAILED'].map((s) => {
            const cfg = STATUS_CONFIG[s];
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{ padding: '0.5rem 1.25rem', borderRadius: '100px', fontWeight: 700, fontSize: '0.8rem', border: active ? 'none' : '1px solid var(--border)', background: active ? (cfg?.bg || '#f1f5f9') : 'white', color: active ? (cfg?.color || 'var(--secondary)') : 'var(--text-muted)', cursor: 'pointer' }}
              >
                {s}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search communications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '0.75rem 1rem 0.75rem 2.75rem', width: '260px', fontSize: '0.875rem', borderRadius: '10px', border: '1px solid var(--border)', background: '#f8fafc', fontFamily: 'var(--font-sans)', outline: 'none' }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              {['Channel', 'Type', 'Recipient', 'Subject', 'Status', 'Sent At'].map((h) => (
                <th key={h} style={{ padding: '1.25rem 1.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No communications match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((comm, idx) => {
                const typeCfg = TYPE_CONFIG[comm.type] || TYPE_CONFIG.EMAIL;
                const statusCfg = STATUS_CONFIG[comm.status] || STATUS_CONFIG.DELIVERED;
                const TypeIcon = typeCfg.icon;
                const StatusIcon = statusCfg.icon;
                return (
                  <motion.tr
                    key={comm.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{ borderBottom: '1px solid var(--border)', background: 'white' }}
                  >
                    <td style={{ padding: '1rem 1.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#f1f5f9', color: 'var(--primary)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>{comm.channel}</span>
                    </td>
                    <td style={{ padding: '1rem 1.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: typeCfg.color }}>
                        <TypeIcon size={16} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{comm.type}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.75rem', fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 600 }}>{comm.recipient}</td>
                    <td style={{ padding: '1rem 1.75rem', fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '250px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comm.subject}</div>
                    </td>
                    <td style={{ padding: '1rem 1.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: statusCfg.color }}>
                        <StatusIcon size={15} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{comm.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatTime(comm.sentAt)}</td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
        <div style={{ padding: '1rem 1.75rem', background: '#f8fafc', borderTop: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          Showing {filtered.length} of {MOCK_COMMS.length} communications
        </div>
      </div>
    </motion.div>
  );
};

export default CommunicationAudit;
