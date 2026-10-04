import { useState, useRef } from 'react';
import { saveAndQueue } from '../../sync/mutations';
import { authService } from '../../services/auth';

export const SosButton = () => {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const startHold = () => {
    setHolding(true);
    setProgress(0);
    const startTime = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / 1500) * 100, 100);
      setProgress(pct);
    }, 50);

    timerRef.current = setTimeout(async () => {
      clearInterval(intervalRef.current);
      setHolding(false);
      setProgress(0);
      await triggerSos();
    }, 1500);
  };

  const cancelHold = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setHolding(false);
    setProgress(0);
  };

  const triggerSos = async () => {
    const user = authService.getUser();
    const isOnline = navigator.onLine;

    const rawStationId = user?.station_id;
    const isValidStation = rawStationId && rawStationId !== 'DEFAULT_STATION';
    const parsedStationId = isValidStation ? parseInt(rawStationId, 10) : null;

    const sosPayload = {
      id: crypto.randomUUID(),
      type: 'other',
      severity: 'critical',
      status: 'raised',
      title: 'SOS Emergency Signal',
      description: 'One-tap SOS triggered from user device',
      station_id: isNaN(parsedStationId) ? null : parsedStationId,
      location_text: isValidStation ? `Station ${rawStationId}` : 'Mobile User Location',
      raised_at: new Date().toISOString(),
      escalation_level: 0,
    };

    try {
      await saveAndQueue('incident', sosPayload, 'create', { priority: 100 });
      if (!isOnline) {
        setStatusMessage('SOS queued, will send when link returns');
      } else {
        setStatusMessage('SOS sent');
      }
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      console.error('SOS triggering failed:', err);
      setStatusMessage('Failed to queue SOS');
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        className="relative overflow-hidden bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-md shadow-md select-none transition-all"
      >
        <span className="relative z-10">{holding ? 'HOLDING SOS...' : '🚨 ONE-TAP SOS'}</span>
        {holding && (
          <div
            className="absolute left-0 top-0 bottom-0 bg-red-900 opacity-60 transition-all ease-linear"
            style={{ width: `${progress}%` }}
          />
        )}
      </button>

      {statusMessage && (
        <div className="absolute right-0 top-12 whitespace-nowrap bg-gray-900 text-white text-xs px-3 py-1.5 rounded shadow-lg z-50">
          {statusMessage}
        </div>
      )}
    </div>
  );
};