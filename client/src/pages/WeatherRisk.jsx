function WeatherRisk() {
  return (
    <div className="w-full pt-14 pb-10 px-gutter-lg bg-surface min-h-[calc(100vh-2.5rem)]">
      <div className="flex flex-col w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md py-space-lg mb-space-md">
          <div>
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Environmental</span>
              <span className="text-outline-variant">/</span>
              <span className="font-data-mono-md text-label-sm text-primary font-semibold">WEATHER & RISK</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Weather Conditions & Risk Assessment</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-[2px]">Monitor weather forecasts, alerts on routes, and risk indicators for polar operations.</p>
          </div>
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh Forecast</span>
            </button>
            <button className="h-8 px-space-md bg-surface-container-low text-on-surface font-title-sm text-title-sm rounded-[3px] hover:bg-surface-container-high flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>View Alerts</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        <section className="bg-surface-container rounded-[3px] p-space-lg">
          <div className="flex flex-col items-center justify-center py-space-lg text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-space-md">air</span>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-space-sm">Weather Data Not Configured</h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-space-md">
              Weather data integration is not yet configured. Set up weather sources to display forecasts, alerts, and risk indicators for operations.
            </p>
            <button className="h-8 px-space-md bg-primary-container text-on-primary font-title-sm text-title-sm rounded-[3px] hover:bg-primary flex items-center gap-space-xs transition-colors" type="button">
              <span className="material-symbols-outlined text-[16px]">settings</span>
              <span>Configure Weather Source</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default WeatherRisk;
