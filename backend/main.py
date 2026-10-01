from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, sync, cargo, weather


app = FastAPI(title="DHRUV Polar API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
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
    }


@app.get("/")
def read_root():
    return {
        "status": "DHRUV API Online",
    }


app.include_router(auth.router)
app.include_router(sync.router)
app.include_router(cargo.router)
app.include_router(weather.router)