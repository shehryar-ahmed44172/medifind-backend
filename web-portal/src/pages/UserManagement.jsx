import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Trash2, ShieldOff, RefreshCw, User, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

const ROLE_MAP = { patients: 'PATIENT', responders: 'RESPONDER', caregivers: 'CAREGIVER' };

const STATUS_STYLE = {
  ACTIVE:    { color: '#10b981', bg: '#d1fae5' },
  INACTIVE:  { color: '#ef4444', bg: '#fee2e2' },
  VERIFIED:  { color: '#3182ce', bg: '#ebf8ff' },
  PENDING:   { color: '#f59e0b', bg: '#fef3c7' },
};

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('patients');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const role = ROLE_MAP[activeTab];
      const res = await api.get(`/api/admin/users?role=${role}`);
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchUsers();
    setSearch('');
  }, [fetchUsers]);

  const handleDeactivate = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to deactivate this user?`)) return;
    try {
      await api.patch(`/api/admin/users/${userId}/deactivate`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: false } : u));
      showToast('User deactivated successfully.');
    } catch {
      showToast('Failed to deactivate user.', 'error');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(`This will permanently delete the user. This action cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast('User deleted successfully.');
    } catch {
      showToast('Failed to delete user.', 'error');
    }
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phoneNumber?.toLowerCase().includes(q)
    );
  });

  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', top: '6rem', right: '2rem', zIndex: 9999,
            padding: '1rem 1.5rem', borderRadius: '14px', fontWeight: 700, fontSize: '0.9rem',
            background: toast.type === 'error' ? '#fff1f2' : '#d1fae5',
            color: toast.type === 'error' ? '#be123c' : '#065f46',
            border: `1px solid ${toast.type === 'error' ? '#fecdd3' : '#a7f3d0'}`,
            boxShadow: 'var(--shadow-diffused)',
          }}
        >
          {toast.msg}
        </motion.div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--secondary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>User Directory</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Manage all platform participants and their access levels.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={fetchUsers}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'white', color: 'var(--secondary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
        >
          <RefreshCw size={16} /> Refresh
        </motion.button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {/* Tab Bar + Search */}
        <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
          <div style={{ display: 'flex', gap: '2.5rem' }}>
            {['patients', 'responders', 'caregivers'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 0', fontWeight: 600, textTransform: 'capitalize',
                  color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                  background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '0.75rem 1rem 0.75rem 2.75rem', width: '280px', fontSize: '0.875rem', borderRadius: '10px', border: '1px solid var(--border)', background: '#f8fafc', fontFamily: 'var(--font-sans)', outline: 'none' }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '1rem 2rem', background: '#fff1f2', borderBottom: '1px solid #fecdd3', color: '#be123c', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              {['User', 'Phone', 'Status', 'Joined', 'Actions'].map((h, i) => (
                <th key={h} style={{ padding: '1.25rem 2rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(4).fill(null).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {Array(5).fill(null).map((__, j) => (
                    <td key={j} style={{ padding: '1.5rem 2rem' }}>
                      <div style={{ height: '16px', background: '#f1f5f9', borderRadius: '8px', animation: 'pulse 1.5s infinite' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <User size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1.5rem' }} />
                  <p style={{ fontWeight: 600 }}>No {activeTab} found</p>
                </td>
              </tr>
            ) : (
              filtered.map((user, idx) => {
                // Backend returns isActive:boolean — map to string key for the style map
                const statusKey = user.isActive === false ? 'INACTIVE' : 'ACTIVE';
                const statusStyle = STATUS_STYLE[statusKey];
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    style={{ borderBottom: '1px solid var(--border)', background: 'white' }}
                  >
                    <td style={{ padding: '1.25rem 2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                          {user.fullName?.[0] || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--secondary)' }}>{user.fullName || '—'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user.phoneNumber || '—'}</td>
                    <td style={{ padding: '1.25rem 2rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: '6px', background: statusStyle.bg, color: statusStyle.color }}>
                        {user.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 2rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>{formatDate(user.createdAt)}</td>
                    <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {user.isActive !== false && (
                          <motion.button
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeactivate(user.id)}
                            title="Deactivate user"
                            style={{ padding: '0.5rem', borderRadius: '8px', color: '#f59e0b', background: '#fef3c7', border: 'none', cursor: 'pointer' }}
                          >
                            <ShieldOff size={16} />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(user.id)}
                          title="Delete user"
                          style={{ padding: '0.5rem', borderRadius: '8px', color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>

        <div style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {loading ? 'Loading...' : `Showing ${filtered.length} of ${users.length} ${activeTab}`}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default UserManagement;
