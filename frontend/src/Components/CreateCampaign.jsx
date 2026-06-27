import React, { useState } from 'react';
import { Megaphone, PlusCircle, ClipboardList, Trash2, Loader2, Sparkles } from 'lucide-react';
import { API_BASE } from '../config';

export default function CreateCampaign({ user, refreshUser, refreshTasks, refreshSurveys }) {
  const [activeType, setActiveType] = useState('task'); // 'task' | 'survey'
  const [paymentMethod, setPaymentMethod] = useState('coins'); // 'coins' | 'ton'

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskReward, setTaskReward] = useState('255');
  const [isPremium, setIsPremium] = useState(false);
  const [taskUrl, setTaskUrl] = useState('');

  // Survey Form State
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDesc, setSurveyDesc] = useState('');
  const [surveyReward, setSurveyReward] = useState('850');
  const [surveyTime, setSurveyTime] = useState('5');
  
  // Custom Dynamic Questions
  const [questions, setQuestions] = useState([
    { q: '', opts: ['', ''] }
  ]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [tonTxModalOpen, setTonTxModalOpen] = useState(false);
  const [tonTxStep, setTonTxStep] = useState('idle');

  // Pricing fees
  const normalTaskFee = 1000;
  const premiumTaskFee = 2500;
  const surveyFee = 2000;

  const currentFee = activeType === 'survey' 
    ? surveyFee 
    : (isPremium ? premiumTaskFee : normalTaskFee);
  
  const tonEquivalent = currentFee / 1700;

  const handleAddQuestion = () => {
    setQuestions([...questions, { q: '', opts: ['', ''] }]);
  };

  const handleRemoveQuestion = (idx) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, val) => {
    const updated = [...questions];
    updated[idx].q = val;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx, oIdx, val) => {
    const updated = [...questions];
    updated[qIdx].opts[oIdx] = val;
    setQuestions(updated);
  };

  const handleAddOption = (qIdx) => {
    const updated = [...questions];
    updated[qIdx].opts.push('');
    setQuestions(updated);
  };

  const handleRemoveOption = (qIdx, oIdx) => {
    const updated = [...questions];
    updated[qIdx].opts = updated[qIdx].opts.filter((_, i) => i !== oIdx);
    setQuestions(updated);
  };

  const submitCampaignPayload = async (randomHash = '') => {
    setLoading(true);
    setMsg('');
    try {
      let endpoint = '';
      let bodyData = {};

      if (activeType === 'task') {
        endpoint = `${API_BASE}/tasks/create`;
        bodyData = {
          title: taskTitle,
          description: taskDesc,
          reward_amount: taskReward,
          is_premium: isPremium,
          url: taskUrl,
          paymentMethod,
          txHash: randomHash
        };
      } else {
        endpoint = `${API_BASE}/surveys/create`;
        // Clean empty choices or questions
        const cleanedQuestions = questions.filter(q => q.q.trim() !== '').map(q => ({
          q: q.q,
          opts: q.opts.filter(opt => opt.trim() !== '')
        }));

        bodyData = {
          title: surveyTitle,
          description: surveyDesc,
          reward_amount: surveyReward,
          time_estimate: surveyTime,
          questions: cleanedQuestions,
          paymentMethod,
          txHash: randomHash
        };
      }

      const res = await fetch(`${endpoint}?userId=${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit campaign');
      }

      const result = await res.json();
      setMsg(`🎉 Success: ${result.message}`);
      
      // Reset Forms
      setTaskTitle('');
      setTaskDesc('');
      setTaskUrl('');
      setSurveyTitle('');
      setSurveyDesc('');
      setQuestions([{ q: '', opts: ['', ''] }]);

      // Refresh Stats & Lists
      if (refreshUser) await refreshUser();
      if (refreshTasks) await refreshTasks();
      if (refreshSurveys) await refreshSurveys();
    } catch (err) {
      console.error(err);
      setMsg(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (paymentMethod === 'coins') {
      if (user.balance < currentFee) {
        setMsg(`❌ Insufficient Coins balance. Publishing costs ${currentFee.toLocaleString()} Coins.`);
        return;
      }
      await submitCampaignPayload();
    } else {
      // TON Payment Flow
      setTonTxModalOpen(true);
      setTonTxStep('pending');
      
      setTimeout(async () => {
        const simulatedHash = '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
        await submitCampaignPayload(simulatedHash);
        setTonTxStep('success');
      }, 2500);
    }
  };

  return (
    <div className="tab-content-fade" style={{ paddingBottom: '30px' }}>
      <div className="section-title">
        <Megaphone size={12} /> Launch New Campaign
      </div>

      {msg && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          color: msg.includes('❌') ? '#ff4757' : '#2ed573',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {msg}
        </div>
      )}

      {/* Selector: Campaign Type */}
      <div className="tab-navigation" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <button 
          className={`tab-btn ${activeType === 'task' ? 'active' : ''}`}
          onClick={() => { setActiveType('task'); setMsg(''); }}
          style={{ flex: 1, padding: '10px' }}
        >
          <PlusCircle size={12} style={{ marginRight: '4px' }} /> Social Campaign
        </button>
        <button 
          className={`tab-btn ${activeType === 'survey' ? 'active' : ''}`}
          onClick={() => { setActiveType('survey'); setMsg(''); }}
          style={{ flex: 1, padding: '10px' }}
        >
          <ClipboardList size={12} style={{ marginRight: '4px' }} /> Custom Survey
        </button>
      </div>

      {/* Campaign Form */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Payment Method Selector */}
          <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <label style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              PAYMENT METHOD & FEE
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div 
                onClick={() => setPaymentMethod('coins')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: paymentMethod === 'coins' ? 'rgba(255, 215, 0, 0.06)' : 'var(--bg-secondary)',
                  border: '1px solid',
                  borderColor: paymentMethod === 'coins' ? '#ffd700' : 'var(--border-color)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '800', color: paymentMethod === 'coins' ? '#ffd700' : '#fff' }}>
                  Coins Balance
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Cost: {currentFee.toLocaleString()} Coins
                </div>
              </div>

              <div 
                onClick={() => setPaymentMethod('ton')}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: paymentMethod === 'ton' ? 'rgba(0, 212, 255, 0.06)' : 'var(--bg-secondary)',
                  border: '1px solid',
                  borderColor: paymentMethod === 'ton' ? 'var(--accent-cyan)' : 'var(--border-color)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '800', color: paymentMethod === 'ton' ? 'var(--accent-cyan)' : '#fff' }}>
                  TON Connect
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Cost: {tonEquivalent.toFixed(4)} TON
                </div>
              </div>
            </div>
          </div>

          {activeType === 'task' ? (
            /* Task Form fields */
            <>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Task Title</label>
                <input 
                  type="text" 
                  value={taskTitle} 
                  onChange={(e) => setTaskTitle(e.target.value)} 
                  placeholder="e.g. Subscribe to Telegram Channel"
                  required 
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Description</label>
                <input 
                  type="text" 
                  value={taskDesc} 
                  onChange={(e) => setTaskDesc(e.target.value)} 
                  placeholder="e.g. Join the channel and verify status"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Reward per Completion (Coins)</label>
                  <input 
                    type="number" 
                    value={taskReward} 
                    onChange={(e) => setTaskReward(e.target.value)} 
                    placeholder="e.g. 255"
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Campaign Type</label>
                  <select 
                    value={isPremium ? 'premium' : 'easy'} 
                    onChange={(e) => setIsPremium(e.target.value === 'premium')}
                    style={{
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'white',
                      fontSize: '13px'
                    }}
                  >
                    <option value="easy">Normal Task</option>
                    <option value="premium">Premium Campaign</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Link / target URL</label>
                <input 
                  type="url" 
                  value={taskUrl} 
                  onChange={(e) => setTaskUrl(e.target.value)} 
                  placeholder="https://t.me/yourchannel"
                  required 
                />
              </div>
            </>
          ) : (
            /* Survey Form fields */
            <>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Survey Title</label>
                <input 
                  type="text" 
                  value={surveyTitle} 
                  onChange={(e) => setSurveyTitle(e.target.value)} 
                  placeholder="e.g. Feedback on Gaming Platform"
                  required 
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Description</label>
                <input 
                  type="text" 
                  value={surveyDesc} 
                  onChange={(e) => setSurveyDesc(e.target.value)} 
                  placeholder="e.g. Help us improve the gameplay flow"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Reward per Completion (Coins)</label>
                  <input 
                    type="number" 
                    value={surveyReward} 
                    onChange={(e) => setSurveyReward(e.target.value)} 
                    placeholder="e.g. 850"
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Time Estimate (minutes)</label>
                  <input 
                    type="number" 
                    value={surveyTime} 
                    onChange={(e) => setSurveyTime(e.target.value)} 
                    placeholder="e.g. 5"
                    required 
                  />
                </div>
              </div>

              {/* Questions dynamic builder */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
                    Questions ({questions.length})
                  </label>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '9px' }}
                    onClick={handleAddQuestion}
                  >
                    + Add Question
                  </button>
                </div>

                {questions.map((q, qIdx) => (
                  <div key={qIdx} style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>#{qIdx + 1}</span>
                      <input 
                        type="text" 
                        value={q.q} 
                        onChange={(e) => handleQuestionChange(qIdx, e.target.value)} 
                        placeholder="Enter question text..."
                        style={{ flex: 1, padding: '6px' }}
                        required 
                      />
                      {questions.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveQuestion(qIdx)} 
                          style={{ background: 'transparent', border: 'none', color: '#ff4757', padding: '0 4px', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div style={{ marginLeft: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Multiple Choice Options:</span>
                        <button 
                          type="button" 
                          className="btn-secondary" 
                          style={{ width: 'auto', padding: '2px 6px', fontSize: '8px' }}
                          onClick={() => handleAddOption(qIdx)}
                        >
                          + Add Choice
                        </button>
                      </div>

                      {q.opts.map((opt, oIdx) => (
                        <div key={oIdx} style={{ display: 'flex', gap: '6px', marginBottom: '4px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            value={opt} 
                            onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)} 
                            placeholder={`Choice ${oIdx + 1}`}
                            style={{ flex: 1, padding: '4px 6px', fontSize: '10px' }}
                            required 
                          />
                          {q.opts.length > 2 && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveOption(qIdx, oIdx)}
                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
            style={{ background: 'var(--grad-cyan-blue)', color: '#000', fontWeight: 'bold' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto' }} /> : `Launch Campaign`}
          </button>
        </form>
      </div>

      {/* TON simulated transaction modal */}
      {tonTxModalOpen && (
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
          <div className="card" style={{ maxWidth: '300px', width: '100%', padding: '20px', border: '1px solid var(--accent-cyan)', textAlign: 'center', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>🚀</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>TON Connect</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Confirm Campaign Publication Payout</div>
            
            {tonTxStep === 'pending' ? (
              <>
                <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px auto', color: 'var(--accent-cyan)' }} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confirming transfer of {tonEquivalent.toFixed(4)} TON to BoltQuest contract...</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '32px', color: '#2ed573', marginBottom: '12px' }}>✓</div>
                <div style={{ fontSize: '12px', color: '#2ed573', fontWeight: 'bold', marginBottom: '6px' }}>Campaign Published!</div>
                <button 
                  className="btn-primary" 
                  style={{ background: 'var(--grad-success)', border: 'none', color: '#000', padding: '8px 16px', fontSize: '11px', fontWeight: 'bold' }}
                  onClick={() => setTonTxModalOpen(false)}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
