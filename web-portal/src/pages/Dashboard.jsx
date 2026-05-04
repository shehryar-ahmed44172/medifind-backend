import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, Users, UserCheck, Activity, History, Mail,
  LogOut, Bell, Search, Zap, AlertTriangle, CreditCard,
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Shield, Clock, ArrowRight, PanelLeftClose, PanelLeftOpen,
  Circle, Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import UserManagement from './UserManagement';
import ResponderVerification from './admin/ResponderVerification';
import SOSMonitor from './admin/SOSMonitor';
import SystemLogs from './admin/SystemLogs';
import CommunicationAudit from './admin/CommunicationAudit';
import SubscriptionManagement from './admin/SubscriptionManagement';
import PlatformSettings from './admin/PlatformSettings';
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
  { label: 'User Directory', to: '/admin/users', Icon: Users },
  { label: 'Verification Queue', to: '/admin/verify', Icon: UserCheck },
  { label: 'SOS Logistics', to: '/admin/sos', Icon: Activity },
  { label: 'Subscriptions', to: '/admin/subscriptions', Icon: CreditCard },
  { label: 'System Logs', to: '/admin/logs', Icon: History },
  { label: 'Comm Audit', to: '/admin/emails', Icon: Mail },
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
          <img
            src={logo} alt="MediFind"
            style={{
              height: '75px', objectFit: 'contain',
              filter: 'brightness(1.15) drop-shadow(0 1px 6px rgba(0,0,0,0.35))',
            }}
          />
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
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const W = open ? 248 : 68;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={{
              position: 'relative', width: '40px', height: '40px', borderRadius: '10px',
              background: C.bg, border: `1.5px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: C.textMuted, transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
            >
              <Bell size={18} />
              <span style={{ position: 'absolute', top: '9px', right: '9px', width: '7px', height: '7px', background: '#FF6B6B', borderRadius: '50%', border: '2px solid white' }} />
            </button>

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
              <Route path="/verify" element={<ResponderVerification />} />
              <Route path="/sos" element={<SOSMonitor />} />
              <Route path="/subscriptions" element={<SubscriptionManagement />} />
              <Route path="/logs" element={<SystemLogs />} />
              <Route path="/emails" element={<CommunicationAudit />} />
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
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/admin/stats')
      .then(r => { if (r.data.success) setStats(r.data.data); })
      .catch(() => setError('Unable to reach backend — check your server is running.'))
      .finally(() => setLoading(false));
  }, []);

  /* Stat card definitions */
  const cards = stats ? [
    {
      label: 'Total Users', value: stats.totalUsers,
      prev: null, trend: '+12%', up: true,
      Icon: Users, accent: '#0C637E', pale: '#E2F0F3',
      sub: 'Registered accounts',
    },
    {
      label: 'Active Emergencies', value: stats.activeEmergencies,
      prev: null, trend: 'LIVE', up: null,
      Icon: Activity, accent: '#EF4444', pale: '#FEF2F2',
      sub: 'Ongoing SOS events',
    },
    {
      label: 'Total Emergencies', value: stats.totalEmergencies,
      prev: null, trend: '+5%', up: true,
      Icon: AlertTriangle, accent: '#F59E0B', pale: '#FFFBEB',
      sub: 'All-time SOS events',
    },
    {
      label: 'Online Responders', value: stats.onlineResponders,
      prev: null, trend: '+3', up: true,
      Icon: Zap, accent: '#10B981', pale: '#ECFDF5',
      sub: 'Available right now',
    },
  ] : Array(4).fill(null);

  /* Sparkline bar heights (mock visual) */
  const sparkBars = [40, 65, 45, 80, 55, 90, 70];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.textMain, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Infrastructure Pulse
          </h1>
          <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>
            Real-time status of the emergency response network.
          </p>
        </div>
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
            whileHover={{ y: -3 }}
            style={{
              background: C.white, borderRadius: '16px',
              border: `1px solid ${C.border}`,
              overflow: 'hidden', position: 'relative',
              boxShadow: '0 1px 4px rgba(12,99,126,0.05)',
              cursor: 'default',
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
                {/* Coloured top stripe */}
                <div style={{ height: '4px', background: card.accent }} />

                <div style={{ padding: '18px 20px 20px' }}>
                  {/* Top row: icon + trend */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px',
                      background: card.pale, color: card.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <card.Icon size={20} strokeWidth={2.5} />
                    </div>
                    {/* Trend pill */}
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
                        {card.up
                          ? <TrendingUp size={12} color="#16A34A" />
                          : <TrendingDown size={12} color="#DC2626" />
                        }
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: card.up ? '#16A34A' : '#DC2626' }}>{card.trend}</span>
                      </div>
                    )}
                  </div>

                  {/* Number */}
                  <p style={{ fontSize: '1.75rem', fontWeight: 700, color: C.textMain, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
                    {typeof card.value === 'number' ? card.value.toLocaleString() : (card.value ?? '—')}
                  </p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textSub, marginBottom: '2px' }}>{card.label}</p>
                  <p style={{ fontSize: '0.75rem', color: C.textMuted }}>{card.sub}</p>

                  {/* Mini sparkline */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', marginTop: '14px', height: '28px' }}>
                    {sparkBars.map((h, j) => (
                      <div
                        key={j}
                        style={{
                          flex: 1, height: `${h}%`, borderRadius: '3px',
                          background: j === sparkBars.length - 1 ? card.accent : `${card.accent}30`,
                          transition: 'height 0.3s',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Bottom Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px' }}>

        {/* Live SOS Panel */}
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
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: C.textMain }}>Live SOS Logistics</h3>
              <p style={{ fontSize: '0.8rem', color: C.textMuted, marginTop: '2px' }}>Active bridge connections between patients and responders</p>
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

          <div style={{ padding: '32px 24px', textAlign: 'center' }}>
            {/* Decorative rings */}
            <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid #E2F0F3' }} />
              <div style={{ position: 'absolute', inset: '12px', borderRadius: '50%', border: '2px dashed #C5DDE6' }} />
              <div style={{
                position: 'absolute', inset: '24px', borderRadius: '50%',
                background: 'linear-gradient(135deg,#E2F0F3,#C5DDE6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Activity size={24} color="#0C637E" />
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: C.textSub, marginBottom: '6px' }}>Live data is in SOS Logistics</p>
            <p style={{ fontSize: '0.8rem', color: C.textMuted, marginBottom: '20px' }}>Switch to the SOS monitor for real-time emergency tracking</p>
            <Link
              to="/admin/sos"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', borderRadius: '10px',
                background: 'linear-gradient(135deg,#0C637E,#2496A7)',
                color: 'white', fontWeight: 700, fontSize: '0.85rem',
                textDecoration: 'none', transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Open SOS Monitor <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {/* Quick Stats Panel */}
        <div style={{
          background: C.white, borderRadius: '16px',
          border: `1px solid ${C.border}`,
          boxShadow: '0 1px 4px rgba(12,99,126,0.05)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: C.textMain }}>Quick Stats</h3>
            <Clock size={16} color={C.textMuted} />
          </div>

          <div style={{ padding: '8px 0' }}>
            {(stats ? [
              { label: 'Total Users', value: stats.totalUsers, Icon: Users, accent: '#0C637E', pale: '#E2F0F3' },
              { label: 'Online Responders', value: stats.onlineResponders, Icon: Zap, accent: '#10B981', pale: '#ECFDF5' },
              { label: 'Active Emergencies', value: stats.activeEmergencies, Icon: Activity, accent: '#EF4444', pale: '#FEF2F2' },
              { label: 'Total Emergencies', value: stats.totalEmergencies, Icon: AlertTriangle, accent: '#F59E0B', pale: '#FFFBEB' },
            ] : Array(4).fill(null)).map((item, i, arr) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 22px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                }}
              >
                {loading || !item ? (
                  <>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <Skeleton h={32} w={32} br={10} />
                      <Skeleton h={12} w={90} />
                    </div>
                    <Skeleton h={20} w={32} />
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '10px',
                        background: item.pale, color: item.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <item.Icon size={16} strokeWidth={2.5} />
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: C.textSub }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: '1.375rem', fontWeight: 800, color: item.accent }}>
                      {item.value ?? '—'}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* System integrity mini bar */}
          <div style={{ padding: '14px 22px', background: '#FAFCFD', borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.textMuted }}>System Integrity</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16A34A' }}>98.2%</span>
            </div>
            <div style={{ height: '5px', background: '#E2ECF0', borderRadius: '3px' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '98.2%' }}
                transition={{ delay: 0.5, duration: 1.2, ease: 'easeOut' }}
                style={{ height: '100%', background: 'linear-gradient(90deg,#0C637E,#10B981)', borderRadius: '3px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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
