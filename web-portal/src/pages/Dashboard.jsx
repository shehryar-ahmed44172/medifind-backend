import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Users, UserCheck, Activity, History, Mail,
  LogOut, Bell, Search, Zap, AlertTriangle, CreditCard,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Shield, Clock, ArrowRight, PanelLeftClose, PanelLeftOpen,
  Circle, Settings, CheckCircle, XCircle, EarOff, RefreshCw,
  Send, LayoutDashboard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import api from '../services/api';
import { io } from 'socket.io-client';
import UserManagement from './UserManagement';
import AdminUserProfile from './admin/AdminUserProfile';
import ResponderVerification from './admin/ResponderVerification';
import SOSMonitor from './admin/SOSMonitor';
import SystemLogs from './admin/SystemLogs';
import CommunicationAudit from './admin/CommunicationAudit';
import SubscriptionManagement from './admin/SubscriptionManagement';
import PlatformSettings from './admin/PlatformSettings';
import SystemNotifications from './admin/SystemNotifications';
import AdminInbox from './admin/AdminInbox';
import logo from '../assets/Medifind_New_Logo-removebg-preview.png';

/* ─── Theme ────────────────────────────────────────────────────────────── */
const C = {
  sidebarBg: 'linear-gradient(175deg,#03293C 0%,#0A5570 55%,#0E6E82 100%)',
  accent: '#2891C2',
  accentHover: '#1e7aab',
  border: '#E4EEF3',
  bg: '#F3F7FA',
  white: '#FFFFFF',
  textMain: '#0F1A22',
  textSub: '#3D5360',
  textMuted: '#7A96A3',
};

/* ─── Nav items ─────────────────────────────────────────────────────────── */
const NAV = [
  { label: 'Overview', to: '/admin', Icon: BarChart3, exact: true },
  { label: 'User Management', to: '/admin/users', Icon: Users },
  { label: 'Verification Queue', to: '/admin/verify', Icon: UserCheck },
  { label: 'SOS Logistics', to: '/admin/sos', Icon: Activity },
  { label: 'Subscriptions', to: '/admin/subscriptions', Icon: CreditCard },
  { label: 'System Logs', to: '/admin/logs', Icon: History },
  { label: 'Comm Audit', to: '/admin/emails', Icon: Mail },
  { label: 'Notifications', to: '/admin/notifications', Icon: Bell },
  { label: 'Admin Inbox', to: '/admin/inbox', Icon: Mail },
  { label: 'Platform Settings', to: '/admin/settings', Icon: Settings },
];

