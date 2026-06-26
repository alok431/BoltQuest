import React, { useState } from 'react';
import { Gift, Flame, Zap, Award, CheckCircle, TrendingUp, Loader2, Check, Sparkles } from 'lucide-react';

export default function Home({ user, refreshUser, claimDailyBonus, trendingTasks = [], completeTask }) {
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const handleClaimBonus = async () => {
    if (claiming) return;
    setClaiming(true);
    setClaimMessage('');
    try {
      const res = await claimDailyBonus();
      setClaimMessage(`🎉 ${res.message || 'Daily bonus claimed successfully!'}`);
      setTimeout(() => setClaimMessage(''), 4500);
    } catch (err) {
      console.error(err);
      setClaimMessage('❌ Failed to claim daily bonus.');
    } finally {
      setClaiming(false);
    }
  };

  const handleStartTask = async (task) => {
    if (task.url) {
      window.open(task.url, '_blank');
    }
    setLoadingTaskId(task.id);
    setSuccessInfo(null);
    try {
      const data = await completeTask(task.id, 'Home trending task verification');
      setSuccessInfo(data);
      setTimeout(() => setSuccessInfo(null), 5000);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoadingTaskId(null);
    }
  };

  if (!user) return null;

  return (
    <div id="home" className="tab-content-fade">
      {successInfo && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(46, 213, 115, 0.15) 0%, rgba(123, 237, 159, 0.05) 100%)',
          border: '1px solid rgba(46, 213, 115, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          color: '#2ed573',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> Task Completed!
          </div>
          <div>You earned <strong>+{successInfo.rewardAmount.toFixed(2)} TON</strong> and <strong>+{successInfo.pointsGained} Points</strong>!</div>
          {successInfo.levelInfo?.leveledUp && (
            <div style={{ color: '#ffd700', fontWeight: '700', marginTop: '4px' }}>
              🎉 Leveled up to Level {successInfo.levelInfo.newLevel}!
            </div>
          )}
        </div>
      )}

      {/* Daily Login Rewards Panel */}
      <div className="daily-bonus" style={{ paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#ffd700', fontWeight: '700' }}>
            <Gift size={16} /> DAILY LOGIN REWARDS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#ff8e72', fontWeight: '700' }}>
            <Flame size={12} className="animate-pulse" /> {user.login_streak || 0} DAY STREAK
          </div>
        </div>

        {/* 7-Day Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '5px', 
          marginBottom: '16px' 
        }}>
          {(() => {
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const hasClaimedToday = user.last_login_date === todayStr;

            let displayStreak = user.login_streak || 0;
            let isStreakBroken = false;

            if (user.last_login_date) {
              const lastLogin = new Date(user.last_login_date);
              const d1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
              const d2 = Date.UTC(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
              const diffDays = Math.floor((d1 - d2) / 86400000);
              
              if (diffDays > 1) {
                isStreakBroken = true;
              }
            } else {
              isStreakBroken = true;
            }

            return [
              { day: 1, ton: '0.50', points: '50' },
              { day: 2, ton: '1.00', points: '100' },
              { day: 3, ton: '1.50', points: '150' },
              { day: 4, ton: '2.00', points: '200' },
              { day: 5, ton: '2.50', points: '250' },
              { day: 6, ton: '3.00', points: '300' },
              { day: 7, ton: '5.00', points: '500' }
            ].map((item) => {
              // Determine day status
              let isClaimed = false;
              let isActive = false;
              let isLocked = true;

              if (hasClaimedToday) {
                isClaimed = item.day <= displayStreak;
                isActive = false;
                isLocked = item.day > displayStreak;
              } else {
                if (isStreakBroken || displayStreak >= 7) {
                  isClaimed = false;
                  isActive = item.day === 1;
                  isLocked = item.day > 1;
                } else {
                  isClaimed = item.day <= displayStreak;
                  isActive = item.day === displayStreak + 1;
                  isLocked = item.day > displayStreak + 1;
                }
              }

              return (
                <div 
                  key={item.day}
                  style={{
                    background: isClaimed 
                      ? 'rgba(46, 213, 115, 0.12)' 
                      : isActive 
                        ? 'rgba(0, 212, 255, 0.12)' 
                        : 'rgba(255, 255, 255, 0.02)',
                    border: isClaimed
                      ? '1px solid rgba(46, 213, 115, 0.3)'
                      : isActive
                        ? '1px solid var(--accent-cyan)'
                        : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '8px 2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: isActive ? '0 0 10px rgba(0, 212, 255, 0.2)' : 'none',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{ 
                    fontSize: '9px', 
                    fontWeight: '700', 
                    color: isClaimed 
                      ? 'rgba(46, 213, 115, 0.8)' 
                      : isActive 
                        ? 'var(--accent-cyan)' 
                        : 'var(--text-muted)' 
                  }}>
                    Day {item.day}
                  </div>

                  <div style={{ fontSize: '12px', margin: '2px 0' }}>
                    {isClaimed ? '✅' : isActive ? '💎' : '🔒'}
                  </div>

                  <div style={{ 
                    fontSize: '8px', 
                    fontWeight: '600', 
                    color: '#fff',
                    lineHeight: '1.2'
                  }}>
                    +{item.ton}
                  </div>
                  <div style={{ 
                    fontSize: '7px', 
                    color: 'rgba(255, 255, 255, 0.5)',
                    lineHeight: '1'
                  }}>
                    {item.points} pts
                  </div>

                  <div style={{
                    fontSize: '7px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    marginTop: '2px',
                    padding: '1px 3px',
                    borderRadius: '3px',
                    background: isClaimed 
                      ? 'rgba(46, 213, 115, 0.2)' 
                      : isActive 
                        ? 'rgba(0, 212, 255, 0.2)' 
                        : 'rgba(255, 255, 255, 0.05)',
                    color: isClaimed 
                      ? '#2ed573' 
                      : isActive 
                        ? 'var(--accent-cyan)' 
                        : 'var(--text-muted)'
                  }}>
                    {isClaimed ? 'Claimed' : isActive ? 'Ready' : 'Locked'}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {claimMessage && (
          <div style={{ fontSize: '11px', color: '#ffd700', marginBottom: '10px', fontWeight: '600' }}>
            {claimMessage}
          </div>
        )}
        
        {(() => {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];
          const hasClaimedToday = user.last_login_date === todayStr;

          return (
            <button 
              className="bonus-btn" 
              onClick={handleClaimBonus}
              disabled={claiming || hasClaimedToday}
            >
              {claiming ? 'Claiming...' : hasClaimedToday ? 'Already Claimed Today' : 'Claim Daily Bonus!'}
            </button>
          );
        })()}
      </div>

      {/* Hot & Trending Tasks */}
      <div className="section-title">
        <Flame size={12} color="var(--accent-red)" /> Hot & Trending Tasks
      </div>
      {trendingTasks.map(task => {
        const isCompleted = task.user_status === 'completed';
        const isLoading = loadingTaskId === task.id;

        return (
          <div className="card" key={`trending-${task.id}`} style={{ border: '1px solid rgba(255, 71, 87, 0.12)' }}>
            <div className="task-card">
              <div className="task-info">
                <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {task.title}
                  <span style={{ fontSize: '9px', background: 'rgba(255, 71, 87, 0.1)', color: 'var(--accent-red)', padding: '2px 4px', borderRadius: '4px', fontWeight: '700' }}>
                    🔥 HOT
                  </span>
                </div>
                <div className="task-desc">{task.description}</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>+{task.reward_amount.toFixed(2)} TON</span>
                  <span>•</span>
                  <span>👥 {task.completion_count} completed</span>
                </div>
              </div>
              {isCompleted ? (
                <button className="start-btn completed-btn" disabled>
                  <Check size={12} style={{ marginRight: '4px' }} /> Done
                </button>
              ) : (
                <button 
                  className="start-btn" 
                  style={{ background: 'var(--grad-premium)', color: 'white' }}
                  onClick={() => handleStartTask(task)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <>Start</>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Today's Overview */}
      <div className="section-title">
        <TrendingUp size={12} /> Today's Overview
      </div>
      <div className="grid-2">
        <div className="stat-card">
          <div className="stat-label">Tasks Done</div>
          <div className="stat-value">{user.stats?.todayTasksCompleted || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Earnings</div>
          <div className="stat-value">{user.stats?.todayEarned?.toFixed(2) || '0.00'} TON</div>
        </div>
      </div>

      {/* Quick Start Target */}
      <div className="section-title">
        <Zap size={12} /> Quick Start
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} color="#00d4ff" /> Complete 10 Tasks Today
            </div>
            <div className="task-desc">Get +100 bonus points</div>
          </div>
          <div style={{ fontSize: '20px' }}>📋</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '50%' }}></div>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '6px' }}>
          5/10 completed
        </div>
      </div>

      {/* Featured Banner */}
      <div className="section-title">
        <Award size={12} /> Featured Campaign
      </div>
      <div className="card" style={{ border: '1px solid rgba(255, 71, 87, 0.3)', background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.08) 0%, rgba(255, 107, 129, 0.02) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="task-title">
              VPN Referral Campaign 
              <span className="premium-tag">Premium</span>
            </div>
            <div className="task-desc">Earn double bonus payout this week for verified signups</div>
            <div className="task-reward" style={{ marginTop: '6px', color: '#ff6b81' }}>+25.00 TON Each</div>
          </div>
          <div style={{ fontSize: '20px' }}>🚀</div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="section-title">
        <TrendingUp size={12} /> Stats Overview
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '12px', marginBottom: '8px', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Tasks Completed</span>
          <span style={{ color: '#00d4ff', fontWeight: '700' }}>{user.stats?.tasksCompleted || 0}</span>
        </div>
        <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '12px', marginBottom: '8px', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Total Earned</span>
          <span style={{ color: '#00d4ff', fontWeight: '700' }}>{user.stats?.totalEarned?.toFixed(2) || '0.00'} TON</span>
        </div>
        <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '12px', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Points Gained</span>
          <span style={{ color: '#00d4ff', fontWeight: '700' }}>{user.points?.toLocaleString() || 0}</span>
        </div>
      </div>
    </div>
  );
}
