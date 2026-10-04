import os
import uuid
from sqlalchemy.orm import Session
from app.db import SessionLocal, Base, engine
from app.models.station import Station
from app.models.role import Role
from app.models.user import User
from app.models.station_neighbour import StationNeighbour
from app.security import get_password_hash


def seed_station_node(db: Session, target_station_id: int = 1):
    """
    Seeds local station database in STATION_MODE:
    - Base stations (Bharati and Maitri)
    - Realistic polar neighbours per station (Maitri & Bharati separately)
    - Default roles
    - Station uplink service account
    """
    Base.metadata.create_all(bind=engine)

    # 1. Seed Stations
    s1 = db.query(Station).filter(Station.id == 1).first()
    if not s1:
        s1 = Station(
            id=1,
            name="Bharati Station",
            code="BHARATI",
            location="Larsemann Hills, East Antarctica",
            latitude=-69.4075,
            longitude=76.1908,
            region="Larsemann Hills",
            timezone="UTC+5",
            is_active=True,
        )
        db.add(s1)

    s2 = db.query(Station).filter(Station.id == 2).first()
    if not s2:
        s2 = Station(
            id=2,
            name="Maitri Station",
            code="MAITRI",
            location="Schirmacher Oasis, Queen Maud Land",
            latitude=-70.7667,
            longitude=11.7333,
            region="Schirmacher Oasis",
            timezone="UTC+0",
            is_active=True,
        )
        db.add(s2)
    db.commit()

    # 2. Seed Roles
    roles = [
        "Command",
        "Station Leader",
        "Expedition Leader",
        "Store/Logistics Officer",
        "Field Team Member",
        "Medical Officer",
        "Admin",
    ]
    role_map = {}
    for r_name in roles:
        role = db.query(Role).filter(Role.name == r_name).first()
        if not role:
            role = Role(name=r_name)
            db.add(role)
            db.flush()
        role_map[r_name] = role.id
    db.commit()

    # 3. Seed Uplink Service Account
    uplink_username = os.environ.get("UPLINK_USER", f"uplink_station_{target_station_id}")
    uplink_pwd = os.environ.get("UPLINK_PASSWORD", "uplink123")
    user = db.query(User).filter(User.username == uplink_username).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            username=uplink_username,
            email=f"{uplink_username}@polar.dhruv.local",
            password_hash=get_password_hash(uplink_pwd),
            full_name=f"Station {target_station_id} Uplink Daemon",
            role_id=role_map.get("Station Leader"),
            station_id=target_station_id,
            is_active=True,
        )
        db.add(user)
        db.commit()

    # 4. Seed Station Neighbours
    # Note: Maitri and Bharati are ~3000 km apart; they are never neighbours.
    existing_neighbours = db.query(StationNeighbour).all()
    if not existing_neighbours:
        neighbours = []

        # --- BHARATI NEIGHBOURS (Station ID 1) ---
        neighbours.extend([
            StationNeighbour(
                id=str(uuid.uuid4()),
                station_id=1,
                name="Progress Station",
                country="Russia",
                distance_km=1.2,
                distance_note="Direct sight line across mirror cove",
                services={
                    "medical": "Physician & basic surgical suite",
                    "vehicles": "PistenBully, tracked transport",
                    "runway": "Skiway on continental ice (~8 km south)",
                    "fuel": "Polar diesel (SAB)",
                },
                contact_channels={
                    "vhf_channel": "CH 16 / CH 06",
                    "hf_freq": "8125 kHz USB",
                    "sat_phone": "+7 812 555 0192",
                    "call_sign": "PROGRESS BASE",
                },
                is_sample=True,
                notes="SAMPLE - verify before real use. Nearest station to Bharati.",
            ),
            StationNeighbour(
                id=str(uuid.uuid4()),
                station_id=1,
                name="Zhongshan Station",
                country="China",
                distance_km=2.4,
                distance_note="Adjacent headland across inlet",
                services={
                    "medical": "Full trauma clinic, telemedicine uplink",
                    "vehicles": "Snowcat, heavy cranes, helicopter pad",
                    "runway": "Helipad on site",
                    "fuel": "Aviation kerosene, diesel",
                },
                contact_channels={
                    "vhf_channel": "CH 16 / CH 12",
                    "hf_freq": "7440 kHz USB",
                    "sat_phone": "+86 10 6555 0831",
                    "call_sign": "ZHONGSHAN",
                },
                is_sample=True,
                notes="SAMPLE - verify before real use. Helicopter support capability.",
            ),
            StationNeighbour(
                id=str(uuid.uuid4()),
                station_id=1,
                name="Law-Racoviță-Negoiță Base",
                country="Romania / Australia",
                distance_km=3.0,
                distance_note="North Larsemann Hills",
                services={
                    "medical": "Field first-aid cache",
                    "vehicles": "Quad bikes, snowmobiles (summer only)",
                    "runway": "None",
                    "fuel": "Limited emergency depot",
                },
                contact_channels={
                    "vhf_channel": "CH 16",
                    "hf_freq": "9110 kHz",
                    "sat_phone": "+40 21 555 0411",
                    "call_sign": "LAW BASE",
                },
                is_sample=True,
                notes="SAMPLE - verify before real use. Summer-only station.",
            ),
            StationNeighbour(
                id=str(uuid.uuid4()),
                station_id=1,
                name="Davis Station",
                country="Australia",
                distance_km=110.0,
                distance_note="Vestfold Hills (~110 km east by aircraft)",
                services={
                    "medical": "Comprehensive surgical hospital & dental",
                    "vehicles": "Extensive fleet, heavy tractors, Twin Otter",
                    "runway": "Davis skiway (year-round)",
                    "fuel": "Bulk aviation turbine fuel",
                },
                contact_channels={
                    "vhf_channel": "CH 16 (relay required)",
                    "hf_freq": "5420 kHz USB / 8810 kHz USB",
                    "sat_phone": "+61 3 6232 3000",
                    "call_sign": "DAVIS STATION",
                },
                is_sample=True,
                notes="SAMPLE - verify before real use. Major medical and fixed-wing air asset hub.",
            ),
            StationNeighbour(
                id=str(uuid.uuid4()),
                station_id=1,
                name="External SAR Coordination (RCC Australia / NCPOR HQ)",
                country="India / Australia",
                distance_km=0.0,
                distance_note="Search and Rescue Authority",
                services={
                    "medical": "Air evacuation coordination",
                    "vehicles": "Long-range SAR aircraft dispatch",
                    "runway": "Global maritime rescue coordination",
                    "fuel": "Emergency logistics",
                },
                contact_channels={
                    "vhf_channel": "Inmarsat-C Distress / GMDSS",
                    "hf_freq": "8291 kHz Distress",
                    "sat_phone": "RCC Canberra / NCPOR Goa Emergency Cell",
                    "call_sign": "RCC CANBERRA",
                },
                is_sample=True,
                notes="SAMPLE - verify before real use. Set per station operating procedure.",
            ),
        ])

        # --- MAITRI NEIGHBOURS (Station ID 2) ---
        neighbours.extend([
            StationNeighbour(
                id=str(uuid.uuid4()),
                station_id=2,
                name="Novolazarevskaya Station",
                country="Russia",
                distance_km=4.2,
                distance_note="Direct ground transit across Schirmacher Oasis",
                services={
                    "medical": "Surgeon, anesthesiologist, oxygen concentrators",
                    "vehicles": "Tracked heavy carriers (Vityaz), snowcats",
                    "runway": "Novo Blue Ice Runway (~14 km south)",
                    "fuel": "Arctic diesel, TS-1 jet fuel",
                },
                contact_channels={
                    "vhf_channel": "CH 16 / CH 10",
                    "hf_freq": "6720 kHz USB",
                    "sat_phone": "+7 812 555 0998",
                    "call_sign": "NOVO BASE",
                },
                is_sample=True,
                notes="SAMPLE - verify before real use. Primary medical and runway neighbour for Maitri.",
            ),
            StationNeighbour(
                id=str(uuid.uuid4()),
                station_id=2,
                name="ALCI Air Logistics (Novo Blue Ice Runway)",
                country="International / South Africa",
                distance_km=14.0,
                distance_note="Blue ice runway on inland ice cap",
                services={
                    "medical": "Air ambulance staging & flight paramedic",
                    "vehicles": "BT-67 Turbo Basler, IL-76 intercontinental transport",
                    "runway": "3000m Blue Ice Runway (DROMLAN gateway)",
                    "fuel": "Jet A-1 fuel depot",
                },
                contact_channels={
                    "vhf_channel": "121.5 MHz / 129.7 MHz Air Ground",
                    "hf_freq": "8992 kHz USB",
                    "sat_phone": "+27 21 555 0144",
                    "call_sign": "NOVO TOWER",
                },
                is_sample=True,
                notes="SAMPLE - verify before real use. Intercontinental polar medevac airlift.",
            ),
            StationNeighbour(
                id=str(uuid.uuid4()),
                station_id=2,
                name="External SAR Coordination (MRCC Cape Town / NCPOR HQ)",
                country="India / South Africa",
                distance_km=0.0,
                distance_note="Search and Rescue Authority (Dronning Maud Land)",
                services={
                    "medical": "International medevac clearance",
                    "vehicles": "DROMLAN rescue coordination",
                    "runway": "Cape Town International airlift gateway",
                    "fuel": "Emergency charter support",
                },
                contact_channels={
                    "vhf_channel": "GMDSS / Inmarsat Distress",
                    "hf_freq": "8291 kHz Distress",
                    "sat_phone": "MRCC Cape Town: +27 21 938 3300",
                    "call_sign": "MRCC CAPE TOWN",
                },
                is_sample=True,
                notes="SAMPLE - verify before real use. Set per station operating procedure.",
            ),
        ])

        db.add_all(neighbours)
        db.commit()


if __name__ == "__main__":
    with SessionLocal() as session:
        seed_station_node(session)
    print("Station node reference data seeded successfully.")
