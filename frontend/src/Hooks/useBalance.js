import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

export function useBalance(userId, refreshUserStats) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/wallet/transactions`, {
        headers: { 'user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const requestWithdrawal = async (amount, method, address) => {
    try {
      const res = await fetch(`${API_BASE}/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        },
        body: JSON.stringify({ amount, method, address })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to request withdrawal');
      }
      const data = await res.json();
      
      // Refresh transactions and user stats
      await fetchTransactions();
      if (refreshUserStats) {
        await refreshUserStats();
      }
      return data;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refreshTransactions: fetchTransactions,
    requestWithdrawal
  };
}
