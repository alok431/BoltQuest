const express = require('express');
const router = express.Router();
const { getLeaderboard, updateLeaderboardCache } = require('../services/leaderboardService');

// GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    // Optionally trigger ranking update dynamically before retrieval, or use cached
    await updateLeaderboardCache();
    const rankings = await getLeaderboard();
    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
