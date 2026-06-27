const path = require('path');
require('dotenv').config();

let db;
let pool = null;
let initDatabase;

if (process.env.DATABASE_URL) {
  console.log("Using Supabase PostgreSQL Database...");
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for secure external connections to Supabase
    }
  });

  // A wrapper to match the SQLite API (db.run, db.get, db.all)
  // Translates "?" placeholders to PostgreSQL "$1", "$2", etc. formats
  db = {
    run: (sql, params, callback) => {
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      pool.query(pgSql, params || [], (err, res) => {
        if (callback) {
          if (err) {
            callback(err);
          } else {
            const context = {
              lastID: res.insertId || (res.rows && res.rows[0] ? res.rows[0].id : null),
              changes: res.rowCount
            };
            callback.call(context, null, context);
          }
        }
      });
    },
    get: (sql, params, callback) => {
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      pool.query(pgSql, params || [], (err, res) => {
        if (callback) {
          if (err) callback(err);
          else callback(null, res.rows[0]);
        }
      });
    },
    all: (sql, params, callback) => {
      let index = 1;
      const pgSql = sql.replace(/\?/g, () => `$${index++}`);
      pool.query(pgSql, params || [], (err, res) => {
        if (callback) {
          if (err) callback(err);
          else callback(null, res.rows);
        }
      });
    },
    prepare: (sql) => {
      const runs = [];
      return {
        run: (...params) => {
          runs.push(new Promise((resolve, reject) => {
            let cb = null;
            if (typeof params[params.length - 1] === 'function') {
              cb = params.pop();
            }
            db.run(sql, params, (err, result) => {
              if (cb) cb(err, result);
              if (err) reject(err);
              else resolve(result);
            });
          }));
        },
        finalize: (callback) => {
          Promise.all(runs)
            .then(() => { if (callback) callback(null); })
            .catch((err) => { if (callback) callback(err); });
        }
      };
    },
    serialize: (fn) => fn() // Postgres operates concurrently by default
  };

  initDatabase = function() {
    // Create tables using PostgreSQL syntax
    db.serialize(() => {
      // 1. Users Table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          telegram_id VARCHAR(255) UNIQUE,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          ton_wallet VARCHAR(255),
          level INTEGER DEFAULT 1,
          xp INTEGER DEFAULT 0,
          balance DOUBLE PRECISION DEFAULT 0.0,
          points INTEGER DEFAULT 0,
          premium_status INTEGER DEFAULT 0,
          premium_expiry VARCHAR(255),
          login_streak INTEGER DEFAULT 0,
          last_login_date VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`ALTER TABLE users ADD COLUMN ton_wallet VARCHAR(255)`, (err) => {
        // Ignore column already exists error
      });

      // 2. Tasks Table
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          reward_type VARCHAR(50) DEFAULT 'balance',
          reward_amount DOUBLE PRECISION DEFAULT 0.0,
          is_premium INTEGER DEFAULT 0,
          category VARCHAR(50) DEFAULT 'easy',
          url TEXT
        )
      `);

      // 3. User Tasks Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_tasks (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          task_id INTEGER REFERENCES tasks(id),
          status VARCHAR(50) DEFAULT 'pending',
          proof TEXT,
          completed_at TIMESTAMP,
          CONSTRAINT unique_user_task UNIQUE(user_id, task_id)
        )
      `);

      // 4. Challenges Table
      db.run(`
        CREATE TABLE IF NOT EXISTS challenges (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) DEFAULT 'daily',
          target_count INTEGER DEFAULT 1,
          reward_amount DOUBLE PRECISION DEFAULT 0.0,
          reward_points INTEGER DEFAULT 0,
          days_limit INTEGER DEFAULT 7
        )
      `);

      // 5. User Challenges Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_challenges (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          challenge_id INTEGER REFERENCES challenges(id),
          current_progress INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_user_challenge UNIQUE(user_id, challenge_id)
        )
      `);

      // 6. Transactions Table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          type VARCHAR(50) NOT NULL,
          amount DOUBLE PRECISION DEFAULT 0.0,
          points INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'completed',
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 7. Achievements Table
      db.run(`
        CREATE TABLE IF NOT EXISTS achievements (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          badge_icon VARCHAR(50)
        )
      `);

      // 8. User Achievements Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_achievements (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          achievement_id INTEGER REFERENCES achievements(id),
          earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_user_achievement UNIQUE(user_id, achievement_id)
        )
      `);

      // 9. Referrals Table
      db.run(`
        CREATE TABLE IF NOT EXISTS referrals (
          id SERIAL PRIMARY KEY,
          referrer_id INTEGER REFERENCES users(id),
          referred_id INTEGER REFERENCES users(id),
          status VARCHAR(50) DEFAULT 'joined',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_referral UNIQUE(referrer_id, referred_id)
        )
      `);

      // 10. Leaderboard Table
      db.run(`
        CREATE TABLE IF NOT EXISTS leaderboard (
          id SERIAL PRIMARY KEY,
          user_id INTEGER UNIQUE REFERENCES users(id),
          rank INTEGER,
          points INTEGER DEFAULT 0,
          earnings DOUBLE PRECISION DEFAULT 0.0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 11. Surveys Table
      db.run(`
        CREATE TABLE IF NOT EXISTS surveys (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          reward_amount DOUBLE PRECISION DEFAULT 0.0,
          reward_points INTEGER DEFAULT 0,
          time_estimate INTEGER DEFAULT 5,
          questions_json TEXT
        )
      `);

      // 12. User Surveys Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_surveys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          survey_id INTEGER REFERENCES surveys(id),
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_user_survey UNIQUE(user_id, survey_id)
        )
      `);

      seedPostgresData();
    });
  };

  function seedPostgresData() {
    // Clean up old mock users from Supabase if they exist
    db.run("DELETE FROM user_challenges WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM user_achievements WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM user_tasks WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM referrals WHERE referrer_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%') OR referred_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM leaderboard WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM users WHERE telegram_id LIKE 'telegram_%'", function(err) {
      if (!err) {
        console.log("Successfully cleaned up old mock users from PostgreSQL database.");
        // Reset sequences to prevent duplicate key clash
        db.run("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), false)");
        db.run("SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1), false)");
        db.run("SELECT setval('challenges_id_seq', COALESCE((SELECT MAX(id) FROM challenges), 1), false)");
        db.run("SELECT setval('transactions_id_seq', COALESCE((SELECT MAX(id) FROM transactions), 1), false)");
        db.run("SELECT setval('achievements_id_seq', COALESCE((SELECT MAX(id) FROM achievements), 1), false)");
        db.run("SELECT setval('referrals_id_seq', COALESCE((SELECT MAX(id) FROM referrals), 1), false)");
        db.run("SELECT setval('surveys_id_seq', COALESCE((SELECT MAX(id) FROM surveys), 1), false)");
      }
    });

    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) return console.error(err);
      if (row.count > 0 || (row.rows && row.rows[0] && row.rows[0].count > 0)) {
        console.log("Supabase PostgreSQL database already initialized and seeded.");
        return;
      }

      console.log("Seeding initial PostgreSQL data...");

      const initialTasks = [];

      initialTasks.forEach(t => {
        db.run(`
          INSERT INTO tasks (id, title, description, reward_type, reward_amount, is_premium, category, url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING
        `, t);
      });

      // Seed challenges
      const initialChallenges = [
        [1, 'Complete 5 Tasks Daily', 'Complete at least 5 tasks every day', 'daily', 5, 85000, 0, 7],
        [2, 'Social Media Master', 'Complete all social media tasks (Follow, Like, Comment)', 'weekly', 10, 59500, 500, 7],
        [3, 'Premium Surge', 'Complete 2 premium tasks', 'weekly', 2, 25500, 0, 3],
        [4, 'Referral Rockstar', 'Refer 5 friends who complete at least 1 task', 'streak', 5, 170000, 0, 30],
        [5, 'Earn 85,000 Coins This Week', 'Earn 85,000 Coins through completing tasks', 'weekly', 85000, 0, 200, 7]
      ];

      initialChallenges.forEach(c => {
        db.run(`
          INSERT INTO challenges (id, title, description, type, target_count, reward_amount, reward_points, days_limit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING
        `, c);
      });

      // Seed Achievements
      const initialAchievements = [
        [1, 'First Task', 'Completed your first earning task', '⭐'],
        [2, '$100 Earned', 'Earned over $100 in lifetime earnings', '💰'],
        [3, '7-Day Streak', 'Maintained a login streak of 7 days', '🔥'],
        [4, '50 Tasks Done', 'Completed 50 earning tasks', '🌟'],
        [5, '5 Referrals', 'Successfully referred 5 users', '👥'],
        [6, 'Speed Runner', 'Completed 5 tasks in under 1 hour', '🚀'],
        [7, 'Premium Member', 'Upgraded to Premium member status', '💎'],
        [8, 'Challenge Master', 'Successfully completed 3 weekly challenges', '🎯'],
        [9, 'Top 100', 'Ranked in the top 100 on the Global Leaderboard', '🏆'],
        [10, 'Tech Wizard', 'Linked all available withdrawal methods', '💻'],
        [11, 'Global Star', 'Completed tasks from 3 different categories', '🌍'],
        [12, 'Millionaire (pts)', 'Earned 1,000,000 points in lifetime achievements', '🎊'],
        [13, 'Nocturnal Worker', 'Completed a task between 12 AM and 4 AM', '🌙'],
        [14, 'Elite Gamer', 'Completed 10 challenges', '🎮'],
        [15, 'Diamond Status', 'Earned over $500 in lifetime earnings', '💎'],
        [16, 'Hall of Fame', 'Reached Rank 1 globally', '🏅'],
        [17, 'Crypto King', 'Completed all cryptocurrency tasks', '🔐'],
        [18, 'Global Leader', 'Referred users from 5 different countries', '🌐'],
        [19, 'VIP Status', 'Maintained premium membership for 6 months', '👑'],
        [20, 'Millionaire ($$$)', 'Earned over $1000 in lifetime earnings', '🚁']
      ];

      initialAchievements.forEach(a => {
        db.run(`
          INSERT INTO achievements (id, name, description, badge_icon)
          VALUES (?, ?, ?, ?)
          ON CONFLICT DO NOTHING
        `, a);
      });

      // Seed surveys
      const initialSurveys = [];

      initialSurveys.forEach(s => {
        db.run(`
          INSERT INTO surveys (id, title, description, reward_amount, reward_points, time_estimate, questions_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING
        `, s);
      });

      // Seed Mock Referrers & Referrals
      const referrers = [
        { id: 2, username: 'Alex_Crypto', country: 'USA', referrals: 142, telegramId: 'mock_alex', balance: 241400 },
        { id: 3, username: 'Luna_Trader', country: 'UK', referrals: 118, telegramId: 'mock_luna', balance: 200600 },
        { id: 4, username: 'John_Web3', country: 'Canada', referrals: 95, telegramId: 'mock_john', balance: 161500 },
        { id: 5, username: 'Maria_Tasks', country: 'Spain', referrals: 74, telegramId: 'mock_maria', balance: 125800 },
        { id: 6, username: 'Sophie_Earn', country: 'France', referrals: 48, telegramId: 'mock_sophie', balance: 81600 }
      ];

      referrers.forEach((ref) => {
        db.run(
          `INSERT INTO users (id, telegram_id, username, email, level, xp, balance, points, premium_status, login_streak)
           VALUES (?, ?, ?, ?, 1, 0, ?, 0, 0, 0)
           ON CONFLICT (id) DO NOTHING`,
          [ref.id, ref.telegramId, ref.username, ref.country, ref.balance]
        );

        for (let i = 1; i <= ref.referrals; i++) {
          const refId = ref.id * 10000 + i;
          const refTelegramId = `ref_tg_${ref.username}_${i}`;
          const refUsername = `${ref.username}_friend_${i}`;
          
          db.run(
            `INSERT INTO users (id, telegram_id, username, email, level, xp, balance, points, premium_status, login_streak)
             VALUES (?, ?, ?, 'Global', 1, 0, 0.0, 0, 0, 0)
             ON CONFLICT (id) DO NOTHING`,
            [refId, refTelegramId, refUsername]
          );

          db.run(
            `INSERT INTO referrals (referrer_id, referred_id, status)
             VALUES (?, ?, 'completed')
             ON CONFLICT DO NOTHING`,
            [ref.id, refId]
          );
        }
      });

      console.log("Supabase PostgreSQL successfully seeded!");
    });
  }
} else {
  console.log("No DATABASE_URL found. Falling back to local SQLite database...");
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.resolve(__dirname, 'gaming_miniapp.db');

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to local SQLite database:', err.message);
    } else {
      console.log('Connected to the local SQLite database.');
    }
  });

  initDatabase = function() {
    db.serialize(() => {
      // 1. Users Table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          telegram_id TEXT UNIQUE,
          username TEXT NOT NULL,
          email TEXT,
          ton_wallet TEXT,
          level INTEGER DEFAULT 1,
          xp INTEGER DEFAULT 0,
          balance REAL DEFAULT 0.0,
          points INTEGER DEFAULT 0,
          premium_status INTEGER DEFAULT 0,
          premium_expiry TEXT,
          login_streak INTEGER DEFAULT 0,
          last_login_date TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`ALTER TABLE users ADD COLUMN ton_wallet TEXT`, (err) => {
        // Ignore column already exists error
      });

      // 2. Tasks Table
      db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          reward_type TEXT DEFAULT 'balance',
          reward_amount REAL DEFAULT 0.0,
          is_premium INTEGER DEFAULT 0,
          category TEXT DEFAULT 'easy',
          url TEXT
        )
      `);

      // 3. User Tasks Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          task_id INTEGER,
          status TEXT DEFAULT 'pending',
          proof TEXT,
          completed_at TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(task_id) REFERENCES tasks(id),
          UNIQUE(user_id, task_id)
        )
      `);

      // 4. Challenges Table
      db.run(`
        CREATE TABLE IF NOT EXISTS challenges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          type TEXT DEFAULT 'daily',
          target_count INTEGER DEFAULT 1,
          reward_amount REAL DEFAULT 0.0,
          reward_points INTEGER DEFAULT 0,
          days_limit INTEGER DEFAULT 7
        )
      `);

      // 5. User Challenges Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_challenges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          challenge_id INTEGER,
          current_progress INTEGER DEFAULT 0,
          completed INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(challenge_id) REFERENCES challenges(id),
          UNIQUE(user_id, challenge_id)
        )
      `);

      // 6. Transactions Table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          type TEXT NOT NULL,
          amount REAL DEFAULT 0.0,
          points INTEGER DEFAULT 0,
          status TEXT DEFAULT 'completed',
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 7. Achievements Table
      db.run(`
        CREATE TABLE IF NOT EXISTS achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          badge_icon TEXT
        )
      `);

      // 8. User Achievements Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_achievements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          achievement_id INTEGER,
          earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(achievement_id) REFERENCES achievements(id),
          UNIQUE(user_id, achievement_id)
        )
      `);

      // 9. Referrals Table
      db.run(`
        CREATE TABLE IF NOT EXISTS referrals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          referrer_id INTEGER,
          referred_id INTEGER,
          status TEXT DEFAULT 'joined',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(referrer_id) REFERENCES users(id),
          FOREIGN KEY(referred_id) REFERENCES users(id),
          UNIQUE(referrer_id, referred_id)
        )
      `);

      // 10. Leaderboard Table
      db.run(`
        CREATE TABLE IF NOT EXISTS leaderboard (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER UNIQUE,
          rank INTEGER,
          points INTEGER DEFAULT 0,
          earnings REAL DEFAULT 0.0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 11. Surveys Table
      db.run(`
        CREATE TABLE IF NOT EXISTS surveys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          reward_amount REAL DEFAULT 0.0,
          reward_points INTEGER DEFAULT 0,
          time_estimate INTEGER DEFAULT 5,
          questions_json TEXT
        )
      `);

      // 12. User Surveys Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_surveys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          survey_id INTEGER,
          completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(survey_id) REFERENCES surveys(id),
          UNIQUE(user_id, survey_id)
        )
      `);

      seedSQLiteData();
    });
  };

  function seedSQLiteData() {
    // Clean up old mock users from SQLite if they exist
    db.run("DELETE FROM user_challenges WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM user_achievements WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM user_tasks WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM referrals WHERE referrer_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%') OR referred_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM leaderboard WHERE user_id IN (SELECT id FROM users WHERE telegram_id LIKE 'telegram_%')");
    db.run("DELETE FROM users WHERE telegram_id LIKE 'telegram_%'", function(err) {
      if (!err) {
        console.log("Successfully cleaned up old mock users from SQLite database.");
      }
    });

    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) return console.error(err);
      if (row.count > 0) {
        console.log("Local SQLite database already initialized and seeded.");
        return;
      }

      console.log("Seeding initial SQLite data...");

      const initialTasks = [];

      initialTasks.forEach(t => {
        db.run(`
          INSERT OR IGNORE INTO tasks (id, title, description, reward_type, reward_amount, is_premium, category, url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, t);
      });

      const initialChallenges = [
        [1, 'Complete 5 Tasks Daily', 'Complete at least 5 tasks every day', 'daily', 5, 85000, 0, 7],
        [2, 'Social Media Master', 'Complete all social media tasks (Follow, Like, Comment)', 'weekly', 10, 59500, 500, 7],
        [3, 'Premium Surge', 'Complete 2 premium tasks', 'weekly', 2, 25500, 0, 3],
        [4, 'Referral Rockstar', 'Refer 5 friends who complete at least 1 task', 'streak', 5, 170000, 0, 30],
        [5, 'Earn 85,000 Coins This Week', 'Earn 85,000 Coins through completing tasks', 'weekly', 85000, 0, 200, 7]
      ];

      initialChallenges.forEach(c => {
        db.run(`
          INSERT OR IGNORE INTO challenges (id, title, description, type, target_count, reward_amount, reward_points, days_limit)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, c);
      });

      const initialAchievements = [
        [1, 'First Task', 'Completed your first earning task', '⭐'],
        [2, '$100 Earned', 'Earned over $100 in lifetime earnings', '💰'],
        [3, '7-Day Streak', 'Maintained a login streak of 7 days', '🔥'],
        [4, '50 Tasks Done', 'Completed 50 earning tasks', '🌟'],
        [5, '5 Referrals', 'Successfully referred 5 users', '👥'],
        [6, 'Speed Runner', 'Completed 5 tasks in under 1 hour', '🚀'],
        [7, 'Premium Member', 'Upgraded to Premium member status', '💎'],
        [8, 'Challenge Master', 'Successfully completed 3 weekly challenges', '🎯'],
        [9, 'Top 100', 'Ranked in the top 100 on the Global Leaderboard', '🏆'],
        [10, 'Tech Wizard', 'Linked all available withdrawal methods', '💻'],
        [11, 'Global Star', 'Completed tasks from 3 different categories', '🌍'],
        [12, 'Millionaire (pts)', 'Earned 1,000,000 points in lifetime achievements', '🎊'],
        [13, 'Nocturnal Worker', 'Completed a task between 12 AM and 4 AM', '🌙'],
        [14, 'Elite Gamer', 'Completed 10 challenges', '🎮'],
        [15, 'Diamond Status', 'Earned over $500 in lifetime earnings', '💎'],
        [16, 'Hall of Fame', 'Reached Rank 1 globally', '🏅'],
        [17, 'Crypto King', 'Completed all cryptocurrency tasks', '🔐'],
        [18, 'Global Leader', 'Referred users from 5 different countries', '🌐'],
        [19, 'VIP Status', 'Maintained premium membership for 6 months', '👑'],
        [20, 'Millionaire ($$$)', 'Earned over $1000 in lifetime earnings', '🚁']
      ];

      initialAchievements.forEach(a => {
        db.run(`
          INSERT OR IGNORE INTO achievements (id, name, description, badge_icon)
          VALUES (?, ?, ?, ?)
        `, a);
      });

      const initialSurveys = [];

      initialSurveys.forEach(s => {
        db.run(`
          INSERT OR IGNORE INTO surveys (id, title, description, reward_amount, reward_points, time_estimate, questions_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, s);
      });

      // Seed Mock Referrers & Referrals
      const referrers = [
        { id: 2, username: 'Alex_Crypto', country: 'USA', referrals: 142, telegramId: 'mock_alex', balance: 241400 },
        { id: 3, username: 'Luna_Trader', country: 'UK', referrals: 118, telegramId: 'mock_luna', balance: 200600 },
        { id: 4, username: 'John_Web3', country: 'Canada', referrals: 95, telegramId: 'mock_john', balance: 161500 },
        { id: 5, username: 'Maria_Tasks', country: 'Spain', referrals: 74, telegramId: 'mock_maria', balance: 125800 },
        { id: 6, username: 'Sophie_Earn', country: 'France', referrals: 48, telegramId: 'mock_sophie', balance: 81600 }
      ];

      referrers.forEach((ref) => {
        db.run(
          `INSERT OR IGNORE INTO users (id, telegram_id, username, email, level, xp, balance, points, premium_status, login_streak)
           VALUES (?, ?, ?, ?, 1, 0, ?, 0, 0, 0)`,
          [ref.id, ref.telegramId, ref.username, ref.country, ref.balance]
        );

        for (let i = 1; i <= ref.referrals; i++) {
          const refId = ref.id * 10000 + i;
          const refTelegramId = `ref_tg_${ref.username}_${i}`;
          const refUsername = `${ref.username}_friend_${i}`;
          
          db.run(
            `INSERT OR IGNORE INTO users (id, telegram_id, username, email, level, xp, balance, points, premium_status, login_streak)
             VALUES (?, ?, ?, 'Global', 1, 0, 0.0, 0, 0, 0)`,
            [refId, refTelegramId, refUsername]
          );

          db.run(
            `INSERT OR IGNORE INTO referrals (referrer_id, referred_id, status)
             VALUES (?, ?, 'completed')`,
            [ref.id, refId]
          );
        }
      });

      console.log("Local SQLite database successfully seeded!");
    });
  }
}

module.exports = {
  db,
  initDatabase,
  pool
};
