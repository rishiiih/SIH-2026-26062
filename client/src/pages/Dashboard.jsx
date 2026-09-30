import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import syncEngine from '../sync/sync-engine';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sync Status Bar */}
      <div className={`fixed top-0 left-0 right-0 px-4 py-2 text-sm font-medium ${
        syncStatus?.isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>
            {syncStatus?.isOnline ? '🟢 Online' : '🔴 Offline'}
            {syncStatus?.pendingCount > 0 && ` • ${syncStatus.pendingCount} pending changes`}
          </span>
          <span>
            {syncStatus?.lastSyncTime ? `Last sync: ${new Date(syncStatus.lastSyncTime).toLocaleTimeString()}` : 'Not synced yet'}
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-sky-600">DHRUV</h1>
            <p className="text-sm text-gray-600">Polar Expedition Logistics System</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-medium">{user.full_name}</p>
              <p className="text-sm text-gray-600">{user.role_id ? 'Role ID: ' + user.role_id : 'Role loading...'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Empty State Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Cargo Tracking</h2>
            <p className="text-gray-600 mb-4">Track consignments and shipments to polar stations.</p>
            <button className="text-sky-600 hover:text-sky-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Inventory</h2>
            <p className="text-gray-600 mb-4">Manage stock levels and consumables at stations.</p>
            <button className="text-sky-600 hover:text-sky-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Personnel</h2>
            <p className="text-gray-600 mb-4">Track expedition members and movements.</p>
            <button className="text-sky-600 hover:text-sky-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Assets</h2>
            <p className="text-gray-600 mb-4">Manage equipment and vehicles.</p>
            <button className="text-sky-600 hover:text-sky-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Emergency</h2>
            <p className="text-gray-600 mb-4">Raise and respond to emergency incidents.</p>
            <button className="text-sky-600 hover:text-sky-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-2">Expeditions</h2>
            <p className="text-gray-600 mb-4">Plan and manage expedition schedules.</p>
            <button className="text-sky-600 hover:text-sky-700 font-medium">
              Coming Soon →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
