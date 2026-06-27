const express = require('express');
const router = express.Router();
const { db } = require('../database');

// For simplicity, we default to the first user (Aditya Kumar, user_id = 1) if no Telegram authentication is sent.
// In a production app, we would verify Telegram WebApp initData here.
const DEFAULT_USER_ID = 1;

// POST /api/user/auth
router.post('/auth', (req, res) => {
  const { telegramId, username, email } = req.body;

  if (!telegramId) {
    return res.status(400).json({ error: 'telegramId is required' });
  }

  // Check if user exists by telegram_id
  db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    if (user) {
      // User exists, return user
      return res.json(user);
    }

    // New user signup - initial Coins balance = 0, points = 0, level = 1, xp = 0
    const isPostgres = !!process.env.DATABASE_URL;
    const insertSql = isPostgres
      ? `INSERT INTO users (telegram_id, username, email, level, xp, balance, points, premium_status, login_streak)
         VALUES (?, ?, ?, 1, 0, 0, 0, 0, 0) RETURNING id`
      : `INSERT INTO users (telegram_id, username, email, level, xp, balance, points, premium_status, login_streak)
         VALUES (?, ?, ?, 1, 0, 0, 0, 0, 0)`;

    db.run(
      insertSql,
      [telegramId, username || 'Telegram User', email || ''],
      function(insertErr) {
        if (insertErr) return res.status(500).json({ error: insertErr.message });
        
        const newUserId = this.lastID;
        db.get('SELECT * FROM users WHERE id = ?', [newUserId], (getErr, newUser) => {
          if (getErr) return res.status(500).json({ error: getErr.message });
          res.status(201).json(newUser);
        });
      }
    );
  });
});

// GET /api/user
router.get('/', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const todayStart = new Date().toISOString().split('T')[0] + ' 00:00:00';

    db.get('SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND status = \'completed\'', [userId], (err1, tasksRow) => {
      db.get('SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?', [userId], (err2, refRow) => {
        db.get('SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND amount > 0', [userId], (err3, earnRow) => {
          db.get('SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ? AND status = \'completed\' AND completed_at >= ?', [userId, todayStart], (err4, todayRow) => {
            db.get('SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND amount > 0 AND created_at >= ?', [userId, todayStart], (err5, todayEarnRow) => {
              
              const stats = {
                tasksCompleted: tasksRow?.count || 0,
                referralsCount: refRow?.count || 0,
                totalEarned: earnRow?.total || 0,
                todayTasksCompleted: todayRow?.count || 0,
                todayEarned: todayEarnRow?.total || 0
              };

              res.json({
                ...user,
                stats
              });
            });
          });
        });
      });
    });
  });
});

// POST /api/user/daily-bonus
const activeDailyBonusClaims = new Set();

router.post('/daily-bonus', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  if (activeDailyBonusClaims.has(userId)) {
    return res.status(429).json({ error: 'Claim in progress, please try again.' });
  }
  
  activeDailyBonusClaims.add(userId);
  
  db.get('SELECT balance, login_streak, last_login_date, streak_freezes FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      activeDailyBonusClaims.delete(userId);
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      activeDailyBonusClaims.delete(userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Anti-fraud: Block claiming multiple times on the same calendar day
    if (user.last_login_date === todayStr) {
      activeDailyBonusClaims.delete(userId);
      return res.status(400).json({ error: 'Daily bonus already claimed today' });
    }

    let newStreak = 1;
    let streakFreezeConsumed = false;
    if (user.last_login_date) {
      const lastLogin = new Date(user.last_login_date);
      const d1 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
      const d2 = Date.UTC(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
      const diffDays = Math.floor((d1 - d2) / 86400000);

      if (diffDays === 1) {
        // Continued streak
        newStreak = ((user.login_streak || 0) % 7) + 1;
      } else if (diffDays > 1 && user.streak_freezes > 0) {
        // Streak broken but protected by Streak Freeze!
        newStreak = ((user.login_streak || 0) % 7) + 1;
        streakFreezeConsumed = true;
      } else {
        // Streak broken
        newStreak = 1;
      }
    } else {
      // First daily claim
      newStreak = 1;
    }
    
    const rewards = {
      1: 850,
      2: 1700,
      3: 2550,
      4: 3400,
      5: 4250,
      6: 5100,
      7: 8500
    };
    const bonusAmount = rewards[newStreak] || 4250;
    
    const updateSql = streakFreezeConsumed
      ? 'UPDATE users SET balance = balance + ?, login_streak = ?, last_login_date = ?, streak_freezes = streak_freezes - 1 WHERE id = ? AND (last_login_date IS NULL OR last_login_date != ?)'
      : 'UPDATE users SET balance = balance + ?, login_streak = ?, last_login_date = ? WHERE id = ? AND (last_login_date IS NULL OR last_login_date != ?)';

    // Update user balance, login_streak, and last_login_date
    db.run(
      updateSql,
      [bonusAmount, newStreak, todayStr, userId, todayStr],
      function(updateErr) {
        activeDailyBonusClaims.delete(userId);

        if (updateErr) return res.status(500).json({ error: updateErr.message });

        if (this.changes === 0) {
          return res.status(400).json({ error: 'Daily bonus already claimed today' });
        }

        // Record transaction
        const detailMessage = streakFreezeConsumed
          ? `Claimed Day ${newStreak} Streak (Protected by Streak Freeze)`
          : `Claimed Day ${newStreak} Daily Bonus`;

        db.run(
          `INSERT INTO transactions (user_id, type, amount, points, status, details)
           VALUES (?, 'daily_bonus', ?, 0, 'completed', ?)`,
          [userId, bonusAmount, detailMessage]
        );

        res.json({
          success: true,
          message: streakFreezeConsumed 
            ? `Day ${newStreak} Claimed! Your streak was restored using a Streak Freeze.` 
            : `Day ${newStreak} Daily bonus claimed!`,
          bonusAmount,
          newStreak,
          newBalance: user.balance + bonusAmount,
          streakFreezeConsumed
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

// POST /api/user/wallet
router.post('/wallet', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { walletAddress } = req.body;

  db.run('UPDATE users SET ton_wallet = ? WHERE id = ?', [walletAddress || null, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, walletAddress });
  });
});

module.exports = router;
