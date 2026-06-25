const express = require('express');
const router = express.Router();
const { db } = require('../database');

const DEFAULT_USER_ID = 1;

// GET /api/achievements
router.get('/', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  // Retrieve all achievements and check if user_achievements contains them
  const query = `
    SELECT a.*, CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as earned, ua.earned_at
    FROM achievements a
    LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
