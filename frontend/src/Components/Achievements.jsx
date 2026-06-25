import React from 'react';
import { Award, Lock } from 'lucide-react';

export default function Achievements({ achievements }) {
  const earned = achievements.filter(a => a.earned === 1);
  const locked = achievements.filter(a => a.earned === 0);

  return (
    <div id="achievements" className="tab-content-fade">
      <div className="section-title">
        <Award size={12} /> Your Badges
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700', letterSpacing: '1px' }}>
          EARNED ({earned.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {earned.map(a => (
            <div className="achievement-badge" key={a.id} title={a.description}>
              <span>{a.badge_icon}</span>
              <span>{a.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700', letterSpacing: '1px' }}>
          LOCKED ({locked.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {locked.map(a => (
            <div className="achievement-badge locked" key={a.id} title={a.description}>
              <Lock size={10} style={{ marginRight: '4px' }} />
              <span>{a.badge_icon}</span>
              <span>{a.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
