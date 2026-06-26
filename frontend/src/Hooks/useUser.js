import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

export function useUser(userId) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/user?userId=${userId}`);
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
      const res = await fetch(`${API_BASE}/user/daily-bonus?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
      const res = await fetch(`${API_BASE}/user/settings?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
