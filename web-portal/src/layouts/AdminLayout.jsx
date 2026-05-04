import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Activity, 
  UserCheck, 
  History, 
  Users, 
  ShieldAlert,
  LogOut,
  Bell,
  CreditCard
} from 'lucide-react';

const AdminLayout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <ShieldAlert size={28} color="#ef4444" />
          <span>MediFind Admin</span>
        </div>
        
        <nav className="sidebar-nav">
          <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </NavLink>
          <NavLink to="/admin/sos" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Activity size={20} />
            <span>SOS Monitor</span>
          </NavLink>
          <NavLink to="/admin/verification" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <UserCheck size={20} />
            <span>Verification</span>
          </NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Users size={20} />
            <span>User Management</span>
          </NavLink>
          <NavLink to="/admin/subscriptions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <CreditCard size={20} />
            <span>Subscriptions</span>
          </NavLink>
          <NavLink to="/admin/audit" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <History size={20} />
            <span>Audit Logs</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="header-search">
            <input type="text" placeholder="Search for reports, users..." />
          </div>
          <div className="header-actions">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="badge-notification"></span>
            </button>
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>

      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #f1f5f9;
        }

        .sidebar {
          width: 280px;
          background: #0f172a;
          color: white;
          display: flex;
          flex-direction: column;
          position: fixed;
          height: 100vh;
        }

        .sidebar-header {
          padding: 2rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.25rem;
          font-weight: 700;
          border-bottom: 1px solid #1e293b;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-sm);
          color: #94a3b8;
          transition: all 0.2s;
        }

        .nav-item:hover {
          color: white;
          background: #1e293b;
        }

        .nav-item.active {
          color: white;
          background: var(--accent);
        }

        .sidebar-footer {
          padding: 1.5rem;
          border-top: 1px solid #1e293b;
        }

        .logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.875rem 1rem;
          background: transparent;
          color: #fca5a5;
          font-weight: 600;
          border-radius: var(--radius-sm);
        }

        .logout-btn:hover {
          background: #ef444422;
        }

        .admin-main {
          flex: 1;
          margin-left: 280px;
          display: flex;
          flex-direction: column;
        }

        .admin-header {
          height: 70px;
          background: white;
          border-bottom: 1px solid var(--border);
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-search input {
          padding: 0.625rem 1rem;
          width: 300px;
          background: #f1f5f9;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          outline: none;
        }

        .header-search input:focus {
          background: white;
          border-color: var(--accent);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .icon-btn {
          position: relative;
          background: transparent;
          color: var(--text-muted);
        }

        .badge-notification {
          position: absolute;
          top: -2px;
          right: -2px;
          width: 8px;
          height: 8px;
          background: var(--accent);
          border-radius: 50%;
          border: 2px solid white;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-left: 1.5rem;
          border-left: 1px solid var(--border);
          font-weight: 600;
        }

        .avatar {
          width: 36px;
          height: 36px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
        }

        .admin-content {
          padding: 2rem;
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
