const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./database');
const userRoutes = require('./routes/user');
const tasksRoutes = require('./routes/tasks');
const challengesRoutes = require('./routes/challenges');
const walletRoutes = require('./routes/wallet');
const leaderboardRoutes = require('./routes/leaderboard');
const achievementsRoutes = require('./routes/achievements');
const premiumRoutes = require('./routes/premium');
const surveysRoutes = require('./routes/surveys');
const adminRoutes = require('./routes/admin');
const postbackRoutes = require('./routes/postbacks');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id']
}));
app.use(express.json());

// Initialize Database Tables
initDatabase();

// Route Registrations
app.use('/api/user', userRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/postback', postbackRoutes);

// Root test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to BoltQuest Gaming Miniapp API!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
