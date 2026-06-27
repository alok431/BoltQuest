import React, { useState } from 'react';
import { CreditCard, DollarSign, ArrowDownRight, ArrowUpRight, Loader2, ShieldAlert } from 'lucide-react';
import { API_BASE } from '../config';

export default function Wallet({ user, transactions, requestWithdrawal, refreshUser, tgUser }) {
  const referrals = user?.stats?.referralsCount || 0;
  let feePercentage = 40;
  if (referrals >= 5) {
    feePercentage = 20;
  } else if (referrals >= 1) {
    feePercentage = 30;
  }

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('TON Wallet');
  const [withdrawing, setWithdrawing] = useState(false);
  const [msg, setMsg] = useState('');
  const [isEditingPayment, setIsEditingPayment] = useState(null); // 'custodial'
  
  // TON Wallet address state
  const [walletAddressInput, setWalletAddressInput] = useState('');
  const [isEditingTon, setIsEditingTon] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [custodialAddress, setCustodialAddress] = useState('No Username Connected');

  // Streak Freeze shop state
  const [shopLoading, setShopLoading] = useState(false);
  const [shopMsg, setShopMsg] = useState('');
  const [starsTxModalOpen, setStarsTxModalOpen] = useState(false);
  const [starsTxStep, setStarsTxStep] = useState('idle'); // 'idle' | 'pending' | 'success'

  const buyStreakFreeze = async (paymentMethod, txHash = '') => {
    setShopLoading(true);
    setShopMsg('');
    try {
      const res = await fetch(`${API_BASE}/user/buy-streak-freeze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({ paymentMethod, txHash })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Purchase failed');
      }
      setShopMsg('✓ Streak Freeze item purchased successfully!');
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error(err);
      setShopMsg(`❌ Error: ${err.message}`);
    } finally {
      setShopLoading(false);
    }
  };

  const startStarsPayment = () => {
    setStarsTxModalOpen(true);
    setStarsTxStep('pending');
    
    // Simulate Telegram Stars checkout flow
    setTimeout(async () => {
      const randomHash = 'stars_' + Array.from({ length: 12 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
      try {
        await buyStreakFreeze('stars', randomHash);
        setStarsTxStep('success');
      } catch (err) {
        console.error(err);
        setStarsTxStep('idle');
        setStarsTxModalOpen(false);
      }
    }, 2000);
  };

  React.useEffect(() => {
    if (user?.ton_wallet) {
      setWalletAddressInput(user.ton_wallet);
    }
  }, [user?.ton_wallet]);

  React.useEffect(() => {
    if (tgUser?.username) {
      setCustodialAddress(`@${tgUser.username}`);
    }
  }, [tgUser]);

  const handleSaveWalletAddress = async (address) => {
    setSavingWallet(true);
    setMsg('');
    try {
      const res = await fetch(`${API_BASE}/user/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({ walletAddress: address })
      });
      if (!res.ok) throw new Error('Failed to update wallet address');
      if (refreshUser) await refreshUser();
      setIsEditingTon(false);
      setMsg(address ? '✓ TON Wallet address saved successfully!' : '✓ TON Wallet address removed.');
    } catch (err) {
      console.error(err);
      setMsg(`❌ Save Error: ${err.message}`);
    } finally {
      setSavingWallet(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!amount || withdrawing) return;
    
    const withdrawCoins = parseInt(amount, 10);
    if (isNaN(withdrawCoins) || withdrawCoins <= 0) {
      setMsg('❌ Please enter a valid Coins amount to withdraw.');
      return;
    }

    if (user.balance < withdrawCoins) {
      setMsg('❌ Insufficient Coins balance.');
      return;
    }

    const tonAmt = withdrawCoins / 1700.0;
    if (tonAmt < 5.0) {
      setMsg('❌ Minimum withdrawal is 5 TON (8,500 Coins).');
      return;
    }

    if (method === 'TON Wallet' && !user?.ton_wallet) {
      setMsg('❌ Please save your TON Wallet Address first.');
      return;
    }

    setWithdrawing(true);
    setMsg('');
    try {
      const activeAddress = method === 'TON Wallet' ? user.ton_wallet : custodialAddress;
      const result = await requestWithdrawal(withdrawCoins, method, activeAddress);
      
      const actualNet = result.netTon || (tonAmt * (1 - feePercentage / 100));
      const actualFeePercent = result.feePercent || feePercentage;

      setMsg(`🎉 Withdrawal requested! Coins: ${withdrawCoins.toLocaleString()} → Net Payout: ${actualNet.toFixed(4)} TON (Fee: ${actualFeePercent}%).`);
      setAmount('');
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
      setMsg(`❌ Error: ${err.message}`);
    } finally {
      setWithdrawing(false);
    }
  };

  const getTransactionIcon = (type) => {
    if (type === 'withdrawal') return <ArrowDownRight color="#ff4757" size={16} />;
    return <ArrowUpRight color="#2ed573" size={16} />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div id="wallet" className="tab-content-fade">
      {/* Payment Methods */}
      <div className="section-title">
        <CreditCard size={12} /> Wallet Details
      </div>
      <div className="grid-2">
        <div className="card">
          <div style={{ fontSize: '20px', marginBottom: '6px' }}>💎</div>
          <div className="task-title" style={{ fontSize: '11px' }}>TON Wallet (Non-Custodial)</div>
          
          {user?.ton_wallet && !isEditingTon ? (
            <>
              <div className="task-desc" style={{ wordBreak: 'break-all', fontSize: '9px', color: '#2ed573', fontWeight: '700', marginBottom: '4px' }}>
                ✓ Address Saved
              </div>
              <div className="task-desc" style={{ wordBreak: 'break-all', fontSize: '8px', color: 'var(--text-secondary)', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {user.ton_wallet}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '4px 6px', fontSize: '9px' }}
                  onClick={() => {
                    setWalletAddressInput(user.ton_wallet);
                    setIsEditingTon(true);
                  }}
                >
                  Edit
                </button>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '4px 6px', fontSize: '9px', color: '#ff4757', borderColor: 'rgba(255, 71, 87, 0.2)' }}
                  onClick={() => handleSaveWalletAddress('')}
                  disabled={savingWallet}
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="task-desc" style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Enter address manually:
              </div>
              <input 
                type="text" 
                value={walletAddressInput}
                onChange={(e) => setWalletAddressInput(e.target.value)}
                placeholder="UQ..."
                style={{ padding: '6px', fontSize: '10px', width: '100%', marginBottom: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 1, background: 'var(--grad-cyan-blue)', color: '#000', padding: '6px 4px', fontSize: '9px', fontWeight: '700' }}
                  onClick={() => handleSaveWalletAddress(walletAddressInput)}
                  disabled={savingWallet || !walletAddressInput.trim()}
                >
                  {savingWallet ? '...' : 'Save'}
                </button>
                <button 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '6px 4px', fontSize: '9px' }}
                  onClick={() => {
                    const randomHex = Array.from({ length: 42 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
                    setWalletAddressInput(`UQ${randomHex}`);
                  }}
                >
                  Auto Connect
                </button>
                {isEditingTon && (
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '6px 4px', fontSize: '9px' }}
                    onClick={() => {
                      setWalletAddressInput(user?.ton_wallet || '');
                      setIsEditingTon(false);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: '20px', marginBottom: '6px' }}>💬</div>
          <div className="task-title" style={{ fontSize: '11px' }}>Telegram Wallet (Custodial)</div>

          {isEditingPayment === 'custodial' ? (
            <div>
              <input 
                type="text" 
                value={custodialAddress} 
                onChange={(e) => setCustodialAddress(e.target.value)} 
                style={{ padding: '6px', fontSize: '10px', marginTop: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '8px', width: '100%' }}
              />
              <button 
                className="btn-secondary" 
                style={{ marginTop: '6px', padding: '4px 8px', fontSize: '10px' }}
                onClick={() => setIsEditingPayment(null)}
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <div className="task-desc" style={{ fontSize: '9px' }}>{custodialAddress}</div>
              <button 
                className="btn-secondary" 
                style={{ marginTop: '8px', padding: '4px 8px', fontSize: '10px' }}
                onClick={() => setIsEditingPayment('custodial')}
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Withdraw section */}
      <div className="section-title">
        <DollarSign size={12} /> Convert & Withdraw Coins
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '2px', textTransform: 'uppercase' }}>
              Available Balance
            </div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: '#00d4ff' }}>
              🪙 {user ? user.balance.toLocaleString() : '0'} Coins
            </div>
          </div>
          <div style={{ fontSize: '24px' }}>🪙</div>
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

        <form onSubmit={handleWithdraw}>
          {/* Dynamic Fee Tiers Explanation */}
          <div style={{
            fontSize: '10px',
            color: 'var(--text-secondary)',
            marginBottom: '10px',
            padding: '8px 10px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            lineHeight: '1.4'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Your Referrals: <strong style={{ color: 'var(--accent-cyan)' }}>{referrals}</strong></span>
              <span style={{ color: '#ffd700' }}>Current Fee Rate: <strong>{feePercentage}%</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', marginTop: '4px' }}>
              <span>0 refs: <strong>40% fee</strong></span>
              <span>1+ refs: <strong>30% fee</strong></span>
              <span>5+ refs: <strong>20% fee</strong></span>
            </div>
          </div>

          <div style={{
            fontSize: '11px',
            color: 'var(--accent-cyan)',
            marginBottom: '10px',
            padding: '8px 10px',
            background: 'rgba(0, 212, 255, 0.05)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Rate: 1700 Coins = 1 TON</span>
              <span>Gross: {amount && parseInt(amount, 10) > 0 ? (parseInt(amount, 10) / 1700).toFixed(4) : '0.0000'} TON</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span>Fee ({feePercentage}%):</span>
              <span>-{amount && parseInt(amount, 10) > 0 ? ((parseInt(amount, 10) / 1700) * (feePercentage / 100)).toFixed(4) : '0.0000'} TON</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0, 212, 255, 0.2)', paddingTop: '4px', marginTop: '2px' }}>
              <span style={{ fontWeight: 'bold' }}>Net Received:</span>
              <strong style={{ color: '#2ed573' }}>
                {amount && parseInt(amount, 10) > 0 ? ((parseInt(amount, 10) / 1700) * (1 - feePercentage / 100)).toFixed(4) : '0.0000'} TON
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <div style={{ flex: '2' }}>
              <input 
                type="number" 
                step="1" 
                placeholder="Coins" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ 
              flex: '1.2', 
              padding: '12px 8px', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px',
              color: '#2ed573',
              fontSize: '10px',
              fontWeight: '700',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              height: '42px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>Net Payout</span>
              <span>{amount && parseInt(amount, 10) > 0 ? ((parseInt(amount, 10) / 1700) * (1 - feePercentage / 100)).toFixed(4) : '0.0000'} TON</span>
            </div>
            <div style={{ flex: '1.5' }}>
              <select 
                value={method} 
                onChange={(e) => setMethod(e.target.value)}
                style={{
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  color: 'white',
                  outline: 'none',
                  fontSize: '12px',
                  width: '100%'
                }}
              >
                <option value="TON Wallet">TON Wallet</option>
                <option value="Telegram Wallet">Telegram Wallet</option>
              </select>
            </div>
          </div>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={withdrawing}
          >
            {withdrawing ? <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto' }} /> : 'Convert & Withdraw'}
          </button>
        </form>
      </div>

      {/* Items Shop */}
      <div className="section-title">📦 Item Shop (Power-Ups)</div>
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#ffd700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ❄️ Streak Freeze Protection
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
              Preserves your login streak bonus if you miss a day. Used automatically.
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', border: '1px solid var(--border-color)', color: '#ffd700', whiteSpace: 'nowrap' }}>
            Owned: {user.streak_freezes || 0}
          </div>
        </div>

        {shopMsg && (
          <div style={{
            fontSize: '11px',
            color: shopMsg.includes('❌') ? '#ff4757' : '#2ed573',
            marginBottom: '10px',
            fontWeight: '600'
          }}>
            {shopMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-secondary" 
            style={{ flex: 1, padding: '8px', fontSize: '10px', borderColor: 'rgba(255, 215, 0, 0.3)' }}
            onClick={() => buyStreakFreeze('coins')}
            disabled={shopLoading}
          >
            Buy (1,000 Coins)
          </button>
          <button 
            className="btn-secondary" 
            style={{ flex: 1, padding: '8px', fontSize: '10px', borderColor: 'rgba(0, 212, 255, 0.3)', color: 'var(--accent-cyan)' }}
            onClick={startStarsPayment}
            disabled={shopLoading}
          >
            Buy (50 Stars)
          </button>
        </div>
      </div>

      {/* Stars checkout simulated Modal overlay */}
      {starsTxModalOpen && (
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
          <div className="card" style={{ maxWidth: '300px', width: '100%', padding: '20px', border: '1px solid #ffd700', textAlign: 'center', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '26px', marginBottom: '8px' }}>⭐</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>Telegram Stars Pay</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Invoice: 1x Streak Freeze Protection</div>
            
            {starsTxStep === 'pending' ? (
              <>
                <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 16px auto', color: '#ffd700' }} />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Awaiting validation from Telegram Stars API (Charging 50 Stars)...</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '32px', color: '#2ed573', marginBottom: '12px' }}>✓</div>
                <div style={{ fontSize: '12px', color: '#2ed573', fontWeight: 'bold', marginBottom: '6px' }}>Payment Complete</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '16px' }}>Item added to your inventory.</div>
                <button 
                  className="btn-primary" 
                  style={{ background: 'var(--grad-success)', border: 'none', color: '#000', padding: '8px 16px', fontSize: '11px', fontWeight: 'bold' }}
                  onClick={() => setStarsTxModalOpen(false)}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="section-title">📜 Transaction History</div>
      {transactions.length === 0 ? (
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '20px' }}>
          No transactions recorded yet.
        </div>
      ) : (
        transactions.map((tx) => (
          <div className="card" key={tx.id} style={{ padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'var(--bg-balance)',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getTransactionIcon(tx.type)}
                </div>
                <div>
                  <div className="task-title" style={{ marginBottom: '2px', fontSize: '12px' }}>{tx.details || tx.type}</div>
                  <div className="task-desc" style={{ fontSize: '10px' }}>{formatDate(tx.created_at)}</div>
                </div>
              </div>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '800', 
                color: tx.amount < 0 ? '#ff4757' : '#2ed573',
                whiteSpace: 'nowrap'
              }}>
                {tx.amount < 0 ? (
                  tx.type === 'subscription' ? `${tx.amount} ⭐` : `${tx.amount.toFixed(4)} TON`
                ) : (
                  `+${tx.amount.toLocaleString()} Coins`
                )}
              </div>
            </div>
            <div style={{ fontSize: '9px', color: '#00d4ff', marginTop: '6px', textAlign: 'right', fontWeight: '700' }}>
              ✓ {tx.status}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
