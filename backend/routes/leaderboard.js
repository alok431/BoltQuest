const express = require('express');
const router = express.Router();
const { getLeaderboard, updateLeaderboardCache, getReferralsLeaderboard } = require('../services/leaderboardService');

// GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    // Optionally trigger ranking update dynamically before retrieval, or use cached
    await updateLeaderboardCache();
    const earners = await getLeaderboard();
    const referrals = await getReferralsLeaderboard();
    res.json({
      earners,
      referrals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
