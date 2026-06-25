import React, { useState } from 'react';
import { User, Settings, Shield, Moon, Mail, Edit3, Loader2 } from 'lucide-react';

export default function Profile({ user, updateSettings, theme, setTheme }) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || 'Aditya Kumar');
  const [email, setEmail] = useState(user?.email || 'aditya@email.com');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Settings mock toggles
  const [emailNotif, setEmailNotif] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);


  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await updateSettings({ username, email });
      setMsg('🎉 Profile updated successfully!');
      setIsEditing(false);
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setMsg('❌ Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div id="profile" className="tab-content-fade">
      <div className="section-title">
        <User size={12} /> Account Information
      </div>

      {msg && (
        <div style={{
          fontSize: '11px',
          color: msg.includes('❌') ? '#ff4757' : '#2ed573',
          marginBottom: '12px',
          fontWeight: '600'
        }}>
          {msg}
        </div>
      )}

      <div className="card">
        {isEditing ? (
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn-primary" style={{ padding: '8px' }} disabled={saving}>
                {saving ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
              </button>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '32px' }}>👨‍💼</div>
              <div>
                <div className="task-title" style={{ fontSize: '14px' }}>{user.username}</div>
                <div className="task-desc">
                  Level {user.level} {user.premium_status === 1 ? 'Premium Member' : 'Free Member'}
                </div>
              </div>
            </div>
            <button 
              className="btn-secondary" 
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              onClick={() => setIsEditing(true)}
            >
              <Edit3 size={12} /> Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="section-title">
        <Settings size={12} /> Account Stats
      </div>

      <div className="grid-2">
        <div className="stat-card">
          <div className="stat-label">Total Earned</div>
          <div className="stat-value">745 TON</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tasks Done</div>
          <div className="stat-value">268</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Referrals</div>
          <div className="stat-value">12</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">XP Points</div>
          <div className="stat-value">{(user.xp / 1000).toFixed(1)}K</div>
        </div>
      </div>

      <div className="section-title">
        <Settings size={12} /> Settings
      </div>

      <div className="card" onClick={() => setEmailNotif(!emailNotif)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Mail size={14} color="var(--text-secondary)" /> Email Notifications
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#00d4ff' }}>
            {emailNotif ? '✓' : '○'}
          </div>
        </div>
      </div>

      <div className="card" onClick={() => setTwoFactor(!twoFactor)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Shield size={14} color="var(--text-secondary)" /> Two-Factor Authentication
          </div>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#00d4ff' }}>
            {twoFactor ? '✓' : '○'}
          </div>
        </div>
      </div>

      <div className="card" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Moon size={14} /> Theme Mode
          </div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#00d4ff', textTransform: 'uppercase' }}>
            {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Bright Mode'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button className="btn-secondary" style={{ padding: '10px' }}>Privacy Policy</button>
        <button className="btn-secondary" style={{ padding: '10px' }}>Terms & Conditions</button>
      </div>

      <button className="btn-danger" style={{ marginTop: '12px' }}>
        Log Out
      </button>
    </div>
  );
}
