import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

export function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/user`, {
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      const data = await res.json();
      setUser(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const claimDailyBonus = async () => {
    try {
      const res = await fetch(`${API_BASE}/user/daily-bonus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        }
      });
      if (!res.ok) throw new Error('Failed to claim daily bonus');
      const data = await res.json();
      // Refresh user stats
      await fetchUser();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateSettings = async (settings) => {
    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to update settings');
      const data = await res.json();
      await fetchUser();
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId, fetchUser]);

  return {
    user,
    loading,
    error,
    refreshUser: fetchUser,
    claimDailyBonus,
    updateSettings
  };
}
