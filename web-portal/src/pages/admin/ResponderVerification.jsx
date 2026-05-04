import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, ExternalLink, Check, X, FileText, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const ChevronRight = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const ResponderVerification = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponder, setSelectedResponder] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPending = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/admin/responders/pending');
      if (response.data.success) {
        setPending(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load pending responders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (id, action, reason = '') => {
    setProcessingId(id);
    try {
      const response = await api.post(`/api/admin/responders/${id}/verify`, { action, reason });
      if (response.data.success) {
        setPending(pending.filter(r => r.userId !== id));
        setSelectedResponder(null);
        showToast(action === 'VERIFY' ? 'Responder approved and activated.' : 'Application rejected.');
      }
    } catch {
      showToast('Failed to process verification.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', top: '6rem', right: '2rem', zIndex: 9999,
            padding: '1rem 1.5rem', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem',
            background: toast.type === 'error' ? '#fff1f2' : '#d1fae5',
            color: toast.type === 'error' ? '#be123c' : '#065f46',
            border: `1px solid ${toast.type === 'error' ? '#fecdd3' : '#a7f3d0'}`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          }}
        >
          {toast.msg}
        </motion.div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Verification Queue</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Audit and approve healthcare professionals joining the network.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={fetchPending}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', color: 'var(--secondary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
        >
          <RefreshCw size={16} /> Refresh
        </motion.button>
      </div>

      {error && (
        <div style={{ padding: '1rem 1.5rem', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', color: '#be123c', marginBottom: '2rem', fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '2rem', height: 'calc(100vh - 280px)' }}>
        {/* Left: List */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)' }}>
          <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
              Pending <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.625rem', borderRadius: '100px', fontSize: '0.78rem', marginLeft: '0.5rem' }}>{pending.length}</span>
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              Array(3).fill(null).map((_, i) => (
                <div key={i} style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f1f5f9' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '14px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '8px', width: '70%' }} />
                    <div style={{ height: '12px', background: '#f1f5f9', borderRadius: '6px', width: '50%' }} />
                  </div>
                </div>
              ))
            ) : pending.length === 0 ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <UserCheck size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1.5rem' }} />
                <p style={{ fontWeight: 600 }}>No pending applications</p>
              </div>
            ) : (
              pending.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedResponder(r)}
                  style={{
                    padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: selectedResponder?.userId === r.userId ? '#ebf8ff' : 'white',
                    borderLeft: selectedResponder?.userId === r.userId ? '4px solid var(--primary)' : '4px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#e2e8f0', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}>
                    {r.user?.fullName?.charAt(0) || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--secondary)', marginBottom: '0.25rem' }}>{r.user?.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.responderType} · {r.organization || 'Independent'}</div>
                  </div>
                  <ChevronRight size={16} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Detail */}
        <div className="card" style={{ border: '1px solid var(--border)', overflow: 'auto' }}>
          {selectedResponder ? (
            <div style={{ padding: '2.5rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: '80px', height: '80px', background: 'var(--primary)', color: 'white', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, flexShrink: 0 }}>
                  {selectedResponder.user?.fullName?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{selectedResponder.user?.fullName}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    {selectedResponder.user?.email} · {selectedResponder.user?.phoneNumber || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', flex: 1 }}>
                <div>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.5rem' }}>Professional Credentials</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {[
                      { label: 'License Number', value: selectedResponder.licenseNumber || '—' },
                      { label: 'Responder Type', value: selectedResponder.responderType || '—' },
                      { label: 'Specialization', value: selectedResponder.specialization?.join(', ') || 'General' },
                      { label: 'Vehicle Type', value: selectedResponder.vehicleType || 'Not specified' },
                      { label: 'Organization', value: selectedResponder.organization || 'Independent' },
                    ].map((item) => (
                      <div key={item.label}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{item.label}</span>
                        <strong style={{ fontSize: '1rem', color: 'var(--secondary)' }}>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.5rem' }}>Identity Verification</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button style={{ width: '100%', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', textAlign: 'left' }}>
                      <FileText size={18} />
                      <span style={{ flex: 1 }}>CNIC Copy (Front / Back)</span>
                      <ExternalLink size={14} color="var(--text-muted)" />
                    </button>
                    <button style={{ width: '100%', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', textAlign: 'left' }}>
                      <Shield size={18} />
                      <span style={{ flex: 1 }}>Employee / License Card</span>
                      <ExternalLink size={14} color="var(--text-muted)" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', marginTop: '2rem' }}>
                <button
                  disabled={!!processingId}
                  onClick={() => handleAction(selectedResponder.userId, 'REJECT', 'Incomplete documentation')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: 'white', border: '2px solid #ef4444', color: '#ef4444', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: processingId ? 0.6 : 1 }}
                >
                  <X size={20} /> Reject Application
                </button>
                <button
                  disabled={!!processingId}
                  onClick={() => handleAction(selectedResponder.userId, 'VERIFY')}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: processingId ? 0.6 : 1 }}
                >
                  <Check size={20} /> {processingId ? 'Processing...' : 'Approve Responder'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <UserCheck size={72} style={{ opacity: 0.12, marginBottom: '2rem' }} />
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--secondary)' }}>Select an Application</h3>
              <p style={{ maxWidth: '300px', lineHeight: 1.7 }}>Choose a responder from the list to review their credentials and take action.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ResponderVerification;
