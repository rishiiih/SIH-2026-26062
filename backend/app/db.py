import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

is_station_mode = os.environ.get("STATION_MODE", "").lower() in ("true", "1")
station_id = os.environ.get("STATION_ID", "1")

DATABASE_URL = os.environ.get("DATABASE_URL")
if is_station_mode and not DATABASE_URL:
    DATABASE_URL = f"sqlite:///station_{station_id}.db"
elif not DATABASE_URL:
    DATABASE_URL = "sqlite:///dhruv_central.db"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(
        DATABASE_URL,
        connect_args=connect_args,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()