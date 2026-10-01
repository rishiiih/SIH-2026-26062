import { NavLink } from 'react-router-dom';
import { useEffect } from 'react';

function Sidebar() {
  useEffect(() => {
    // Update station time every second
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toISOString().slice(11, 19);
      const timeElement = document.getElementById('station-time');
      if (timeElement) {
        timeElement.textContent = `${timeStr} UTC`;
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);
  const navItems = [
    { path: '/dashboard', icon: 'grid_view', label: 'Command dashboard' },
    { path: '/station-leader', icon: 'military_tech', label: 'Station leader' },
    { path: '/cargo-log', icon: 'forklift', label: 'Cargo & log' },
    { path: '/inventory', icon: 'inventory_2', label: 'Inventory' },
    { path: '/personnel', icon: 'groups', label: 'Personnel' },
    { path: '/assets', icon: 'precision_manufacturing', label: 'Assets' },
    { path: '/emergency', icon: 'emergency', label: 'Emergency & incidents', isEmergency: true },
    { path: '/polar-map', icon: 'explore', label: 'Polar map' },
    { path: '/weather-risk', icon: 'air', label: 'Weather risk' },
    { path: '/sync-conflicts', icon: 'sync_problem', label: 'Sync & conflicts' },
    { path: '/audit-log', icon: 'menu_book', label: 'Audit log' },
    { path: '/admin-settings', icon: 'tune', label: 'Admin settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container border-r border-outline-variant z-50 flex flex-col">
      <div className="h-14 px-margin flex items-center justify-between border-b border-outline-variant bg-surface-container-high">
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm text-on-surface leading-tight">DHRUV</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Polar Operations</span>
        </div>
        <span className="font-label-sm text-label-sm px-space-xs py-[2px] bg-secondary-container text-on-secondary-fixed-variant border border-outline-variant rounded-sm font-data-mono-md">NCPOR</span>
      </div>
      <div className="px-margin py-space-sm bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
        <span className="font-label-sm text-label-sm text-on-surface-variant">Terminal registry</span>
        <span className="font-data-mono-md text-body-sm text-on-surface font-semibold">IND-CMD-01</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-space-sm space-y-[2px]">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-space-md px-space-md py-[6px] rounded-sm ${
                isActive
                  ? 'bg-primary-container text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
              } ${item.isEmergency ? 'text-error hover:bg-error-container hover:text-on-error-container' : ''}`
            }
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            <span className="font-title-sm text-title-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-space-sm border-t border-outline-variant bg-surface-container-high">
        <div className="flex items-center justify-between text-on-surface-variant">
          <span className="font-label-sm text-label-sm uppercase">Station time</span>
          <span className="font-data-mono-md text-body-sm font-semibold text-on-surface" id="station-time">--:--:-- UTC</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
