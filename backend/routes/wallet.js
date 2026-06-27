const express = require('express');
const router = express.Router();
const { db } = require('../database');

const DEFAULT_USER_ID = 1;

// GET /api/wallet/transactions
router.get('/transactions', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  db.all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// POST /api/wallet/withdraw
router.post('/withdraw', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { amount, method } = req.body; // amount is in Coins

  const withdrawCoins = parseInt(amount, 10);
  if (isNaN(withdrawCoins) || withdrawCoins <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  db.get('SELECT balance, email FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.balance < withdrawCoins) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Conversion rate: 1000 coins = 100 INR, 170 INR = 1 TON.
    // 1 coin = 0.1 INR.
    // TON = (coins * 0.1) / 170 = coins / 1700.
    const tonPayout = withdrawCoins / 1700.0;

    // Deduct balance and insert transaction
    db.serialize(() => {
      db.run(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [withdrawCoins, userId],
        function(updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          const details = `Converted ${withdrawCoins} Coins to ${tonPayout.toFixed(4)} TON. ${method || 'TON Wallet'} Payout to ${req.body.address || 'UQDxTONWallet...'}`;
          
          db.run(
            `INSERT INTO transactions (user_id, type, amount, points, status, details)
             VALUES (?, 'withdrawal', ?, 0, 'completed', ?)`,
            [userId, -tonPayout, details],
            function(insertErr) {
              if (insertErr) return res.status(500).json({ error: insertErr.message });

              res.json({
                success: true,
                message: `Withdrawal request completed successfully! Converted ${withdrawCoins} Coins to ${tonPayout.toFixed(4)} TON.`,
                withdrawnCoins: withdrawCoins,
                withdrawnTon: tonPayout,
                newBalance: user.balance - withdrawCoins
              });
            }
          );
        }
      );
    });
  });
});

module.exports = router;
