import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { authService } from '../../services/auth';
import syncEngine from '../../sync/sync-engine';
import useSyncStatus from '../../hooks/useSyncStatus';
import SosHoldButton from '../sos/SosHoldButton';
import { fireBeacon } from '../../sos/beacon';


function Header() {
  const [user, setUser] = useState(null);
  const [sosInFlight, setSosInFlight] = useState(false);
  const navigate = useNavigate();

  const {
    isOnline,
    pendingCount,
    failedCount,
    conflictCount,
    lastSyncTime,
    syncing,
  } = useSyncStatus();

  useEffect(() => {
    const currentUser = authService.getUser();

    setUser(currentUser);

    if (currentUser?.id) {
      syncEngine.startAutoSync(currentUser.id);
    }

    return () => {
      syncEngine.stopAutoSync();
    };
  }, []);

  const handleSync = async () => {
  if (!user?.id) {
    return;
  }

  await syncEngine.sync(
    user.id,
    { forceRetry: true }
  );
};

  const handleSos = async () => {
    if (sosInFlight) return;
    setSosInFlight(true);
    try {
      const { incidentId } = await fireBeacon();
      // Trigger fast-lane push immediately
      if (user?.id) syncEngine.fireSosFastLane(user.id);
      navigate(`/sos/${incidentId}`);
    } catch (err) {
      console.error('[SOS] Beacon failed:', err);
    } finally {
      setSosInFlight(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <>
    <header className="fixed top-0 left-64 right-0 h-14 bg-surface-container-low border-b border-outline-variant z-40 flex items-center justify-between px-gutter-lg">
      <div className="flex items-center gap-gutter-md">
        <div className="flex items-center gap-space-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline
                ? 'bg-[#3F6B3A]'
                : 'bg-error'
            }`}
          />

          <span className="font-data-mono-md text-body-sm text-on-surface font-medium">
            Sync status:{' '}
            {syncing
              ? 'Syncing'
              : isOnline
                ? 'Online'
                : 'Offline'}
          </span>
        </div>

        <span className="text-outline-variant">|</span>

        <span className="font-data-mono-md text-body-sm text-on-surface-variant">
          Pending changes: {pendingCount} queued
        </span>

        <span className="text-outline-variant">|</span>

        <span className="font-data-mono-md text-body-sm text-on-surface-variant">
          Failed retries: {failedCount}
        </span>

        <span className="text-outline-variant">|</span>

        <span className="font-data-mono-md text-body-sm text-on-surface-variant">
          Conflicts: {conflictCount}
        </span>

        <span className="text-outline-variant">|</span>

        <span className="font-data-mono-md text-body-sm text-on-surface-variant">
          Last sync:{' '}
          {lastSyncTime
            ? new Date(
                lastSyncTime
              ).toLocaleTimeString()
            : 'Not synced yet'}
        </span>
      </div>

      <div className="flex items-center gap-gutter-md">
        {/* SOS Hold Button (desktop) */}
        <div className="hidden md:block">
          <SosHoldButton
            disabled={sosInFlight}
            onActivate={handleSos}
          />
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="h-7 px-space-md bg-surface-container-lowest border border-outline text-on-surface font-title-sm text-title-sm rounded-sm hover:bg-surface-container-high disabled:opacity-50 flex items-center gap-space-xs"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">
            sync
          </span>

          <span>
            {syncing ? 'Syncing...' : 'Sync now'}
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="h-7 px-space-md bg-surface-container-lowest border border-outline text-on-surface font-title-sm text-title-sm rounded-sm hover:bg-surface-container-high"
          type="button"
        >
          Logout
        </button>

        <div className="px-space-md py-space-xs bg-secondary-container border border-outline-variant rounded-sm text-on-secondary-fixed-variant font-label-md text-label-md uppercase tracking-wider">
          Central Command Centre
        </div>

        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary text-[18px]">
            person
          </span>
        </div>
      </div>
    </header>

    {/* Floating SOS button for mobile (<768px) */}
    <SosHoldButton
      floating
      disabled={sosInFlight}
      onActivate={handleSos}
    />
    </>
  );
}

export default Header;