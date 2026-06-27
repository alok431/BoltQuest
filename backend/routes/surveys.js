const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { addXP } = require('../services/levelingService');

const DEFAULT_USER_ID = 1;

// GET /api/surveys/cpx-url
router.get('/cpx-url', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const appId = process.env.CPX_APP_ID || 'your_cpx_app_id_here';
  const secretKey = process.env.CPX_SECRET_KEY || 'your_cpx_secret_key_here';
  
  const crypto = require('crypto');
  const hash = crypto
    .createHash('md5')
    .update(`${userId}-${secretKey}`)
    .digest('hex');
    
  const cpxUrl = `https://offers.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${userId}&secure_hash=${hash}`;
  
  res.json({ url: cpxUrl });
});

// GET /api/surveys
router.get('/', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;

  const query = `
    SELECT s.*, CASE WHEN us.id IS NOT NULL THEN 1 ELSE 0 END as completed, us.completed_at
    FROM surveys s
    LEFT JOIN user_surveys us ON s.id = us.survey_id AND us.user_id = ?
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Parse questions_json back to JS object
    const parsed = rows.map(r => ({
      ...r,
      questions: JSON.parse(r.questions_json || '[]')
    }));
    
    res.json(parsed);
  });
});

// POST /api/surveys/complete
router.post('/complete', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { surveyId, answers } = req.body;

  if (!surveyId) {
    return res.status(400).json({ error: 'surveyId is required' });
  }

  // 1. Fetch survey details
  db.get('SELECT * FROM surveys WHERE id = ?', [surveyId], (err, survey) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!survey) return res.status(404).json({ error: 'Survey not found' });

    // 2. Check if already completed
    db.get('SELECT * FROM user_surveys WHERE user_id = ? AND survey_id = ?', [userId, surveyId], (usErr, completedSurvey) => {
      if (usErr) return res.status(500).json({ error: usErr.message });
      if (completedSurvey) return res.status(400).json({ error: 'Survey already completed' });

      // 3. Mark completed
      db.run(
        'INSERT INTO user_surveys (user_id, survey_id) VALUES (?, ?)',
        [userId, surveyId],
        function(insertErr) {
          if (insertErr) return res.status(500).json({ error: insertErr.message });

          // 4. Calculate rewards
          let rewardAmount = survey.reward_amount;
          let rewardPoints = survey.reward_points;
          let xpGained = 60; // 60 XP for surveys

          // Get user details to apply Premium double booster
          db.get('SELECT premium_status FROM users WHERE id = ?', [userId], async (uErr, user) => {
            if (uErr) return res.status(500).json({ error: uErr.message });

            if (user && user.premium_status === 1) {
              rewardAmount *= 2;
              rewardPoints *= 2;
              xpGained *= 2;
            }

            // Update user balance and points
            db.run(
              'UPDATE users SET balance = balance + ?, points = points + ? WHERE id = ?',
              [rewardAmount, rewardPoints, userId],
              async function(updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });

                try {
                  // Add XP
                  const levelResult = await addXP(userId, xpGained);

                  // Record transaction log
                  db.run(`
                    INSERT INTO transactions (user_id, type, amount, points, status, details)
                    VALUES (?, 'survey_earning', ?, ?, 'completed', ?)
                  `, [userId, rewardAmount, rewardPoints, `Completed Survey: ${survey.title}`]);

                  // Trigger mock updates to challenges if applicable (e.g. daily tasks done)
                  db.run(`
                    UPDATE user_challenges
                    SET current_progress = CASE 
                      WHEN current_progress + 1 > (SELECT target_count FROM challenges WHERE id = 1) 
                      THEN (SELECT target_count FROM challenges WHERE id = 1)
                      ELSE current_progress + 1 
                    END
                    WHERE user_id = ? AND challenge_id = 1 AND completed = 0
                  `, [userId]);

                  res.json({
                    success: true,
                    surveyTitle: survey.title,
                    rewardAmount,
                    rewardPoints,
                    xpGained,
                    levelInfo: levelResult
                  });
                } catch (lvlErr) {
                  res.status(500).json({ error: lvlErr.message });
                }
              }
            );
          });
        }
      );
    });
  });
});

// POST /api/surveys/create
router.post('/create', (req, res) => {
  const userId = req.headers['user-id'] || DEFAULT_USER_ID;
  const { title, description, reward_amount, time_estimate, questions, paymentMethod, txHash } = req.body;

  if (!title || !questions) {
    return res.status(400).json({ error: 'Title and Questions are required' });
  }

  const reward = parseInt(reward_amount, 10) || 850;
  const points = Math.round(reward * 0.5); // automatically calculate points reward
  const timeEst = parseInt(time_estimate, 10) || 5;
  const fee = 2000;
  const tonFee = 1.18;

  const questionsJson = typeof questions === 'string' ? questions : JSON.stringify(questions);

  db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (paymentMethod === 'coins') {
      if (user.balance < fee) {
        return res.status(400).json({ error: `Insufficient Coins balance. Creating this survey requires ${fee} Coins.` });
      }

      db.serialize(() => {
        // Deduct fee
        db.run(
          'UPDATE users SET balance = balance - ? WHERE id = ?',
          [fee, userId],
          function(updateErr) {
            if (updateErr) return res.status(500).json({ error: updateErr.message });

            // Create survey
            db.run(
              `INSERT INTO surveys (title, description, reward_amount, reward_points, time_estimate, questions_json)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [title, description || 'Custom User Survey', reward, points, timeEst, questionsJson],
              function(insertErr) {
                if (insertErr) return res.status(500).json({ error: insertErr.message });
                const newSurveyId = this.lastID;

                // Record transaction
                db.run(
                  `INSERT INTO transactions (user_id, type, amount, points, status, details)
                   VALUES (?, 'campaign_fee', ?, 0, 'completed', ?)`,
                  [userId, -fee, `Published Survey: ${title} (Survey ID: ${newSurveyId})`]
                );

                res.json({ success: true, message: 'Survey campaign created successfully!', surveyId: newSurveyId });
              }
            );
          }
        );
      });
    } else {
      // Payment method = 'ton'
      const hash = txHash || '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
      
      db.serialize(() => {
        db.run(
          `INSERT INTO surveys (title, description, reward_amount, reward_points, time_estimate, questions_json)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [title, description || 'Custom User Survey', reward, points, timeEst, questionsJson],
          function(insertErr) {
            if (insertErr) return res.status(500).json({ error: insertErr.message });
            const newSurveyId = this.lastID;

            // Record transaction
            db.run(
              `INSERT INTO transactions (user_id, type, amount, points, status, details)
               VALUES (?, 'campaign_fee', ?, 0, 'completed', ?)`,
              [userId, -tonFee, `Published Survey: ${title} (Paid ${tonFee} TON, Tx: ${hash.substring(0, 10)}...)`]
            );

            res.json({ success: true, message: 'Survey campaign created successfully!', surveyId: newSurveyId });
          }
        );
      });
    }
  });
});

module.exports = router;
