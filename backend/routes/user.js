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
// POST /api/user/daily-bonus/double
router.post('/daily-bonus/double', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Check if user already got double bonus today
  db.get(
    `SELECT id FROM transactions 
     WHERE user_id = ? AND type = 'daily_bonus_double' 
     AND created_at >= ?`,
    [userId, todayStr + ' 00:00:00'],
    (err, doubleRow) => {
      if (err) return res.status(500).json({ error: err.message });
      if (doubleRow) {
        return res.status(400).json({ error: 'You have already doubled today\'s reward.' });
      }

      // 2. Get the daily bonus claimed today
      db.get(
        `SELECT amount FROM transactions 
         WHERE user_id = ? AND type = 'daily_bonus' 
         AND created_at >= ? 
         ORDER BY created_at DESC LIMIT 1`,
        [userId, todayStr + ' 00:00:00'],
        (err2, bonusRow) => {
          if (err2) return res.status(500).json({ error: err2.message });
          if (!bonusRow) {
            return res.status(400).json({ error: 'Please claim today\'s daily bonus first.' });
          }

          const doubleAmount = Math.abs(bonusRow.amount);

          // 3. Update user balance and insert double bonus transaction
          db.serialize(() => {
            db.run(
              'UPDATE users SET balance = balance + ? WHERE id = ?',
              [doubleAmount, userId],
              function(updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });

                db.run(
                  `INSERT INTO transactions (user_id, type, amount, points, status, details)
                   VALUES (?, 'daily_bonus_double', ?, 0, 'completed', 'Doubled Daily Bonus via Telegram Story Share')`,
                  [userId, doubleAmount],
                  function(insertErr) {
                    if (insertErr) return res.status(500).json({ error: insertErr.message });

                    db.get('SELECT balance FROM users WHERE id = ?', [userId], (err3, userRow) => {
                      res.json({
                        success: true,
                        message: '🎉 Today\'s reward doubled successfully!',
                        doubledAmount: doubleAmount,
                        newBalance: userRow?.balance || 0
                      });
                    });
                  }
                );
              }
            );
          });
        }
      );
    }
  );
});

// GET /api/user/miner-status
router.get('/miner-status', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  db.get('SELECT level, xp, last_miner_claim_time, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const level = user.level || 1;
    const xp = user.xp || 0;
    const ratePerHour = level * 5.0 + (xp * 0.01);
    const capacityHours = 6.0;
    const maxCapacity = ratePerHour * capacityHours;

    const now = Date.now();
    const defaultStartTime = new Date(user.created_at || now).getTime() - (capacityHours * 60 * 60 * 1000);
    const lastClaim = user.last_miner_claim_time ? new Date(user.last_miner_claim_time).getTime() : defaultStartTime;

    const timePassedMs = now - lastClaim;
    const timePassedHours = Math.max(0, timePassedMs / (1000 * 60 * 60));
    const accumulatedCoins = parseFloat(Math.min(maxCapacity, timePassedHours * ratePerHour).toFixed(4));
    const percentFull = Math.min(100, Math.floor((timePassedHours / capacityHours) * 100));
    const secondsRemaining = Math.max(0, Math.floor((capacityHours * 60 * 60 * 1000 - timePassedMs) / 1000));

    res.json({
      accumulatedCoins,
      ratePerHour,
      maxCapacity,
      percentFull,
      secondsRemaining,
      lastClaimTime: user.last_miner_claim_time || null
    });
  });
});

// POST /api/user/miner-claim
router.post('/miner-claim', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  db.get('SELECT balance, level, xp, last_miner_claim_time, created_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const level = user.level || 1;
    const xp = user.xp || 0;
    const ratePerHour = level * 5.0 + (xp * 0.01);
    const capacityHours = 6.0;
    const maxCapacity = ratePerHour * capacityHours;

    const now = Date.now();
    const defaultStartTime = new Date(user.created_at || now).getTime() - (capacityHours * 60 * 60 * 1000);
    const lastClaim = user.last_miner_claim_time ? new Date(user.last_miner_claim_time).getTime() : defaultStartTime;

    const timePassedMs = now - lastClaim;
    const timePassedHours = Math.max(0, timePassedMs / (1000 * 60 * 60));
    const accumulatedCoins = parseFloat(Math.min(maxCapacity, timePassedHours * ratePerHour).toFixed(4));

    if (accumulatedCoins <= 0.01) {
      return res.status(400).json({ error: 'Storage tank has too few coins to claim (min. 0.01).' });
    }

    db.serialize(() => {
      db.run(
        'UPDATE users SET balance = balance + ?, last_miner_claim_time = ? WHERE id = ?',
        [accumulatedCoins, new Date(now).toISOString(), userId],
        function(updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          db.run(
            `INSERT INTO transactions (user_id, type, amount, points, status, details)
             VALUES (?, 'miner_claim', ?, 0, 'completed', 'Claimed passive Bolt Generator earnings')`,
            [userId, accumulatedCoins],
            function(insertErr) {
              if (insertErr) return res.status(500).json({ error: insertErr.message });

              res.json({
                success: true,
                message: `🎉 Claimed ${accumulatedCoins.toFixed(2)} Coins from Bolt Generator!`,
                claimedAmount: accumulatedCoins,
                newBalance: user.balance + accumulatedCoins
              });
            }
          );
        }
      );
    });
  });
});

// POST /api/user/claim-chest
router.post('/claim-chest', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { chestType } = req.body;

  db.get('SELECT balance, premium_status FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let reward = 0;
    let label = '';
    if (chestType === 'bronze') {
      reward = 100;
      label = 'Bronze Adsgram Chest';
    } else if (chestType === 'silver') {
      reward = 250;
      label = 'Silver Adsgram Chest';
    } else if (chestType === 'gold') {
      reward = 600;
      label = 'Gold Adsgram Chest';
    } else {
      return res.status(400).json({ error: 'Invalid chest type' });
    }

    db.serialize(() => {
      db.run(
        'UPDATE users SET balance = balance + ? WHERE id = ?',
        [reward, userId],
        function(updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          db.run(
            `INSERT INTO transactions (user_id, type, amount, points, status, details)
             VALUES (?, 'chest_claim', ?, 0, 'completed', ?)`,
            [userId, reward, `Opened ${label} reward`],
            function(insertErr) {
              if (insertErr) return res.status(500).json({ error: insertErr.message });
              res.json({
                success: true,
                message: `🎉 Opened ${label} and earned ${reward} Coins!`,
                claimedAmount: reward,
                newBalance: user.balance + reward
              });
            }
          );
        }
      );
    });
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
