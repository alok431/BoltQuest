import React, { useState } from 'react';
import { useAuth } from './Hooks/useAuth';
import { useUser } from './Hooks/useUser';
import { useBalance } from './Hooks/useBalance';
import { useTasks } from './Hooks/useTasks';
import { API_BASE } from './config';
import { User, Sun, Moon } from 'lucide-react';

// Components
import Home from './Components/Home';
import Tasks from './Components/Tasks';
import Leaderboard from './Components/Leaderboard';
import Wallet from './Components/Wallet';
import Profile from './Components/Profile';
import Surveys from './Components/Surveys';
import Premium from './Components/Premium';
import Admin from './Components/Admin';

// Styles
import './Styles/dark-theme.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [theme, setTheme] = useState('dark');
  const { userId, tgUser, isTelegram } = useAuth();
  
  const { 
    user, 
    loading: userLoading, 
    error: userError,
    refreshUser, 
    claimDailyBonus, 
    updateSettings 
  } = useUser(userId);

  const { 
    transactions, 
    requestWithdrawal, 
    refreshTransactions 
  } = useBalance(userId, refreshUser);

  const {
    tasks,
    trendingTasks,
    surveys,
    challenges,
    leaderboard,
    achievements,
    loadingTasks,
    completeTask,
    completeSurvey,
    subscribePremium,
    cancelPremium
  } = useTasks(userId, refreshUser);

  // Referral Deep-linking Attribution Effect
  React.useEffect(() => {
    const webapp = window.Telegram?.WebApp;
    const startParam = webapp?.initDataUnsafe?.start_param;
    if (startParam && userId) {
      fetch(`${API_BASE}/user/referral?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ referrerId: startParam })
      })
      .then(res => res.json())
      .then(data => console.log('Referral Attribution Result:', data))
      .catch(err => console.error('Referral Attribution Error:', err));
    }
  }, [userId]);

  const handleSwitchTab = (tabName) => {
    setActiveTab(tabName);
    // Auto-scroll to top when switching view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    if (userLoading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(0, 212, 255, 0.1)',
            borderTopColor: '#00d4ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Loading BoltQuest...</span>
        </div>
      );
    }

    if (userError) {
      return (
        <div style={{ padding: '24px', color: '#ff4d4d', textAlign: 'center', background: 'rgba(255, 77, 77, 0.1)', border: '1px solid rgba(255, 77, 77, 0.2)', borderRadius: '12px', margin: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>⚠️ Error Connecting to Backend</h3>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>{userError}</p>
          <button onClick={refreshUser} style={{ padding: '8px 16px', background: '#ff4d4d', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
            Retry Connection
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return <Home user={user} refreshUser={refreshUser} claimDailyBonus={claimDailyBonus} trendingTasks={trendingTasks} completeTask={completeTask} />;
      case 'tasks':
        return <Tasks tasks={tasks} completeTask={completeTask} user={user} />;
      case 'leaderboard':
        return <Leaderboard leaderboard={leaderboard} user={user} />;
      case 'wallet':
        return (
          <Wallet 
            user={user} 
            transactions={transactions} 
            requestWithdrawal={requestWithdrawal} 
            refreshUser={refreshUser}
            tgUser={tgUser}
          />
        );
      case 'profile':
        return <Profile user={user} updateSettings={updateSettings} theme={theme} setTheme={setTheme} tgUser={tgUser} />;
      case 'surveys':
        return <Surveys surveys={surveys} completeSurvey={completeSurvey} user={user} />;
      case 'premium':
        return (
          <Premium 
            user={user} 
            subscribePremium={subscribePremium} 
            cancelPremium={cancelPremium} 
            tasks={tasks}
            completeTask={completeTask}
          />
        );
      case 'admin':
        return <Admin />;
      default:
        return <Home user={user} refreshUser={refreshUser} claimDailyBonus={claimDailyBonus} />;
    }
  };

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (!isTelegram && !isLocalhost) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 30%, #17212b 0%, #0e1621 100%)',
        color: '#ffffff',
        padding: '24px',
        textAlign: 'center',
        fontFamily: 'var(--font-family)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(0, 136, 204, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          border: '2px solid rgba(0, 136, 204, 0.3)',
          boxShadow: '0 0 20px rgba(0, 136, 204, 0.2)'
        }}>
          <span style={{ fontSize: '40px' }}>✈️</span>
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '10px', background: 'linear-gradient(135deg, #0088cc 0%, #00a8ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Telegram Access Only
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', maxWidth: '300px', marginBottom: '28px' }}>
          BoltQuest is a Telegram Mini App. To play, earn tasks, and manage your wallet, please open it inside the official Telegram application.
        </p>
        <a 
          href="https://t.me/BoltQuest_bot/app" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #0088cc 0%, #00a8ff 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontWeight: '700',
            textDecoration: 'none',
            fontSize: '13px',
            boxShadow: '0 4px 15px rgba(0, 136, 204, 0.4)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Open in Telegram
        </a>
      </div>
    );
  }

  return (
    <div className={`app-container ${theme === 'light' ? 'light-theme' : ''}`}>
      {/* Sticky Header */}
      <div className="sticky-header">
        <div className="header">
          <div>
            <div className="header-title">⚡ BoltQuest</div>
            {user && (
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '500' }}>
                Level {user.level} • {user.xp} XP
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user?.premium_status === 1 ? (
              <div 
                className="badge" 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--grad-premium)', 
                  color: '#fff', 
                  borderColor: 'transparent',
                  boxShadow: activeTab === 'profile' ? '0 0 15px rgba(255, 71, 87, 0.5)' : 'none',
                  transform: activeTab === 'profile' ? 'scale(1.05)' : 'none'
                }} 
                onClick={() => handleSwitchTab('profile')}
              >
                <User size={14} style={{ color: '#fff' }} /> Profile
              </div>
            ) : (
              <div 
                className="badge" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeTab === 'profile' ? 'rgba(0, 212, 255, 0.25)' : 'rgba(0, 212, 255, 0.1)',
                  color: 'var(--accent-cyan)',
                  borderColor: activeTab === 'profile' ? 'var(--accent-cyan)' : 'rgba(0, 212, 255, 0.3)',
                  boxShadow: activeTab === 'profile' ? '0 0 12px rgba(0, 212, 255, 0.4)' : 'none',
                  transform: activeTab === 'profile' ? 'scale(1.05)' : 'none'
                }}
                onClick={() => handleSwitchTab('profile')}
              >
                <User size={14} style={{ color: 'var(--accent-cyan)' }} /> Profile
              </div>
            )}

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.05)',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)',
                padding: 0
              }}
              className="theme-toggle-btn"
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun size={14} style={{ color: '#ffd700' }} />
              ) : (
                <Moon size={14} style={{ color: 'var(--accent-blue)' }} />
              )}
            </button>
          </div>
        </div>
        
        {user && (
          <div className="balance-mini">
            <div className="balance-item" onClick={() => handleSwitchTab('wallet')}>
              💎 {user.balance.toFixed(2)} TON
            </div>
            <div className="balance-item points" style={{ cursor: 'default' }}>
              ⭐ {user.points.toLocaleString()} Points
            </div>
          </div>
        )}
      </div>

      {/* Navigation Row */}
      <div className="tab-navigation" style={{ marginBottom: '20px' }}>
        <button 
          className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('home')}
        >
          <span>🏠</span><span>Home</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('tasks')}
        >
          <span>⭐</span><span>Tasks</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'surveys' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('surveys')}
        >
          <span>📋</span><span>Surveys</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'premium' ? 'active premium' : ''}`}
          onClick={() => handleSwitchTab('premium')}
        >
          <span>👑</span><span>Premium</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('leaderboard')}
        >
          <span>🏆</span><span>Ranks</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('wallet')}
        >
          <span>💳</span><span>Wallet</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => handleSwitchTab('admin')}
          style={{ border: '1px dashed rgba(255, 255, 255, 0.2)' }}
        >
          <span>🛠️</span><span>Admin</span>
        </button>
      </div>

      {/* Dynamic Content Panel */}
      <div style={{ flex: '1' }}>
        {renderContent()}
      </div>

      {/* Embedded Spinner Keyframes */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .tab-content-fade {
          animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .theme-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.12) !important;
          transform: scale(1.08);
          border-color: rgba(255, 255, 255, 0.25) !important;
        }
      `}</style>
    </div>
  );
}
