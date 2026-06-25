import { useState, useEffect } from 'react';

export function useAuth() {
  const [tgUser, setTgUser] = useState(null);
  const [userId, setUserId] = useState(1); // default mock user_id
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;
    if (webapp && webapp.initDataUnsafe && webapp.initDataUnsafe.user) {
      setTgUser(webapp.initDataUnsafe.user);
      setIsTelegram(true);
      // In a real app, you would send initData to the backend and verify it, 
      // which returns a verified JWT user ID. Here we use a fallback/mock user.
      setUserId(1); 
      webapp.expand();
      webapp.ready();
    } else {
      console.log("Not running inside Telegram. Using default mock user credentials.");
      setIsTelegram(false);
      setTgUser({
        id: 12345,
        first_name: "Aditya",
        last_name: "Kumar",
        username: "aditya_kumar",
        language_code: "en"
      });
      setUserId(1);
    }
  }, []);

  return {
    tgUser,
    userId,
    isTelegram
  };
}
