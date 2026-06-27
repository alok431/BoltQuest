import React from 'react';
import { Trophy, Users } from 'lucide-react';

export default function Leaderboard({ leaderboard, user }) {
  const getRankMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (rank === 4) return '4️⃣';
    if (rank === 5) return '5️⃣';
    if (rank === 6) return '6️⃣';
    return rank;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank gold';
    if (rank === 2) return 'rank silver';
    if (rank === 3) return 'rank bronze';
    return 'rank';
  };

  const earners = Array.isArray(leaderboard) ? leaderboard : (leaderboard?.earners || []);
  const referrals = leaderboard?.referrals || [];

  const displayReferrals = referrals.slice(0, 6);

  // Find user's rankings dynamically
  const myRefRanking = referrals.find(p => p.username === user?.username);
  const myRefRank = myRefRanking ? myRefRanking.rank : (referrals.length > 0 ? referrals.length + 1 : 1);
  const myRefCount = user?.stats?.referralsCount || 0;

  const myEarnRanking = earners.find(p => p.username === user?.username);
  const myEarnRank = myEarnRanking ? myEarnRanking.rank : (earners.length > 0 ? earners.length + 1 : 1);
  const myEarnAmount = user?.balance || 0.00;

  return (
    <div id="leaderboard" className="tab-content-fade">
      {user && (
        <div className="card" style={{ marginBottom: '16px', background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(0, 212, 255, 0.02) 100%)', border: '1px solid rgba(0, 212, 255, 0.2)', padding: '12px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
            🔗 Your Referral Link
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
              type="text" 
              readOnly 
              value={`https://t.me/BoltQuest_bot/app?startapp=${user.telegram_id || user.id}`} 
              style={{ flex: 1, padding: '8px', fontSize: '11px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff' }} 
              onClick={(e) => e.target.select()}
            />
            <button 
              className="btn-primary" 
              style={{ padding: '8px 12px', fontSize: '11px', width: 'auto', background: 'var(--grad-cyan-blue)', color: '#000', fontWeight: '700' }}
              onClick={() => {
                navigator.clipboard.writeText(`https://t.me/BoltQuest_bot/app?startapp=${user.telegram_id || user.id}`);
                alert("Referral link copied to clipboard!");
              }}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* 🏆 Weekly Season Prize Pool Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 71, 87, 0.05) 100%)',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        boxShadow: '0 0 15px rgba(255, 215, 0, 0.08)',
        padding: '16px',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--accent-gold)' }}>
            🏆 WEEKLY SEASON #4 (LIVE)
          </div>
          <div style={{
            background: 'rgba(255, 71, 87, 0.15)',
            color: 'var(--accent-red)',
            fontSize: '8px',
            fontWeight: '900',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Ends in: 2d 14h
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>
              Season Prize Pool
            </div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffd700' }}>
              💎 50.00 TON <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>(~$350 USD)</span>
            </div>
          </div>
          <div style={{ fontSize: '26px' }}>👑</div>
        </div>

        <div style={{
          fontSize: '9px',
          color: 'var(--text-secondary)',
          background: 'var(--bg-secondary)',
          padding: '8px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          lineHeight: '1.4',
          marginBottom: '10px'
        }}>
          <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>Pool Distribution:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🥇 1st Place: <strong>20 TON</strong></span>
            <span>🥈 2nd-3rd: <strong>10 TON</strong></span>
            <span>🥉 4th-10th: <strong>2 TON</strong></span>
          </div>
        </div>
        
        <div style={{ fontSize: '8px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Earn coins from Torox, ayeT, and Notik offerwalls to climb the standings. Only the top 50 users qualify!
        </div>
      </div>

      {/* Part 1: Global Top Referrals */}
      <div className="section-title" style={{ marginTop: '5px' }}>
        <Users size={12} color="var(--accent-cyan)" /> Global Top Referrals
      </div>

      {displayReferrals.map((player, idx) => {
        const isSelf = player.username === user?.username;
        return (
          <div key={`ref-${idx}`} className={`leaderboard-row ${isSelf ? 'user-row' : ''}`}>
            <div className={getRankClass(player.rank)}>
              {getRankMedal(player.rank)}
            </div>
            <div>
              <div className="user-name">{player.username}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                {player.country}
              </div>
            </div>
            <div className="user-points" style={{ color: 'var(--accent-cyan)' }}>
              {player.referrals} Ref(s)
            </div>
          </div>
        );
      })}

      <div style={{ height: '16px' }} />

      {/* Part 2: Global Top Earners */}
      <div className="section-title">
        <Trophy size={12} color="var(--accent-gold)" /> Global Top Earners
      </div>

      {earners.slice(0, 6).map((player, idx) => {
        const isSelf = player.username === user?.username;
        return (
          <div key={`earn-${idx}`} className={`leaderboard-row ${isSelf ? 'user-row' : ''}`}>
            <div className={getRankClass(player.rank)}>
              {getRankMedal(player.rank)}
            </div>
            <div>
              <div className="user-name">{player.username}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                {player.country}
              </div>
            </div>
            <div className="user-points" style={{ color: 'var(--accent-gold)' }}>
              {player.earnings.toLocaleString()} Coins
            </div>
          </div>
        );
      })}

      <div className="section-title">📈 Your Standing Summary</div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Referrals Ranking:</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-cyan)' }}>#{myRefRank} Globally ({myRefCount} Refs)</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Earnings Ranking:</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-gold)' }}>#{myEarnRank} Globally ({myEarnAmount.toLocaleString()} Coins)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
