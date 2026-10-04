import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';

import db from '../../db/dexie';
import { fireBeacon, cancelBeacon } from '../../sos/beacon';
import syncEngine from '../../sync/sync-engine';
import { authService } from '../../services/auth';
import {
  UNDO_WINDOW_S,
  SOS_CATEGORIES,
  DELIVERY_CHANNELS,
} from '../../sos/sosConfig';
import { saveAndQueue } from '../../sync/mutations';
import { PRIORITIES } from '../../sync/priorities';

/**
 * SosAlarmOverlay — full-screen emergency overlay.
 *
 * Mounted globally in App.jsx. Watches `db.incidents` for any
 * active SOS (`is_sos=true`, status in [raised, acknowledged, responding]).
 *
 * Features:
 *   • Web Audio API synthesised polar emergency siren (two-tone)
 *   • Device vibration pattern
 *   • Screen Wake Lock API
 *   • Tab title alert flashing
 *   • 30-second "Mute for me" with auto re-alarm on escalation
 */
export default function SosAlarmOverlay() {
  const user = authService.getUser();

  // Watch for any active SOS at user's station (or all for Command)
  const activeAlarm = useLiveQuery(async () => {
    if (!db.incidents) return null;
    const all = await db.incidents
      .where('is_sos')
      .equals(1)
      .toArray();

    // Filter to active statuses
    const active = all.filter(
      (i) =>
        i.is_sos &&
        ['raised', 'acknowledged', 'responding'].includes(i.status)
    );

    if (!active.length) return null;

    // For field/station users, only alarm for own station
    // For command, alarm for all
    const isCommand =
      user?.role_name === 'Command Center Operator' ||
      user?.role_name === 'Station Leader';

    const relevant = isCommand
      ? active
      : active.filter((i) => i.station_id === user?.station_id);

    if (!relevant.length) return null;

    // Return the highest-escalation active SOS
    return relevant.sort(
      (a, b) => (b.escalation_level || 0) - (a.escalation_level || 0)
    )[0];
  }, [user?.station_id, user?.role_name]);

  const [muted, setMuted] = useState(false);
  const [muteUntil, setMuteUntil] = useState(null);
  const [dismissed, setDismissed] = useState(null); // incident ID last dismissed
  const audioCtxRef = useRef(null);
  const sirenIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);
  const titleIntervalRef = useRef(null);
  const lastEscalationRef = useRef(0);

  // ─── SIREN (Web Audio API) ───
  const startSiren = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      let high = true;
      sirenIntervalRef.current = setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.value = high ? 880 : 660;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
        high = !high;
      }, 500);
    } catch (e) {
      console.warn('[SOS Alarm] Web Audio API unavailable:', e);
    }
  }, []);

  const stopSiren = useCallback(() => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  // ─── VIBRATION ───
  const startVibration = useCallback(() => {
    if (!navigator.vibrate) return;
    // Repeating pattern: 500ms buzz, 300ms pause
    navigator.vibrate([500, 300, 500, 300, 500, 300, 500, 300, 500]);
  }, []);

  const stopVibration = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(0);
  }, []);

  // ─── WAKE LOCK ───
  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch (e) {
      console.warn('[SOS Alarm] Wake lock failed:', e);
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // ─── TAB TITLE FLASH ───
  const originalTitle = useRef(document.title);

  const startTitleFlash = useCallback(() => {
    if (titleIntervalRef.current) return;
    let flash = false;
    titleIntervalRef.current = setInterval(() => {
      document.title = flash ? '🚨 SOS EMERGENCY 🚨' : originalTitle.current;
      flash = !flash;
    }, 800);
  }, []);

  const stopTitleFlash = useCallback(() => {
    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
    }
    document.title = originalTitle.current;
  }, []);

  // ─── MUTE LOGIC ───
  const handleMute = useCallback(() => {
    setMuted(true);
    const until = Date.now() + 30_000;
    setMuteUntil(until);
    stopSiren();
    stopVibration();
  }, [stopSiren, stopVibration]);

  // Auto-unmute after 30s
  useEffect(() => {
    if (!muted || !muteUntil) return;
    const remaining = muteUntil - Date.now();
    if (remaining <= 0) {
      setMuted(false);
      return;
    }
    const timer = setTimeout(() => setMuted(false), remaining);
    return () => clearTimeout(timer);
  }, [muted, muteUntil]);

  // Re-alarm on escalation even when muted
  useEffect(() => {
    if (!activeAlarm) return;
    const level = activeAlarm.escalation_level || 0;
    if (level > lastEscalationRef.current) {
      setMuted(false);
      lastEscalationRef.current = level;
    }
  }, [activeAlarm?.escalation_level]);

  // ─── ALARM EFFECTS ───
  const shouldAlarm =
    activeAlarm &&
    !muted &&
    dismissed !== activeAlarm?.id;

  useEffect(() => {
    if (shouldAlarm) {
      startSiren();
      startVibration();
      acquireWakeLock();
      startTitleFlash();
    } else {
      stopSiren();
      stopVibration();
      releaseWakeLock();
      stopTitleFlash();
    }

    return () => {
      stopSiren();
      stopVibration();
      releaseWakeLock();
      stopTitleFlash();
    };
  }, [shouldAlarm]);

  // Reset dismissal when alarm changes
  useEffect(() => {
    if (!activeAlarm) {
      setDismissed(null);
      lastEscalationRef.current = 0;
    }
  }, [activeAlarm?.id]);

  // ─── RENDER ───
  if (!activeAlarm) return null;

  const escalationLabel =
    activeAlarm.escalation_level > 0
      ? `ESCALATION LEVEL ${activeAlarm.escalation_level}`
      : 'ACTIVE';

  return (
    <div
      id="sos-alarm-overlay"
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(186,26,26,0.92) 0%, rgba(93,0,10,0.96) 100%)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Pulsing ring animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-48 h-48 rounded-full border-4 border-white/20"
          style={{
            animation: 'sos-pulse 1.5s ease-out infinite',
          }}
        />
      </div>

      <div className="relative text-center space-y-6 max-w-md px-6">
        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 border border-white/25 rounded-full">
          <span
            className="w-2.5 h-2.5 rounded-full bg-white"
            style={{ animation: 'sos-blink 0.8s ease-in-out infinite' }}
          />
          <span className="font-label-md text-label-md text-white uppercase tracking-wider">
            {escalationLabel}
          </span>
        </div>

        {/* Title */}
        <h1 className="font-headline-xl text-headline-xl text-white font-headline-lg leading-tight">
          {activeAlarm.title || 'SOS EMERGENCY'}
        </h1>

        {/* Subtitle */}
        <p className="font-body-lg text-body-lg text-white/80">
          {activeAlarm.sos_category
            ? SOS_CATEGORIES.find(
                (c) => c.key === activeAlarm.sos_category
              )?.label || activeAlarm.sos_category
            : 'Emergency alert dispatched from station'}
        </p>

        {/* Time raised */}
        <p className="font-data-mono-md text-body-sm text-white/60">
          Raised{' '}
          {activeAlarm.raised_at
            ? new Date(activeAlarm.raised_at).toLocaleTimeString()
            : '—'}{' '}
          UTC
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <a
            href={`/sos/${activeAlarm.id}`}
            className="h-10 px-6 inline-flex items-center justify-center gap-2 bg-white text-error font-title-md text-title-md rounded-sm hover:bg-white/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              open_in_new
            </span>
            View Details
          </a>

          <button
            type="button"
            onClick={handleMute}
            disabled={muted}
            className="h-10 px-6 inline-flex items-center justify-center gap-2 bg-white/15 border border-white/30 text-white font-title-md text-title-md rounded-sm hover:bg-white/25 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">
              volume_off
            </span>
            {muted ? 'Muted (30s)' : 'Mute for 30s'}
          </button>

          <button
            type="button"
            onClick={() => setDismissed(activeAlarm.id)}
            className="h-10 px-6 inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white/70 font-title-md text-title-md rounded-sm hover:bg-white/15 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              close
            </span>
            Dismiss
          </button>
        </div>
      </div>

      {/* CSS animations injected inline */}
      <style>{`
        @keyframes sos-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes sos-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
