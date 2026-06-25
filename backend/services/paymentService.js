const { db } = require('../database');

/**
 * Payment Service (Stripe/Razorpay Mock)
 * Simulates upgrading user status to Premium.
 */

function subscribePremium(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT premium_status, username FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) return reject(err);
      if (!user) return reject(new Error('User not found'));

      const isAlreadyPremium = user.premium_status === 1;
      const nextYearDate = new Date();
      nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
      const expiryString = nextYearDate.toISOString().split('T')[0];

      db.run(
        `UPDATE users
         SET premium_status = 1, premium_expiry = ?
         WHERE id = ?`,
        [expiryString, userId],
        function(updateErr) {
          if (updateErr) return reject(updateErr);

          // Add transaction record
          db.run(`
            INSERT INTO transactions (user_id, type, amount, points, status, details)
            VALUES (?, 'subscription', -250, 0, 'completed', 'Subscribed to Premium Membership (250 Stars)')
          `, [userId]);

          // Award Premium achievement if not already earned
          db.run(`
            INSERT OR IGNORE INTO user_achievements (user_id, achievement_id)
            SELECT ?, id FROM achievements WHERE name = 'Premium Member'
          `, [userId]);

          resolve({
            success: true,
            username: user.username,
            premiumStatus: 1,
            premiumExpiry: expiryString,
            message: isAlreadyPremium ? 'Premium subscription renewed!' : 'Successfully upgraded to Premium!'
          });
        }
      );
    });
  });
}

function cancelPremium(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT premium_status, username FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) return reject(err);
      if (!user) return reject(new Error('User not found'));

      db.run(
        `UPDATE users
         SET premium_status = 0, premium_expiry = NULL
         WHERE id = ?`,
        [userId],
        function(updateErr) {
          if (updateErr) return reject(updateErr);

          resolve({
            success: true,
            username: user.username,
            premiumStatus: 0,
            message: 'Premium subscription cancelled successfully.'
          });
        }
      );
    });
  });
}

module.exports = {
  subscribePremium,
  cancelPremium
};
