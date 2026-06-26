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

module.exports = router;
