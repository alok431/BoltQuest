import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Flame, Zap, Award, CheckCircle, TrendingUp, Loader2, Check, Sparkles } from 'lucide-react';
import { API_BASE } from '../config';

export default function Home({ user, refreshUser, claimDailyBonus, trendingTasks = [], completeTask }) {
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Story double bonus state
  const [storyDoubled, setStoryDoubled] = useState(false);
  const [sharingStory, setSharingStory] = useState(false);

  // Passive Miner state
  const [minerData, setMinerData] = useState(null);
  const [minerLoading, setMinerLoading] = useState(false);



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

  const handleShareToStory = async () => {
    setSharingStory(true);
    const refLink = `https://t.me/BoltQuestBot?start=${user.telegram_id || user.id}`;
    
    try {
      await navigator.clipboard.writeText(refLink);
    } catch (e) {
      console.warn("Clipboard write failed:", e);
    }

    if (window.Telegram?.WebApp?.shareToStory) {
      window.Telegram.WebApp.shareToStory(
        "https://boltquest.com/images/story-card.jpg",
        `Claim daily coins on BoltQuest and convert them to real TON! ⚡ Here's my join link: ${refLink}`
      );
    } else {
      alert(`Story sharing simulated! Your referral link has been copied: ${refLink}. Publish it to your story to claim your reward.`);
    }

    try {
      const res = await fetch(`${API_BASE}/user/daily-bonus/double`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to double bonus');
      }
      const data = await res.json();
      setClaimMessage(`🎉 Success! Doubled today's bonus: +${data.doubledAmount} Coins!`);
      setStoryDoubled(true);
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
      setClaimMessage(`❌ Error: ${err.message}`);
    } finally {
      setSharingStory(false);
    }
  };

  const fetchMinerStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE}/user/miner-status`, {
        headers: { 'user-id': user.id }
      });
      if (res.ok) {
        const data = await res.json();
        setMinerData(data);
      }
    } catch (err) {
      console.error("Failed to fetch miner status:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMinerStatus();
  }, [fetchMinerStatus]);

  // Live Tick for passive miner
  useEffect(() => {
    if (!minerData) return;
    const interval = setInterval(() => {
      setMinerData(prev => {
        if (!prev) return null;
        const addPerSec = prev.ratePerHour / 3600.0;
        const newAccumulated = Math.min(prev.maxCapacity, prev.accumulatedCoins + (addPerSec * 2));
        const newPercent = Math.min(100, Math.floor((newAccumulated / prev.maxCapacity) * 100));
        return {
          ...prev,
          accumulatedCoins: newAccumulated,
          percentFull: newPercent
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [minerData]);

  const handleClaimMiner = async () => {
    setMinerLoading(true);
    try {
      const res = await fetch(`${API_BASE}/user/miner-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to claim miner');
      }
      const data = await res.json();
      setClaimMessage(`🎉 Claimed ${data.claimedAmount.toFixed(2)} Coins from Bolt Generator!`);
      setTimeout(() => setClaimMessage(''), 4500);
      
      if (refreshUser) refreshUser();
      await fetchMinerStatus();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Claim failed');
    } finally {
      setMinerLoading(false);
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
      {/* Live Activity Ticker */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderBottom: '1px solid var(--border-color)',
        padding: '6px 12px',
        margin: '-16px -16px 16px -16px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative'
      }}>
        <div style={{
          display: 'inline-block',
          animation: 'marquee 30s linear infinite',
          fontSize: '9px',
          color: 'var(--text-secondary)',
          fontWeight: '600'
        }}>
          🚀 activity: Alex_Crypto completed Instagram Join (+255 Coins) &nbsp;&nbsp;•&nbsp;&nbsp;
          👑 luna_t upgraded to Premium Membership &nbsp;&nbsp;•&nbsp;&nbsp;
          💎 John_Web3 withdrew 5.40 TON &nbsp;&nbsp;•&nbsp;&nbsp;
          ⚡ Aditya completed daily streak claim (+8,500 Coins) &nbsp;&nbsp;•&nbsp;&nbsp;
          🔒 User_998 activated Streak Freeze protection
        </div>
      </div>
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
          <div>You earned <strong>+{successInfo.rewardAmount} Coins</strong>!</div>
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
              { day: 1, coins: '850' },
              { day: 2, coins: '1700' },
              { day: 3, coins: '2550' },
              { day: 4, coins: '3400' },
              { day: 5, coins: '4250' },
              { day: 6, coins: '5100' },
              { day: 7, coins: '8500' }
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
                    {isClaimed ? '✅' : isActive ? '🪙' : '🔒'}
                  </div>

                  <div style={{ 
                    fontSize: '8px', 
                    fontWeight: '600', 
                    color: '#fff',
                    lineHeight: '1.2'
                  }}>
                    +{item.coins}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                className="bonus-btn" 
                onClick={handleClaimBonus}
                disabled={claiming || hasClaimedToday}
              >
                {claiming ? 'Claiming...' : hasClaimedToday ? 'Already Claimed Today' : 'Claim Daily Bonus!'}
              </button>

              {hasClaimedToday && !storyDoubled && (
                <button 
                  className="bonus-btn"
                  style={{
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0088cc 100%)',
                    color: '#000',
                    border: 'none',
                    fontWeight: '900',
                    boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)'
                  }}
                  onClick={handleShareToStory}
                  disabled={sharingStory}
                >
                  {sharingStory ? 'Doubling Reward...' : '⚡ Share Story to Double Reward!'}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* ⚡ BOLT GENERATOR (Passive Miner) */}
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Zap size={12} color="var(--accent-cyan)" /> ⚡ BOLT PASSIVE GENERATOR
      </div>
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(0, 136, 204, 0.01) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        marginBottom: '16px',
        padding: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
              ⚡ Generator (Level {user.level || 1})
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Generates passive coins. Fills up every 6 hours.
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '8px', fontSize: '9px', fontWeight: 'bold', border: '1px solid var(--border-color)', color: 'var(--accent-cyan)', whiteSpace: 'nowrap' }}>
            Rate: {minerData ? minerData.ratePerHour.toFixed(2) : '5.00'} Coins/hr
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Accumulated Storage
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#fff' }}>
              🪙 {minerData ? minerData.accumulatedCoins.toFixed(4) : '0.0000'}
            </div>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
            {minerData ? `${minerData.percentFull}% Full` : '0% Full'}
          </div>
        </div>

        <div className="progress-bar" style={{ height: '8px', background: 'rgba(255,255,255,0.05)', marginBottom: '12px', borderRadius: '4px' }}>
          <div className="progress-fill" style={{
            width: `${minerData ? minerData.percentFull : 0}%`,
            background: 'linear-gradient(90deg, var(--accent-cyan), #0088cc)',
            borderRadius: '4px',
            transition: 'width 0.5s ease-in-out'
          }}></div>
        </div>

        <button 
          className="btn-primary" 
          style={{
            background: 'var(--grad-cyan-blue)',
            color: '#000',
            fontWeight: '800',
            padding: '10px',
            fontSize: '11px',
            border: 'none',
            borderRadius: '10px',
            width: '100%'
          }}
          onClick={handleClaimMiner}
          disabled={minerLoading || !minerData || minerData.accumulatedCoins < 0.01}
        >
          {minerLoading ? <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Claim Miner Earnings'}
        </button>
      </div>

      {/* ⚡ SUPER CHARGED TASKS (CPA / Affiliate High-Yield Section) */}
      <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffb300' }}>
        <Sparkles size={12} color="#ffb300" /> ⚡ SUPER CHARGED TASKS
      </div>
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* CPA Card 1: Binance KYC */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(255, 179, 0, 0.08) 0%, rgba(255, 71, 87, 0.03) 100%)',
          border: '1px solid rgba(255, 179, 0, 0.2)',
          boxShadow: '0 0 15px rgba(255, 179, 0, 0.03)',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Badge */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'linear-gradient(90deg, #ffb300, #ff4757)',
            color: '#000',
            fontSize: '8px',
            fontWeight: '900',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            HIGH YIELD
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🪙 Binance KYC Verification
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                Register via BoltQuest link, verify identity (KYC), and trade $10.
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: '#ffd700', fontSize: '11px', fontWeight: '800' }}>+85,000 Coins (~50 TON)</span>
              </div>
            </div>
            
            <button 
              className="btn-primary" 
              style={{
                background: 'linear-gradient(135deg, #ffb300 0%, #ff8000 100%)',
                color: '#000',
                border: 'none',
                padding: '8px 12px',
                fontSize: '10px',
                fontWeight: '800',
                borderRadius: '8px',
                alignSelf: 'center',
                boxShadow: '0 4px 10px rgba(255, 179, 0, 0.25)',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                window.open('https://binance.com', '_blank');
              }}
            >
              Start Offer
            </button>
          </div>
        </div>

        {/* CPA Card 2: Tonkeeper Wallet */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(0, 136, 204, 0.03) 100%)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 0 15px rgba(0, 212, 255, 0.03)',
          padding: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Badge */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'linear-gradient(90deg, #00d4ff, #0088cc)',
            color: '#000',
            fontSize: '8px',
            fontWeight: '900',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            HOT CPA
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💎 Tonkeeper Wallet Promo
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '8px' }}>
                Create a new Tonkeeper wallet, buy and hold at least 5 TON.
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: '#00d4ff', fontSize: '11px', fontWeight: '800' }}>+34,000 Coins (~20 TON)</span>
              </div>
            </div>
            
            <button 
              className="btn-primary" 
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #0088cc 100%)',
                color: '#000',
                border: 'none',
                padding: '8px 12px',
                fontSize: '10px',
                fontWeight: '800',
                borderRadius: '8px',
                alignSelf: 'center',
                boxShadow: '0 4px 10px rgba(0, 212, 255, 0.25)',
                whiteSpace: 'nowrap'
              }}
              onClick={() => {
                window.open('https://tonkeeper.com', '_blank');
              }}
            >
              Start Offer
            </button>
          </div>
        </div>
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
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>+{task.reward_amount} Coins</span>
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
          <div className="stat-value">{user.stats?.todayEarned?.toLocaleString() || '0'} Coins</div>
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
            <div className="task-desc">Get +170 bonus Coins</div>
          </div>
          <div style={{ fontSize: '20px' }}>📋</div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(Math.round(((user.stats?.todayTasksCompleted || 0) / 10) * 100), 100)}%` }}></div>
        </div>
        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '6px' }}>
          {user.stats?.todayTasksCompleted || 0}/10 completed
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
            <div className="task-reward" style={{ marginTop: '6px', color: '#ff6b81' }}>+42,500 Coins Each</div>
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
        <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '12px', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Total Earned</span>
          <span style={{ color: '#00d4ff', fontWeight: '700' }}>{user.stats?.totalEarned?.toLocaleString() || '0'} Coins</span>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

      `}</style>
    </div>
  );
}
