const express = require('express');
const router = express.Router();
const { db } = require('../database');

const DEFAULT_USER_ID = 1;

// GET /api/challenges
router.get('/', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  // Select all challenges, and join user_challenges to get current progress
  const query = `
    SELECT c.*, COALESCE(uc.current_progress, 0) as current_progress, COALESCE(uc.completed, 0) as completed
    FROM challenges c
    LEFT JOIN user_challenges uc ON c.id = uc.challenge_id AND uc.user_id = ?
  `;

  db.all(query, [userId], (err, challenges) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(challenges);
  });
});

module.exports = router;
