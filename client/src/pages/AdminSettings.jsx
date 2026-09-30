function AdminSettings() {
  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-lg mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">System Administration</span>
              <span className="text-outline-variant">/</span>
              <span className="font-data-mono-md text-label-sm text-primary font-semibold">ADMIN SETTINGS</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">System Configuration</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-[2px]">Configure users, roles, permissions, stations, and system-wide settings for the DHRUV platform.</p>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter-md">
          {/* Users & Roles */}
          <section className="bg-surface-container rounded-[3px] p-space-md">
            <div className="flex items-center gap-space-xs mb-space-md">
              <span className="material-symbols-outlined text-[20px] text-primary">people</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Users & Roles</h2>
            </div>
            <div className="space-y-space-sm">
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Manage Users</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Manage Roles</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Permission Matrix</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </section>

          {/* Stations */}
          <section className="bg-surface-container rounded-[3px] p-space-md">
            <div className="flex items-center gap-space-xs mb-space-md">
              <span className="material-symbols-outlined text-[20px] text-primary">location_on</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Stations</h2>
            </div>
            <div className="space-y-space-sm">
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Manage Stations</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Station Metadata</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </section>

          {/* System */}
          <section className="bg-surface-container rounded-[3px] p-space-md">
            <div className="flex items-center gap-space-xs mb-space-md">
              <span className="material-symbols-outlined text-[20px] text-primary">settings</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">System Configuration</h2>
            </div>
            <div className="space-y-space-sm">
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Database Settings</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Sync Configuration</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>API Configuration</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </section>

          {/* Integrations */}
          <section className="bg-surface-container rounded-[3px] p-space-md">
            <div className="flex items-center gap-space-xs mb-space-md">
              <span className="material-symbols-outlined text-[20px] text-primary">extension</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">Integrations</h2>
            </div>
            <div className="space-y-space-sm">
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Weather Data Source</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Satellite Messaging</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
              <button className="w-full h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center justify-between transition-colors" type="button">
                <span>Map Tile Provider</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;
