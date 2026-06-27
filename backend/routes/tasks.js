const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { verifyTask } = require('../services/taskVerification');

const DEFAULT_USER_ID = 1;

// GET /api/tasks
router.get('/', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  // Select all tasks, and left join user_tasks to see if user started/completed them
  const query = `
    SELECT t.*, ut.status as user_status, ut.completed_at
    FROM tasks t
    LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.user_id = ?
  `;

  db.all(query, [userId], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tasks);
  });
});

// POST /api/tasks/complete
router.post('/complete', async (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { taskId, proof } = req.body;

  if (!taskId) {
    return res.status(400).json({ error: 'taskId is required' });
  }

  try {
    const result = await verifyTask(userId, taskId, proof);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/tasks/trending
router.get('/trending', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  const query = `
    SELECT t.id, t.title, t.description, t.reward_type, t.reward_amount, t.is_premium, t.category, t.url,
           COUNT(ut.id) as completion_count,
           (SELECT status FROM user_tasks WHERE user_id = ? AND task_id = t.id) as user_status
    FROM tasks t
    LEFT JOIN user_tasks ut ON t.id = ut.task_id AND ut.status = 'completed'
    GROUP BY t.id, t.title, t.description, t.reward_type, t.reward_amount, t.is_premium, t.category, t.url
    ORDER BY completion_count DESC, t.id ASC
    LIMIT 5
  `;

  db.all(query, [userId], (err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tasks);
  });
});

// POST /api/tasks/create
router.post('/create', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { title, description, reward_amount, is_premium, url, paymentMethod, txHash } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }

  const reward = parseInt(reward_amount, 10) || 255;
  const isPremium = is_premium ? 1 : 0;
  const fee = isPremium ? 2500 : 1000;
  const tonFee = isPremium ? 1.47 : 0.59;
  const category = isPremium ? 'premium' : 'easy';

  db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (paymentMethod === 'coins') {
      if (user.balance < fee) {
        return res.status(400).json({ error: `Insufficient Coins balance. Creating this task requires ${fee} Coins.` });
      }

      db.serialize(() => {
        // Deduct fee
        db.run(
          'UPDATE users SET balance = balance - ? WHERE id = ?',
          [fee, userId],
          function(updateErr) {
            if (updateErr) return res.status(500).json({ error: updateErr.message });

            // Create task
            db.run(
              `INSERT INTO tasks (title, description, reward_type, reward_amount, is_premium, category, url)
               VALUES (?, ?, 'balance', ?, ?, ?, ?)`,
              [title, description || 'Custom Task Campaign', reward, isPremium, category, url],
              function(insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                const newTaskId = this.lastID;

                // Record transaction
                db.run(
                  `INSERT INTO transactions (user_id, type, amount, points, status, details)
                   VALUES (?, 'campaign_fee', ?, 0, 'completed', ?)`,
                  [userId, -fee, `Published Campaign: ${title} (Task ID: ${newTaskId})`]
                );

                res.json({ success: true, message: 'Campaign created successfully!', taskId: newTaskId });
              }
            );
          }
        );
      });
    } else {
      // Payment method = 'ton'
      const hash = txHash || '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
      
      db.serialize(() => {
        db.run(
          `INSERT INTO tasks (title, description, reward_type, reward_amount, is_premium, category, url)
           VALUES (?, ?, 'balance', ?, ?, ?, ?)`,
          [title, description || 'Custom Task Campaign', reward, isPremium, category, url],
          function(insertErr) {
            if (insertErr) return res.status(500).json({ error: insertErr.message });
            const newTaskId = this.lastID;

            // Record transaction
            db.run(
              `INSERT INTO transactions (user_id, type, amount, points, status, details)
               VALUES (?, 'campaign_fee', ?, 0, 'completed', ?)`,
              [userId, -tonFee, `Published Campaign: ${title} (Paid ${tonFee} TON, Tx: ${hash.substring(0, 10)}...)`]
            );

            res.json({ success: true, message: 'Campaign created successfully!', taskId: newTaskId });
          }
        );
      });
    }
  });
});

module.exports = router;
