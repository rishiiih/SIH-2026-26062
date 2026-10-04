import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import db from '../db/dexie';

function StationLeader() {
  const navigate = useNavigate();
  const consumables = [];
  const personnel = [];
  const consignments = [];
  const equipmentFlags = [];

  const activeIncidents = useLiveQuery(
    async () => {
      if (!db.incidents) return [];
      return db.incidents.filter((i) => i.status !== 'resolved' && i.status !== 'cancelled').toArray();
    },
    [],
    []
  );

  const pendingCancel = (activeIncidents || []).find((i) => i.cancel_requested_at && !i.cancel_confirmed_at);

  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full">
        {/* Station Header */}
        <div className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-space-md mb-gutter-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-sm mb-[2px]">
              <span className="material-symbols-outlined text-primary text-[20px]">explore</span>
              <h1 className="font-headline-lg text-headline-lg text-[#1D2B33]">Polar Station Operations Console</h1>
              <span className="px-space-xs py-[2px] bg-[#EEF1F2] text-[#3F6B3A] border border-[#3F6B3A] rounded-[3px] font-label-sm text-label-sm tracking-wide ml-space-xs">SECTOR POLAR REGION</span>
            </div>
            <p className="font-body-md text-body-md text-[#50616a]">
              Station Leader on duty: <strong className="text-[#1D2B33] font-semibold">Not assigned</strong> | Local Station Time: <span className="font-data-mono-md text-[#1D2B33]">--:-- UTC</span> | SatLink: <span className="text-[#A16207] font-semibold">Checking...</span>
            </p>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto shrink-0">
            <div className="px-space-sm py-[4px] bg-[#E4E8EA] border border-[#C3CCD0] rounded-[3px] text-right">
              <span className="font-label-sm text-label-sm block text-[#50616a]">Outside temp</span>
              <span className="font-data-mono-md text-data-mono-md font-semibold text-[#1D2B33]">--.-°C</span>
            </div>
            <button
              onClick={() => navigate('/emergency')}
              className="h-8 px-space-md bg-primary-container text-on-primary border border-primary-container rounded-[3px] font-title-sm text-title-sm hover:bg-[#25555C] active:bg-[#1C4147] flex items-center gap-space-xs"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">emergency_share</span>
              <span>Log roll call / Muster</span>
            </button>
          </div>
        </div>

        {/* Pending False Alarm Banner */}
        {pendingCancel && (
          <div
            onClick={() => navigate('/emergency')}
            className="bg-amber-50 border-2 border-amber-500 rounded-[3px] p-space-sm px-space-md mb-gutter-md flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors animate-pulse"
          >
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-amber-600 text-[22px]">warning</span>
              <span className="font-body-md text-body-md text-amber-950 font-bold">
                ALERT: False alarm cancellation requested on SOS #{pendingCancel.id.slice(0, 8)} — Radio verification required!
              </span>
            </div>
            <span className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-bold">
              Review in Emergency Console &rarr;
            </span>
          </div>
        )}

        {/* Offline Status Banner */}
        <div className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-space-sm px-space-md mb-gutter-md flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[#3F6B3A] text-[18px]">cloud_done</span>
            <span className="font-body-md text-body-md text-[#1D2B33]">
              Sync status: Online (Central Command Centre link active)
            </span>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="font-data-mono-md text-body-sm text-[#50616a]">Pending changes: 0 queued</span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-md">
          {/* Left Column */}
          <div className="lg:col-span-8 flex flex-col gap-gutter-md">
            {/* Consumables */}
            <section className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] flex flex-col">
              <div className="px-space-md py-space-sm border-b border-[#C3CCD0] flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[18px]">propane_tank</span>
                  <h2 className="font-headline-sm text-headline-sm text-[#1D2B33]">Station Consumables & Days of Supply</h2>
                </div>
                <span className="font-data-mono-md text-body-sm text-[#50616a]">Winter reserves projection baseline</span>
              </div>
              
              {consumables.length === 0 ? (
                <div className="p-space-lg text-center">
                  <span className="material-symbols-outlined text-[32px] text-[#50616a] mb-space-sm">inventory_2</span>
                  <p className="font-body-md text-body-md text-[#50616a] mt-space-sm">No consumables data available. Add inventory items to track supply levels.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#E4E8EA] border-b border-[#C3CCD0]">
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase">Consumable item</th>
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase text-right">Physical stock</th>
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase text-right">Reserve timeline</th>
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase">Status & operational context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C3CCD0]">
                      {consumables.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#F5F7F7] bg-[#EEF1F2] transition-colors">
                          <td className="py-space-sm px-space-md">
                            <div className="font-title-sm text-title-sm text-[#1D2B33]">{item.name}</div>
                            <div className="font-data-mono-md text-body-sm text-[#50616a]">{item.daily}</div>
                          </td>
                          <td className="py-space-sm px-space-md text-right font-data-mono-md text-body-md text-[#1D2B33]">
                            {item.stock}
                          </td>
                          <td className="py-space-sm px-space-md text-right">
                            <span className={`font-data-mono-lg text-headline-sm ${item.days < 30 ? 'text-[#C2410C]' : 'text-[#1D2B33]'}`}>{item.days} Days</span>
                            <div className="w-24 ml-auto h-1 bg-[#C3CCD0] mt-1">
                              <div className={`h-1 ${item.days < 30 ? 'bg-[#C2410C]' : item.days < 50 ? 'bg-[#A16207]' : 'bg-[#2F6B73]'}`} style={{ width: `${item.percent}%` }}></div>
                            </div>
                          </td>
                          <td className="py-space-sm px-space-md">
                            <span className={`px-space-xs py-[2px] ${item.status.includes('Critical') || item.status.includes('Caution') ? `bg-[#EEF1F2] text-[${item.statusColor}] border border-[${item.statusColor}]` : 'bg-[#EEF1F2] text-[#3F6B3A] border border-[#3F6B3A]'} rounded-[3px] font-label-sm text-label-sm block w-fit mb-1`}>
                              {item.status}
                            </span>
                            {item.message && <p className={`font-body-sm text-body-sm ${item.status.includes('Critical') ? 'text-[#C2410C]' : 'text-[#A16207]'} font-semibold`}>{item.message}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Personnel */}
            <section className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] flex flex-col">
              <div className="px-space-md py-space-sm border-b border-[#C3CCD0] flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                  <h2 className="font-headline-sm text-headline-sm text-[#1D2B33]">Active Station Personnel & Check-in Roster</h2>
                </div>
                <span className="font-data-mono-md text-body-sm text-[#1D2B33] font-semibold">0 personnel present on station</span>
              </div>
              
              {personnel.length === 0 ? (
                <div className="p-space-lg text-center">
                  <span className="material-symbols-outlined text-[32px] text-[#50616a] mb-space-sm">groups</span>
                  <p className="font-body-md text-body-md text-[#50616a] mt-space-sm">No personnel assigned to this station yet. Add expedition members to track check-ins and locations.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#E4E8EA] border-b border-[#C3CCD0]">
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase">Personnel</th>
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase">Operational role</th>
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase">Assigned location</th>
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase">Radio call</th>
                        <th className="py-space-xs px-space-md font-label-sm text-label-sm text-[#50616a] uppercase">Check-in status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C3CCD0]">
                      {personnel.map((person, idx) => (
                        <tr key={idx} className="hover:bg-[#F5F7F7] bg-[#EEF1F2]">
                          <td className="py-space-sm px-space-md font-title-sm text-title-sm text-[#1D2B33]">{person.name}</td>
                          <td className="py-space-sm px-space-md font-body-sm text-body-sm text-[#50616a]">{person.role}</td>
                          <td className="py-space-sm px-space-md font-body-sm text-body-sm text-[#1D2B33]">
                            {person.location}
                            {person.coords && <span className="block font-data-mono-md text-[11px] text-[#50616a]">{person.coords}</span>}
                          </td>
                          <td className="py-space-sm px-space-md font-data-mono-md text-body-sm text-[#1D2B33]">{person.radio}</td>
                          <td className="py-space-sm px-space-md">
                            <span className={`px-space-xs py-[2px] bg-[#EEF1F2] text-[${person.statusColor}] border border-[${person.statusColor}] rounded-[3px] font-label-sm text-label-sm inline-block ${person.status.includes('Caution') ? 'font-semibold' : ''}`}>
                              {person.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 flex flex-col gap-gutter-md">
            {/* Inbound Consignments */}
            <section className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] flex flex-col">
              <div className="px-space-md py-space-sm border-b border-[#C3CCD0] flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[18px]">directions_boat</span>
                  <h2 className="font-headline-sm text-headline-sm text-[#1D2B33]">Inbound Consignments</h2>
                </div>
                <span className="font-data-mono-md text-body-sm text-[#50616a]">No active vessels</span>
              </div>
              
              {consignments.length === 0 ? (
                <div className="p-space-lg text-center">
                  <span className="material-symbols-outlined text-[32px] text-[#50616a] mb-space-sm">local_shipping</span>
                  <p className="font-body-md text-body-sm text-[#50616a] mt-space-sm">No inbound consignments scheduled. Add cargo manifests to track shipments.</p>
                </div>
              ) : (
                <div className="p-space-md flex flex-col gap-space-md">
                  {consignments.map((pkg, idx) => (
                    <div key={idx} className="bg-[#F5F7F7] border border-[#C3CCD0] rounded-[3px] p-space-sm flex flex-col gap-[4px]">
                      <div className="flex items-center justify-between">
                        <span className="font-data-mono-md text-title-sm font-semibold text-[#1D2B33]">{pkg.id}</span>
                        <span className={`px-space-xs py-[1px] ${pkg.priority === 'Priority 1' ? 'bg-[#C2410C] text-[#F5F7F7] border border-[#9A3412]' : 'bg-[#EEF1F2] text-[#3F6B3A] border border-[#3F6B3A]'} rounded-[3px] font-label-sm text-label-sm`}>
                          {pkg.priority}
                        </span>
                      </div>
                      <div className="font-title-sm text-title-sm text-[#1D2B33]">{pkg.name}</div>
                      <div className="flex items-center justify-between text-body-sm font-data-mono-md text-[#50616a] pt-space-xs border-t border-[#C3CCD0]">
                        <span>Gross: {pkg.weight}</span>
                        <span className="text-primary font-semibold">{pkg.status}</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-[#50616a] mt-1">{pkg.location}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Equipment Flags */}
            <section className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] flex flex-col">
              <div className="px-space-md py-space-sm border-b border-[#C3CCD0] flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[#3F6B3A] text-[18px]">check_circle</span>
                  <h2 className="font-headline-sm text-headline-sm text-[#1D2B33]">Critical Equipment Flags</h2>
                </div>
                <span className="px-space-xs py-[1px] bg-[#EEF1F2] text-[#3F6B3A] rounded-[3px] font-data-mono-md text-label-sm">0 alerts</span>
              </div>
              
              {equipmentFlags.length === 0 ? (
                <div className="p-space-lg text-center">
                  <span className="material-symbols-outlined text-[32px] text-[#3F6B3A] mb-space-sm">precision_manufacturing</span>
                  <p className="font-body-md text-body-sm text-[#50616a] mt-space-sm">All equipment operational. No flags raised.</p>
                </div>
              ) : (
                <div className="p-space-md flex flex-col gap-space-md">
                  {equipmentFlags.map((eq, idx) => (
                    <div key={idx} className="p-space-sm bg-[#F5F7F7] border border-[#C3CCD0] rounded-[3px] flex flex-col gap-[2px]">
                      <div className="flex items-center justify-between">
                        <span className="font-title-sm text-title-sm font-semibold text-[#1D2B33]">{eq.name}</span>
                        <span className={`px-space-xs py-[1px] ${eq.status === 'Red tag' ? 'bg-[#C2410C] text-[#F5F7F7] border border-[#C2410C]' : 'bg-[#EEF1F2] text-[#A16207] border border-[#A16207]'} rounded-[3px] font-label-sm text-label-sm`}>
                          {eq.status}
                        </span>
                      </div>
                      <p className={`font-body-md text-body-md ${eq.status === 'Red tag' ? 'text-[#C2410C]' : 'text-[#A16207]'} font-semibold mt-1`}>
                        {eq.message}
                      </p>
                      <p className="font-body-sm text-body-sm text-[#50616a] mt-1">{eq.details}</p>
                      <div className="mt-space-xs pt-space-xs border-t border-[#C3CCD0] flex items-center justify-between font-label-sm text-label-sm text-[#50616a]">
                        <span>Assigned Tech: {eq.tech}</span>
                        <span className="font-data-mono-md">{eq.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Telemetry Log */}
            <section className="bg-[#EEF1F2] border border-[#C3CCD0] rounded-[3px] p-space-md">
              <h3 className="font-title-sm text-title-sm text-[#1D2B33] mb-space-xs flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">sensors</span>
                <span>Station Telemetry & Link Log</span>
              </h3>
              <div className="font-data-mono-md text-body-sm text-[#50616a] space-y-[4px]">
                <div className="flex justify-between border-b border-[#C3CCD0] pb-[2px]">
                  <span>--:-- UTC</span>
                  <span className="text-[#1D2B33]">System initialized</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StationLeader;
