const { db } = require('../database');
const { addXP } = require('./levelingService');

/**
 * Task Verification Service
 * Simulates proof checking for social/premium tasks.
 * Basic tasks are auto-completed instantly.
 * Premium/high-value tasks enter 'verifying' state, awaiting Admin approval.
 */

function verifyTask(userId, taskId, proofText = '') {
  return new Promise((resolve, reject) => {
    // 1. Get task details
    db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
      if (err) return reject(err);
      if (!task) return reject(new Error('Task not found'));

      // 2. Check if already completed
      db.get('SELECT * FROM user_tasks WHERE user_id = ? AND task_id = ?', [userId, taskId], (userTaskErr, userTask) => {
        if (userTaskErr) return reject(userTaskErr);
        if (userTask && userTask.status === 'completed') {
          return reject(new Error('Task already completed'));
        }
        if (userTask && userTask.status === 'verifying') {
          return reject(new Error('Task proof is already under review'));
        }

        const isPremiumTask = task.is_premium === 1 || task.category === 'premium';

        if (isPremiumTask) {
          // Requires review
          db.run(
            `INSERT INTO user_tasks (user_id, task_id, status, proof, completed_at)
             VALUES (?, ?, 'verifying', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id, task_id) DO UPDATE SET
               status = EXCLUDED.status,
               proof = EXCLUDED.proof,
               completed_at = EXCLUDED.completed_at`,
            [userId, taskId, proofText || 'Screenshot proof submitted'],
            function(updateErr) {
              if (updateErr) return reject(updateErr);
              resolve({
                success: true,
                status: 'verifying',
                taskTitle: task.title,
                message: 'Proof submitted successfully! Awaiting manual verification by Admin.'
              });
            }
          );
        } else {
          // Instant completion for basic/easy tasks
          db.run(
            `INSERT INTO user_tasks (user_id, task_id, status, proof, completed_at)
             VALUES (?, ?, 'completed', ?, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id, task_id) DO UPDATE SET
               status = EXCLUDED.status,
               proof = EXCLUDED.proof,
               completed_at = EXCLUDED.completed_at`,
            [userId, taskId, proofText || 'Instant verification successful'],
            async function(updateErr) {
              if (updateErr) return reject(updateErr);
              try {
                const rewardRes = await rewardUserForTask(userId, task);
                resolve(rewardRes);
              } catch (rewardErr) {
                reject(rewardErr);
              }
            }
          );
        }
      });
    });
  });
}

function rewardUserForTask(userId, task) {
  return new Promise((resolve, reject) => {
    const isPremium = task.is_premium === 1;
    let rewardAmount = task.reward_amount;
    let xpGained = isPremium ? 150 : 50;
    let pointsGained = isPremium ? 500 : 100;

    // Check if user has premium status (2x multiplier)
    db.get('SELECT premium_status FROM users WHERE id = ?', [userId], (uErr, user) => {
      if (uErr) return reject(uErr);

      if (user && user.premium_status === 1) {
        rewardAmount *= 2;
        pointsGained *= 2;
        xpGained *= 2;
      }

      // Update user stats
      db.run(
        `UPDATE users
         SET balance = balance + ?, points = points + ?
         WHERE id = ?`,
        [rewardAmount, pointsGained, userId],
        async function(rewardErr) {
          if (rewardErr) return reject(rewardErr);

          try {
            // Add XP and handle potential level ups
            const levelResult = await addXP(userId, xpGained);

            // Record transaction
            db.run(`
              INSERT INTO transactions (user_id, type, amount, points, status, details)
              VALUES (?, 'task_earning', ?, ?, 'completed', ?)
            `, [userId, rewardAmount, pointsGained, `Completed task: ${task.title}`]);

            // Update challenges progress
            updateChallengesProgress(userId, task);

            // Anti-fraud Referral check: If this user has a pending referral, reward the referrer now that they completed their first task
            db.get('SELECT * FROM referrals WHERE referred_id = ? AND status = \'pending\'', [userId], (refErr, referral) => {
              if (!refErr && referral) {
                const referrerId = referral.referrer_id;
                db.run('UPDATE referrals SET status = \'completed\' WHERE id = ?', [referral.id], (upRefErr) => {
                  if (!upRefErr) {
                    db.run('UPDATE users SET points = points + 500, balance = balance + 850 WHERE id = ?', [referrerId], (upUsrErr) => {
                      if (!upUsrErr) {
                        db.run(
                          `INSERT INTO transactions (user_id, type, amount, points, status, details)
                           VALUES (?, 'referral_bonus', 850, 500, 'completed', ?)`,
                          [referrerId, `Referral verified: User (ID: ${userId}) completed their first task`]
                        );
                      }
                    });
                  }
                });
              }
            });

            resolve({
              success: true,
              status: 'completed',
              taskTitle: task.title,
              rewardAmount,
              pointsGained,
              xpGained,
              levelInfo: levelResult
            });
          } catch (lvlErr) {
            reject(lvlErr);
          }
        }
      );
    });
  });
}

