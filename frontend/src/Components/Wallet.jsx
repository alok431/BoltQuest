import React, { useState } from 'react';
import { CreditCard, DollarSign, ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';

export default function Wallet({ user, transactions, requestWithdrawal, refreshUser, tgUser }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('TON Wallet');
  const [withdrawing, setWithdrawing] = useState(false);
  const [msg, setMsg] = useState('');
  const [isEditingPayment, setIsEditingPayment] = useState(null); // 'noncustodial' or 'custodial'
  
  const [nonCustodialAddress, setNonCustodialAddress] = useState('No Wallet Connected');
  const [custodialAddress, setCustodialAddress] = useState('No Username Connected');
  const [walletConnected, setWalletConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  React.useEffect(() => {
    if (tgUser?.username) {
      setCustodialAddress(`@${tgUser.username}`);
    }
  }, [tgUser]);

  const handleConnectWallet = () => {
    setConnecting(true);
    setTimeout(() => {
      setWalletConnected(true);
      const randomHex = Array.from({ length: 42 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
      setNonCustodialAddress(`UQ${randomHex}`);
      setConnecting(false);
    }, 1200);
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    setNonCustodialAddress('No Wallet Connected');
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

    setWithdrawing(true);
    setMsg('');
    try {
      const activeAddress = method === 'TON Wallet' ? nonCustodialAddress : custodialAddress;
      const result = await requestWithdrawal(withdrawCoins, method, activeAddress);
      const tonAmt = withdrawCoins / 1700;
      setMsg(`🎉 Withdrawal of ${withdrawCoins} Coins (${tonAmt.toFixed(4)} TON) requested successfully!`);
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
          
          {connecting ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '9px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              <Loader2 size={12} className="animate-spin" /> Connecting...
            </div>
          ) : walletConnected ? (
            <>
              <div className="task-desc" style={{ wordBreak: 'break-all', fontSize: '9px', color: '#2ed573', fontWeight: '700' }}>
                ✓ Connected (TON Connect)
              </div>
              <div className="task-desc" style={{ wordBreak: 'break-all', fontSize: '8px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {nonCustodialAddress}
              </div>
              <button 
                className="btn-secondary" 
                style={{ marginTop: '8px', color: '#ff4757', borderColor: 'rgba(255, 71, 87, 0.2)' }}
                onClick={handleDisconnectWallet}
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div className="task-desc" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                No wallet connected.
              </div>
              <button 
                className="btn-primary" 
                style={{ marginTop: '8px', background: 'var(--grad-cyan-blue)', color: '#000', padding: '6px 10px', fontSize: '10px', fontWeight: '700' }}
                onClick={handleConnectWallet}
              >
                Connect Wallet
              </button>
            </>
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
                style={{ padding: '6px', fontSize: '10px', marginTop: '4px' }}
              />
              <button 
                className="btn-secondary" 
                style={{ marginTop: '6px', padding: '4px 8px' }}
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
                style={{ marginTop: '8px' }}
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
          {amount && parseInt(amount, 10) > 0 && (
            <div style={{
              fontSize: '11px',
              color: 'var(--accent-cyan)',
              marginBottom: '10px',
              padding: '6px 10px',
              background: 'rgba(0, 212, 255, 0.05)',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Rate: 1700 Coins = 1 TON</span>
              <strong>Payout: {(parseInt(amount, 10) / 1700).toFixed(4)} TON</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: '1' }}>
              <input 
                type="number" 
                step="1" 
                placeholder="Amount in Coins" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div>
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
                  fontSize: '13px'
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
