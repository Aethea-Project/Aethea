import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to automatically log out a user after a period of inactivity.
 * @param logout The function to call when the timeout is reached.
 * @param isActive Whether the auto-logout timer should be running.
 * @param timeoutMs The inactivity timeout in milliseconds (default: 15 minutes).
 */
export function useAutoLogout(logout: () => void, isActive: boolean, timeoutMs: number = 15 * 60 * 1000) {
  const timerRef = useRef<number | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    if (isActive) {
      timerRef.current = window.setTimeout(() => {
        logout();
      }, timeoutMs);
    }
  }, [logout, timeoutMs, isActive]);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      return;
    }

    // Initial timer setup
    resetTimer();

    // Events that constitute user activity
    const events = ['mousemove', 'mousedown', 'keypress', 'DOMMouseScroll', 'mousewheel', 'touchmove', 'MSPointerMove'];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimer, isActive]);
}
