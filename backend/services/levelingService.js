const { db } = require('../database');

/**
 * Leveling Service
 * Formula for XP to level up: XP needed for Level L = (L - 1) * 400
 */
const XP_PER_LEVEL = 400;

function getXPForLevel(level) {
  return (level - 1) * XP_PER_LEVEL;
}

function getLevelFromXP(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function addXP(userId, xpAmount) {
  return new Promise((resolve, reject) => {
    db.get('SELECT xp, level, username FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) return reject(err);
      if (!user) return reject(new Error('User not found'));

      const newXP = user.xp + xpAmount;
      const newLevel = getLevelFromXP(newXP);
      const leveledUp = newLevel > user.level;

      db.run(
        'UPDATE users SET xp = ?, level = ? WHERE id = ?',
        [newXP, newLevel, userId],
        function(updateErr) {
          if (updateErr) return reject(updateErr);

          resolve({
            userId,
            username: user.username,
            oldXP: user.xp,
            newXP,
            oldLevel: user.level,
            newLevel,
            leveledUp,
            xpForNextLevel: getXPForLevel(newLevel + 1)
          });
        }
      );
    });
  });
}

module.exports = {
  getXPForLevel,
  getLevelFromXP,
  addXP
};
