import { useState, useEffect } from 'react';
import { API_BASE } from '../config';

export function useAuth() {
  const [tgUser, setTgUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;
    let userData = null;

    if (webapp && webapp.initDataUnsafe && webapp.initDataUnsafe.user) {
      userData = webapp.initDataUnsafe.user;
      setTgUser(userData);
      setIsTelegram(true);
      webapp.expand();
      webapp.ready();
    } else {
      console.log("Not running inside Telegram. Using default mock user credentials.");
      setIsTelegram(false);
      userData = {
        id: 12345,
        first_name: "Aditya",
        last_name: "Kumar",
        username: "aditya_kumar",
        language_code: "en"
      };
      setTgUser(userData);
    }

    if (userData) {
      // Authenticate or register user dynamically based on their Telegram ID
      fetch(`${API_BASE}/user/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegramId: String(userData.id),
          username: userData.username || `${userData.first_name} ${userData.last_name}`.trim(),
          email: userData.email || ''
        })
      })
      .then(res => {
        if (!res.ok) throw new Error('Authentication failed');
        return res.json();
      })
      .then(data => {
        setUserId(data.id);
      })
      .catch(err => {
        console.error("Auth Error:", err);
        // Fallback to ID 1 if backend is temporarily unreachable
        setUserId(1);
      });
    }
  }, []);

  return {
    tgUser,
    userId,
    isTelegram
  };
}
