import React, { useState, useEffect, useRef } from 'react';
import { Activity, MapPin, Clock, Phone, AlertTriangle, ShieldCheck, RefreshCw, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

// Uses CSS variables from index.css so colours adapt to light/dark theme automatically
const STATUS_STYLE = {
  ACTIVE:    { color: 'var(--s-active)',    bg: 'var(--s-active-bg)',    tint: 'var(--s-active-tint)',    label: 'Active'    },
  PENDING:   { color: 'var(--s-pending)',   bg: 'var(--s-pending-bg)',   tint: 'var(--s-pending-tint)',   label: 'Pending'   },
  ASSIGNED:  { color: 'var(--s-assigned)',  bg: 'var(--s-assigned-bg)',  tint: 'var(--s-assigned-tint)',  label: 'Assigned'  },
  RESOLVED:  { color: 'var(--s-resolved)',  bg: 'var(--s-resolved-bg)',  tint: 'var(--s-resolved-tint)',  label: 'Resolved'  },
  COMPLETED: { color: 'var(--s-resolved)',  bg: 'var(--s-resolved-bg)',  tint: 'var(--s-resolved-tint)',  label: 'Completed' },
  CANCELLED: { color: 'var(--s-cancelled)', bg: 'var(--s-cancelled-bg)', tint: 'var(--s-cancelled-tint)', label: 'Cancelled' },
};

const formatTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const SOSMonitor = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchEmergencies = async () => {
    try {
      const response = await api.get('/api/emergencies');
      if (response.data.success) {
        setEmergencies(response.data.data);
        setLastUpdated(new Date());
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch emergencies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
    intervalRef.current = setInterval(fetchEmergencies, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const activeCount = emergencies.filter(e => e.status === 'ACTIVE').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.375rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '-0.03em' }}>
              Live SOS Monitor
            </h1>
            {/* Live badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'var(--s-resolved-bg)', color: 'var(--s-resolved)',
              padding: '0.3rem 0.875rem', borderRadius: '100px',
              fontSize: '0.7rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--s-resolved)', flexShrink: 0 }}
              />
              Live
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Real-time view of all emergency requests.
            {lastUpdated && (
              <span style={{ marginLeft: '0.875rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Updated {timeAgo(lastUpdated)}
              </span>
            )}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={fetchEmergencies}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.375rem', borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-sub)', fontWeight: 700,
            cursor: 'pointer', fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
            transition: 'all 0.18s ease',
          }}
        >
          <RefreshCw size={15} /> Refresh
        </motion.button>
      </div>

      {/* ── Active Emergency Alert Banner ── */}
      {activeCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          style={{
            padding: '1.125rem 1.5rem',
            background: 'var(--error-bg)',
            border: '1px solid var(--error-border)',
            borderRadius: '14px',
            marginBottom: '1.75rem',
            display: 'flex', alignItems: 'center', gap: '0.875rem',
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--s-active)', flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: 'var(--error-fg)', fontSize: '0.95rem' }}>
            {activeCount} active emergency{activeCount > 1 ? 's' : ''} requiring immediate attention
          </span>
        </motion.div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          padding: '0.875rem 1.375rem',
          background: 'var(--error-bg)',
          border: '1px solid var(--error-border)',
          borderRadius: '12px',
          color: 'var(--error-fg)',
          marginBottom: '1.75rem',
          fontWeight: 600, fontSize: '0.9rem',
        }}>
          {error}
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {Array(4).fill(null).map((_, i) => (
            <div
              key={i}
              className="card"
              style={{
                padding: '1.5rem', border: '1px solid var(--border)',
                height: '220px', background: 'var(--surface-raised)',
                borderRadius: 'var(--radius-md)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>

      /* ── Empty State ── */
      ) : emergencies.length === 0 ? (
        <div className="card" style={{
          padding: '5rem 2rem', textAlign: 'center',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          background: 'var(--surface)',
        }}>
          <ShieldCheck size={56} style={{ margin: '0 auto 1.5rem', color: 'var(--s-resolved)', opacity: 0.7 }} />
          <h3 style={{ fontSize: '1.375rem', color: 'var(--s-resolved)', marginBottom: '0.75rem' }}>All Clear</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            No active emergencies at this time. The system is scanning for signals.
          </p>
        </div>

      /* ── Emergency Cards ── */
      ) : (
        <AnimatePresence>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
            {emergencies.map((e, idx) => {
              const s = STATUS_STYLE[e.status] || STATUS_STYLE.ACTIVE;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="card"
                  style={{
                    padding: '1.625rem',
                    border: '1px solid var(--border)',
                    borderLeft: `4px solid ${s.color}`,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface)',
                    transition: 'box-shadow 0.2s ease',
                  }}
                >
                  {/* Card header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      color: s.color, fontWeight: 800,
                      fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      <AlertTriangle size={14} />
                      {e.emergencyType || 'Medical'} Emergency
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      fontSize: '0.78rem', color: 'var(--text-muted)',
                    }}>
                      <Clock size={12} /> {formatTime(e.createdAt)}
                    </div>
                  </div>

                  {/* Patient info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.125rem' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '11px',
                      background: s.tint, color: s.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1rem', flexShrink: 0,
                    }}>
                      {e.patient?.fullName?.charAt(0) || <User size={18} />}
                    </div>
                    <div>
                      <h4 style={{
                        fontSize: '0.9rem', fontWeight: 700,
                        color: 'var(--text-sub)', marginBottom: '0.2rem',
                      }}>
                        {e.patient?.fullName || 'Anonymous Patient'}
                      </h4>
                      <p style={{
                        fontSize: '0.78rem', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                      }}>
                        <Phone size={11} /> {e.patient?.phoneNumber || 'No contact on file'}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                    padding: '0.75rem 0.875rem',
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px', marginBottom: '1.125rem',
                  }}>
                    <MapPin size={16} style={{ color: 'var(--s-active)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.2rem' }}>
                        GPS Coordinates
                      </strong>
                      <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {e.latitude?.toFixed(6)}, {e.longitude?.toFixed(6)}
                      </p>
                    </div>
                  </div>

                  {/* Status row */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderTop: '1px solid var(--border)', paddingTop: '1rem',
                  }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, padding: '0.3rem 0.75rem',
                      borderRadius: '6px', background: s.bg, color: s.color,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {s.label}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {e.emergencyRequests?.length || 0} responder{e.emergencyRequests?.length !== 1 ? 's' : ''} notified
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </motion.div>
  );
};

export default SOSMonitor;
