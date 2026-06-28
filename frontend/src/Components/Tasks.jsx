import React, { useState } from 'react';
import { Play, Check, Loader2, Sparkles, ArrowLeft, ExternalLink } from 'lucide-react';
import { API_BASE } from '../config';

const AYET_ADSLOT_ID = '27806'; // ayeT-Studios Adslot ID

export default function Tasks({ tasks, completeTask, user, onSwitchTab, refreshUser }) {
  const [loadingTaskId, setLoadingTaskId] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);
  const [activeOfferwall, setActiveOfferwall] = useState(null);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Mystery chests ad state
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [adActiveChest, setAdActiveChest] = useState('');
  const [adCurrentIndex, setAdCurrentIndex] = useState(0);
  const [adTotalRequired, setAdTotalRequired] = useState(0);
  const [adMessage, setAdMessage] = useState('');

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

  const handleOpenChest = async (chestType) => {
    if (chestType === 'gold' && user?.premium_status === 1) {
      await claimChestBackend(chestType);
      return;
    }

    let requiredAds = 1;
    if (chestType === 'silver') requiredAds = 2;
    if (chestType === 'gold') requiredAds = 4;

    setAdActiveChest(chestType);
    setAdTotalRequired(requiredAds);
    setAdCurrentIndex(0);
    setAdModalOpen(true);
    setAdMessage('Connecting to Adsgram video ad provider...');

    playAdSequence(0, requiredAds, chestType);
  };

  const playAdSequence = (index, total, chestType) => {
    if (index >= total) {
      setAdMessage('All ads watched! Opening chest...');
      setTimeout(async () => {
        await claimChestBackend(chestType);
      }, 1000);
      return;
    }

    setAdCurrentIndex(index + 1);
    setAdMessage(`Watching Sponsor Video Ad (${index + 1} / ${total})... Please do not close.`);

    setTimeout(() => {
      playAdSequence(index + 1, total, chestType);
    }, 2000);
  };

  const claimChestBackend = async (chestType) => {
    try {
      const res = await fetch(`${API_BASE}/user/claim-chest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({ chestType })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server rejected chest claim');
      }
      const data = await res.json();
      
      setSuccessInfo({
        rewardAmount: data.claimedAmount,
        levelInfo: { leveledUp: false }
      });
      setTimeout(() => setSuccessInfo(null), 5000);
      
      setAdModalOpen(false);
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to claim chest');
      setAdModalOpen(false);
    }
  };

  const easyTasks = tasks.filter(t => t.is_premium === 0);
  const premiumTasks = tasks.filter(t => t.is_premium === 1);

  const getOfferwallUrl = (type) => {
    switch (type) {
      case 'torox':
        return `https://web.torox.com/offerwall?pubid=24890&subid=${user?.id || 1}`;
      case 'ayet':
        return `https://www.ayetstudios.com/offers/web_offerwall/${AYET_ADSLOT_ID}?external_identifier=${user?.id || 1}`;
      case 'monlix':
        return `https://offers.monlix.com/?appid=monlix_app_id_placeholder&userid=${user?.id || 1}`;
      default:
        return '';
    }
  };

  const getOfferwallTitle = (type) => {
    switch (type) {
      case 'torox':
        return 'Torox Wall';
      case 'ayet':
        return 'ayeT Studios';
      case 'monlix':
        return 'Monlix Wall';
      default:
        return '';
    }
  };

  if (activeOfferwall) {
    const url = getOfferwallUrl(activeOfferwall);
    const title = getOfferwallTitle(activeOfferwall);

    return (
      <div className="tab-content-fade" id="tasks">
        <button
          onClick={() => {
            setActiveOfferwall(null);
            setIframeLoading(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '16px',
            transition: 'var(--transition-smooth)'
          }}
        >
          <ArrowLeft size={14} /> Back to Tasks
        </button>

        <div className="section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span>🔌 {title}</span>
          <button
            onClick={() => window.open(url, '_blank')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-cyan)',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Open in Browser <ExternalLink size={12} />
          </button>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          lineHeight: '1.5'
        }}>
          <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
            💡 Quick Tips:
          </div>
          Complete tasks to earn coins instantly. If your reward is delayed, check the support/history section inside the offerwall provider.
        </div>

        <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
          {iframeLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '550px',
              background: 'var(--bg-secondary)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              zIndex: 1
            }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Loading Secure Offerwall...</span>
            </div>
          )}
          <div style={{
            width: '100%',
            height: '550px',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            background: 'var(--bg-secondary)',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)'
          }}>
            <iframe
              src={url}
              title={title}
              onLoad={() => setIframeLoading(false)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
            />
          </div>
        </div>
      </div>
    );
  }

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
          <div>You earned <strong>+{successInfo.rewardAmount} Coins</strong>!</div>
          {successInfo.levelInfo?.leveledUp && (
            <div style={{ color: '#ffd700', fontWeight: '700', marginTop: '4px' }}>
              🎉 Leveled up to Level {successInfo.levelInfo.newLevel}!
            </div>
          )}
        </div>
      )}

      {/* Offerwall Partners Horizontal Scroll Container */}
      <div className="section-title">🔌 Offerwall Partners</div>
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '4px 12px',
        margin: '0 -16px 16px -16px',
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none'
      }}>
        {/* Torox Card */}
        <div className="card" style={{ flex: '0 0 115px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px', border: '1px solid rgba(0, 212, 255, 0.15)', margin: 0 }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>🛡️</div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>Torox Wall</div>
          <div style={{ fontSize: '8px', color: 'var(--text-secondary)', margin: '4px 0 8px 0', minHeight: '30px' }}>
            Install apps & complete high-paying offers.
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '6px', fontSize: '10px', background: 'var(--grad-cyan-blue)', color: '#000', fontWeight: '700' }}
            onClick={() => setActiveOfferwall('torox')}
          >
            Open Torox
          </button>
        </div>

        {/* ayeT-Studios Card */}
        <div className="card" style={{ flex: '0 0 115px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px', border: '1px solid rgba(255, 71, 87, 0.15)', margin: 0 }}>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎯</div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>ayeT Studios</div>
          <div style={{ fontSize: '8px', color: 'var(--text-secondary)', margin: '4px 0 8px 0', minHeight: '30px' }}>
            Complete game tasks & earn high payouts.
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '6px', fontSize: '10px', background: 'var(--grad-premium)', color: '#fff', fontWeight: '700' }}
            onClick={() => setActiveOfferwall('ayet')}
          >
            Open ayeT
          </button>
        </div>

        {/* Monlix Card (Pending Approval) */}
        <div className="card" style={{ 
          flex: '0 0 115px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center', 
          padding: '10px', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          margin: 0,
          opacity: 0.6,
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: 'var(--accent-red, #ff4757)',
            color: '#fff',
            fontSize: '6px',
            fontWeight: '900',
            padding: '2px 4px',
            borderRadius: '4px',
            textTransform: 'uppercase'
          }}>
            Pending
          </div>
          <div style={{ fontSize: '20px', marginBottom: '4px' }}>📈</div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)' }}>Monlix Wall</div>
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', margin: '4px 0 8px 0', minHeight: '30px' }}>
            Complete simple offers, surveys & tasks.
          </div>
          <button 
            className="btn-primary" 
            disabled
            style={{ 
              width: '100%', 
              padding: '6px', 
              fontSize: '10px', 
              background: 'rgba(255,255,255,0.08)', 
              color: 'var(--text-muted)', 
              fontWeight: '700',
              cursor: 'not-allowed',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
          >
            Coming Soon
          </button>
        </div>
      </div>

      <div className="section-title">🪙 Easy Tasks (255 - 850 Coins)</div>
      {easyTasks.length === 0 ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '12px', margin: '8px 0' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📣</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>No Active Social Campaigns</div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Be the first to promote your Telegram channels, groups or links!
          </div>
          <button 
            className="btn-primary" 
            style={{ width: 'auto', padding: '8px 16px', fontSize: '11px', background: 'var(--grad-cyan-blue)', color: '#000', fontWeight: 'bold', display: 'block', margin: '0 auto' }}
            onClick={() => onSwitchTab('create-campaign')}
          >
            Create Task Campaign
          </button>
        </div>
      ) : (
        easyTasks.map(task => {
          const isCompleted = task.user_status === 'completed';
          const isLoading = loadingTaskId === task.id;

          return (
            <div className="card" key={task.id}>
              <div className="task-card">
                <div className="task-info">
                  <div className="task-title">{task.title}</div>
                  <div className="task-desc">{task.description}</div>
                  <div className="task-reward">
                    +{task.reward_amount} Coins
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
        })
      )}

      <div className="section-title" style={{ marginTop: '20px' }}>
        🪙 Premium Tasks (1700 - 8500 Coins) <span className="premium-tag">PREMIUM</span>
      </div>
      {premiumTasks.length === 0 ? (
        <div className="card" style={{ padding: '24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border-color)', borderRadius: '12px', margin: '8px 0' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>👑</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ff6b81', marginBottom: '4px' }}>No Active Premium Campaigns</div>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Publish premium target campaigns visible only to premium users.
          </div>
          <button 
            className="btn-primary" 
            style={{ width: 'auto', padding: '8px 16px', fontSize: '11px', background: 'var(--grad-premium)', color: '#fff', fontWeight: 'bold', display: 'block', margin: '0 auto' }}
            onClick={() => onSwitchTab('create-campaign')}
          >
            Launch Premium Campaign
          </button>
        </div>
      ) : (
        premiumTasks.map(task => {
          const isCompleted = task.user_status === 'completed';
          const isLoading = loadingTaskId === task.id;

          return (
            <div className="card" key={task.id} style={{ border: '1px solid rgba(255, 71, 87, 0.15)' }}>
              <div className="task-card">
                <div className="task-info">
                  <div className="task-title" style={{ color: '#ff6b81' }}>{task.title}</div>
                  <div className="task-desc">{task.description}</div>
                  <div className="task-reward" style={{ color: '#ff6b81' }}>
                    +{task.reward_amount} Coins
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
        })
      )}

      {/* Adsgram Mystery Chests Section */}
      <div className="section-title" style={{ marginTop: '20px' }}>📦 Adsgram Mystery Chests</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        {/* Bronze Chest */}
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px', border: '1px solid rgba(205, 127, 50, 0.4)', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>📦</div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#cd7f32' }}>Bronze Chest</div>
            <div style={{ fontSize: '8px', color: 'var(--text-secondary)', margin: '4px 0' }}>Watch 1 Ad</div>
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '6px', fontSize: '9px', background: 'linear-gradient(135deg, #cd7f32 0%, #b87333 100%)', color: '#fff', border: 'none', fontWeight: 'bold', borderRadius: '6px', marginTop: '6px' }}
            onClick={() => handleOpenChest('bronze')}
          >
            Claim (100)
          </button>
        </div>

        {/* Silver Chest */}
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px', border: '1px solid rgba(192, 192, 192, 0.4)', margin: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '28px', marginBottom: '4px' }}>🪙</div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#c0c0c0' }}>Silver Chest</div>
            <div style={{ fontSize: '8px', color: 'var(--text-secondary)', margin: '4px 0' }}>Watch 2 Ads</div>
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '6px', fontSize: '9px', background: 'linear-gradient(135deg, #c0c0c0 0%, #a9a9a9 100%)', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '6px', marginTop: '6px' }}
            onClick={() => handleOpenChest('silver')}
          >
            Claim (250)
          </button>
        </div>

        {/* Gold Chest */}
        <div className="card" style={{ textAlign: 'center', padding: '12px 8px', border: '1px solid rgba(255, 215, 0, 0.4)', margin: 0, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--grad-premium)',
            color: '#fff',
            fontSize: '6px',
            fontWeight: '950',
            padding: '2px 4px',
            borderRadius: '4px',
            whiteSpace: 'nowrap'
          }}>
            PREMIUM/4 ADS
          </div>
          <div>
            <div style={{ fontSize: '28px', marginBottom: '4px', marginTop: '4px' }}>👑</div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#ffd700' }}>Gold Chest</div>
            <div style={{ fontSize: '8px', color: 'var(--text-secondary)', margin: '4px 0' }}>4 Ads / Free</div>
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '6px', fontSize: '9px', background: 'linear-gradient(135deg, #ffd700 0%, #ffa500 100%)', color: '#000', border: 'none', fontWeight: 'bold', borderRadius: '6px', marginTop: '6px' }}
            onClick={() => handleOpenChest('gold')}
          >
            Claim (600)
          </button>
        </div>
      </div>

      {/* Adsgram Simulated Player Overlay */}
      {adModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '300px', width: '100%', padding: '24px', border: '1px solid var(--accent-cyan)', textAlign: 'center', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📺</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Adsgram Sponsor Video</div>
            
            <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px auto', color: 'var(--accent-cyan)' }} />
            
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {adMessage}
            </div>
            
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
              Supporting BoltQuest offers with Adsgram. Reward unlocks immediately after completion.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
