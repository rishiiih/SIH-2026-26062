import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.db import SessionLocal, get_db, is_station_mode, station_id
from app.routes import auth, cargo, emergency, sync, weather
from app.services.sos_escalation import evaluate_sos_escalations
from app.station_seed import seed_station_node
from app.uplink import uplink_worker


async def escalation_background_worker():
    """15-second background tick for evaluating SOS escalations."""
    while True:
        try:
            await asyncio.sleep(15)
            if SessionLocal is not None:
                with SessionLocal() as db:
                    evaluate_sos_escalations(db)
        except asyncio.CancelledError:
            break
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize station node seed and uplink worker if STATION_MODE
    uplink_task = None
    if is_station_mode and SessionLocal is not None:
        try:
            with SessionLocal() as db:
                seed_station_node(db, target_station_id=int(station_id or 1))
            uplink_task = asyncio.create_task(uplink_worker.run_loop())
        except Exception as err:
            print(f"Error initializing station node: {err}")

    escalation_task = asyncio.create_task(escalation_background_worker())

    yield

    escalation_task.cancel()
    if uplink_task is not None:
        uplink_task.cancel()


app = FastAPI(title="DHRUV Polar API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "DHRUV Polar API",
        "mode": "station" if is_station_mode else "central",
        "station_id": int(station_id) if is_station_mode else None,
    }


@app.post("/api/alerts/evaluate")
def trigger_alerts_evaluate(db: Session = Depends(get_db)):
    escalations = evaluate_sos_escalations(db)
    return {"status": "ok", "escalations": escalations}


app.include_router(auth.router)
app.include_router(sync.router)
app.include_router(emergency.router)
app.include_router(cargo.router)
app.include_router(weather.router)

# Serve built frontend in Station Node mode or production deployment
client_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "client", "dist"))
if os.path.exists(client_dist):
    assets_dir = os.path.join(client_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path == "openapi.json":
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = os.path.join(client_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(client_dist, "index.html")
        if os.path.isfile(index_path):
            return FileResponse(index_path)
        return {"status": "DHRUV API Online"}
else:
    @app.get("/")
    def read_root():
        return {
            "status": "DHRUV API Online",
            "mode": "station" if is_station_mode else "central",
        }