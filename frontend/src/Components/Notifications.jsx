import React from 'react';
import { Bell } from 'lucide-react';

const INITIAL_NOTIFICATIONS = [
  { id: 1, title: '🎉 New Task Available!', desc: 'VPN signup task is now available - Earn $2.50' },
  { id: 2, title: '💰 Withdrawal Approved!', desc: 'Your $50 withdrawal has been processed to PayPal' },
  { id: 3, title: '🏆 Achievement Unlocked!', desc: 'You\'ve earned the "Speed Runner" badge' },
  { id: 4, title: '⚡ Daily Bonus Ready', desc: 'Your daily bonus of $2.50 is waiting to be claimed' },
  { id: 5, title: '🎯 Challenge Alert', desc: 'Complete 5 more tasks to finish your 7-day challenge' },
  { id: 6, title: '👥 Friend Joined!', desc: 'Your referral "Alex_Crypto" joined BoltQuest. Earn $0.50!' }
];

export default function Notifications() {
  return (
    <div id="notifications" className="tab-content-fade">
      <div className="section-title">
        <Bell size={12} /> Latest Updates
      </div>

      {INITIAL_NOTIFICATIONS.map(notif => (
        <div className="notification-item" key={notif.id}>
          <div className="notif-title">{notif.title}</div>
          <div className="notif-desc">{notif.desc}</div>
        </div>
      ))}
    </div>
  );
}
