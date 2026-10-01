import { useEffect, useRef, useState } from 'react';

import api from '../services/api';
import db from '../db/dexie';


export default function WeatherRisk() {
  const [weatherData, setWeatherData] = useState([]);
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(true);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    async function loadWeather() {
      try {
        const response = await api.get(
          '/api/weather/stations'
        );

        const data =
          response.data?.stations_weather ||
          response.data ||
          [];

        if (!isMounted.current) {
          return;
        }

        setWeatherData(data);
        setIsCached(false);

        if (db.cache) {
          await db.cache.put({
            key: 'weather_risk_cache',
            data,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (!isMounted.current) {
          return;
        }

        console.warn(
          'Using cached weather data:',
          error.message
        );

        if (db.cache) {
          const cached = await db.cache.get(
            'weather_risk_cache'
          );

          if (cached?.data) {
            setWeatherData(cached.data);
            setIsCached(true);
          }
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    }

    loadWeather();

    return () => {
      isMounted.current = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-space-lg text-on-surface">
        Fetching station environmental telemetry...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-space-lg bg-surface text-on-surface">
      <div className="flex items-center justify-between mb-space-lg">
        <div>
          <h1 className="text-title-lg font-title-lg">
            Weather Risk Assessment
          </h1>

          <p className="text-body-sm text-on-surface-variant">
            Live station environmental monitoring
          </p>
        </div>

        {isCached && (
          <div className="px-space-sm py-space-xs bg-amber-500/20 border border-amber-500 text-amber-200 rounded-sm">
            Showing cached offline telemetry
          </div>
        )}
      </div>

      {weatherData.length === 0 ? (
        <div className="p-space-lg bg-surface-container-low border border-outline-variant rounded-sm">
          No station weather data is available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {weatherData.map((station) => (
            <div
              key={station.station_id || station.id}
              className="p-space-md bg-surface-container border border-outline-variant rounded-sm"
            >
              <div className="flex items-start justify-between mb-space-md">
                <h2 className="text-title-sm font-semibold">
                  {station.station_name ||
                    station.name ||
                    'Station'}
                </h2>

                <span className="px-space-xs py-space-xs bg-red-600 text-white text-xs rounded-sm">
                  {station.risk_level || 'LOW'}
                </span>
              </div>

              <div className="space-y-space-xs text-body-sm">
                <div className="flex justify-between">
                  <span>Temperature</span>
                  <strong>
                    {station.temperature_c ?? '--'}°C
                  </strong>
                </div>

                <div className="flex justify-between">
                  <span>Wind speed</span>
                  <strong>
                    {station.wind_speed_kmh ?? '--'} km/h
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}