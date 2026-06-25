import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

export function useTasks(userId, refreshUserStats) {
  const [tasks, setTasks] = useState([]);
  const [trendingTasks, setTrendingTasks] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingAchievements, setLoadingAchievements] = useState(true);

  // Surveys Logic
  const fetchSurveys = useCallback(async () => {
    try {
      setLoadingSurveys(true);
      const res = await fetch(`${API_BASE}/surveys`, {
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to fetch surveys');
      const data = await res.json();
      setSurveys(data);
    } catch (err) {
      console.error('Error fetching surveys:', err);
    } finally {
      setLoadingSurveys(false);
    }
  }, [userId]);

  const completeSurvey = async (surveyId, answers) => {
    try {
      const res = await fetch(`${API_BASE}/surveys/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        },
        body: JSON.stringify({ surveyId, answers })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to complete survey');
      }
      const data = await res.json();
      
      if (refreshUserStats) await refreshUserStats();
      await fetchSurveys();
      await fetchChallenges();
      
      return data;
    } catch (err) {
      console.error('Error completing survey:', err);
      throw err;
    }
  };

  // 1. Tasks
  const fetchTrendingTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks/trending`, {
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to fetch trending tasks');
      const data = await res.json();
      setTrendingTasks(data);
    } catch (err) {
      console.error('Error fetching trending tasks:', err);
    }
  }, [userId]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      const res = await fetch(`${API_BASE}/tasks`, {
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, [userId]);

  const completeTask = async (taskId, proof = '') => {
    try {
      const res = await fetch(`${API_BASE}/tasks/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        },
        body: JSON.stringify({ taskId, proof })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to complete task');
      }
      const data = await res.json();
      
      // Refresh user stats, tasks, challenges, and achievements!
      if (refreshUserStats) await refreshUserStats();
      await fetchTasks();
      await fetchTrendingTasks();
      await fetchChallenges();
      await fetchAchievements();
      await fetchLeaderboard(); // refresh ranking
      
      return data;
    } catch (err) {
      console.error('Error completing task:', err);
      throw err;
    }
  };

  // 2. Challenges
  const fetchChallenges = useCallback(async () => {
    try {
      setLoadingChallenges(true);
      const res = await fetch(`${API_BASE}/challenges`, {
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to fetch challenges');
      const data = await res.json();
      setChallenges(data);
    } catch (err) {
      console.error('Error fetching challenges:', err);
    } finally {
      setLoadingChallenges(false);
    }
  }, [userId]);

  // 3. Leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoadingLeaderboard(true);
      const res = await fetch(`${API_BASE}/leaderboard`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  // 4. Achievements
  const fetchAchievements = useCallback(async () => {
    try {
      setLoadingAchievements(true);
      const res = await fetch(`${API_BASE}/achievements`, {
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to fetch achievements');
      const data = await res.json();
      setAchievements(data);
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoadingAchievements(false);
    }
  }, [userId]);

  // 5. Premium Subscription Actions
  const subscribePremium = async () => {
    try {
      const res = await fetch(`${API_BASE}/premium/subscribe`, {
        method: 'POST',
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to subscribe');
      const data = await res.json();

      if (refreshUserStats) await refreshUserStats();
      await fetchTasks();
      await fetchAchievements();

      return data;
    } catch (err) {
      console.error('Error subscribing premium:', err);
      throw err;
    }
  };

  const cancelPremium = async () => {
    try {
      const res = await fetch(`${API_BASE}/premium/cancel`, {
        method: 'POST',
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to cancel subscription');
      const data = await res.json();

      if (refreshUserStats) await refreshUserStats();
      await fetchTasks();
      await fetchAchievements();

      return data;
    } catch (err) {
      console.error('Error cancelling premium:', err);
      throw err;
    }
  };

  // Fetch all on mount or userId change
  useEffect(() => {
    if (userId) {
      fetchTasks();
      fetchTrendingTasks();
      fetchSurveys();
      fetchChallenges();
      fetchLeaderboard();
      fetchAchievements();
    }
  }, [userId, fetchTasks, fetchTrendingTasks, fetchSurveys, fetchChallenges, fetchLeaderboard, fetchAchievements]);

  return {
    tasks,
    trendingTasks,
    surveys,
    challenges,
    leaderboard,
    achievements,
    loadingTasks,
    loadingSurveys,
    loadingChallenges,
    loadingLeaderboard,
    loadingAchievements,
    completeTask,
    completeSurvey,
    subscribePremium,
    cancelPremium,
    refreshTasks: fetchTasks,
    refreshSurveys: fetchSurveys,
    refreshChallenges: fetchChallenges,
    refreshLeaderboard: fetchLeaderboard,
    refreshAchievements: fetchAchievements
  };
}
