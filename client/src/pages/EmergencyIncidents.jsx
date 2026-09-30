function EmergencyIncidents() {
  const incidents = []; // Empty - no incidents yet

  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-lg mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Safety & Response</span>
              <span className="text-outline-variant">/</span>
              <span className="font-data-mono-md text-label-sm text-error font-semibold">EMERGENCY & INCIDENTS</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Emergency Response System</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-[2px]">Raise, acknowledge, and respond to emergency incidents with checklists, escalation timers, and offline SOS capability.</p>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button className="h-8 px-space-md bg-error text-on-error font-title-sm text-title-sm rounded-[3px] hover:bg-error-container hover:text-on-error-container flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">add_alert</span>
              <span>Raise Incident</span>
            </button>
            <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">sos</span>
              <span>Offline SOS</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {incidents.length === 0 ? (
          <section className="bg-surface-container rounded-[3px] p-space-lg">
            <div className="flex flex-col items-center justify-center py-space-lg text-center">
              <span className="material-symbols-outlined text-[48px] text-secondary mb-space-md">verified_user</span>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-space-sm">No Active Incidents</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-md">
                No emergency incidents have been raised. All systems are nominal. Raise an incident to begin emergency response workflows.
              </p>
              <button className="h-8 px-space-md bg-error text-on-error font-title-sm text-title-sm rounded-[3px] hover:bg-error-container hover:text-on-error-container flex items-center gap-space-xs transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">add_alert</span>
                <span>Raise First Incident</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="bg-surface-container rounded-[3px] overflow-hidden">
            <div className="px-space-md py-space-sm bg-surface-container-high flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-error">fmd_bad</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Active Incidents</h2>
              </div>
              <span className="px-space-xs py-[2px] bg-error-container text-on-error-container font-data-mono-md text-label-sm rounded-[3px]">{incidents.length} ACTIVE</span>
            </div>
            <div className="p-space-md space-y-space-md">
              {incidents.map((incident) => (
                <div key={incident.id} className="bg-surface-container-lowest p-space-md rounded-[3px]">
                  <div className="flex items-center justify-between gap-space-xs mb-space-xs">
                    <span className="font-data-mono-md text-body-sm font-bold text-error">{incident.id}</span>
                    <span className="font-label-sm text-label-sm px-space-xs py-[2px] bg-error-container text-on-error-container font-semibold rounded-[3px]">{incident.severity}</span>
                  </div>
                  <h4 className="font-title-sm text-title-sm text-on-surface font-semibold">{incident.title}</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">{incident.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default EmergencyIncidents;
