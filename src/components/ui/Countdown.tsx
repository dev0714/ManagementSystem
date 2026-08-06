'use client';

import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

function format(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}:${pad(sec)}`;
}

/**
 * Ticks once a second off a server-supplied deadline. The deadline is an
 * absolute epoch value so the client clock drifting does not change the target.
 */
export function Countdown({ targetEpochMs, offsetSeconds = 0 }: { targetEpochMs: number; offsetSeconds?: number }) {
  const [remaining, setRemaining] = useState(() =>
    Math.round((targetEpochMs - Date.now()) / 1000) - offsetSeconds,
  );

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.round((targetEpochMs - Date.now()) / 1000) - offsetSeconds);
    }, 1000);
    return () => clearInterval(id);
  }, [targetEpochMs, offsetSeconds]);

  return <span suppressHydrationWarning>{format(remaining)}</span>;
}

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span suppressHydrationWarning>--:--</span>;
  return (
    <span suppressHydrationWarning>
      {pad(now.getHours())}:{pad(now.getMinutes())}
    </span>
  );
}
