from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.station import Station
from app.services.weather_service import get_weather_for_station


router = APIRouter(
    prefix="/api/weather",
    tags=["weather"],
)


@router.get("/stations")
def get_all_stations_weather(
    db: Session = Depends(get_db),
):
    stations = (
        db.query(Station)
        .filter(Station.is_active == True)
        .all()
    )

    results = [
        get_weather_for_station(station)
        for station in stations
    ]

    return {
        "stations_weather": results,
    }