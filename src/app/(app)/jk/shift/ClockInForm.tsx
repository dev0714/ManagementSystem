'use client';

import { useEffect, useState } from 'react';

import { clockInAction } from './actions';

/**
 * GPS clock-in. The browser position is attached when available; the geofence
 * itself is checked server-side against the site's coordinates.
 */
export function ClockInForm({ siteName, geofenceM }: { siteName: string; geofenceM: number }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [state, setState] = useState<'idle' | 'locating' | 'ready' | 'denied'>('idle');

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState('denied');
      return;
    }
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setState('ready');
      },
      () => setState('denied'),
      { timeout: 8000 },
    );
  }, []);

  return (
    <form action={clockInAction} className="stack">
      <input type="hidden" name="lat" value={coords?.lat ?? ''} />
      <input type="hidden" name="lng" value={coords?.lng ?? ''} />

      <div className="tile">
        <div className="tile__label">Location</div>
        <div className="tile__value">
          {state === 'locating' && 'Finding you…'}
          {state === 'ready' && coords && `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
          {state === 'denied' && 'Location unavailable — clock-in will be flagged for review'}
          {state === 'idle' && '—'}
        </div>
      </div>

      <p className="muted" style={{ margin: 0 }}>
        You must be within {geofenceM} m of {siteName}. Outside the zone, clock-in is blocked and your Site Manager is
        notified on WhatsApp.
      </p>

      <button type="submit" className="btn">
        Clock in
      </button>
    </form>
  );
}
