import React from 'react';
import { Target, CheckCircle2 } from 'lucide-react';

export default function Challenges({ challenges }) {
  return (
    <div id="challenges" className="tab-content-fade">
      <div className="section-title">
        <Target size={12} /> Active Challenges
      </div>

      {challenges.map(c => {
        const isCompleted = c.completed === 1;
        const progressPercentage = Math.round((c.current_progress / c.target_count) * 100);

        return (
          <div 
            className="challenge-card" 
            key={c.id}
            style={isCompleted ? { borderColor: 'rgba(46, 213, 115, 0.3)', background: 'linear-gradient(135deg, rgba(46, 213, 115, 0.05) 0%, rgba(46, 213, 115, 0.01) 100%)' } : {}}
          >
            <div className="challenge-header">
              <div className="challenge-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isCompleted ? <CheckCircle2 size={14} color="#2ed573" /> : null}
                {c.title}
              </div>
              <div className="challenge-days">{c.days_limit} Days</div>
            </div>
            
            <div className="task-desc">{c.description}</div>
            
            <div className="task-reward" style={{ fontSize: '13px', marginTop: '6px' }}>
              {c.reward_amount > 0 ? `+${c.reward_amount} Coins` : ''} 
              {c.reward_amount > 0 && c.reward_points > 0 ? ' + ' : ''}
              {c.reward_points > 0 ? `${c.reward_points} Points` : ''} 
              {' Reward'}
            </div>

            <div className="progress-bar" style={{ marginTop: '10px' }}>
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${progressPercentage}%`,
                  background: isCompleted ? 'var(--grad-success)' : 'var(--grad-cyan-blue)' 
                }}
              ></div>
            </div>
            
            <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {c.id === 1 ? `Day ${c.current_progress} of ${c.target_count}` : 
                 c.id === 5 ? `${c.current_progress.toLocaleString()} Coins / ${c.target_count.toLocaleString()} Coins` : 
                 `${c.current_progress}/${c.target_count} completed`}
              </span>
              <span>{progressPercentage}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
