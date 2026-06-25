const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { approveTask, rejectTask } = require('../services/taskVerification');

// GET /api/admin/pending-tasks
router.get('/pending-tasks', (req, res) => {
  const query = `
    SELECT ut.id as user_task_id, ut.user_id, ut.task_id, ut.status, ut.proof, ut.completed_at,
           u.username, t.title as task_title, t.reward_amount, t.category
    FROM user_tasks ut
    JOIN users u ON ut.user_id = u.id
    JOIN tasks t ON ut.task_id = t.id
    WHERE ut.status = 'verifying'
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/admin/approve-task
router.post('/approve-task', async (req, res) => {
  const { userId, taskId } = req.body;
  if (!userId || !taskId) {
    return res.status(400).json({ error: 'userId and taskId are required' });
  }
  try {
    const result = await approveTask(userId, taskId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/reject-task
router.post('/reject-task', async (req, res) => {
  const { userId, taskId } = req.body;
  if (!userId || !taskId) {
    return res.status(400).json({ error: 'userId and taskId are required' });
  }
  try {
    const result = await rejectTask(userId, taskId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/withdrawals
router.get('/withdrawals', (req, res) => {
  db.all(`
    SELECT t.*, u.username
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    WHERE t.type = 'withdrawal'
    ORDER BY t.created_at DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST /api/admin/approve-withdrawal
router.post('/approve-withdrawal', (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) {
    return res.status(400).json({ error: 'transactionId is required' });
  }
  db.run(
    "UPDATE transactions SET status = 'completed' WHERE id = ?",
    [transactionId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Withdrawal marked as completed' });
    }
  );
});

// POST /api/admin/add-task
router.post('/add-task', (req, res) => {
  const { title, description, reward_type, reward_amount, is_premium, category, url } = req.body;
  db.run(
    `INSERT INTO tasks (title, description, reward_type, reward_amount, is_premium, category, url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description, reward_type || 'balance', reward_amount, is_premium ? 1 : 0, category || 'easy', url],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Task added successfully!', taskId: this.lastID });
    }
  );
});

module.exports = router;
