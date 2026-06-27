const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../database');
const { addXP } = require('../services/levelingService');

// Replace these with your actual App Secrets from the publisher panels
const TOROX_SECRET_KEY = process.env.TOROX_SECRET_KEY || 'your_torox_secret_key_here';
const NOTIK_SECRET_KEY = process.env.NOTIK_SECRET_KEY || 'your_notik_secret_key_here';
const AYET_API_KEY = process.env.AYET_API_KEY || 'your_ayet_api_key_here';
const CPX_SECRET_KEY = process.env.CPX_SECRET_KEY || 'your_cpx_secret_key_here';

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

/**
 * 3. AYET STUDIOS POSTBACK WEBHOOK
 * ayeT-Studios sends GET requests. Example parameters:
 * /api/postback/ayet?user_id=1&amount=10.00&offer_name=LordsMobile&txn_id=12345
 * Header: X-Ayetstudios-Security-Hash
 */
router.get('/ayet', (req, res) => {
  const { user_id, amount, offer_name, txn_id } = req.query;

  if (!user_id || !amount || !txn_id) {
    return res.status(400).send('Missing required parameters');
  }

  // Verify Signature to prevent user spoofing
  const receivedHash = req.headers['x-ayetstudios-security-hash'] || req.headers['X-Ayetstudios-Security-Hash'];

  if (receivedHash) {
    // Sort parameters alphabetically
    const sortedKeys = Object.keys(req.query).sort();
    const sortedParams = new URLSearchParams();
    for (const key of sortedKeys) {
      sortedParams.append(key, req.query[key]);
    }
    const sortedQueryString = sortedParams.toString();

    // Compute expected hash using SHA256 HMAC and Publisher API Key
    const expectedHash = crypto
      .createHmac('sha256', AYET_API_KEY)
      .update(sortedQueryString)
      .digest('hex');

    if (receivedHash !== expectedHash && AYET_API_KEY !== 'your_ayet_api_key_here') {
      return res.status(403).send('Invalid signature');
    }
  } else if (AYET_API_KEY !== 'your_ayet_api_key_here') {
    return res.status(403).send('Missing security hash header');
  }

  let rewardAmount = parseFloat(amount);
  let isReversal = txn_id.startsWith('r-');
  let txType = 'task_earning';
  let txDetails = `Ayet Offerwall: ${offer_name || 'Offer completed'}`;

  if (isReversal) {
    rewardAmount = -rewardAmount; // Deduct balance and points for chargeback
    txType = 'task_reversal';
    txDetails = `Ayet Reversal: ${offer_name || 'Offer charged back'}`;
  }

  // Credit or deduct user balance in SQLite / Postgres
  db.run(
    'UPDATE users SET balance = balance + ?, points = points + ? WHERE id = ?',
    [rewardAmount, Math.round(rewardAmount * 100), user_id],
    function(err) {
      if (err) return res.status(500).send(err.message);

      // Record transaction
      db.run(
        `INSERT INTO transactions (user_id, type, amount, points, status, details)
         VALUES (?, ?, ?, ?, 'completed', ?)`,
        [user_id, txType, rewardAmount, Math.round(rewardAmount * 100), txDetails]
      );

      // ayeT-Studios requires a 200 OK response to acknowledge receipt
      res.status(200).send('OK');
    }
  );
});

/**
 * 4. CPX RESEARCH POSTBACK WEBHOOK
 * CPX Research sends GET requests. Example parameters:
 * /api/postback/cpx?trans_id=123&user_id=1&amount=0.50&status=1&hash=HASH
 */
router.get('/cpx', (req, res) => {
  const { trans_id, user_id, amount, status, hash } = req.query;

  if (!user_id || !amount || !hash || !trans_id) {
    return res.status(400).send('Missing required parameters');
  }

  // Verify Signature to prevent user spoofing
  // CPX signature formula: md5(trans_id + '-' + user_id + '-' + amount + '-' + secret_key)
  const computedHash = crypto
    .createHash('md5')
    .update(`${trans_id}-${user_id}-${amount}-${CPX_SECRET_KEY}`)
    .digest('hex');

  if (hash !== computedHash && CPX_SECRET_KEY !== 'your_cpx_secret_key_here') {
    return res.status(403).send('Invalid signature');
  }

  let rewardAmount = parseFloat(amount);
  let rewardPoints = Math.round(rewardAmount * 100);
  let xpGained = 60; // 60 XP for surveys
  const isReversal = status === '2' || String(status) === '2';

  if (isReversal) {
    rewardAmount = -rewardAmount;
    rewardPoints = -rewardPoints;
    xpGained = -xpGained;
  }

  // Fetch user details to apply Premium double booster
  db.get('SELECT premium_status FROM users WHERE id = ?', [user_id], (uErr, user) => {
    if (uErr) return res.status(500).send(uErr.message);

    // If completed (not reversal) and user has premium, double rewards
    if (!isReversal && user && user.premium_status === 1) {
      rewardAmount *= 2;
      rewardPoints *= 2;
      xpGained *= 2;
    }

    const txType = isReversal ? 'survey_reversal' : 'survey_earning';
    let txDetails = isReversal
      ? `CPX Research Survey Chargeback (ID: ${trans_id})`
      : `CPX Research Survey Completed (ID: ${trans_id})`;

    if (!isReversal && user && user.premium_status === 1) {
      txDetails += ' (2x Premium Booster)';
    }

    // Update user balance and points in SQLite
    db.run(
      'UPDATE users SET balance = balance + ?, points = points + ? WHERE id = ?',
      [rewardAmount, rewardPoints, user_id],
      async function(updateErr) {
        if (updateErr) return res.status(500).send(updateErr.message);

        try {
          if (!isReversal) {
            await addXP(user_id, xpGained);
          }

          // Record transaction log
          db.run(
            `INSERT INTO transactions (user_id, type, amount, points, status, details)
             VALUES (?, ?, ?, ?, 'completed', ?)`,
            [user_id, txType, rewardAmount, rewardPoints, txDetails]
          );

          res.send('1');
        } catch (xpErr) {
          console.error('Error adding XP in CPX webhook:', xpErr);
          // Record transaction log and send success anyway to avoid repeat retries
          db.run(
            `INSERT INTO transactions (user_id, type, amount, points, status, details)
             VALUES (?, ?, ?, ?, 'completed', ?)`,
            [user_id, txType, rewardAmount, rewardPoints, txDetails]
          );
          res.send('1');
        }
      }
    );
  });
});

module.exports = router;
