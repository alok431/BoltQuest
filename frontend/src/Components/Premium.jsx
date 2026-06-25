import React, { useState } from 'react';
import { Crown, CheckCircle, ShieldAlert, Sparkles, Loader2, Award, ExternalLink, Clock } from 'lucide-react';

export default function Premium({ user, subscribePremium, cancelPremium, tasks = [], completeTask }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  
  // Tasks state
  const [proofInputs, setProofInputs] = useState({}); 
  const [submittingProof, setSubmittingProof] = useState({});

  const isPremium = user?.premium_status === 1;

  const handleSubscribe = async () => {
    setLoading(true);
    setMsg('');
    try {
      const data = await subscribePremium();
      setMsg(`🎉 Upgrade successful! Welcome to Premium.`);
    } catch (err) {
      console.error(err);
      setMsg('❌ Upgrade failed. Please check your TON balance.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your Premium membership? You will lose the 2x earnings multiplier!")) return;
    setLoading(true);
    setMsg('');
    try {
      await cancelPremium();
      setMsg(`🔒 Subscription cancelled successfully.`);
    } catch (err) {
      console.error(err);
      setMsg('❌ Cancellation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (task) => {
    if (task.url) {
      window.open(task.url, '_blank');
    }
    // Toggle manual proof input field
    setProofInputs(prev => ({ ...prev, [task.id]: prev[task.id] !== undefined ? undefined : '' }));
  };

  const submitManualProof = async (task) => {
    const proofText = proofInputs[task.id];
    if (!proofText) {
      alert('Please enter proof details (e.g., username or screenshot url) to submit.');
      return;
    }
    setSubmittingProof(prev => ({ ...prev, [task.id]: true }));
    try {
      const data = await completeTask(task.id, proofText);
      alert(data.message || '🎉 Proof submitted for review!');
      setProofInputs(prev => ({ ...prev, [task.id]: undefined }));
    } catch (err) {
      alert(err.message || 'Submission failed.');
    } finally {
      setSubmittingProof(prev => ({ ...prev, [task.id]: false }));
    }
  };

  // Filter Premium exclusive offers
  const premiumOffers = tasks.filter(t => t.is_premium === 1 || t.category === 'premium');

  return (
    <div id="premium" className="tab-content-fade" style={{ paddingBottom: '30px' }}>
      <div className="section-title">
        <Crown size={12} /> Premium Subscription
      </div>

      {msg && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          color: '#ffd700',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {msg}
        </div>
      )}

      {isPremium ? (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.15) 0%, rgba(255, 107, 129, 0.05) 100%)', borderColor: 'rgba(255, 71, 87, 0.4)' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#ff6b81', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crown size={14} fill="#ff6b81" /> ✓ Active Premium Member
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            You are getting a <strong>2x earnings multiplier</strong> on all completed tasks!
          </div>
        </div>
      ) : (
        <div className="card" style={{ border: '1px solid var(--border-color)', textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '8px' }}>
            👑 Upgrade to BoltQuest Premium
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Get early access to premium tasks, 2x earnings boost, and access to exclusive high-payout campaigns.
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffd700', marginBottom: '16px' }}>
            Price: 10.00 TON / month
          </div>
          <button 
            className="btn-primary" 
            style={{ background: 'var(--grad-premium)', color: '#fff', width: '100%', padding: '10px' }}
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Upgrade Now'}
          </button>
        </div>
      )}

      {/* 2. Premium Offers Section */}
      <div className="section-title">
        <Sparkles size={12} color="#ffd700" /> Exclusive Premium Campaigns ({premiumOffers.length})
      </div>

      {!isPremium ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px', padding: '24px 16px' }}>
          <ShieldAlert size={24} color="var(--accent-red)" />
          <div style={{ fontSize: '13px', fontWeight: '700' }}>Premium Offers Locked</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Upgrade your account to unlock these high-paying offers yielding up to 5+ TON each!
          </div>
        </div>
      ) : premiumOffers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          No premium offers available currently.
        </div>
      ) : (
        premiumOffers.map((task) => {
          const isCompleted = task.user_status === 'completed';
          const isVerifying = task.user_status === 'verifying';
          const isProofInputOpen = proofInputs[task.id] !== undefined;

          return (
            <div 
              className="card" 
              key={`prem-${task.id}`} 
              style={{ border: '1px solid rgba(255, 71, 87, 0.2)', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 71, 87, 0.02) 100%)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: '1' }}>
                  <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    {task.title}
                    <span style={{ fontSize: '8px', background: 'rgba(255, 71, 87, 0.15)', color: 'var(--accent-red)', padding: '2px 4px', borderRadius: '4px', fontWeight: '800' }}>
                      PREMIUM
                    </span>
                  </div>
                  <div className="task-desc" style={{ fontSize: '10px', marginTop: '3px' }}>{task.description}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '9px', fontWeight: '600' }}>
                    <span style={{ color: '#ffd700' }}>+{task.reward_amount.toFixed(2)} TON</span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: 'var(--accent-cyan)' }}>+{(task.reward_amount * 200).toFixed(0)} pts</span>
                  </div>
                </div>

                <div>
                  {isCompleted ? (
                    <button className="start-btn completed-btn" style={{ padding: '6px 12px', fontSize: '10px' }} disabled>
                      Done
                    </button>
                  ) : isVerifying ? (
                    <button className="start-btn" style={{ padding: '6px 12px', fontSize: '10px', background: 'rgba(255, 152, 0, 0.1)', color: '#ff9800', border: '1px solid rgba(255,152,0,0.3)', display: 'flex', alignItems: 'center', gap: '3px' }} disabled>
                      <Clock size={10} /> Pending
                    </button>
                  ) : (
                    <button 
                      className="start-btn" 
                      style={{ background: 'var(--grad-premium)', color: 'white', padding: '6px 12px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}
                      onClick={() => handleStartTask(task)}
                    >
                      Start <ExternalLink size={10} />
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Proof Input Fields */}
              {isProofInputOpen && !isCompleted && !isVerifying && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <label style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Submit Proof Details (e.g. Screenshot URL or username used for task)
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="text" 
                      placeholder="Enter verification proof details..."
                      value={proofInputs[task.id]}
                      onChange={(e) => setProofInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                      style={{ flex: '1', padding: '6px', fontSize: '11px', height: '30px' }}
                    />
                    <button
                      className="btn-primary"
                      style={{ background: 'var(--accent-cyan)', color: '#000', fontSize: '10px', padding: '0 12px', height: '30px', fontWeight: '700' }}
                      onClick={() => submitManualProof(task)}
                      disabled={submittingProof[task.id]}
                    >
                      {submittingProof[task.id] ? <Loader2 size={12} className="animate-spin" /> : 'Submit'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Perks List */}
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Sparkles size={14} color="#ffd700" /> Exclusive Premium Perks:
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontSize: '20px' }}>⚡</div>
            <div>
              <div className="task-title">2x Earnings Boost</div>
              <div className="task-desc">Earn double TON balance payouts and points on all tasks.</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontSize: '20px' }}>🔗</div>
            <div>
              <div className="task-title">High-Value Affiliate Commission</div>
              <div className="task-desc">Access campaign links yielding up to 25 TON per qualified referral.</div>
            </div>
          </div>
        </div>
      </div>

      {isPremium && (
        <div style={{ marginTop: '20px' }}>
          <button 
            className="btn-danger" 
            style={{ width: '100%', padding: '10px' }}
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Cancel Premium Subscription'}
          </button>
        </div>
      )}
    </div>
  );
}
