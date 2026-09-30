function PolarMap() {
  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-lg mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Geospatial</span>
              <span className="text-outline-variant">/</span>
              <span className="font-data-mono-md text-label-sm text-primary font-semibold">POLAR MAP</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Expedition Map</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-[2px]">Visualize station locations, vessel/aircraft tracking, consignment movements, and incident markers.</p>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">layers</span>
              <span>Toggle Layers</span>
            </button>
            <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">my_location</span>
              <span>Report Position</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        <section className="bg-surface-container rounded-[3px] p-space-lg h-[calc(100vh-20rem)] flex items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-md">map</span>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-space-sm">Map Initializing</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-md">
              Add stations and operational data to visualize them on the polar map. Supports offline tile caching for remote operations.
            </p>
            <div className="flex gap-space-sm">
              <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">cached</span>
                <span>Download Offline Tiles</span>
              </button>
              <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
                <span className="material-symbols-outlined text-[16px]">my_location</span>
                <span>Report Manual Position</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default PolarMap;
