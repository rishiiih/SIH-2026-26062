function CommandDashboard() {
  const stations = []; // Empty - no stations configured yet
  const incidents = []; // Empty - no incidents yet
  const operations = []; // Empty - no operations yet

  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full pb-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-lg mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Mission Command Terminal</span>
              <span className="text-outline-variant">/</span>
              <span className="font-data-mono-md text-label-sm text-primary font-semibold">GLOBAL POLAR WATCH</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Polar Expedition Overview</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-[2px]">Real-time telemetry and supply status across polar research stations.</p>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Export SITREP</span>
            </button>
          </div>
        </div>

        {/* Empty State - No Stations */}
        {stations.length === 0 && (
          <section className="bg-surface-container rounded-[3px] p-space-lg mb-gutter-lg">
            <div className="flex flex-col items-center justify-center py-space-lg text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-md">location_off</span>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-space-sm">No Stations Configured</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                No polar research stations have been added to the system yet. Add stations to begin tracking telemetry and supply status.
              </p>
              <button className="mt-space-md h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add First Station</span>
              </button>
            </div>
          </section>
        )}

        {/* Stats Cards - Only show if stations exist */}
        {stations.length > 0 && (
          <section className="bg-surface-container rounded-[3px] p-space-md mb-gutter-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
              <div className="bg-surface-container-lowest p-space-md rounded-[3px] flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-semibold">Active Personnel</span>
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                </div>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-data-mono-lg text-data-mono-lg text-on-surface font-bold">0</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">deployed across stations</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-space-md rounded-[3px] flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-semibold">Active Alert Roster</span>
                  <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                </div>
                <div className="flex items-baseline gap-space-sm">
                  <span className="font-data-mono-lg text-data-mono-lg text-secondary font-semibold">0 ALERTS</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-space-md rounded-[3px] flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-semibold">Inbound Vessels</span>
                  <span className="material-symbols-outlined text-[18px] text-secondary">directions_boat</span>
                </div>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-data-mono-lg text-data-mono-lg text-secondary font-semibold">0 ACTIVE</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-space-md rounded-[3px] flex flex-col justify-between">
                <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
                  <span className="font-label-sm text-label-sm uppercase font-semibold">Resupply Windows</span>
                  <span className="material-symbols-outlined text-[18px] text-secondary">schedule</span>
                </div>
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-data-mono-lg text-data-mono-lg text-secondary font-semibold">0 OPEN</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Station Telemetry Table - Only show if stations exist */}
        {stations.length > 0 && (
          <section className="bg-surface-container rounded-[3px] overflow-hidden mb-gutter-lg">
            <div className="px-space-md py-space-sm bg-surface-container-high flex flex-wrap items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px] text-primary">hub</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Station Telemetry Grid</h2>
              </div>
              <div className="flex items-center gap-space-md font-data-mono-md text-label-sm text-on-surface-variant">
                <span>REFRESH: CONTINUOUS 10s</span>
                <span>DATUM: WGS 84</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm uppercase">
                    <th className="py-space-xs px-space-md font-semibold">Station</th>
                    <th className="py-space-xs px-space-md font-semibold">Coordinates</th>
                    <th className="py-space-xs px-space-md font-semibold text-center">Crew</th>
                    <th className="py-space-xs px-space-md font-semibold">Fuel Autonomy</th>
                    <th className="py-space-xs px-space-md font-semibold">Rations Reserve</th>
                    <th className="py-space-xs px-space-md font-semibold">Medical</th>
                    <th className="py-space-xs px-space-md font-semibold">Weather & Hazards</th>
                    <th className="py-space-xs px-space-md font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md bg-surface-container-lowest">
                  {stations.map((station) => (
                    <tr key={station.code} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-space-md px-space-md align-top">
                        <div className="flex items-center gap-space-xs">
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                          <span className="font-title-sm text-title-sm text-on-surface font-semibold">{station.name}</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant block mt-space-xs">{station.location}</span>
                      </td>
                      <td className="py-space-md px-space-md align-top font-data-mono-md text-body-sm text-on-surface">
                        <div>{station.coords.split(', ')[0]}</div>
                        <div className="text-on-surface-variant">{station.coords.split(', ')[1]}</div>
                      </td>
                      <td className="py-space-md px-space-md align-top text-center font-data-mono-md text-body-lg font-bold text-on-surface">
                        {station.crew}
                      </td>
                      <td className="py-space-md px-space-md align-top">
                        <div className="flex items-center gap-space-xs mb-space-xs">
                          <span className="font-data-mono-md text-body-md font-bold text-on-surface">{station.fuelDays} Days</span>
                        </div>
                        <div className="w-full bg-surface-container-high h-1.5 rounded-[1px] mb-space-xs overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${station.fuelPercent}%` }}></div>
                        </div>
                        <span className="inline-block px-space-xs py-[2px] bg-secondary-container text-on-secondary-fixed-variant font-label-sm text-label-sm rounded-[3px]">
                          {station.fuelStatus}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md align-top">
                        <div className="flex items-center gap-space-xs mb-space-xs">
                          <span className="font-data-mono-md text-body-md font-bold text-on-surface">{station.rationsDays} Days</span>
                        </div>
                        <div className="w-full bg-surface-container-high h-1.5 rounded-[1px] mb-space-xs overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${station.rationsPercent}%` }}></div>
                        </div>
                        <span className="inline-block px-space-xs py-[2px] bg-secondary-container text-on-secondary-fixed-variant font-label-sm text-label-sm rounded-[3px]">
                          {station.rationsStatus}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md align-top">
                        <div className="flex items-center gap-space-xs mb-space-xs">
                          <span className="font-data-mono-md text-body-md font-bold text-on-surface">{station.medicalDays} Days</span>
                        </div>
                        <div className="w-full bg-surface-container-high h-1.5 rounded-[1px] mb-space-xs overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${station.medicalPercent}%` }}></div>
                        </div>
                        <span className="inline-block px-space-xs py-[2px] bg-secondary-container text-on-secondary-fixed-variant font-label-sm text-label-sm rounded-[3px]">
                          {station.medicalStatus}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md align-top">
                        <div className="flex items-center gap-space-xs text-on-surface font-medium">
                          <span className="material-symbols-outlined text-[16px]">thermostat</span>
                          <span>{station.temp}°C</span>
                        </div>
                        <div className="font-label-sm text-label-sm text-on-surface uppercase font-semibold mt-space-xs">{station.weather}</div>
                        <div className="font-data-mono-md text-body-sm text-on-surface-variant">{station.wind}</div>
                      </td>
                      <td className="py-space-md px-space-md align-top text-right">
                        <button className="h-7 px-space-md bg-surface-container-low text-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary hover:text-on-primary transition-colors" type="button">
                          Open station view
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-lg">
          {/* Logistics */}
          <section className="lg:col-span-7 bg-surface-container rounded-[3px] p-space-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-space-sm mb-space-md bg-surface-container">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Expedition Logistics & Resupply Windows</h3>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Active Cycle 44</span>
              </div>
              
              {operations.length === 0 ? (
                <div className="bg-surface-container-lowest p-space-lg rounded-[3px] text-center">
                  <span className="material-symbols-outlined text-[32px] text-on-surface-variant mb-space-sm">local_shipping</span>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm">No logistics operations scheduled yet.</p>
                </div>
              ) : (
                <>
                  <div className="bg-surface-container-lowest p-space-md rounded-[3px] mb-space-md">
                    <div className="flex justify-between items-start mb-space-xs">
                      <div>
                        <span className="font-title-sm text-title-sm text-on-surface font-semibold block">Vessel Voyage Tracker</span>
                        <span className="font-data-mono-md text-body-sm text-secondary">Transit corridor to polar stations</span>
                      </div>
                      <span className="font-data-mono-md text-title-sm text-primary font-bold">ETA: TBA</span>
                    </div>
                    <div className="w-full bg-surface-container-high h-2 rounded-[2px] mt-space-sm relative overflow-hidden">
                      <div className="bg-primary h-full rounded-[2px]" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-body-sm text-body-sm">
                      <thead>
                        <tr className="bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase">
                          <th className="py-space-xs px-space-sm">Operation / Asset</th>
                          <th className="py-space-xs px-space-sm">Route / Leg</th>
                          <th className="py-space-xs px-space-sm">Cargo Manifest</th>
                          <th className="py-space-xs px-space-sm text-right">Scheduled Window</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant bg-surface-container-lowest font-data-mono-md">
                        {operations.map((op, idx) => (
                          <tr key={idx}>
                            <td className="py-space-sm px-space-sm text-on-surface font-semibold">{op.op}</td>
                            <td className="py-space-sm px-space-sm text-on-surface-variant">{op.route}</td>
                            <td className="py-space-sm px-space-sm text-on-surface-variant">{op.cargo}</td>
                            <td className="py-space-sm px-space-sm text-right text-on-surface">{op.window}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="mt-space-md pt-space-sm flex items-center justify-between text-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-space-sm py-space-xs rounded-[3px]">
              <span>NCPOR POLAR LOGISTICS DIVISION</span>
              <span>AUTHORITY: CENTRAL COMMAND CENTRE</span>
            </div>
          </section>

          {/* Incidents */}
          <section className="lg:col-span-5 bg-surface-container rounded-[3px] p-space-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-space-sm mb-space-md bg-surface-container">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">Operational Incidents & Safety Watch</h3>
                </div>
                <span className="px-space-xs py-[2px] bg-secondary-container text-on-secondary-fixed-variant font-data-mono-md text-label-sm rounded-[3px]">{incidents.length} LOGGED</span>
              </div>
              
              {incidents.length === 0 ? (
                <div className="bg-surface-container-lowest p-space-lg rounded-[3px] text-center">
                  <span className="material-symbols-outlined text-[32px] text-secondary mb-space-sm">verified_user</span>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-space-sm">No active incidents. All systems nominal.</p>
                </div>
              ) : (
                <div className="space-y-space-md">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="bg-surface-container-lowest p-space-md rounded-[3px]">
                      <div className="flex items-center justify-between gap-space-xs mb-space-xs">
                        <span className={`font-data-mono-md text-body-sm font-bold ${incident.status === 'active' ? 'text-error' : 'text-primary'}`}>{incident.id}</span>
                        <span className={`font-label-sm text-label-sm px-space-xs py-[2px] ${incident.status === 'active' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-fixed-variant'} font-semibold rounded-[3px]`}>{incident.severity}</span>
                      </div>
                      <h4 className="font-title-sm text-title-sm text-on-surface font-semibold">{incident.title}</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                        {incident.description}
                      </p>
                      <div className="mt-space-sm pt-space-xs flex items-center justify-between font-data-mono-md text-label-sm text-secondary">
                        <span>Station: {incident.station}</span>
                        <span>{incident.logged}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-space-md pt-space-sm flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Emergency Channel: 406.025 MHz</span>
              <button className="h-7 px-space-md bg-surface-container-lowest text-error font-title-sm text-title-sm rounded-[3px] hover:bg-error-container transition-colors flex items-center gap-space-xs" type="button">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>Initiate Crisis Protocol</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default CommandDashboard;
