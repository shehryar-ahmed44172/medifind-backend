import React, { useState, useEffect } from 'react';
import { Users, Activity, ShieldCheck, HeartPulse, ArrowUpRight, TrendingUp } from 'lucide-react';
import api from '../../services/api';

const Overview = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEmergencies: 0,
    activeEmergencies: 0,
    onlineResponders: 0
  });

  useEffect(() => {
    // Fetch real stats from backend
    const fetchStats = async () => {
      try {
        const response = await api.get('/api/admin/stats');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users />, color: '#6366f1', trend: '+12.5%' },
    { label: 'Total SOS Requests', value: stats.totalEmergencies, icon: <HeartPulse />, color: '#ef4444', trend: '+8.2%' },
    { label: 'Active emergencies', value: stats.activeEmergencies, icon: <Activity />, color: '#f59e0b', trend: 'Live' },
    { label: 'Verified Responders', value: stats.onlineResponders, icon: <ShieldCheck />, color: '#10b981', trend: '+5.1%' },
  ];

  return (
    <div className="overview-container">
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time platform metrics and health status.</p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <div key={i} className="stat-card glass-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-label">{stat.label}</span>
              <h2 className="stat-value">{stat.value}</h2>
              <span className={`stat-trend ${stat.trend === 'Live' ? 'live' : ''}`}>
                <TrendingUp size={14} /> {stat.trend}
              </span>
            </div>
            <div className="stat-action">
              <ArrowUpRight size={20} color="#94a3b8" />
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-charts">
        <div className="chart-container glass-card">
          <h3>Emergency Frequency (Last 7 Days)</h3>
          <div className="placeholder-chart">
            {/* Chart visualization would go here */}
            <p>Chart coming soon...</p>
          </div>
        </div>
        <div className="recent-activity glass-card">
          <h3>Live Activity Stream</h3>
          <div className="activity-list">
            <div className="activity-item">
              <div className="dot live"></div>
              <div className="activity-text">
                <strong>SOS Triggered:</strong> Patient "Shehryar Ahmed" in Gulberg III
                <span>Just now</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="dot"></div>
              <div className="activity-text">
                <strong>Verification:</strong> New responder "Dr. Sarah" pending review
                <span>2 mins ago</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="dot success"></div>
              <div className="activity-text">
                <strong>Emergency Resolved:</strong> Case #8241 closed successfully
                <span>15 mins ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .overview-container {
          animation: fadeIn 0.5s ease-out;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
        }

        .page-header p {
          color: var(--text-muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          padding: 1.5rem;
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          position: relative;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-label {
          display: block;
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 0.25rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 0.25rem;
        }

        .stat-trend {
          font-size: 0.75rem;
          color: var(--success);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
        }

        .stat-trend.live {
          color: var(--accent);
        }

        .stat-action {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
        }

        .dashboard-charts {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 1.5rem;
        }

        .chart-container, .recent-activity {
          padding: 1.5rem;
          min-height: 300px;
        }

        .chart-container h3, .recent-activity h3 {
          font-size: 1.125rem;
          margin-bottom: 1.5rem;
        }

        .placeholder-chart {
          height: 200px;
          background: #f8fafc;
          border: 2px dashed var(--border);
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .activity-item {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--border);
          margin-top: 6px;
        }

        .dot.live { background: var(--accent); box-shadow: 0 0 0 4px #ef444422; }
        .dot.success { background: var(--success); }

        .activity-text {
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .activity-text strong {
          display: block;
          color: var(--primary);
        }

        .activity-text span {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 0.25rem;
        }
      `}</style>
    </div>
  );
};

export default Overview;
