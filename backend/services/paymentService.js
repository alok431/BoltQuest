const { db } = require('../database');

/**
 * Payment Service (Stripe/Razorpay Mock)
 * Simulates upgrading user status to Premium.
 */

function subscribePremium(userId, paymentMethod = 'coins', txHash = '') {
  return new Promise((resolve, reject) => {
    db.get('SELECT premium_status, username, balance FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) return reject(err);
      if (!user) return reject(new Error('User not found'));

      const isAlreadyPremium = user.premium_status === 1;
      const nextYearDate = new Date();
      nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);
      const expiryString = nextYearDate.toISOString().split('T')[0];

      if (paymentMethod === 'coins') {
        const cost = 2000;
        if (user.balance < cost) {
          return reject(new Error('Insufficient Coins balance. You need 2,000 Coins to upgrade.'));
        }
        
        db.serialize(() => {
          db.run(
            `UPDATE users
             SET premium_status = 1, premium_expiry = ?, balance = balance - ?
             WHERE id = ?`,
            [expiryString, cost, userId],
            function(updateErr) {
              if (updateErr) return reject(updateErr);

              // Add transaction record
              db.run(`
                INSERT INTO transactions (user_id, type, amount, points, status, details)
                VALUES (?, 'subscription', ?, 0, 'completed', 'Subscribed to Premium (Paid 2,000 Coins)')
              `, [userId, -cost]);

              // Award Premium achievement if not already earned
              db.run(`
                INSERT INTO user_achievements (user_id, achievement_id)
                SELECT ?, id FROM achievements WHERE name = 'Premium Member'
                ON CONFLICT (user_id, achievement_id) DO NOTHING
              `, [userId]);

              resolve({
                success: true,
                username: user.username,
                premiumStatus: 1,
                premiumExpiry: expiryString,
                message: isAlreadyPremium ? 'Premium subscription renewed!' : 'Successfully upgraded to Premium using 2,000 Coins!'
              });
            }
          );
        });
      } else {
        // paid via TON
        const tonAmount = 1.18; 
        const transactionHash = txHash || '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
        
        db.serialize(() => {
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
                VALUES (?, 'subscription', ?, 0, 'completed', ?)
              `, [userId, -tonAmount, `Subscribed to Premium (Paid ${tonAmount} TON, Tx: ${transactionHash.substring(0, 10)}...)`]);

              // Award Premium achievement if not already earned
              db.run(`
                INSERT INTO user_achievements (user_id, achievement_id)
                SELECT ?, id FROM achievements WHERE name = 'Premium Member'
                ON CONFLICT (user_id, achievement_id) DO NOTHING
              `, [userId]);

              resolve({
                success: true,
                username: user.username,
                premiumStatus: 1,
                premiumExpiry: expiryString,
                message: isAlreadyPremium ? 'Premium subscription renewed!' : `Successfully upgraded to Premium using ${tonAmount} TON!`
              });
            }
          );
        });
      }
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
