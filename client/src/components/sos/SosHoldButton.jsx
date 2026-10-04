import { useState, useRef, useCallback, useEffect } from 'react';
import { HOLD_MS } from '../../sos/sosConfig';

/**
 * SosHoldButton — a 1.5-second press-and-hold SOS trigger.
 *
 * Features:
 *   • Circular SVG progress ring fills over HOLD_MS (1500ms)
 *   • Fires `onActivate()` only when the hold completes
 *   • Never disabled offline — always available
 *   • On mobile (<768px) renders as a fixed floating button
 *   • Vibrates on activation if the Vibration API is available
 *
 * Props:
 *   onActivate  — () => void, called when hold completes
 *   floating    — boolean, if true uses fixed-position floating style
 *   disabled    — boolean, suppress interaction (e.g. while SOS in flight)
 */
export default function SosHoldButton({
  onActivate,
  floating = false,
  disabled = false,
}) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const firedRef = useRef(false);

  const animate = useCallback(() => {
    if (!startRef.current) return;
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / HOLD_MS, 1);
    setProgress(pct);

    if (pct >= 1 && !firedRef.current) {
      firedRef.current = true;
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      onActivate?.();
      return; // stop animation
    }

    if (pct < 1) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [onActivate]);

  const handleStart = useCallback(
    (e) => {
      if (disabled) return;
      e.preventDefault();
      firedRef.current = false;
      startRef.current = Date.now();
      setHolding(true);
      setProgress(0);
      rafRef.current = requestAnimationFrame(animate);
    },
    [disabled, animate]
  );

  const handleEnd = useCallback(() => {
    startRef.current = null;
    setHolding(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    // Reset ring unless already fired
    if (!firedRef.current) setProgress(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // SVG ring geometry
  const SIZE = floating ? 64 : 36;
  const STROKE = floating ? 4 : 3;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * RADIUS;
  const dashOffset = CIRC * (1 - progress);

  const wrapperClass = floating
    ? 'fixed bottom-6 right-6 z-[9999] md:hidden'
    : 'relative';

  return (
    <div className={wrapperClass}>
      <button
        id="sos-hold-button"
        type="button"
        aria-label="Hold to send SOS"
        onPointerDown={handleStart}
        onPointerUp={handleEnd}
        onPointerLeave={handleEnd}
        onPointerCancel={handleEnd}
        className={`
          relative select-none touch-none
          flex items-center justify-center
          rounded-full transition-shadow
          ${floating
            ? 'w-16 h-16 bg-error shadow-lg shadow-error/30'
            : 'w-9 h-9 bg-error hover:shadow-md hover:shadow-error/30'
          }
          ${holding ? 'scale-95' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        disabled={disabled}
      >
        {/* Progress ring */}
        <svg
          className="absolute inset-0"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
        >
          {/* Background circle */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={STROKE}
          />
          {/* Animated fill */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="white"
            strokeWidth={STROKE}
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: holding ? 'none' : 'stroke-dashoffset 0.2s' }}
          />
        </svg>

        {/* Icon */}
        <span
          className={`material-symbols-outlined text-on-error z-10 ${
            floating ? 'text-[28px]' : 'text-[18px]'
          }`}
        >
          sos
        </span>
      </button>

      {/* Label below floating button */}
      {floating && (
        <span className="block text-center mt-1 font-label-md text-label-md text-error uppercase tracking-wider">
          Hold SOS
        </span>
      )}
    </div>
  );
}
