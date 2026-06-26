const express = require('express');
const router = express.Router();
const { db, initDatabase } = require('../database');
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

// GET /api/admin/db-schema (Temporary schema inspector)
router.get('/db-schema', (req, res) => {
  db.all(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `, [], (err, rows) => {
    if (err) {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (sqliteErr, sqliteRows) => {
        if (sqliteErr) return res.status(500).json({ error: err.message, sqliteError: sqliteErr.message });
        res.json({ type: 'sqlite', tables: sqliteRows });
      });
    } else {
      res.json({ type: 'postgres', schema: rows });
    }
  });
});

// POST /api/admin/db-reset (Temporary database reset/recreation)
router.post('/db-reset', (req, res) => {
  const tables = [
    'user_ad_views', 'user_promos', 'user_tasks', 'user_surveys', 'user_challenges',
    'referrals', 'leaderboard', 'transactions', 'tasks', 'surveys', 'user_achievements', 'achievements',
    'users', 'ads'
  ];
  
  const dropQueries = tables.map(t => `DROP TABLE IF EXISTS ${t} CASCADE;`);
  let executedCount = 0;
  let errors = [];
  
  function runNextQuery() {
    if (executedCount < dropQueries.length) {
      const q = dropQueries[executedCount];
      db.run(q, [], (err) => {
        if (err) errors.push({ query: q, error: err.message });
        executedCount++;
        runNextQuery();
      });
    } else {
      // Re-initialize tables and seed data
      try {
        initDatabase();
        setTimeout(() => {
          res.json({
            success: errors.length === 0,
            message: 'Database tables dropped, recreated, and seeded successfully.',
            errors: errors.length > 0 ? errors : null
          });
        }, 1000); // Small delay to let initDatabase query executions queue up
      } catch (initErr) {
        res.status(500).json({ error: initErr.message, dropErrors: errors });
      }
    }
  }
  
  runNextQuery();
});

module.exports = router;
