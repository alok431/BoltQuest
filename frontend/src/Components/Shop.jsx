import React, { useState } from 'react';
import { ShoppingBag, Star, Sparkles, CheckCircle } from 'lucide-react';

const SHOP_ITEMS = [
  { id: 1, name: '$1 Gift Card', price: 500, icon: '💳' },
  { id: 2, name: '$5 Gift Card', price: 2500, icon: '💳' },
  { id: 3, name: 'Airpods Pro', price: 150000, icon: '🎧' },
  { id: 4, name: 'iPhone 15', price: 350000, icon: '📱' },
  { id: 5, name: 'PS5 Console', price: 400000, icon: '🎮' },
  { id: 6, name: 'Apple Watch', price: 80000, icon: '⌚' }
];

export default function Shop({ user, refreshUser }) {
  const [redeemedItem, setRedeemedItem] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRedeem = (item) => {
    setErrorMsg('');
    setRedeemedItem(null);

    if (!user) return;

    if (user.points < item.price) {
      setErrorMsg(`❌ Insufficient points. You need ${item.price - user.points} more points.`);
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    // In a real application we would call a POST /api/shop/redeem endpoint.
    // For local simulation, we can alert the user.
    setRedeemedItem(item);
    // Since points are in user table, we'll simulate it
    user.points -= item.price;
    if (refreshUser) refreshUser();
    
    setTimeout(() => setRedeemedItem(null), 5000);
  };

  return (
    <div id="shop" className="tab-content-fade">
      {redeemedItem && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(46, 213, 115, 0.15) 0%, rgba(123, 237, 159, 0.05) 100%)',
          border: '1px solid rgba(46, 213, 115, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          color: '#2ed573',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> Redeem Request Successful!
          </div>
          <div>Successfully redeemed <strong>{redeemedItem.name}</strong> for <strong>{redeemedItem.price} points</strong>. Check your email/notifications for instructions.</div>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(255, 71, 87, 0.12)',
          border: '1px solid rgba(255, 71, 87, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          marginBottom: '16px',
          color: '#ff4757',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {errorMsg}
        </div>
      )}

      <div className="section-title">
        <ShoppingBag size={12} /> Redeem Your Points
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {SHOP_ITEMS.map(item => (
          <div className="shop-item" key={item.id}>
            <div className="shop-icon">{item.icon}</div>
            <div className="shop-name">{item.name}</div>
            <div className="shop-price">{item.price.toLocaleString()} pts</div>
            <button className="buy-btn" onClick={() => handleRedeem(item)}>Redeem</button>
          </div>
        ))}
      </div>

      <div className="section-title">
        <Sparkles size={12} /> Premium Perks (Members Only)
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={14} color="#ffd700" fill="#ffd700" /> 2x Points Multiplier
            </div>
            <div className="task-desc">Earn double points on all completed social tasks</div>
          </div>
          <div style={{ fontSize: '20px' }}>⭐</div>
        </div>
        <div style={{ fontSize: '10px', color: '#00d4ff', fontWeight: '600' }}>Active until Dec 31</div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <div className="task-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={14} color="#ffd700" fill="#ffd700" /> Monthly Bonus $10
            </div>
            <div className="task-desc">Extra $10 credited automatically to balance</div>
          </div>
          <div style={{ fontSize: '20px' }}>🎁</div>
        </div>
        <div style={{ fontSize: '10px', color: '#00d4ff', fontWeight: '600' }}>Next bonus: Jan 1</div>
      </div>
    </div>
  );
}