/* ─── Sidebar ───────────────────────────────────────────────────────────── */
function Sidebar({ open, onToggle, onLogout }) {
  const { pathname } = useLocation();
  const W = open ? 248 : 68;

  const active = (item) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <motion.aside
      animate={{ width: W }}
      initial={false}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      style={{
        position: 'fixed', top: 0, left: 0, height: '100vh',
        background: C.sidebarBg,
        display: 'flex', flexDirection: 'column',
        zIndex: 200, overflow: 'hidden',
        boxShadow: '2px 0 20px rgba(3,41,60,0.22)',
        flexShrink: 0,
      }}
    >
      {/* ── Logo + toggle row ── */}
      <div style={{
        height: '95px',
        display: 'flex', alignItems: 'center',
        justifyContent: open ? 'space-between' : 'center',
        padding: open ? '0 14px 0 16px' : '0',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        {open && (
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src={logo} alt="MediFind"
              style={{
                height: '75px', objectFit: 'contain',
                filter: 'brightness(1.15) drop-shadow(0 1px 6px rgba(0,0,0,0.35))',
                cursor: 'pointer'
              }}
            />
          </Link>
        )}
        {/* collapse / expand toggle */}
        <button
          onClick={onToggle}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          style={{
            width: '32px', height: '32px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          {open ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav style={{
        flex: 1, padding: open ? '16px 10px' : '16px 8px',
        display: 'flex', flexDirection: 'column', gap: '2px',
        overflow: 'hidden',            /* never scroll */
      }}>
        {open && (
          <p style={{
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)',
            padding: '0 8px', marginBottom: '8px',
          }}>Management</p>
        )}

        {NAV.map((item) => {
          const on = active(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={!open ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: open ? '10px' : '0',
                justifyContent: open ? 'flex-start' : 'center',
                padding: open ? '10px 12px' : '11px 0',
                borderRadius: '12px',
                background: on ? 'rgba(255,255,255,0.13)' : 'transparent',
                color: on ? '#FFFFFF' : 'rgba(255,255,255,0.48)',
                fontWeight: on ? 700 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.15s',
                textDecoration: 'none',
                whiteSpace: 'nowrap', overflow: 'hidden',
                position: 'relative',
                borderLeft: on && open ? '3px solid #FF6B6B' : '3px solid transparent',
              }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.48)'; } }}
            >
              <item.Icon size={18} strokeWidth={on ? 2.5 : 2} style={{ flexShrink: 0 }} />
              {open && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{
        padding: open ? '12px 10px 16px' : '12px 8px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {/* Integrity bar — only when open */}
        {open && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '10px 12px', marginBottom: '10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>System Integrity</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4ade80' }}>98.2%</span>
            </div>
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: '98.2%', background: 'linear-gradient(90deg,#2891C2,#4ade80)', borderRadius: '2px' }} />
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={onLogout}
          title={!open ? 'Sign Out' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: open ? '9px' : '0',
            justifyContent: open ? 'flex-start' : 'center',
            width: '100%', padding: open ? '10px 12px' : '11px 0',
            borderRadius: '12px',
            background: 'rgba(255,100,100,0.08)',
            border: '1px solid rgba(255,100,100,0.15)',
            color: '#ff8585', fontWeight: 700, fontSize: '0.875rem',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,100,100,0.18)'; e.currentTarget.style.color = '#ff6b6b'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,100,100,0.08)'; e.currentTarget.style.color = '#ff8585'; }}
        >
          <LogOut size={17} style={{ flexShrink: 0 }} />
          {open && 'Sign Out'}
        </button>
      </div>
    </motion.aside>
  );
}

/* ─── Root Dashboard ────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [open, setOpen] = useState(true);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();

  const W = open ? 248 : 68;

  // Real-time Socket Listener
  useEffect(() => {
    // Initial Fetch
    api.get('/api/notifications/history?limit=10').then(res => {
      if (res.data.success) {
        setNotifs(res.data.data);
        setUnread(res.data.data.filter((n) => !n.isRead).length);
      }
    }).catch(err => console.error('Failed to load initial notifications:', err));

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');
    
    socket.on('connect', () => {
      console.log('📡 Connected to Real-time Admin Network');
      socket.emit('join', { userId: user?.id, role: 'ADMIN' });
    });

    socket.on('admin_notification', (notif) => {
      console.log('📢 Admin Alert Received:', notif);
      setNotifs(prev => [notif, ...prev].slice(0, 10));
      setUnread(u => u + 1);
      
      // Critical Popups
      if (notif.type === 'SOS_TRIGGERED' || notif.type === 'PATIENT_EMERGENCY') {
        showAlert(`CRITICAL: ${notif.title}`, 'error');
      } else {
        showAlert(notif.title, 'info');
      }
    });

    return () => socket.disconnect();
  }, [user, showAlert]);

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const adminInitial = user?.fullName?.charAt(0)?.toUpperCase() ?? 'A';
  const adminName = user?.fullName ?? 'System Administrator';

  const pageLabel = NAV.find(n =>
    n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to)
  )?.label ?? 'Dashboard';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
      <Sidebar open={open} onToggle={() => setOpen(o => !o)} onLogout={handleLogout} />

      {/* ── Main ── */}
      <motion.div
        animate={{ marginLeft: W }}
        initial={false}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh' }}
      >
        {/* ── Top Bar ── */}
        <header style={{
          height: '64px', background: C.white,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px', position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 1px 3px rgba(12,99,126,0.06)',
        }}>
          {/* Left: page title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={16} color={C.accent} />
            <span style={{ fontSize: '0.8rem', color: C.textMuted, fontWeight: 600 }}>MediFind Admin</span>
            <ChevronRight size={14} color={C.textMuted} />
            <span style={{ fontSize: '0.8rem', color: C.textMain, fontWeight: 700 }}>{pageLabel}</span>
          </div>

          {/* Center: search */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} size={16} />
            <input
              type="text"
              placeholder="Search users, emergencies…"
              style={{
                width: '100%', height: '40px', paddingLeft: '38px',
                border: `1.5px solid ${C.border}`, borderRadius: '10px',
                background: C.bg, outline: 'none', fontSize: '0.875rem',
                fontFamily: 'inherit', color: C.textMain, transition: 'border 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>

          {/* Right: bell + user */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <button 
              onClick={() => { setShowNotifs(!showNotifs); setUnread(0); }}
              style={{
                position: 'relative', width: '40px', height: '40px', borderRadius: '10px',
                background: C.bg, border: `1.5px solid ${showNotifs ? C.accent : C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: showNotifs ? C.accent : C.textMuted, transition: 'all 0.15s',
              }}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span style={{ position: 'absolute', top: '9px', right: '9px', width: '10px', height: '10px', background: '#FF6B6B', borderRadius: '50%', border: '2px solid white', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  style={{
                    position: 'absolute', top: '55px', right: '60px', width: '320px',
                    background: 'white', borderRadius: '16px', border: `1px solid ${C.border}`,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.12)', zIndex: 1000, overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: C.textMain }}>Recent Alerts</h4>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.accent, cursor: 'pointer' }} onClick={() => setNotifs([])}>Clear All</span>
                  </div>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {notifs.length === 0 ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted }}>
                        <Mail size={24} style={{ marginBottom: '10px', opacity: 0.3 }} />
                        <p style={{ fontSize: '0.85rem', margin: 0 }}>All quiet on the network.</p>
                      </div>
                    ) : (
                      notifs.map((n, i) => (
                        <div key={i} 
                          onClick={() => { if(n.type.includes('SOS')) navigate('/admin/sos'); setShowNotifs(false); }}
                          style={{ 
                            padding: '12px 20px', borderBottom: i < notifs.length - 1 ? `1px solid ${C.border}` : 'none',
                            cursor: 'pointer', transition: 'background 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ 
                              width: '8px', height: '8px', borderRadius: '50%', 
                              background: n.type.includes('SOS') ? '#FF6B6B' : C.accent,
                              marginTop: '6px', flexShrink: 0
                            }} />
                            <div>
                              <p style={{ margin: '0 0 2px 0', fontSize: '0.875rem', fontWeight: 700, color: C.textMain }}>{n.title}</p>
                              <p style={{ margin: 0, fontSize: '0.78rem', color: C.textSub, lineHeight: 1.4 }}>{n.body}</p>
                              <p style={{ margin: '6px 0 0 0', fontSize: '0.7rem', color: C.textMuted }}>{new Date(n.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifs.length > 0 && (
                    <div style={{ padding: '12px', textAlign: 'center', borderTop: `1px solid ${C.border}`, background: '#f8fafc' }}>
                      <Link to="/admin/emails" onClick={() => setShowNotifs(false)} style={{ fontSize: '0.8rem', fontWeight: 700, color: C.accent, textDecoration: 'none' }}>View Communication Audit</Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ width: '1px', height: '28px', background: C.border }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: C.textMain, lineHeight: 1.2 }}>{adminName}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', justifyContent: 'flex-end' }}>
                  <Circle size={7} fill="#10B981" color="#10B981" />
                  <span style={{ fontSize: '0.72rem', color: C.textMuted, fontWeight: 600 }}>Network Online</span>
                </div>
              </div>
              <div style={{
                width: '40px', height: '40px',
                background: 'linear-gradient(135deg,#0C637E,#2496A7)',
                borderRadius: '11px', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem', flexShrink: 0,
              }}>
                {adminInitial}
              </div>
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <div style={{ flex: 1, padding: '28px 32px', overflow: 'auto' }}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Overview />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/users/:userId" element={<AdminUserProfile />} />
              <Route path="/verify" element={<ResponderVerification />} />
              <Route path="/sos" element={<SOSMonitor />} />
              <Route path="/subscriptions" element={<SubscriptionManagement />} />
              <Route path="/logs" element={<SystemLogs />} />
              <Route path="/emails" element={<CommunicationAudit />} />
              <Route path="/notifications" element={<SystemNotifications />} />
              <Route path="/inbox" element={<AdminInbox />} />
              <Route path="/settings" element={<PlatformSettings />} />
            </Routes>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Overview Page ─────────────────────────────────────────────────────── */
function Overview() {
  const navigate = useNavigate();
  const [stats,        setStats]        = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [health,       setHealth]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/api/admin/stats'),
      api.get('/api/admin/responders/pending'),
      api.get('/api/admin/health'),
    ])
      .then(([statsRes, pendRes, healthRes]) => {
        if (statsRes.data.success)  setStats(statsRes.data.data);
        if (pendRes.data.success)   setPendingCount(pendRes.data.data.length);
        if (healthRes.data.success) setHealth(healthRes.data.data);
      })
      .catch(() => setError('Unable to reach backend — check your server is running.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  /* Stat card definitions */
  const cards = stats ? [
    {
      label: 'Total Users', value: stats.totalUsers,
      trend: '+12%', up: true,
      Icon: Users, accent: '#0C637E', pale: '#E2F0F3',
      sub: 'Registered accounts',
      to: '/admin/users',
    },
    {
      label: 'Active Emergencies', value: stats.activeEmergencies,
      trend: 'LIVE', up: null,
      Icon: Activity, accent: '#EF4444', pale: '#FEF2F2',
      sub: 'Ongoing SOS events',
      to: '/admin/sos',
    },
    {
      label: 'Total Emergencies', value: stats.totalEmergencies,
      trend: '+5%', up: true,
      Icon: AlertTriangle, accent: '#F59E0B', pale: '#FFFBEB',
      sub: 'All-time SOS events',
      to: '/admin/sos',
    },
    {
      label: 'Verified Responders', value: stats.onlineResponders,
      trend: '+3', up: true,
      Icon: Zap, accent: '#10B981', pale: '#ECFDF5',
      sub: 'Ready to respond',
      to: '/admin/verify',
    },
  ] : Array(4).fill(null);

  const sparkBars = [40, 65, 45, 80, 55, 90, 70];

  /* Quick action definitions */
  const quickActions = [
    {
      label: 'Verify Responders',
      desc: pendingCount != null ? `${pendingCount} awaiting review` : 'Review credentials',
      Icon: UserCheck,
      accent: '#10B981', pale: '#ECFDF5',
      to: '/admin/verify',
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: '#EF4444',
    },
    {
      label: 'Live SOS Monitor',
      desc: stats ? `${stats.activeEmergencies} active now` : 'Track emergencies',
      Icon: Activity,
      accent: '#EF4444', pale: '#FEF2F2',
      to: '/admin/sos',
      badge: stats?.activeEmergencies > 0 ? stats.activeEmergencies : null,
      badgeColor: '#EF4444',
      pulse: stats?.activeEmergencies > 0,
    },
    {
      label: 'User Management',
      desc: stats ? `${stats.totalUsers} registered users` : 'Manage all users',
      Icon: Users,
      accent: '#0C637E', pale: '#E2F0F3',
      to: '/admin/users',
      badge: null,
    },
    {
      label: 'Send Notification',
      desc: 'Broadcast to users',
      Icon: Send,
      accent: '#8B5CF6', pale: '#EDE9FE',
      to: '/admin/notifications',
      badge: null,
    },
    {
      label: 'Subscriptions',
      desc: 'Plans & billing',
      Icon: CreditCard,
      accent: '#F59E0B', pale: '#FFFBEB',
      to: '/admin/subscriptions',
      badge: null,
    },
    {
      label: 'System Logs',
      desc: 'Audit trail',
      Icon: History,
      accent: '#64748B', pale: '#F1F5F9',
      to: '/admin/logs',
      badge: null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.textMain, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Infrastructure Pulse
          </h1>
          <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>
            Real-time status of the MediFind emergency response network.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={loadData}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 14px', borderRadius: '10px',
              border: `1.5px solid ${C.border}`, background: C.white,
              color: C.textSub, fontWeight: 700, cursor: 'pointer',
              fontSize: '0.82rem', fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </motion.button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '10px',
            background: '#ECFDF5', border: '1px solid #6EE7B7',
          }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>All Systems Operational</span>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '12px 18px', background: '#FFF7ED',
          border: '1px solid #FED7AA', borderRadius: '12px',
          color: '#C2410C', fontSize: '0.875rem', fontWeight: 600, marginBottom: '20px',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '20px' }}>
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(12,99,126,0.12)' }}
            onClick={() => card?.to && navigate(card.to)}
            style={{
              background: C.white, borderRadius: '16px',
              border: `1px solid ${C.border}`,
              overflow: 'hidden', position: 'relative',
              boxShadow: '0 1px 4px rgba(12,99,126,0.05)',
              cursor: card?.to ? 'pointer' : 'default',
            }}
          >
            {loading || !card ? (
              <div style={{ padding: '20px' }}>
                <Skeleton h={14} w="50%" mb={12} />
                <Skeleton h={32} w="40%" mb={10} />
                <Skeleton h={10} w="60%" />
              </div>
            ) : (
              <>
                <div style={{ height: '4px', background: card.accent }} />
                <div style={{ padding: '18px 20px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: card.pale, color: card.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <card.Icon size={20} strokeWidth={2.5} />
                    </div>
                    {card.trend === 'LIVE' ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px', borderRadius: '20px',
                        background: '#FEF2F2', border: '1px solid #FECACA',
                      }}>
                        <motion.div
                          animate={{ opacity: [1, 0.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1.4 }}
                          style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }}
                        />
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#EF4444', letterSpacing: '0.05em' }}>LIVE</span>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', borderRadius: '20px',
                        background: card.up ? '#F0FDF4' : '#FEF2F2',
                        border: `1px solid ${card.up ? '#BBF7D0' : '#FECACA'}`,
                      }}>
                        {card.up ? <TrendingUp size={12} color="#16A34A" /> : <TrendingDown size={12} color="#DC2626" />}
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: card.up ? '#16A34A' : '#DC2626' }}>{card.trend}</span>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '1.75rem', fontWeight: 700, color: C.textMain, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
                    {typeof card.value === 'number' ? card.value.toLocaleString() : (card.value ?? '—')}
                  </p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textSub, marginBottom: '2px' }}>{card.label}</p>
                  <p style={{ fontSize: '0.75rem', color: C.textMuted }}>{card.sub}</p>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', marginTop: '14px', height: '28px' }}>
                    {sparkBars.map((h, j) => (
                      <div key={j} style={{
                        flex: 1, height: `${h}%`, borderRadius: '3px',
                        background: j === sparkBars.length - 1 ? card.accent : `${card.accent}30`,
                      }} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{
        background: C.white, borderRadius: '16px',
        border: `1px solid ${C.border}`,
        boxShadow: '0 1px 4px rgba(12,99,126,0.05)',
        marginBottom: '20px', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: C.textMain }}>Quick Actions</h3>
            <p style={{ fontSize: '0.8rem', color: C.textMuted, marginTop: '2px' }}>Most-used admin tasks — one click to navigate</p>
          </div>
          <LayoutDashboard size={18} color={C.textMuted} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '1px', background: C.border }}>
          {quickActions.map((qa, i) => (
            <motion.div
              key={i}
              whileHover={{ background: qa.pale }}
              onClick={() => navigate(qa.to)}
              style={{
                background: C.white, padding: '18px 16px',
                cursor: 'pointer', transition: 'background 0.15s',
                display: 'flex', flexDirection: 'column', gap: '8px',
                position: 'relative',
              }}
            >
              {/* Badge */}
              {qa.badge != null && (
                <div style={{
                  position: 'absolute', top: '10px', right: '10px',
                  minWidth: '20px', height: '20px', borderRadius: '10px',
                  background: qa.badgeColor, color: 'white',
                  fontSize: '0.65rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 5px',
                }}>
                  {qa.pulse && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                      style={{
                        position: 'absolute', inset: -3, borderRadius: '50%',
                        background: qa.badgeColor, opacity: 0.3,
                      }}
                    />
                  )}
                  {qa.badge}
                </div>
              )}
              <div style={{
                width: '40px', height: '40px', borderRadius: '11px',
                background: qa.pale, color: qa.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <qa.Icon size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: C.textMain }}>{qa.label}</p>
                <p style={{ fontSize: '0.73rem', color: C.textMuted, marginTop: '2px' }}>{qa.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px' }}>

        {/* ── Active Emergency Status ── */}
        <div style={{
          background: C.white, borderRadius: '16px',
          border: `1px solid ${C.border}`,
          boxShadow: '0 1px 4px rgba(12,99,126,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px 24px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: C.textMain }}>Network Overview</h3>
              <p style={{ fontSize: '0.8rem', color: C.textMuted, marginTop: '2px' }}>Emergency response network health</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
              <motion.div
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.6 }}
                style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#EF4444' }}>MONITORING</span>
            </div>
          </div>

          {/* Status metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1px', background: C.border }}>
            {[
              {
                label: 'Active SOS Events', value: stats?.activeEmergencies ?? '—',
                color: '#EF4444', bg: '#FEF2F2', Icon: Activity,
                action: () => navigate('/admin/sos'), actionLabel: 'Open SOS Monitor',
              },
              {
                label: 'Verified Responders', value: stats?.onlineResponders ?? '—',
                color: '#10B981', bg: '#ECFDF5', Icon: CheckCircle,
                action: () => navigate('/admin/verify'), actionLabel: 'Verification Queue',
              },
              {
                label: 'Pending Verifications', value: pendingCount ?? '—',
                color: '#F59E0B', bg: '#FFFBEB', Icon: Clock,
                action: () => navigate('/admin/verify'), actionLabel: 'Review Now',
              },
              {
                label: 'Total Users', value: stats?.totalUsers ?? '—',
                color: '#0C637E', bg: '#E2F0F3', Icon: Users,
                action: () => navigate('/admin/users'), actionLabel: 'User Management',
              },
            ].map((m, i) => (
              <div key={i} style={{ background: C.white, padding: '22px 24px' }}>
                {loading ? (
                  <><Skeleton h={12} w="60%" mb={10} /><Skeleton h={28} w="40%" mb={8} /><Skeleton h={10} w="50%" /></>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <m.Icon size={16} color={m.color} />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: C.textMuted, fontWeight: 600 }}>{m.label}</span>
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 800, color: m.color, lineHeight: 1, marginBottom: '10px' }}>
                      {typeof m.value === 'number' ? m.value.toLocaleString() : m.value}
                    </p>
                    <button
                      onClick={m.action}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: 'none', border: 'none', padding: 0,
                        fontSize: '0.78rem', fontWeight: 700, color: m.color,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {m.actionLabel} <ArrowRight size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel: System Integrity + Quick Stats ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* System Health — real data from /api/admin/health */}
          <SystemHealthPanel health={health} loading={loading} />

          {/* Quick Nav to all sections */}
          <div style={{
            background: C.white, borderRadius: '16px',
            border: `1px solid ${C.border}`,
            boxShadow: '0 1px 4px rgba(12,99,126,0.05)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: C.textMain }}>All Sections</h3>
            </div>
            <div style={{ padding: '8px 0' }}>
              {NAV.filter(n => n.to !== '/admin').map((n, i, arr) => (
                <Link
                  key={n.to}
                  to={n.to}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 22px',
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                    textDecoration: 'none', color: C.textSub,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <n.Icon size={15} color={C.accent} strokeWidth={2} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{n.label}</span>
                  </div>
                  <ArrowRight size={13} color={C.textMuted} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── System Health Panel (real data) ──────────────────────────────────── */
function SystemHealthPanel({ health, loading }) {
  // Map backend status strings to colours and labels
  const STATUS = {
    healthy:  { color: '#10B981', bg: '#ECFDF5', label: 'Healthy'  },
    degraded: { color: '#F59E0B', bg: '#FFFBEB', label: 'Degraded' },
    down:     { color: '#EF4444', bg: '#FEF2F2', label: 'Down'     },
  };

  const services = health ? [
    {
      label: 'API Gateway',
      key: 'api',
      extra: health.services.api.latencyMs != null
        ? `${health.services.api.latencyMs} ms` : null,
    },
    {
      label: 'Database',
      key: 'database',
      extra: health.services.database.latencyMs != null
        ? `${health.services.database.latencyMs} ms` : null,
    },
    { label: 'Push Service',  key: 'push',   extra: null },
    { label: 'Socket Layer',  key: 'socket', extra: null },
  ] : [];

  // Format uptime: e.g. 2d 4h 13m
  const formatUptime = (secs) => {
    if (secs == null) return '—';
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${secs % 60}s`;
  };

  return (
    <div style={{
      background: C.white, borderRadius: '16px',
      border: `1px solid ${C.border}`,
      boxShadow: '0 1px 4px rgba(12,99,126,0.05)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '18px 22px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: C.textMain }}>System Health</h3>
          {health && (
            <p style={{ fontSize: '0.72rem', color: C.textMuted, marginTop: '2px' }}>
              Uptime: <strong style={{ color: '#10B981' }}>{formatUptime(health.uptime)}</strong>
            </p>
          )}
        </div>
        <Shield size={16} color={C.textMuted} />
      </div>

      <div style={{ padding: '16px 22px' }}>
        {loading ? (
          Array(4).fill(null).map((_, i) => (
            <div key={i} style={{ marginBottom: i < 3 ? '14px' : 0 }}>
              <Skeleton h={10} w="60%" mb={6} />
              <Skeleton h={5} w="100%" />
            </div>
          ))
        ) : (
          services.map(({ label, key, extra }, i) => {
            const svc    = health.services[key];
            const s      = STATUS[svc?.status] || STATUS.down;
            return (
              <div key={i} style={{ marginBottom: i < services.length - 1 ? '14px' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: C.textSub }}>{label}</span>
                    {extra && (
                      <span style={{ fontSize: '0.68rem', color: C.textMuted, fontWeight: 600 }}>
                        ({extra})
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px',
                    borderRadius: '6px', background: s.bg, color: s.color,
                  }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ height: '5px', background: '#E2ECF0', borderRadius: '3px' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: svc?.status === 'healthy' ? '100%' : svc?.status === 'degraded' ? '55%' : '10%' }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.9, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg,#0C637E,${s.color})`,
                      borderRadius: '3px',
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Memory usage footer */}
      {health && !loading && (
        <div style={{
          padding: '12px 22px', background: '#FAFCFD',
          borderTop: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.textMuted }}>
              Heap Memory
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: health.memory.usedPct > 80 ? '#EF4444' : '#10B981' }}>
              {health.memory.usedMB} / {health.memory.totalMB} MB ({health.memory.usedPct}%)
            </span>
          </div>
          <div style={{ height: '5px', background: '#E2ECF0', borderRadius: '3px' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${health.memory.usedPct}%` }}
              transition={{ delay: 0.6, duration: 1.0, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: health.memory.usedPct > 80
                  ? 'linear-gradient(90deg,#F59E0B,#EF4444)'
                  : 'linear-gradient(90deg,#0C637E,#10B981)',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton helper ───────────────────────────────────────────────────── */
function Skeleton({ h, w, mb = 0, br = 6 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: br, marginBottom: mb,
      background: 'linear-gradient(90deg,#EEF2F5 25%,#E4EBF0 50%,#EEF2F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease infinite',
    }} />
  );
}
