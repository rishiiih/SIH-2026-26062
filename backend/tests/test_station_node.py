import os
import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import AsyncMock, patch

from app.models.incident import Incident
from app.models.station import Station
from app.models.station_neighbour import StationNeighbour
from app.models.sync import ChangeLog
from app.station_seed import seed_station_node
from app.uplink import UplinkWorker


def test_station_seed_initializes_stations_and_neighbours(db_session):
    seed_station_node(db_session, target_station_id=1)

    # 1. Check Stations
    stations = db_session.query(Station).all()
    codes = [s.code for s in stations]
    assert "BHARATI" in codes
    assert "MAITRI" in codes

    # 2. Check Neighbours for Bharati (Station 1)
    bharati_neighbours = (
        db_session.query(StationNeighbour)
        .filter(StationNeighbour.station_id == 1)
        .all()
    )
    b_names = [n.name for n in bharati_neighbours]
    assert any("Progress" in name for name in b_names)
    assert any("Zhongshan" in name for name in b_names)
    assert any("Law" in name for name in b_names)
    assert any("Davis" in name for name in b_names)

    # 3. Check Neighbours for Maitri (Station 2)
    maitri_neighbours = (
        db_session.query(StationNeighbour)
        .filter(StationNeighbour.station_id == 2)
        .all()
    )
    m_names = [n.name for n in maitri_neighbours]
    assert any("Novolazarevskaya" in name for name in m_names)
    assert any("ALCI" in name for name in m_names)

    # Maitri and Bharati must NOT be neighbours
    assert not any("Maitri" in name for name in b_names)
    assert not any("Bharati" in name for name in m_names)

    # Verify SAMPLE tag
    for n in bharati_neighbours + maitri_neighbours:
        assert n.is_sample is True
        assert "SAMPLE" in n.notes


@pytest.mark.anyio
async def test_uplink_worker_offline_resilience(db_session):
    """When Central is unreachable, UplinkWorker handles it cleanly."""
    worker = UplinkWorker(central_url="http://127.0.0.1:59999", station_id=1)

    healthy = await worker.check_health()
    assert healthy is False

    cycle_result = await worker.run_cycle(db_session)
    assert cycle_result["connected"] is False
    assert cycle_result["pushed"] == 0
    assert cycle_result["pulled"] == 0


@pytest.mark.anyio
async def test_uplink_idempotency_preservation(db_session):
    """Uplink pushes mutations with consistent station-prefixed idempotency keys."""
    worker = UplinkWorker(central_url="http://mock-central:5001", station_id=1)
    worker.last_pushed_seq = 0

    # Create a local SOS incident in ChangeLog
    inc_id = str(uuid.uuid4())
    log = ChangeLog(
        entity_type="incident",
        entity_id=inc_id,
        station_id=1,
        operation="create",
        data={"id": inc_id, "is_sos": True, "type": "FIRE"},
        serialized_data={"id": inc_id, "is_sos": True, "type": "FIRE"},
    )
    db_session.add(log)
    db_session.commit()
    db_session.refresh(log)

    captured_payload = None

    async def mock_post(url, **kwargs):
        nonlocal captured_payload
        mock_response = AsyncMock()
        mock_response.status_code = 200
        if "sync/push" in url:
            captured_payload = kwargs.get("json")
            mock_response.json = lambda: {"results": [{"success": True, "outbox_id": f"uplink-{log.seq}"}]}
        return mock_response

    with patch("httpx.AsyncClient.post", side_effect=mock_post):
        pushed = await worker.push_to_central(db_session, token="fake-token")
        assert pushed == 1
        assert captured_payload is not None
        mutations = captured_payload["mutations"]
        assert len(mutations) == 1
        assert mutations[0]["entity_id"] == inc_id
        # Idempotency key must be deterministic and preserved
        assert mutations[0]["idempotency_key"] == f"station-1-incident-{inc_id}"
        assert mutations[0]["priority"] == 100
        assert worker.last_pushed_seq == log.seq
