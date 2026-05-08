import React, { useState, useEffect } from 'react';
import { Users, Activity, ShieldCheck, HeartPulse, ArrowUpRight, TrendingUp, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const Overview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEmergencies: 0,
    activeEmergencies: 0,
    onlineResponders: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/admin/stats');
        if (response.data.success) setStats(response.data.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: <Users size={22} />,
      color: '#6366f1',
      colorVar: 'rgba(99,102,241,0.12)',
      trend: '+12.5%',
    },
    {
      label: 'Total SOS Requests',
      value: stats.totalEmergencies,
      icon: <HeartPulse size={22} />,
      color: 'var(--s-active)',
      colorVar: 'var(--s-active-tint)',
      trend: '+8.2%',
    },
    {
      label: 'Active Emergencies',
      value: stats.activeEmergencies,
      icon: <Activity size={22} />,
      color: 'var(--s-pending)',
      colorVar: 'var(--s-pending-tint)',
      trend: 'Live',
      isLive: true,
    },
    {
      label: 'Verified Responders',
      value: stats.onlineResponders,
      icon: <ShieldCheck size={22} />,
      color: 'var(--s-resolved)',
      colorVar: 'var(--s-resolved-tint)',
      trend: '+5.1%',
    },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.03em', marginBottom: '0.375rem' }}>
          Dashboard Overview
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Real-time platform metrics and system health status.
        </p>
      </div>

      {/* ── Stats Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              position: 'relative',
              borderRadius: 'var(--radius-md)',
              cursor: 'default',
            }}
          >
            <div style={{
              width: '46px', height: '46px', borderRadius: '12px',
              background: stat.colorVar, color: stat.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {stat.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                {stat.label}
              </span>
              <h2 style={{
                fontSize: '1.75rem', fontWeight: 800,
                color: 'var(--text-sub)', marginBottom: '0.375rem',
                letterSpacing: '-0.04em', lineHeight: 1,
              }}>
                {stat.value}
              </h2>
              <span style={{
                fontSize: '0.75rem',
                color: stat.isLive ? 'var(--s-active)' : 'var(--s-resolved)',
                display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700,
              }}>
                {stat.isLive
                  ? <><Zap size={12} /> Live</>
                  : <><TrendingUp size={12} /> {stat.trend}</>
                }
              </span>
            </div>
            <ArrowUpRight size={18} style={{ color: 'var(--text-muted)', position: 'absolute', top: '1.25rem', right: '1.25rem' }} />
          </motion.div>
        ))}
      </div>

      {/* ── Dashboard Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
        {/* Chart placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card"
          style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', minHeight: '300px' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: '1.25rem' }}>
            Emergency Frequency — Last 7 Days
          </h3>
          <div style={{
            height: '220px',
            background: 'var(--surface-raised)',
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: '0.75rem',
          }}>
            <Activity size={32} style={{ opacity: 0.35 }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Chart coming soon</p>
            <p style={{ fontSize: '0.78rem', opacity: 0.7 }}>Analytics integration in progress</p>
          </div>
        </motion.div>

        {/* Live Activity Stream */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="glass-card"
          style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-sub)', marginBottom: '1.25rem' }}>
            Live Activity Stream
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            {[
              { dot: 'var(--s-active)', shadow: 'var(--s-active-tint)', title: 'SOS Triggered', body: 'Patient "Shehryar Ahmed" — Gulberg III', time: 'Just now' },
              { dot: 'var(--s-pending)', shadow: 'transparent', title: 'Verification Pending', body: 'New responder "Dr. Sarah" awaiting review', time: '2 mins ago' },
              { dot: 'var(--s-resolved)', shadow: 'transparent', title: 'Emergency Resolved', body: 'Case #8241 closed successfully', time: '15 mins ago' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: item.dot, marginTop: '5px', flexShrink: 0,
                  boxShadow: i === 0 ? `0 0 0 4px ${item.shadow}` : 'none',
                }} />
                <div>
                  <strong style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.15rem' }}>
                    {item.title}
                  </strong>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.body}</p>
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', opacity: 0.7 }}>
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Overview;
