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
  const { amount, method } = req.body; // method could be 'PayPal' or 'Bank Transfer'

  const withdrawAmount = parseFloat(amount);
  if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  db.get('SELECT balance, email FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.balance < withdrawAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Deduct balance and insert transaction
    db.serialize(() => {
      db.run(
        'UPDATE users SET balance = balance - ? WHERE id = ?',
        [withdrawAmount, userId],
        function(updateErr) {
          if (updateErr) return res.status(500).json({ error: updateErr.message });

          const details = `${method || 'TON Wallet'} Withdrawal to ${req.body.address || 'UQDxTONWallet...'}`;
          
          db.run(
            `INSERT INTO transactions (user_id, type, amount, points, status, details)
             VALUES (?, 'withdrawal', ?, 0, 'completed', ?)`,
            [userId, -withdrawAmount, details],
            function(insertErr) {
              if (insertErr) return res.status(500).json({ error: insertErr.message });

              res.json({
                success: true,
                message: 'Withdrawal request completed successfully!',
                withdrawnAmount: withdrawAmount,
                newBalance: user.balance - withdrawAmount
              });
            }
          );
        }
      );
    });
  });
});

module.exports = router;
