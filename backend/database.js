const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'gaming_miniapp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

function initDatabase() {
  db.serialize(() => {
    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        username TEXT NOT NULL,
        email TEXT,
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

    // 2. Tasks Table
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        reward_type TEXT DEFAULT 'balance', -- 'balance' or 'points'
        reward_amount REAL DEFAULT 0.0,
        is_premium INTEGER DEFAULT 0, -- 0 = Free, 1 = Premium
        category TEXT DEFAULT 'easy', -- 'easy', 'premium'
        url TEXT
      )
    `);

    // 3. User Tasks Table (Completion status)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        task_id INTEGER,
        status TEXT DEFAULT 'pending', -- 'started', 'completed', 'pending'
        proof TEXT,
        completed_at TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(task_id) REFERENCES tasks(id),
        UNIQUE(user_id, task_id)
      )
    `);

    // 4. Challenges Table (templates)
    db.run(`
      CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'streak'
        target_count INTEGER DEFAULT 1,
        reward_amount REAL DEFAULT 0.0,
        reward_points INTEGER DEFAULT 0,
        days_limit INTEGER DEFAULT 7
      )
    `);

    // 5. User Challenges Table (progress tracking)
    db.run(`
      CREATE TABLE IF NOT EXISTS user_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        challenge_id INTEGER,
        current_progress INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0, -- 0 = False, 1 = True
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(challenge_id) REFERENCES challenges(id),
        UNIQUE(user_id, challenge_id)
      )
    `);

    // 6. Transactions Table (wallet history)
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL, -- 'withdrawal', 'task_earning', 'daily_bonus', 'challenge_reward'
        amount REAL DEFAULT 0.0,
        points INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed', -- 'completed', 'pending', 'failed'
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
        status TEXT DEFAULT 'joined', -- 'joined', 'active'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(referrer_id) REFERENCES users(id),
        FOREIGN KEY(referred_id) REFERENCES users(id),
        UNIQUE(referrer_id, referred_id)
      )
    `);

    // 10. Leaderboard Table (rank cache)
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

    seedData();
  });
}

function seedData() {
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) return console.error(err);
    if (row.count > 0) {
      console.log("Database already initialized and seeded.");
      return;
    }

    console.log("Seeding initial data...");

    db.run(`
      INSERT INTO users (id, telegram_id, username, email, level, xp, balance, points, premium_status, premium_expiry, login_streak, last_login_date)
      VALUES (1, 'telegram_12345', 'Aditya Kumar', 'aditya@email.com', 12, 4250, 24.50, 8420, 1, '2025-12-31', 7, '2026-06-25')
    `);

    const otherUsers = [
      [2, 'telegram_001', 'Alex_Crypto', 'alex@crypto.com', 25, 12000, 2450.00, 150000, 1, 'USA'],
      [3, 'telegram_002', 'Luna_Trader', 'luna@trader.com', 22, 9800, 2120.00, 120000, 1, 'UK'],
      [4, 'telegram_003', 'John_Web3', 'john@web3.com', 18, 7500, 1890.00, 95000, 0, 'Canada'],
      [5, 'telegram_004', 'Maria_Tasks', 'maria@tasks.com', 15, 5800, 1650.00, 78000, 0, 'Spain'],
      [6, 'telegram_005', 'Sophie_Earn', 'sophie@earn.com', 10, 3900, 980.00, 45000, 0, 'France']
    ];

    otherUsers.forEach(u => {
      db.run(`
        INSERT INTO users (id, telegram_id, username, email, level, xp, balance, points, premium_status, premium_expiry, login_streak, last_login_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '2026-06-25')
      `, [u[0], u[1], u[2], u[3], u[4], u[5], u[6], u[7], u[8], '2025-12-31']);
    });

    const ranks = [
      [2, 1, 150000, 2450.00],
      [3, 2, 120000, 2120.00],
      [4, 3, 95000, 1890.00],
      [5, 4, 78000, 1650.00],
      [6, 5, 45000, 980.00],
      [1, 47, 8420, 24.50]
    ];
    ranks.forEach(r => {
      db.run(`INSERT INTO leaderboard (user_id, rank, points, earnings) VALUES (?, ?, ?, ?)`, r);
    });

    const initialTasks = [
      ['Like Instagram Post', 'Like the pinned post on our page', 'balance', 0.15, 0, 'easy', 'https://instagram.com/boltquest'],
      ['Follow Twitter', 'Follow @BoltQuestOfficial', 'balance', 0.25, 0, 'easy', 'https://twitter.com/BoltQuestOfficial'],
      ['Like TikTok Video', 'Double tap our latest video', 'balance', 0.20, 0, 'easy', 'https://tiktok.com/@boltquest'],
      ['Comment on YouTube', 'Leave a comment on our latest video', 'balance', 0.30, 0, 'easy', 'https://youtube.com/boltquest'],
      ['Join Discord Server', 'Join and introduce yourself', 'balance', 0.45, 0, 'easy', 'https://discord.gg/boltquest'],
      ['Sign up for VPN Service', 'Complete signup & verify email', 'balance', 2.50, 1, 'premium', 'https://vpn.boltquest.com'],
      ['Download App & Rate', 'Download and rate 5 stars', 'balance', 1.50, 1, 'premium', 'https://play.google.com/store'],
      ['Open Credit Card Account', 'Complete application process', 'balance', 5.00, 1, 'premium', 'https://bank.boltquest.com/credit'],
      ['Create Crypto Account', 'Sign up and verify identity', 'balance', 3.75, 1, 'premium', 'https://crypto.boltquest.com'],
      ['Share Referral Link', 'Refer a friend who completes tasks', 'balance', 10.00, 1, 'premium', 'https://boltquest.com/ref?code=aditya']
    ];

    initialTasks.forEach(t => {
      db.run(`
        INSERT INTO tasks (title, description, reward_type, reward_amount, is_premium, category, url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, t);
    });

    const initialChallenges = [
      [1, 'Complete 5 Tasks Daily', 'Complete at least 5 tasks every day', 'daily', 5, 50.00, 0, 7],
      [2, 'Social Media Master', 'Complete all social media tasks (Follow, Like, Comment)', 'weekly', 10, 35.00, 500, 7],
      [3, 'Premium Surge', 'Complete 2 premium tasks', 'weekly', 2, 15.00, 0, 3],
      [4, 'Referral Rockstar', 'Refer 5 friends who complete at least 1 task', 'streak', 5, 100.00, 0, 30],
      [5, 'Earn 50 TON This Week', 'Earn 50 TON through completing tasks', 'weekly', 50, 0.00, 200, 7]
    ];

    initialChallenges.forEach(c => {
      db.run(`
        INSERT INTO challenges (id, title, description, type, target_count, reward_amount, reward_points, days_limit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, c);
    });

    db.run(`INSERT INTO user_challenges (user_id, challenge_id, current_progress, completed) VALUES (1, 1, 5, 0)`);
    db.run(`INSERT INTO user_challenges (user_id, challenge_id, current_progress, completed) VALUES (1, 2, 6, 0)`);
    db.run(`INSERT INTO user_challenges (user_id, challenge_id, current_progress, completed) VALUES (1, 3, 1, 0)`);
    db.run(`INSERT INTO user_challenges (user_id, challenge_id, current_progress, completed) VALUES (1, 4, 2, 0)`);
    db.run(`INSERT INTO user_challenges (user_id, challenge_id, current_progress, completed) VALUES (1, 5, 42, 0)`);

    db.run(`
      INSERT INTO transactions (user_id, type, amount, points, status, details, created_at)
      VALUES (1, 'withdrawal', -50.00, 0, 'completed', 'TON Wallet Withdrawal to UQDxTONWalletAddressExample', '2026-01-08 12:00:00')
    `);
    db.run(`
      INSERT INTO transactions (user_id, type, amount, points, status, details, created_at)
      VALUES (1, 'task_earning', 15.50, 0, 'completed', 'Task Earnings in TON - Multiple Tasks completed', '2026-01-10 14:30:00')
    `);

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
      `, a);
    });

    for (let i = 1; i <= 12; i++) {
      db.run(`INSERT INTO user_achievements (user_id, achievement_id) VALUES (1, ?)`, [i]);
    }

    db.run(`INSERT INTO referrals (referrer_id, referred_id, status) VALUES (1, 2, 'active')`);
    db.run(`INSERT INTO referrals (referrer_id, referred_id, status) VALUES (1, 3, 'joined')`);

    // Seed mock task completions for calculating trending tasks
    const mockCompletions = [
      [2, 1], [3, 1], [4, 1], [5, 1], [6, 1],
      [2, 2], [3, 2], [4, 2], [5, 2],
      [2, 3], [3, 3], [4, 3],
      [2, 4], [3, 4],
      [2, 5]
    ];
    mockCompletions.forEach(mc => {
      db.run(`
        INSERT INTO user_tasks (user_id, task_id, status, completed_at)
        VALUES (?, ?, 'completed', CURRENT_TIMESTAMP)
      `, mc);
    });

    // Seed Surveys
    const initialSurveys = [
      [
        'Web3 User Survey', 
        'Help us understand your usage of cryptocurrency and web3 miniapps.', 
        1.50, 
        300, 
        5,
        JSON.stringify([
          { q: "How often do you trade cryptocurrency?", opts: ["Daily", "Weekly", "Monthly", "Never"] },
          { q: "What is your preferred crypto wallet?", opts: ["Tonkeeper", "Telegram Wallet", "Metamask", "Trust Wallet"] },
          { q: "Have you used TON-based miniapps before?", opts: ["Yes, frequently", "Yes, a few times", "No, this is the first", "Unsure"] }
        ])
      ],
      [
        'Gaming Preferences Poll', 
        'We are building a new TON game. Tell us what you like to play!', 
        0.75, 
        150, 
        3,
        JSON.stringify([
          { q: "What genre of mobile games do you play most?", opts: ["RPG / Strategy", "Puzzle / Casual", "Action / Shooters", "Idle / Clickers"] },
          { q: "How much time do you spend gaming daily?", opts: ["Less than 30 mins", "30 - 60 mins", "1 - 2 hours", "More than 2 hours"] },
          { q: "Do you like Web3 elements (NFTs/Tokens) in games?", opts: ["Yes, absolutely", "Maybe if it is fun", "No, it ruins games", "Unsure"] }
        ])
      ],
      [
        'VPN Usage Feedback', 
        'Feedback on VPN speeds and privacy setups.', 
        1.00, 
        200, 
        4,
        JSON.stringify([
          { q: "Do you currently use a VPN service?", opts: ["Yes, paid service", "Yes, free service", "No, never", "Occasionally"] },
          { q: "What is the most important VPN feature to you?", opts: ["Connection Speed", "Security & Privacy", "Server Locations", "Low Price"] }
        ])
      ],
      [
        'Telegram Features Poll', 
        'Tell us what features you want in our Telegram bot ecosystem.', 
        0.50, 
        100, 
        2,
        JSON.stringify([
          { q: "What notification channel do you check most?", opts: ["Telegram DM", "Telegram Channels", "Email", "SMS"] },
          { q: "Would you invite friends for extra commissions?", opts: ["Yes, definitely", "Maybe", "No", "Unsure"] }
        ])
      ]
    ];

    initialSurveys.forEach(s => {
      db.run(`
        INSERT INTO surveys (title, description, reward_amount, reward_points, time_estimate, questions_json)
        VALUES (?, ?, ?, ?, ?, ?)
      `, s);
    });

    console.log("Database successfully seeded.");
  });
}

module.exports = {
  db,
  initDatabase
};
