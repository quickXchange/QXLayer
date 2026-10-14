import { useEffect, useState } from 'react';

export function useAuthCooldown() {
  const [until, setUntil] = useState(0);
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick(); const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  return { remaining, start: (seconds: number) => {
    const safe = Math.max(1, Math.min(3600, seconds));
    setRemaining(safe); setUntil(Date.now() + safe * 1000);
  } };
}
