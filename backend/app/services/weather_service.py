from datetime import datetime, timedelta, timezone  # <--- Updated imports
import requests  # <--- Fixed typo (removed leading underscore)

# Risk Rule Threshold Constants
HIGH_WIND_KMH = 60.0
HIGH_TEMP_C = -40.0
MEDIUM_WIND_KMH = 40.0
MEDIUM_TEMP_C = -30.0

WEATHER_CACHE = {}  # In-memory cache: { station_id: { "data": dict, "fetched_at": datetime } }
CACHE_TTL_MINUTES = 15

def evaluate_weather_risk(temp_c: float, wind_kmh: float) -> str:
    """Evaluates risk based on polar environmental thresholds."""
    if wind_kmh >= HIGH_WIND_KMH or temp_c <= HIGH_TEMP_C:
        return "HIGH"
    if wind_kmh >= MEDIUM_WIND_KMH or temp_c <= MEDIUM_TEMP_C:
        return "MEDIUM"
    return "LOW"

def fetch_open_meteo_data(latitude: float, longitude: float):
    """Fetches weather metrics from Open-Meteo API with a 5s timeout."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ["temperature_2m", "wind_speed_10m"],
        "forecast_days": 1
    }
    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            return response.json(), False
    except Exception:
        pass
    return None, True

def get_weather_for_station(station):
    """Returns weather snapshot and risk level for a station, utilizing cache when available."""
    now = datetime.now(timezone.utc)  # <--- Replaced deprecated datetime.utcnow()
    cached = WEATHER_CACHE.get(station.id)

    # Return cached data if fresh
    if cached and (now - cached["fetched_at"]) < timedelta(minutes=CACHE_TTL_MINUTES):
        result = cached["data"].copy()
        result["stale"] = False
        return result

    raw_data, is_stale = fetch_open_meteo_data(float(station.latitude), float(station.longitude))

    if raw_data and "current" in raw_data:
        temp = raw_data["current"].get("temperature_2m", 0.0)
        wind = raw_data["current"].get("wind_speed_10m", 0.0)
        risk = evaluate_weather_risk(temp, wind)

        weather_payload = {
            "station_id": station.id,
            "station_code": station.code,
            "station_name": station.name,
            "temperature_c": temp,
            "wind_speed_kmh": wind,
            "risk_level": risk,
            "as_of": now.isoformat(),
            "stale": False
        }
        WEATHER_CACHE[station.id] = {"data": weather_payload, "fetched_at": now}
        return weather_payload

    # Return stale cached data if external network fails
    if cached:
        payload = cached["data"].copy()
        payload["stale"] = True
        return payload

    # Fallback default payload if network is down and no cache exists
    return {
        "station_id": station.id,
        "station_code": station.code,
        "station_name": station.name,
        "temperature_c": -18.5,
        "wind_speed_kmh": 22.0,
        "risk_level": "LOW",
        "as_of": now.isoformat(),
        "stale": True
    }