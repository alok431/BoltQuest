const express = require('express');
const router = express.Router();
const { db } = require('../database');

// For simplicity, we default to the first user (Aditya Kumar, user_id = 1) if no Telegram authentication is sent.
// In a production app, we would verify Telegram WebApp initData here.
const DEFAULT_USER_ID = 1;

// GET /api/user
router.get('/', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });
});

// POST /api/user/daily-bonus
router.post('/daily-bonus', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const todayStr = new Date().toISOString().split('T')[0];
  
  db.get('SELECT balance, login_streak, last_login_date FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // For interactive testing, increment streak on every claim, wrapping at 7
    const newStreak = ((user.login_streak || 0) % 7) + 1;
    
    const rewards = {
      1: 0.50,
      2: 1.00,
      3: 1.50,
      4: 2.00,
      5: 2.50,
      6: 3.00,
      7: 5.00
    };
    const bonusAmount = rewards[newStreak] || 2.50;
    
    // Update user balance, login_streak, and last_login_date
    db.run(
      'UPDATE users SET balance = balance + ?, login_streak = ?, last_login_date = ? WHERE id = ?',
      [bonusAmount, newStreak, todayStr, userId],
      function(updateErr) {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        // Record transaction
        db.run(
          `INSERT INTO transactions (user_id, type, amount, points, status, details)
           VALUES (?, 'daily_bonus', ?, 0, 'completed', 'Claimed Day ${newStreak} Daily Bonus')`,
          [userId, bonusAmount]
        );

        res.json({
          success: true,
          message: `Day ${newStreak} Daily bonus claimed!`,
          bonusAmount,
          newStreak,
          newBalance: user.balance + bonusAmount
        });
      }
    );
  });
});

// POST /api/user/settings
router.post('/settings', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { email, username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  db.run(
    'UPDATE users SET username = ?, email = ? WHERE id = ?',
    [username, email, userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Settings updated successfully' });
    }
  );
});

// POST /api/user/referral
router.post('/referral', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { referrerId } = req.body;

  if (!referrerId || referrerId == userId) {
    return res.status(400).json({ error: 'Invalid referrer ID' });
  }

  // Check if referral record already exists for this referred user
  db.get('SELECT * FROM referrals WHERE referred_id = ?', [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.json({ success: true, message: 'Referral already registered' });

    // Insert new referral as 'pending' (anti-fraud check: rewarded on first completed task)
    db.run(
      'INSERT INTO referrals (referrer_id, referred_id, status) VALUES (?, ?, ?)',
      [referrerId, userId, 'pending'],
      function(insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        res.json({ success: true, message: 'Referral registered (pending verification)' });
      }
    );
  });
});

module.exports = router;
