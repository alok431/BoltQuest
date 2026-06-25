const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../database');

// Replace these with your actual App Secrets from the publisher panels
const TOROX_SECRET_KEY = process.env.TOROX_SECRET_KEY || 'your_torox_secret_key_here';
const NOTIK_SECRET_KEY = process.env.NOTIK_SECRET_KEY || 'your_notik_secret_key_here';

/**
 * 1. TOROX POSTBACK WEBHOOK
 * Torox sends GET requests. Example parameters:
 * /api/postback/torox?user_id=1&amount=5.50&o_name=VegasSlots&sig=HASH
 */
router.get('/torox', (req, res) => {
  const { user_id, amount, o_name, sig, o_id } = req.query;

  if (!user_id || !amount || !sig) {
    return res.status(400).send('Missing required parameters');
  }

  // Verify Signature to prevent user spoofing
  // Torox signature formula: md5(o_id + user_id + secret_key)
  const computedSig = crypto
    .createHash('md5')
    .update(`${o_id}${user_id}${TOROX_SECRET_KEY}`)
    .digest('hex');

  if (sig !== computedSig && TOROX_SECRET_KEY !== 'your_torox_secret_key_here') {
    return res.status(403).send('Invalid signature');
  }

  const rewardAmount = parseFloat(amount);

  // Credit user balance in SQLite
  db.run(
    'UPDATE users SET balance = balance + ?, points = points + ? WHERE id = ?',
    [rewardAmount, Math.round(rewardAmount * 100), user_id],
    function(err) {
      if (err) return res.status(500).send(err.message);
      
      // Record transaction
      db.run(
        `INSERT INTO transactions (user_id, type, amount, points, status, details)
         VALUES (?, 'task_earning', ?, ?, 'completed', ?)`,
        [user_id, rewardAmount, Math.round(rewardAmount * 100), `Torox Offerwall: ${o_name || 'Offer completed'}`]
      );

      // Return success signal to Torox (usually 1 or success)
      res.send('1'); 
    }
  );
});

/**
 * 2. NOTIK.ME POSTBACK WEBHOOK
 * Notik sends GET requests. Example parameters:
 * /api/postback/notik?user_id=1&amount=10.00&offer_name=LordsMobile&hash=HASH
 */
router.get('/notik', (req, res) => {
  const { user_id, amount, offer_name, hash, txn_id } = req.query;

  if (!user_id || !amount || !hash) {
    return res.status(400).send('Missing required parameters');
  }

  // Notik signature formula: sha256(txn_id + secret_key)
  const computedHash = crypto
    .createHash('sha256')
    .update(`${txn_id}${NOTIK_SECRET_KEY}`)
    .digest('hex');

  if (hash !== computedHash && NOTIK_SECRET_KEY !== 'your_notik_secret_key_here') {
    return res.status(403).send('Invalid signature');
  }

  const rewardAmount = parseFloat(amount);

  db.run(
    'UPDATE users SET balance = balance + ?, points = points + ? WHERE id = ?',
    [rewardAmount, Math.round(rewardAmount * 100), user_id],
    function(err) {
      if (err) return res.status(500).send(err.message);

      // Record transaction
      db.run(
        `INSERT INTO transactions (user_id, type, amount, points, status, details)
         VALUES (?, 'task_earning', ?, ?, 'completed', ?)`,
        [user_id, rewardAmount, Math.round(rewardAmount * 100), `Notik Offerwall: ${offer_name || 'Offer completed'}`]
      );

      res.json({ success: true });
    }
  );
});

module.exports = router;
