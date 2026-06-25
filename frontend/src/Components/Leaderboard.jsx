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

  const topReferrals = [
    { rank: 1, username: 'Alex_Crypto', country: 'USA', referrals: 142 },
    { rank: 2, username: 'Luna_Trader', country: 'UK', referrals: 118 },
    { rank: 3, username: 'John_Web3', country: 'Canada', referrals: 95 },
    { rank: 4, username: 'Maria_Tasks', country: 'Spain', referrals: 74 },
    { rank: 5, username: 'Sophie_Earn', country: 'France', referrals: 48 },
    { rank: 47, username: user?.username || 'Aditya Kumar', country: 'Global', referrals: 12 }
  ];

  return (
    <div id="leaderboard" className="tab-content-fade">
      {/* Part 1: Global Top Referrals */}
      <div className="section-title" style={{ marginTop: '5px' }}>
        <Users size={12} color="var(--accent-cyan)" /> Global Top Referrals
      </div>

      {topReferrals.map((player, idx) => {
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

      {leaderboard.slice(0, 6).map((player, idx) => {
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
              {player.earnings.toFixed(2)} TON
            </div>
          </div>
        );
      })}

      <div className="section-title">📈 Your Standing Summary</div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Referrals Ranking:</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-cyan)' }}>#47 Globally (12 Refs)</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Earnings Ranking:</div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-gold)' }}>#47 Globally (24.50 TON)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
