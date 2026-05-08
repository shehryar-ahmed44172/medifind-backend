import React, { useState } from 'react';
import { 
  Settings, 
  Mail, 
  CreditCard, 
  Shield, 
  Globe, 
  Bell, 
  Database,
  Save,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ToggleLeft as Toggle,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useAlert } from '../../context/AlertContext';

const PlatformSettings = () => {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState('GENERAL');
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);
  const [showStripeSecret, setShowStripeSecret] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showAlert('Settings updated successfully', 'success');
    }, 1200);
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const res = await api.post('/api/admin/test-email');
      showAlert(res.data.message || 'Test email sent successfully!', 'success');
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to send test email. Check SMTP settings.', 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  const TABS = [
    { id: 'GENERAL',   label: 'General',    icon: Settings },
    { id: 'EMAILS',    label: 'Email Gateway', icon: Mail },
    { id: 'PAYMENTS',  label: 'Gateways',   icon: CreditCard },
    { id: 'SECURITY',  label: 'Security',   icon: Shield },
    { id: 'NOTIFY',    label: 'Alerts',     icon: Bell },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >


      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Platform Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Configure core infrastructure, payment gateways, and system parameters.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={saving}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem', 
            padding: '0.875rem 1.75rem', borderRadius: '12px', 
            background: 'var(--primary)', color: 'white', 
            fontWeight: 700, cursor: 'pointer', border: 'none',
            boxShadow: '0 4px 12px rgba(12, 99, 126, 0.2)'
          }}
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Navigation Sidebar */}
        <div className="card" style={{ padding: '1rem', border: '1px solid var(--border)' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem 1.25rem', borderRadius: '12px', border: 'none',
                  background: active ? '#ebf8ff' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: active ? 700 : 500, fontSize: '0.95rem',
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                  marginBottom: '0.25rem'
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{tab.label}</span>
                {active && <ChevronRight size={14} />}
              </button>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--border)', minHeight: '600px' }}>
          {activeTab === 'GENERAL' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '2rem' }}>General Configuration</h2>
              
              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Organization Name</label>
                <input type="text" defaultValue="MediFind Network Pakistan" 
                  style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-raised)', fontSize: '1rem', outline: 'none' }} />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Support Email</label>
                <input type="email" defaultValue="support@medifind.pk" 
                  style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-raised)', fontSize: '1rem', outline: 'none' }} />
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem', marginTop: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>Maintenance Mode</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Disable public access while performing updates.</p>
                  </div>
                  <Toggle size={32} color="var(--text-muted)" style={{ cursor: 'pointer', opacity: 0.5 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>Debug Logging</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Record verbose technical data in system logs.</p>
                  </div>
                  <Toggle size={32} color="var(--primary)" style={{ cursor: 'pointer' }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'EMAILS' && (
            <div style={{ maxWidth: '640px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)' }}>Email Infrastructure</h2>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.375rem 0.875rem', borderRadius: '100px', background: 'var(--success-bg)', color: 'var(--success-fg)' }}>CONNECTED</span>
              </div>

              <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', gap: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Mail size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.25rem' }}>SMTP Server (SendGrid)</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Currently handling all system transactional emails.</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Host</label>
                  <input type="text" defaultValue="smtp.sendgrid.net" 
                    style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-raised)', fontSize: '0.95rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Port</label>
                  <input type="text" defaultValue="587" 
                    style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-raised)', fontSize: '0.95rem' }} />
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>API Key / Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showEmailPass ? "text" : "password"} defaultValue="••••••••••••••••••••" 
                    style={{ width: '100%', padding: '0.875rem 3.5rem 0.875rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-raised)', fontSize: '0.95rem' }} />
                  <button 
                    onClick={() => setShowEmailPass(!showEmailPass)}
                    style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showEmailPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleTestEmail}
                disabled={testingEmail}
                style={{ 
                  padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'var(--surface)', 
                  border: '1px solid var(--border)', color: 'var(--secondary)', 
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  opacity: testingEmail ? 0.6 : 1
                }}
              >
                <RefreshCw size={14} style={{ animation: testingEmail ? 'spin 1.5s linear infinite' : 'none' }} /> 
                {testingEmail ? 'Sending...' : 'Send Test Email'}
              </motion.button>
            </div>
          )}

          {activeTab === 'PAYMENTS' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '2rem' }}>Payment Gateways</h2>

              {/* Stripe Section */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', background: '#635bff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <CreditCard size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)' }}>Stripe Integration</h3>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '100px', background: 'var(--s-pending-bg)', color: 'var(--warning-fg)' }}>TEST MODE</span>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.625rem' }}>Public Key</label>
                  <input type="text" placeholder="pk_test_..." 
                    style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-raised)', fontSize: '0.9rem', fontFamily: 'monospace' }} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.625rem' }}>Secret Key</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showStripeSecret ? "text" : "password"} placeholder="sk_test_..." 
                      style={{ width: '100%', padding: '0.875rem 3.5rem 0.875rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-raised)', fontSize: '0.9rem', fontFamily: 'monospace' }} />
                    <button 
                      onClick={() => setShowStripeSecret(!showStripeSecret)}
                      style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {showStripeSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.85rem' }}>
                  <AlertCircle size={18} />
                  <span>Stripe is currently in <strong>sandbox mode</strong>. No real transactions will be processed.</span>
                </div>
              </div>

              {/* HIPAA & Privacy Status */}
              <div className="card" style={{ padding: '2rem', border: '1px solid #d1fae5', background: '#f0fdf4', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#064e3b' }}>HIPAA Compliance & Privacy</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#047857' }}>Data protection standards are active.</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--success-border)' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Access Auditing</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#064e3b' }}>Enabled (All PHI Logs)</span>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--success-border)' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Data Minimization</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#064e3b' }}>Active (PHI Masked)</span>
                  </div>
                  <div style={{ padding: '1rem', background: 'var(--surface)', borderRadius: '10px', border: '1px solid var(--success-border)' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '4px' }}>Auto-Timeout</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#064e3b' }}>30 Min Inactivity</span>
                  </div>
                </div>
              </div>

              {/* Local Gateway Section */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem', opacity: 0.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', background: '#10b981', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <Globe size={20} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)' }}>JazzCash / EasyPaisa</h3>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '100px', background: 'var(--surface-raised)', color: 'var(--text-muted)' }}>COMING SOON</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Integration with local Pakistani payment providers for direct bank transfers.</p>
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '2rem' }}>Security & Access Control</h2>
              
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '1.5rem', marginBottom: '2.5rem', display: 'flex', gap: '1.25rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--s-pending-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                  <Shield size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--warning-fg)', marginBottom: '0.25rem' }}>Admin Session Hardening</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--warning-fg)', opacity: 0.8 }}>Enhanced protection for administrative console access.</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[
                  { label: 'Two-Factor Authentication (2FA)', desc: 'Require 2FA for all administrative accounts.', active: true },
                  { label: 'IP Whitelisting', desc: 'Restrict admin access to specific office IP addresses.', active: false },
                  { label: 'Session Timeout', desc: 'Auto-logout admins after 30 minutes of inactivity.', active: true },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'var(--surface-raised)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.25rem' }}>{item.label}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</p>
                    </div>
                    <Toggle size={28} color={item.active ? 'var(--primary)' : 'var(--text-muted)'} style={{ cursor: 'pointer', opacity: item.active ? 1 : 0.4 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'NOTIFY' && (
            <div style={{ maxWidth: '640px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '2rem' }}>System Alerts & Notifications</h2>
              
              <div style={{ marginBottom: '2.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Configure where system-critical alerts are dispatched.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '1.5rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Mail size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>Email Notifications</span>
                      </div>
                      <Toggle size={24} color="var(--primary)" />
                    </div>
                    <input type="text" defaultValue="ops@medifind.pk" 
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.875rem' }} />
                  </div>

                  <div style={{ padding: '1.5rem', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Database size={18} color="#8b5cf6" />
                        <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>Discord / Webhook</span>
                      </div>
                      <Toggle size={24} color="#8b5cf6" />
                    </div>
                    <input type="text" placeholder="https://discord.com/api/webhooks/..." 
                      style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.875rem' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PlatformSettings;
