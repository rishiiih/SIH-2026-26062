import { useState } from 'react';

function CargoLog() {
  const consignments = []; // Empty - no consignments yet
  const [selectedConsignment, setSelectedConsignment] = useState(null);

  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-lg mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Logistics</span>
              <span className="text-outline-variant">/</span>
              <span className="font-data-mono-md text-label-sm text-primary font-semibold">CARGO & LOG</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Cargo & Consignment Tracking</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-[2px]">Track consignments, chain of custody, cold-chain telemetry, and shipment status across polar supply routes.</p>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Create Consignment</span>
            </button>
            <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>Scan Label</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        {consignments.length === 0 ? (
          <section className="bg-surface-container rounded-[3px] p-space-lg">
            <div className="flex flex-col items-center justify-center py-space-lg text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-md">local_shipping</span>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-space-sm">No Consignments</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-md">
                No consignments have been created yet. Create cargo manifests to track shipments, chain of custody, and cold-chain telemetry.
              </p>
              <div className="flex gap-space-sm">
                <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Create First Consignment</span>
                </button>
                <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Import Manifest</span>
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-md">
            {/* Consignment List */}
            <section className="lg:col-span-5 bg-surface-container rounded-[3px] overflow-hidden">
              <div className="px-space-md py-space-sm bg-surface-container-high flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Active Consignments</h2>
                </div>
                <span className="font-data-mono-md text-body-sm text-on-surface-variant">{consignments.length} items</span>
              </div>
              <div className="p-space-md space-y-space-sm">
                {consignments.map((consignment) => (
                  <div key={consignment.id} className="bg-surface-container-lowest p-space-sm rounded-[3px] cursor-pointer hover:bg-surface-container-low transition-colors" onClick={() => setSelectedConsignment(consignment)}>
                    <div className="flex items-center justify-between mb-space-xs">
                      <span className="font-data-mono-md text-body-sm font-semibold text-on-surface">{consignment.id}</span>
                      <span className={`px-space-xs py-[1px] font-label-sm text-label-sm rounded-[3px] ${consignment.priority === 'Priority 1' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-fixed-variant'}`}>
                        {consignment.priority}
                      </span>
                    </div>
                    <div className="font-title-sm text-title-sm text-on-surface">{consignment.name}</div>
                    <div className="flex items-center justify-between mt-space-xs font-data-mono-md text-body-sm text-on-surface-variant">
                      <span>{consignment.destination}</span>
                      <span className="text-primary">{consignment.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Consignment Detail */}
            <section className="lg:col-span-7 bg-surface-container rounded-[3px] p-space-md">
              {selectedConsignment ? (
                <div>
                  <div className="flex items-center justify-between mb-space-md">
                    <div>
                      <span className="font-data-mono-md text-body-sm text-primary font-semibold">{selectedConsignment.id}</span>
                      <h2 className="font-headline-md text-headline-md text-on-surface">{selectedConsignment.name}</h2>
                    </div>
                    <span className={`px-space-xs py-[2px] font-label-sm text-label-sm rounded-[3px] ${selectedConsignment.priority === 'Priority 1' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-fixed-variant'}`}>
                      {selectedConsignment.priority}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-space-md mb-space-md">
                    <div className="bg-surface-container-lowest p-space-sm rounded-[3px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">Destination</span>
                      <span className="font-title-sm text-title-sm text-on-surface">{selectedConsignment.destination}</span>
                    </div>
                    <div className="bg-surface-container-lowest p-space-sm rounded-[3px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">Gross Weight</span>
                      <span className="font-data-mono-md text-body-md text-on-surface">{selectedConsignment.weight}</span>
                    </div>
                    <div className="bg-surface-container-lowest p-space-sm rounded-[3px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">Cube</span>
                      <span className="font-data-mono-md text-body-md text-on-surface">{selectedConsignment.cube}</span>
                    </div>
                    <div className="bg-surface-container-lowest p-space-sm rounded-[3px]">
                      <span className="font-label-sm text-label-sm text-on-surface-variant block">Expedition Priority</span>
                      <span className="font-title-sm text-title-sm text-on-surface">{selectedConsignment.priority}</span>
                    </div>
                  </div>
                  <div className="flex gap-space-sm">
                    <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
                      <span className="material-symbols-outlined text-[16px]">print</span>
                      <span>Print Label</span>
                    </button>
                    <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
                      <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                      <span>Transfer Custody</span>
                    </button>
                    <button className="h-8 px-space-md bg-error text-on-error font-title-sm text-title-sm rounded-[3px] hover:bg-error-container hover:text-on-error-container flex items-center gap-space-xs transition-colors" type="button">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span>Report Breach</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-space-lg text-center">
                  <span className="material-symbols-outlined text-[32px] text-on-surface-variant mb-space-sm">inbox</span>
                  <p className="font-body-md text-body-md text-on-surface-variant">Select a consignment to view details</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default CargoLog;
