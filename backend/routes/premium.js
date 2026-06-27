const express = require('express');
const router = express.Router();
const { subscribePremium, cancelPremium } = require('../services/paymentService');

const DEFAULT_USER_ID = 1;

// POST /api/premium/subscribe
router.post('/subscribe', async (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { paymentMethod, txHash } = req.body;

  try {
    const result = await subscribePremium(userId, paymentMethod, txHash);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/premium/cancel
router.post('/cancel', async (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  try {
    const result = await cancelPremium(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