function approveTask(userId, taskId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM tasks WHERE id = ?', [taskId], (err, task) => {
      if (err) return reject(err);
      if (!task) return reject(new Error('Task not found'));

      db.run(
        `UPDATE user_tasks SET status = 'completed' WHERE user_id = ? AND task_id = ?`,
        [userId, taskId],
        async function(updateErr) {
          if (updateErr) return reject(updateErr);
          
          try {
            const rewardRes = await rewardUserForTask(userId, task);
            resolve(rewardRes);
          } catch (rewardErr) {
            reject(rewardErr);
          }
        }
      );
    });
  });
}

function rejectTask(userId, taskId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE user_tasks SET status = 'pending', proof = 'Rejected by Admin' WHERE user_id = ? AND task_id = ?`,
      [userId, taskId],
      function(err) {
        if (err) return reject(err);
        resolve({ success: true, message: 'Task proof was rejected. User can re-submit.' });
      }
    );
  });
}

function updateChallengesProgress(userId, task) {
  db.all(`
    SELECT uc.*, c.type, c.target_count, c.reward_amount, c.reward_points
    FROM user_challenges uc
    JOIN challenges c ON uc.challenge_id = c.id
    WHERE uc.user_id = ? AND uc.completed = 0
  `, [userId], (err, challenges) => {
    if (err || !challenges) return;

    challenges.forEach(uc => {
      let increment = 0;
      
      if (uc.challenge_id === 1) {
        increment = 1;
      } else if (uc.challenge_id === 2 && task.category === 'easy') {
        increment = 1;
      } else if (uc.challenge_id === 3 && (task.is_premium === 1 || task.category === 'premium')) {
        increment = 1;
      } else if (uc.challenge_id === 5) {
        increment = Math.round(task.reward_amount);
      }

      if (increment > 0) {
        const newProgress = Math.min(uc.current_progress + increment, uc.target_count);
        const completed = newProgress >= uc.target_count ? 1 : 0;

        db.run(`
          UPDATE user_challenges
          SET current_progress = ?, completed = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newProgress, completed, uc.id], function(progressErr) {
          if (progressErr) return;

          if (completed === 1) {
            db.run(`
              UPDATE users
              SET balance = balance + ?, points = points + ?
              WHERE id = ?
            `, [uc.reward_amount, uc.reward_points, userId], () => {
              db.run(`
                INSERT INTO transactions (user_id, type, amount, points, status, details)
                VALUES (?, 'challenge_reward', ?, ?, 'completed', ?)
              `, [userId, uc.reward_amount, uc.reward_points, `Completed Challenge: ${uc.title || 'Challenge Bonus'}`]);
            });
          }
        });
      }
    });
  });
}

module.exports = {
  verifyTask,
  approveTask,
  rejectTask
};
