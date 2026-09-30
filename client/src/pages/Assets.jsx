function Assets() {
  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-lg mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Equipment</span>
              <span className="text-outline-variant">/</span>
              <span className="font-data-mono-md text-label-sm text-primary font-semibold">ASSET MANAGEMENT</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Station Assets</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-[2px]">Track equipment, vehicles, and critical assets with maintenance schedules and condition monitoring.</p>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Register Asset</span>
            </button>
            <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">build</span>
              <span>Maintenance Log</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        <section className="bg-surface-container rounded-[3px] p-space-lg">
          <div className="flex flex-col items-center justify-center py-space-lg text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-md">precision_manufacturing</span>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-space-sm">No Assets Registered</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-md">
              No assets have been registered in the system yet. Add equipment, vehicles, and critical infrastructure to track maintenance and condition.
            </p>
            <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Register First Asset</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Assets;
