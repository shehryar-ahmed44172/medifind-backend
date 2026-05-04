import React, { useState, useEffect, useRef } from 'react';
import { Activity, MapPin, Clock, Phone, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const STATUS_STYLE = {
  ACTIVE:    { color: '#ef4444', bg: '#fee2e2', label: 'Active' },
  PENDING:   { color: '#f59e0b', bg: '#fef3c7', label: 'Pending' },
  RESOLVED:  { color: '#10b981', bg: '#d1fae5', label: 'Resolved' },
  CANCELLED: { color: '#6b7280', bg: '#f3f4f6', label: 'Cancelled' },
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)', letterSpacing: '-0.02em' }}>Live SOS Monitor</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b98115', color: '#10b981', padding: '0.375rem 1rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}
              />
              Live
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
            Real-time view of all emergency requests.
            {lastUpdated && <span style={{ marginLeft: '1rem', fontSize: '0.85rem' }}>Updated {timeAgo(lastUpdated)}</span>}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={fetchEmergencies}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', color: 'var(--secondary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
        >
          <RefreshCw size={16} /> Refresh
        </motion.button>
      </div>

      {/* Active Alert Banner */}
      {activeCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          style={{ padding: '1.25rem 1.75rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}
        >
          <AlertTriangle size={22} color="#ef4444" />
          <span style={{ fontWeight: 700, color: '#be123c', fontSize: '1rem' }}>
            {activeCount} active emergency{activeCount > 1 ? 'ies' : 'y'} requiring attention
          </span>
        </motion.div>
      )}

      {error && (
        <div style={{ padding: '1rem 1.5rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#be123c', marginBottom: '2rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {Array(4).fill(null).map((_, i) => (
            <div key={i} className="card" style={{ padding: '1.5rem', border: '1px solid var(--border)', height: '220px', background: '#f8fafc' }} />
          ))}
        </div>
      ) : emergencies.length === 0 ? (
        <div className="card" style={{ padding: '6rem', textAlign: 'center', border: '1px solid var(--border)' }}>
          <ShieldCheck size={64} color="#10b981" style={{ margin: '0 auto 2rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.5rem', color: '#10b981', marginBottom: '1rem' }}>All Clear</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>No active emergencies at this time. The system is scanning for signals.</p>
        </div>
      ) : (
        <AnimatePresence>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {emergencies.map((e, idx) => {
              const statusCfg = STATUS_STYLE[e.status] || STATUS_STYLE.ACTIVE;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="card"
                  style={{ padding: '1.75rem', border: '1px solid var(--border)', borderLeft: `4px solid ${statusCfg.color}` }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: statusCfg.color, fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <AlertTriangle size={16} />
                      {e.emergencyType || 'Medical'} Emergency
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <Clock size={13} /> {formatTime(e.createdAt)}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${statusCfg.color}15`, color: statusCfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                      {e.patient?.fullName?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.25rem' }}>{e.patient?.fullName || 'Anonymous Patient'}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Phone size={12} /> {e.patient?.phoneNumber || 'No contact'}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem 1rem', background: '#f8fafc', borderRadius: '12px', marginBottom: '1.25rem' }}>
                    <MapPin size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>Coordinates</strong>
                      <p style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {e.latitude?.toFixed(6)}, {e.longitude?.toFixed(6)}
                      </p>
                    </div>
                  </div>

                  {/* Status Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, padding: '0.375rem 0.875rem', borderRadius: '6px', background: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {e.emergencyRequests?.length || 0} responder{e.emergencyRequests?.length !== 1 ? 's' : ''} assigned
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
