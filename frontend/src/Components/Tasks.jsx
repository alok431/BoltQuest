import React, { useState } from 'react';
import { Play, Check, Loader2, Sparkles } from 'lucide-react';

const AYET_ADSLOT_ID = '27806'; // ayeT-Studios Adslot ID

export default function Tasks({ tasks, completeTask, user }) {
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const handleStartTask = async (task) => {
    // 1. Open task URL
    if (task.url) {
      window.open(task.url, '_blank');
    }

    // 2. Set task to loading (simulated check)
    setLoadingTaskId(task.id);
    setSuccessInfo(null);
    
    try {
      // 3. Complete task on backend (this updates balance, points, level)
      const data = await completeTask(task.id, 'Simulated user verification');
      
      // 4. Set success notification
      setSuccessInfo(data);
      setTimeout(() => setSuccessInfo(null), 5000);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoadingTaskId(null);
    }
  };

  const easyTasks = tasks.filter(t => t.is_premium === 0);
  const premiumTasks = tasks.filter(t => t.is_premium === 1);

  return (
    <div id="tasks" className="tab-content-fade">
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
            <Sparkles size={16} /> Task Completed Successfully!
          </div>
          <div>You earned <strong>+{successInfo.rewardAmount.toFixed(2)} TON</strong> and <strong>+{successInfo.pointsGained} Points</strong>!</div>
          {successInfo.levelInfo?.leveledUp && (
            <div style={{ color: '#ffd700', fontWeight: '700', marginTop: '4px' }}>
              🎉 Leveled up to Level {successInfo.levelInfo.newLevel}!
            </div>
          )}
        </div>
      )}

      {/* Offerwall Partners Grid */}
      <div className="section-title">🔌 Offerwall Partners</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        {/* Torox Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px', border: '1px solid rgba(0, 212, 255, 0.15)', margin: 0 }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>🛡️</div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>Torox Wall</div>
          <div style={{ fontSize: '8px', color: 'var(--text-secondary)', margin: '4px 0 8px 0', minHeight: '30px' }}>
            Install apps & complete high-paying offers.
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '6px', fontSize: '10px', background: 'var(--grad-cyan-blue)', color: '#000', fontWeight: '700' }}
            onClick={() => window.open(`https://web.torox.com/offerwall?pubid=24890&subid=${user?.id || 1}`, '_blank')}
          >
            Open Torox
          </button>
        </div>

        {/* ayeT-Studios Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px', border: '1px solid rgba(255, 71, 87, 0.15)', margin: 0 }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎯</div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>ayeT Studios</div>
          <div style={{ fontSize: '8px', color: 'var(--text-secondary)', margin: '4px 0 8px 0', minHeight: '30px' }}>
            Complete game tasks & earn high payouts.
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '6px', fontSize: '10px', background: 'var(--grad-premium)', color: '#fff', fontWeight: '700' }}
            onClick={() => window.open(`https://www.ayetstudios.com/offers/web_offerwall/${AYET_ADSLOT_ID}?external_identifier=${user?.id || 1}`, '_blank')}
          >
            Open ayeT
          </button>
        </div>

        {/* Notik.me Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px', border: '1px solid rgba(255, 215, 0, 0.15)', margin: 0 }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>📈</div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>Notik Offerwall</div>
          <div style={{ fontSize: '8px', color: 'var(--text-secondary)', margin: '4px 0 8px 0', minHeight: '30px' }}>
            Answer quick quiz polls & claim payouts.
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '6px', fontSize: '10px', background: 'var(--grad-gold-orange)', color: '#000', fontWeight: '700' }}
            onClick={() => window.open(`https://notik.me/coins?api_key=notik_api_key_placeholder&pubid=24890&subid=${user?.id || 1}`, '_blank')}
          >
            Open Notik
          </button>
        </div>
      </div>

      <div className="section-title">⭐ Easy Tasks (0.15 - 0.50 TON)</div>
      {easyTasks.map(task => {
        const isCompleted = task.user_status === 'completed';
        const isLoading = loadingTaskId === task.id;

        return (
          <div className="card" key={task.id}>
            <div className="task-card">
              <div className="task-info">
                <div className="task-title">{task.title}</div>
                <div className="task-desc">{task.description}</div>
                <div className="task-reward">
                  +{task.reward_amount.toFixed(2)} TON
                  {user?.premium_status === 1 && (
                    <span style={{ fontSize: '10px', color: '#ff6b81', marginLeft: '6px', fontWeight: '700' }}>
                      (Premium 2x Active)
                    </span>
                  )}
                </div>
              </div>
              {isCompleted ? (
                <button className="start-btn completed-btn" disabled>
                  <Check size={12} style={{ marginRight: '4px' }} /> Done
                </button>
              ) : (
                <button 
                  className="start-btn" 
                  onClick={() => handleStartTask(task)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <>Start <Play size={10} style={{ marginLeft: '4px', display: 'inline' }} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div className="section-title" style={{ marginTop: '20px' }}>
        💎 Premium Tasks (1.00 - 5.00 TON) <span className="premium-tag">PREMIUM</span>
      </div>
      {premiumTasks.map(task => {
        const isCompleted = task.user_status === 'completed';
        const isLoading = loadingTaskId === task.id;

        return (
          <div className="card" key={task.id} style={{ border: '1px solid rgba(255, 71, 87, 0.15)' }}>
            <div className="task-card">
              <div className="task-info">
                <div className="task-title" style={{ color: '#ff6b81' }}>{task.title}</div>
                <div className="task-desc">{task.description}</div>
                <div className="task-reward" style={{ color: '#ff6b81' }}>
                  +{task.reward_amount.toFixed(2)} TON
                  {user?.premium_status === 1 && (
                    <span style={{ fontSize: '10px', color: '#ff4757', marginLeft: '6px', fontWeight: '700' }}>
                      (Premium 2x Active)
                    </span>
                  )}
                </div>
              </div>
              {isCompleted ? (
                <button className="start-btn completed-btn" disabled>
                  <Check size={12} style={{ marginRight: '4px' }} /> Done
                </button>
              ) : (
                <button 
                  className="start-btn" 
                  style={{ background: 'var(--grad-premium)' }}
                  onClick={() => handleStartTask(task)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <>Start <Play size={10} style={{ marginLeft: '4px', display: 'inline' }} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
