import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, ExternalLink, Check, X, FileText, RefreshCw, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { resolveFileUrl } from '../../utils/resolveFileUrl';

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
      if (response.data.success) setPending(response.data.data);
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

  const docCard = (label, url) => (
    <div style={{ marginBottom: '0.75rem' }}>
      <span style={{
        display: 'block', fontSize: '0.72rem', fontWeight: 700,
        color: 'var(--text-muted)', textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: '0.4rem',
      }}>
        {label}
      </span>
      {url ? (
        <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img
            src={url}
            alt={label}
            style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block', background: 'var(--surface-raised)' }}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          {/* Fallback if image fails to load */}
          <div style={{
            display: 'none', height: '110px', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: '6px',
            background: 'var(--surface-raised)', color: 'var(--text-muted)',
            fontSize: '0.78rem', fontWeight: 600,
          }}>
            <FileText size={22} style={{ opacity: 0.4 }} />
            <span>Cannot display</span>
          </div>
          <button
            onClick={() => window.open(url, '_blank')}
            style={{
              position: 'absolute', bottom: '6px', right: '6px',
              background: 'rgba(0,0,0,0.6)', color: 'white',
              border: 'none', borderRadius: '6px',
              padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
            }}
          >
            <ExternalLink size={11} /> Open
          </button>
        </div>
      ) : (
        <div style={{
          height: '110px', borderRadius: '10px',
          border: '1.5px dashed var(--border)',
          background: 'var(--surface-raised)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: '6px',
          color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600,
        }}>
          <FileText size={20} style={{ opacity: 0.3 }} />
          Not Uploaded
        </div>
      )}
    </div>
  );

  const docBtn = (label, url, Icon) => (
    <button
      onClick={() => url && window.open(url, '_blank')}
      disabled={!url}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.875rem 1.125rem', borderRadius: '12px',
        border: '1px solid var(--border)',
        background: url ? 'var(--surface)' : 'var(--surface-raised)',
        color: url ? 'var(--text-sub)' : 'var(--text-muted)',
        cursor: url ? 'pointer' : 'not-allowed',
        width: '100%', textAlign: 'left',
        transition: 'all 0.2s ease',
        opacity: url ? 1 : 0.6,
        fontFamily: 'inherit'
      }}
    >
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: url ? 'var(--primary-pale)' : 'var(--surface-raised)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: url ? 'var(--primary)' : 'var(--text-muted)',
        flexShrink: 0
      }}>
        <Icon size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '2px', color: 'var(--text-sub)' }}>{label}</p>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {url ? 'Click to view document' : 'Not provided'}
        </p>
      </div>
      {url && <ExternalLink size={14} style={{ opacity: 0.5 }} />}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── Toast ── */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', top: '5.5rem', right: '2rem', zIndex: 9999,
            padding: '0.875rem 1.375rem', borderRadius: '14px',
            fontWeight: 700, fontSize: '0.9rem',
            background: toast.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
            color: toast.type === 'error' ? 'var(--error-fg)' : 'var(--success-fg)',
            border: `1px solid ${toast.type === 'error' ? 'var(--error-border)' : 'var(--success-border)'}`,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {toast.msg}
        </motion.div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-sub)', letterSpacing: '-0.03em', marginBottom: '0.375rem' }}>
            Verification Queue
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Audit and approve healthcare professionals joining the network.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={fetchPending}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.375rem', borderRadius: '12px',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-sub)', fontWeight: 700,
            cursor: 'pointer', fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <RefreshCw size={15} /> Refresh
        </motion.button>
      </div>

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

      {/* ── Split Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', height: 'calc(100vh - 260px)' }}>

        {/* ── Left: Pending List ── */}
        <div className="card" style={{
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
          background: 'var(--surface)',
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              Pending
              <span style={{
                background: 'var(--s-pending-bg)', color: 'var(--s-pending)',
                padding: '0.15rem 0.6rem', borderRadius: '100px',
                fontSize: '0.75rem', fontWeight: 800,
              }}>
                {pending.length}
              </span>
            </h3>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              Array(4).fill(null).map((_, i) => (
                <div key={i} style={{
                  padding: '1.125rem 1.5rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', gap: '0.875rem', alignItems: 'center',
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-raised)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '13px', background: 'var(--surface-raised)', borderRadius: '6px', marginBottom: '7px', width: '65%' }} />
                    <div style={{ height: '11px', background: 'var(--surface-raised)', borderRadius: '6px', width: '45%' }} />
                  </div>
                </div>
              ))
            ) : pending.length === 0 ? (
              <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <UserCheck size={44} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1.25rem' }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>No pending applications</p>
              </div>
            ) : (
              pending.map((r) => {
                const isSelected = selectedResponder?.userId === r.userId;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedResponder(r)}
                    style={{
                      padding: '1.125rem 1.5rem',
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: isSelected ? 'var(--primary-pale)' : 'transparent',
                      borderLeft: `3px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: isSelected ? 'var(--primary)' : 'var(--surface-raised)',
                      color: isSelected ? 'white' : 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1rem', flexShrink: 0,
                      transition: 'all 0.18s ease',
                    }}>
                      {r.user?.fullName?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-sub)', marginBottom: '0.2rem' }}>
                        {r.user?.fullName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {r.responderType} · {r.organization || 'Independent'}
                      </div>
                    </div>
                    <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Detail Panel ── */}
        <div className="card" style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'auto',
          background: 'var(--surface)',
        }}>
          {selectedResponder ? (
            <div style={{ padding: '2.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1.75rem',
                marginBottom: '2.25rem', paddingBottom: '2rem',
                borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: '72px', height: '72px',
                  background: 'linear-gradient(135deg, var(--grad-start), var(--grad-end))',
                  color: 'white', borderRadius: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.875rem', fontWeight: 800, flexShrink: 0,
                }}>
                  {selectedResponder.user?.fullName?.charAt(0) || '?'}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.375rem', color: 'var(--text-sub)', letterSpacing: '-0.03em' }}>
                    {selectedResponder.user?.fullName}
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {selectedResponder.user?.email} · {selectedResponder.user?.phoneNumber || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', flex: 1 }}>
                <div>
                  <p style={{
                    fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.25rem',
                  }}>
                    Professional Credentials
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                    {[
                      { label: 'License Number', value: selectedResponder.licenseNumber || '—' },
                      { label: 'Responder Type', value: selectedResponder.responderType || '—' },
                      { label: 'Specialization', value: selectedResponder.specialization?.join(', ') || 'General' },
                      { label: 'Vehicle Type', value: selectedResponder.vehicleType || 'Not specified' },
                      { label: 'Organization', value: selectedResponder.organization || 'Independent' },
                    ].map((item) => (
                      <div key={item.label}>
                        <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                          {item.label}
                        </span>
                        <strong style={{ fontSize: '0.95rem', color: 'var(--text-sub)' }}>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p style={{
                    fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: 'var(--text-muted)', fontWeight: 700, marginBottom: '1.25rem',
                  }}>
                    Identity Documents
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {docBtn('CNIC Front', resolveFileUrl(selectedResponder.cnicImageUrl), FileText)}
                    {docBtn('CNIC Back', resolveFileUrl(selectedResponder.cnicBackImageUrl), FileText)}
                    {docBtn('Professional ID / Card', resolveFileUrl(selectedResponder.employeeCardImageUrl), Shield)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex', gap: '1.25rem',
                paddingTop: '2rem', borderTop: '1px solid var(--border)', marginTop: '2rem',
              }}>
                <button
                  disabled={!!processingId}
                  onClick={() => handleAction(selectedResponder.userId, 'REJECT', 'Incomplete documentation')}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.625rem', padding: '0.9rem',
                    background: 'var(--error-bg)',
                    border: '1px solid var(--error-border)',
                    color: 'var(--error-fg)',
                    borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem',
                    cursor: processingId ? 'not-allowed' : 'pointer',
                    opacity: processingId ? 0.6 : 1,
                    fontFamily: 'var(--font-sans)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <X size={18} /> Reject
                </button>
                <button
                  disabled={!!processingId}
                  onClick={() => handleAction(selectedResponder.userId, 'VERIFY')}
                  style={{
                    flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.625rem', padding: '0.9rem',
                    background: 'linear-gradient(135deg, var(--grad-start), var(--grad-end))',
                    color: 'white', border: 'none',
                    borderRadius: '14px', fontWeight: 700, fontSize: '0.95rem',
                    cursor: processingId ? 'not-allowed' : 'pointer',
                    opacity: processingId ? 0.7 : 1,
                    fontFamily: 'var(--font-sans)',
                    boxShadow: processingId ? 'none' : '0 4px 16px rgba(12,99,126,0.30)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Check size={18} /> {processingId ? 'Processing…' : 'Approve Responder'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', padding: '4rem',
              color: 'var(--text-muted)',
            }}>
              <UserCheck size={64} style={{ opacity: 0.10, marginBottom: '2rem', color: 'var(--primary)' }} />
              <h3 style={{ fontSize: '1.375rem', marginBottom: '0.75rem', color: 'var(--text-sub)' }}>
                Select an Application
              </h3>
              <p style={{ maxWidth: '280px', lineHeight: 1.7, fontSize: '0.95rem' }}>
                Choose a responder from the list to review their credentials and make a decision.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ResponderVerification;
