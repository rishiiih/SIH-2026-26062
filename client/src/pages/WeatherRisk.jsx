// client/src/pages/WeatherRisk.jsx
import React, { useEffect, useState, useRef } from 'react';
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
        // Fetch relative path '/weather/stations' or '/api/weather/stations'
        const res = await api.get('/weather/stations');
        const data = res.data?.stations_weather || res.data || [];
        
        if (!isMounted.current) return;

        setWeatherData(data);
        setIsCached(false);

        if (db.cache) {
          await db.cache.put({
            key: 'weather_risk_cache',
            data,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        if (!isMounted.current) return;

        console.warn("Network unreachable. Retrieving cached weather data from Dexie...", err.message);

        if (db.cache) {
          const cached = await db.cache.get('weather_risk_cache');
          if (cached && cached.data) {
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
    return <div className="p-6 text-on-surface">Fetching station environmental telemetry...</div>;
  }

  return (
    <div className="p-6 bg-surface min-h-screen text-on-surface">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-headline-lg font-bold">Weather Risk Assessment</h1>
          <p className="text-body-sm text-on-surface-variant">Live station environmental monitoring</p>
        </div>
        {isCached && (
          <div className="bg-amber-500/20 border border-amber-500 text-amber-200 px-3 py-1 rounded-[3px] text-body-sm">
            ⚠️ Showing cached offline environmental telemetry
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {weatherData.map((station) => (
          <div key={station.station_id || station.id} className="bg-surface-container border border-outline-variant p-4 rounded-[3px]">
            <div className="flex justify-between items-start mb-3">
              <h2 className="text-title-sm font-semibold">{station.station_name || station.name || 'Station'}</h2>
              <span className="px-2 py-1 bg-red-600 text-white font-bold text-xs rounded-[3px]">
                {station.risk_level || 'LOW'}
              </span>
            </div>

            <div className="space-y-2 mb-4 font-mono text-body-sm">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className="font-bold">{station.temperature_c ?? '--'}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Wind Speed:</span>
                <span className="font-bold">{station.wind_speed_kmh ?? '--'} km/h</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}