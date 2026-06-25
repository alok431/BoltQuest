import React, { useState, useEffect } from 'react';
import { Shield, Check, X, CreditCard, PlusCircle, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function Admin() {
  const [pendingTasks, setPendingTasks] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // ID of action running
  const [msg, setMsg] = useState('');

  // Add Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskReward, setTaskReward] = useState('');
  const [taskIsPremium, setTaskIsPremium] = useState(false);
  const [taskCategory, setTaskCategory] = useState('easy');
  const [taskUrl, setTaskUrl] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const fetchPendingTasks = async () => {
    try {
      setLoadingTasks(true);
      const res = await fetch(`${API_BASE}/admin/pending-tasks`);
      const data = await res.json();
      setPendingTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      setLoadingWithdrawals(true);
      const res = await fetch(`${API_BASE}/admin/withdrawals`);
      const data = await res.json();
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  useEffect(() => {
    fetchPendingTasks();
    fetchWithdrawals();
  }, []);

  const handleApproveTask = async (userId, taskId, id) => {
    setActionLoading(`approve-${id}`);
    try {
      const res = await fetch(`${API_BASE}/admin/approve-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId })
      });
      if (res.ok) {
        setMsg('🎉 Task approved and rewarded!');
        fetchPendingTasks();
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectTask = async (userId, taskId, id) => {
    setActionLoading(`reject-${id}`);
    try {
      const res = await fetch(`${API_BASE}/admin/reject-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, taskId })
      });
      if (res.ok) {
        setMsg('❌ Task proof rejected.');
        fetchPendingTasks();
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveWithdrawal = async (transactionId) => {
    setActionLoading(`withdraw-${transactionId}`);
    try {
      const res = await fetch(`${API_BASE}/admin/approve-withdrawal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });
      if (res.ok) {
        setMsg('💸 Withdrawal marked as completed!');
        fetchWithdrawals();
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle || !taskReward) return;
    setAddingTask(true);
    try {
      const res = await fetch(`${API_BASE}/admin/add-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          reward_amount: parseFloat(taskReward),
          is_premium: taskIsPremium ? 1 : 0,
          category: taskCategory,
          url: taskUrl
        })
      });
      if (res.ok) {
        setMsg('⚡ New task added successfully!');
        setTaskTitle('');
        setTaskDesc('');
        setTaskReward('');
        setTaskIsPremium(false);
        setTaskCategory('easy');
        setTaskUrl('');
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTask(false);
    }
  };

  return (
    <div id="admin" className="tab-content-fade" style={{ paddingBottom: '30px' }}>
      <div className="section-title">
        <Shield size={12} /> Admin Dashboard
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

      {/* 1. Pending Tasks */}
      <div className="section-title">📝 Pending Task Proofs ({pendingTasks.length})</div>
      {loadingTasks ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent-cyan)' }} />
        </div>
      ) : pendingTasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
          No pending proofs to review.
        </div>
      ) : (
        pendingTasks.map((t) => (
          <div className="card" key={t.user_task_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div className="task-title" style={{ fontSize: '12px' }}>{t.task_title}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  User: <strong>{t.username}</strong>
                </div>
              </div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                +{t.reward_amount.toFixed(2)} TON
              </div>
            </div>
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '8px', 
              fontSize: '10px', 
              fontFamily: 'monospace',
              marginBottom: '10px',
              wordBreak: 'break-all',
              color: 'var(--text-secondary)'
            }}>
              Proof: {t.proof}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--grad-success)', border: 'none', color: '#000', fontSize: '11px' }}
                onClick={() => handleApproveTask(t.user_id, t.task_id, t.user_task_id)}
                disabled={actionLoading !== null}
              >
                {actionLoading === `approve-${t.user_task_id}` ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
              </button>
              <button 
                className="btn-danger" 
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                onClick={() => handleRejectTask(t.user_id, t.task_id, t.user_task_id)}
                disabled={actionLoading !== null}
              >
                {actionLoading === `reject-${t.user_task_id}` ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Reject
              </button>
            </div>
          </div>
        ))
      )}

      {/* 2. Withdrawal Requests */}
      <div className="section-title">💸 Withdrawal Processing ({withdrawals.filter(w => w.status === 'pending').length})</div>
      {loadingWithdrawals ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent-cyan)' }} />
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
          No withdrawal history.
        </div>
      ) : (
        withdrawals.map((w) => (
          <div className="card" key={w.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <div className="task-title" style={{ fontSize: '11px' }}>User: {w.username}</div>
                <div className="task-desc" style={{ fontSize: '9px', wordBreak: 'break-all' }}>
                  Address: {w.details}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#ff4757' }}>
                  {w.amount.toFixed(2)} TON
                </div>
                <div style={{ fontSize: '8px', color: w.status === 'completed' ? '#2ed573' : '#ff9800', fontWeight: '800', textTransform: 'uppercase' }}>
                  {w.status}
                </div>
              </div>
            </div>
            {w.status === 'pending' && (
              <button
                className="btn-primary"
                style={{ width: '100%', padding: '6px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={() => handleApproveWithdrawal(w.id)}
                disabled={actionLoading !== null}
              >
                {actionLoading === `withdraw-${w.id}` ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />} Release TON Payout
              </button>
            )}
          </div>
        ))
      )}

      {/* 3. Add Task */}
      <div className="section-title">
        <PlusCircle size={12} /> Add New Campaign
      </div>
      <div className="card">
        <form onSubmit={handleAddTask}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Campaign Title</label>
            <input 
              type="text" 
              value={taskTitle} 
              onChange={(e) => setTaskTitle(e.target.value)} 
              placeholder="e.g. Subscribe to Telegram"
              required 
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Description</label>
            <input 
              type="text" 
              value={taskDesc} 
              onChange={(e) => setTaskDesc(e.target.value)} 
              placeholder="e.g. Join the channel and verify your status"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Reward (TON)</label>
              <input 
                type="number" 
                step="0.05"
                value={taskReward} 
                onChange={(e) => setTaskReward(e.target.value)} 
                placeholder="e.g. 1.50"
                required 
              />
            </div>
            <div>
              <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Category</label>
              <select value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)}>
                <option value="easy">Easy (Instant)</option>
                <option value="premium">Premium (Manual Proof)</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Campaign Link / URL</label>
            <input 
              type="url" 
              value={taskUrl} 
              onChange={(e) => setTaskUrl(e.target.value)} 
              placeholder="e.g. https://t.me/examplechannel"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <input 
              type="checkbox" 
              id="premium-check" 
              checked={taskIsPremium} 
              onChange={(e) => setTaskIsPremium(e.target.checked)} 
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            <label htmlFor="premium-check" style={{ fontSize: '11px', cursor: 'pointer' }}>Require Premium status (2x reward multipliers apply)</label>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '10px' }} disabled={addingTask}>
            {addingTask ? <Loader2 size={14} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Publish Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
}
