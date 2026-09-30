import { authService } from '../../services/auth';
import syncEngine from '../../sync/sync-engine';
import { useState, useEffect } from 'react';

function Header() {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    pendingCount: 0,
    lastSyncTime: null
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const currentUser = authService.getUser();
    setUser(currentUser);

    if (currentUser) {
      loadSyncStatus(currentUser.id);
      syncEngine.startAutoSync(currentUser.id);
    }

    return () => {
      syncEngine.stopAutoSync();
    };
  }, []);

  const loadSyncStatus = async (userId) => {
    const status = await syncEngine.getSyncStatus(userId);
    setSyncStatus(status);
  };

  const handleSync = async () => {
    if (user) {
      await syncEngine.sync(user.id);
      await loadSyncStatus(user.id);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-surface-container-low border-b border-outline-variant z-40 flex items-center justify-between px-gutter-lg">
      <div className="flex items-center gap-gutter-md">
        <div className="flex items-center gap-space-xs">
          <span className={`w-2 h-2 rounded-full ${syncStatus.isOnline ? 'bg-[#3F6B3A]' : 'bg-error'}`}></span>
          <span className="font-data-mono-md text-body-sm text-on-surface font-medium">
            Sync status: {syncStatus.isOnline ? 'Online (Central Command Centre link active)' : 'Offline'}
          </span>
        </div>
        <span className="text-outline-variant">|</span>
        <span className="font-data-mono-md text-body-sm text-on-surface-variant">
          Pending changes: {syncStatus.pendingCount} queued
        </span>
        <span className="text-outline-variant">|</span>
        <span className="font-data-mono-md text-body-sm text-on-surface-variant">
          Last sync: {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleTimeString() : 'Not synced yet'}
        </span>
      </div>
      <div className="flex items-center gap-gutter-md">
        <button
          onClick={handleSync}
          className="h-7 px-space-md bg-surface-container-lowest border border-outline text-on-surface font-title-sm text-title-sm rounded-sm hover:bg-surface-container-high hover:text-on-surface flex items-center gap-space-xs"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">sync</span>
          <span>Sync now</span>
        </button>
        <div className="px-space-md py-space-xs bg-secondary-container border border-outline-variant rounded-sm text-on-secondary-fixed-variant font-label-md text-label-md uppercase tracking-wider">
          Central Command Centre
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
