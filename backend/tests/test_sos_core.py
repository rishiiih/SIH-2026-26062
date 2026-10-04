import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt
import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from main import app
from app.models.incident import Incident
from app.models.incident_update import IncidentUpdate
from app.models.audit_log import AuditLog
from app.models.alert import Alert
from app.models.role import Role, Permission, RolePermission
from app.security import SECRET_KEY, ALGORITHM, create_access_token
from app.services.sos_escalation import evaluate_sos_escalations, raise_sos_from_silence, raise_sos_from_muster


@pytest.fixture
def field_role(db_session):
    role = Role(name="Field Team Member")
    db_session.add(role)
    db_session.flush()
    return role


@pytest.fixture
def test_client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def make_token_with_expiry(user_id: str, exp_dt: datetime) -> str:
    payload = {
        "sub": user_id,
        "exp": int(exp_dt.timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def test_duplicate_beacon_creates_one_row(test_client, db_session, test_user, test_station):
    token = create_access_token({"sub": test_user.id})
    beacon_id = str(uuid.uuid4())
    payload = {
        "id": beacon_id,
        "type": "MED",
        "station_id": test_station.id,
        "device_timestamp": datetime.now(timezone.utc).isoformat(),
        "lat": -70.5,
        "lon": 11.5,
        "people_count": 1,
    }

    # First transmission
    res1 = test_client.post(
        "/api/sos/beacon",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 200
    assert res1.json()["id"] == beacon_id

    # Duplicate transmission
    res2 = test_client.post(
        "/api/sos/beacon",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 200
    assert res2.json()["id"] == beacon_id

    # Check database: exactly one incident created
    incidents = db_session.query(Incident).filter(Incident.id == beacon_id).all()
    assert len(incidents) == 1
    assert incidents[0].type == "MED"
    assert incidents[0].is_sos is True


def test_same_sos_via_two_paths_creates_one_row(test_client, db_session, test_user, test_station):
    token = create_access_token({"sub": test_user.id})
    sos_id = str(uuid.uuid4())

    # Path A: Direct beacon submission
    res_beacon = test_client.post(
        "/api/sos/beacon",
        json={
            "id": sos_id,
            "type": "FIRE",
            "station_id": test_station.id,
            "device_timestamp": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_beacon.status_code == 200

    # Path B: Same SOS arriving via /api/sync/push mutation
    push_payload = {
        "device_id": "phone-lane-01",
        "mutations": [
            {
                "id": str(uuid.uuid4()),
                "entity_type": "incident",
                "entity_id": sos_id,
                "operation": "create",
                "payload": {
                    "id": sos_id,
                    "type": "FIRE",
                    "station_id": test_station.id,
                    "is_sos": True,
                    "severity": "critical",
                    "status": "raised",
                    "title": "SOS: FIRE",
                },
                "idempotency_key": f"idem-{sos_id}",
            }
        ],
    }

    res_sync = test_client.post(
        "/api/sync/push",
        json=push_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_sync.status_code == 200

    # Verify single incident row
    incidents = db_session.query(Incident).filter(Incident.id == sos_id).all()
    assert len(incidents) == 1
    assert incidents[0].type == "FIRE"


def test_field_user_can_raise_only_at_own_station(test_client, db_session, field_role, test_station, test_station_beta):
    from app.models.user import User
    field_user = User(
        id=str(uuid.uuid4()),
        username="field_user_1",
        email="field1@example.com",
        password_hash="fake",
        full_name="Field User",
        role_id=field_role.id,
        station_id=test_station.id,
        is_active=True,
    )
    db_session.add(field_user)
    db_session.commit()

    token = create_access_token({"sub": field_user.id})

    # Raise at own station -> OK
    own_beacon_id = str(uuid.uuid4())
    res_own = test_client.post(
        "/api/sos/beacon",
        json={
            "id": own_beacon_id,
            "type": "FIELD",
            "station_id": test_station.id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_own.status_code == 200

    # Raise at different station -> 403 Forbidden
    other_beacon_id = str(uuid.uuid4())
    res_other = test_client.post(
        "/api/sos/beacon",
        json={
            "id": other_beacon_id,
            "type": "FIELD",
            "station_id": test_station_beta.id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_other.status_code == 403


def test_command_sees_all_stations(test_client, db_session, make_user, field_role, test_station, test_station_beta):
    from app.models.user import User
    # Field user at Station Alpha
    field_user = User(
        id=str(uuid.uuid4()),
        username="field_alpha",
        email="field_alpha@example.com",
        password_hash="fake",
        full_name="Field Alpha",
        role_id=field_role.id,
        station_id=test_station.id,
        is_active=True,
    )
    db_session.add(field_user)
    db_session.commit()
    field_token = create_access_token({"sub": field_user.id})


    # Command user (no station restriction)
    command_user = make_user(username="hq_command", role_name="Command", station_id=None)
    command_token = create_access_token({"sub": command_user.id})

    # Create SOS at Alpha and Beta
    inc_alpha = Incident(
        id=str(uuid.uuid4()),
        station_id=test_station.id,
        created_by=field_user.id,
        type="MED",
        severity="critical",
        status="raised",
        title="Alpha Emergency",
        raised_at=datetime.now(timezone.utc),
        is_sos=True,
    )
    inc_beta = Incident(
        id=str(uuid.uuid4()),
        station_id=test_station_beta.id,
        created_by="someone_else",
        type="FIRE",
        severity="critical",
        status="raised",
        title="Beta Emergency",
        raised_at=datetime.now(timezone.utc),
        is_sos=True,
    )
    db_session.add_all([inc_alpha, inc_beta])
    db_session.commit()

    # Field user only sees Station Alpha
    res_field = test_client.get(
        "/api/sos/active",
        headers={"Authorization": f"Bearer {field_token}"},
    )
    assert res_field.status_code == 200
    field_ids = [i["id"] for i in res_field.json()["incidents"]]
    assert inc_alpha.id in field_ids
    assert inc_beta.id not in field_ids

    # Command user sees both stations
    res_cmd = test_client.get(
        "/api/sos/active",
        headers={"Authorization": f"Bearer {command_token}"},
    )
    assert res_cmd.status_code == 200
    cmd_ids = [i["id"] for i in res_cmd.json()["incidents"]]
    assert inc_alpha.id in cmd_ids
    assert inc_beta.id in cmd_ids


def test_ack_respond_resolve_are_audited(test_client, db_session, make_user, test_station):
    leader = make_user(username="leader_user", role_name="Station Leader", station_id=test_station.id)
    token = create_access_token({"sub": leader.id})

    inc = Incident(
        id=str(uuid.uuid4()),
        station_id=test_station.id,
        created_by=leader.id,
        type="MED",
        severity="critical",
        status="raised",
        title="Medical SOS",
        raised_at=datetime.now(timezone.utc),
        is_sos=True,
    )
    db_session.add(inc)
    db_session.commit()

    # 1. Acknowledge
    res_ack = test_client.post(
        f"/api/sos/{inc.id}/ack",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_ack.status_code == 200
    assert res_ack.json()["incident"]["acknowledged_by"] == leader.id

    # 2. Respond
    res_respond = test_client.post(
        f"/api/sos/{inc.id}/respond",
        json={"note": "Doctor deployed with trauma kit"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_respond.status_code == 200

    # 3. Resolve
    res_resolve = test_client.post(
        f"/api/sos/{inc.id}/resolve",
        json={"note": "Patient stabilized and evacuated to sick bay"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_resolve.status_code == 200
    assert res_resolve.json()["incident"]["status"] == "resolved"

    # Verify audit logs
    audit_actions = [
        a.action
        for a in db_session.query(AuditLog).filter(AuditLog.entity_id == inc.id).all()
    ]
    assert "sos:acknowledge" in audit_actions
    assert "sos:respond" in audit_actions
    assert "sos:resolve" in audit_actions


def test_cancel_request_does_not_close(test_client, db_session, test_user, test_station):
    token = create_access_token({"sub": test_user.id})
    inc = Incident(
        id=str(uuid.uuid4()),
        station_id=test_station.id,
        created_by=test_user.id,
        type="UNSPEC",
        severity="critical",
        status="raised",
        title="Accidental Press",
        raised_at=datetime.now(timezone.utc),
        is_sos=True,
    )
    db_session.add(inc)
    db_session.commit()

    # Sender requests cancellation (false alarm)
    res_cancel_req = test_client.post(
        f"/api/sos/{inc.id}/cancel-request",
        json={"reason": "Pocket press in glove"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_cancel_req.status_code == 200
    inc_data = res_cancel_req.json()["incident"]

    # Must NOT close incident
    assert inc_data["status"] == "raised"
    assert inc_data["cancel_requested_by"] == test_user.id
    assert inc_data["cancel_requested_reason"] == "Pocket press in glove"

    # Leader confirms cancellation
    res_confirm = test_client.post(
        f"/api/sos/{inc.id}/cancel-confirm",
        json={"note": "Verified by VHF radio, false alarm confirmed"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_confirm.status_code == 200
    assert res_confirm.json()["incident"]["status"] == "cancelled"


def test_escalation_levels_at_right_times(db_session, test_user, test_station):
    now = datetime.now(timezone.utc)

    # 1. New incident (10 seconds ago) -> Level 0
    inc = Incident(
        id=str(uuid.uuid4()),
        station_id=test_station.id,
        created_by=test_user.id,
        type="HAZ",
        severity="critical",
        status="raised",
        title="Gas Leak",
        raised_at=now - timedelta(seconds=10),
        is_sos=True,
        escalation_level=0,
    )
    db_session.add(inc)
    db_session.commit()

    evaluate_sos_escalations(db_session)
    db_session.refresh(inc)
    assert inc.escalation_level == 0

    # 2. 130s unacknowledged -> Level 1 (threshold 120s)
    inc.raised_at = now - timedelta(seconds=130)
    db_session.commit()
    evaluate_sos_escalations(db_session)
    db_session.refresh(inc)
    assert inc.escalation_level == 1

    # 3. 320s unacknowledged -> Level 2 (threshold 300s)
    inc.raised_at = now - timedelta(seconds=320)
    db_session.commit()
    evaluate_sos_escalations(db_session)
    db_session.refresh(inc)
    assert inc.escalation_level == 2

    # 4. 650s unacknowledged -> Level 3 (threshold 600s)
    inc.raised_at = now - timedelta(seconds=650)
    db_session.commit()
    evaluate_sos_escalations(db_session)
    db_session.refresh(inc)
    assert inc.escalation_level == 3

    # Check alert was maintained
    alert = db_session.query(Alert).filter(Alert.dedupe_key == f"sos:{inc.id}").first()
    assert alert is not None
    assert alert.severity == "critical"


def test_expired_token_window_enforced(test_client, db_session, test_user, test_station):
    now = datetime.utcnow()

    # Case A: Token expired 5 days ago (<= 30 days) -> Allowed
    token_5d = make_token_with_expiry(test_user.id, now - timedelta(days=5))
    res_5d = test_client.post(
        "/api/sos/beacon",
        json={
            "id": str(uuid.uuid4()),
            "type": "MED",
            "station_id": test_station.id,
        },
        headers={"Authorization": f"Bearer {token_5d}"},
    )
    assert res_5d.status_code == 200

    # Verify audit log flagged expired token use
    audit = (
        db_session.query(AuditLog)
        .filter(AuditLog.action == "sos:beacon_expired_token_used")
        .first()
    )
    assert audit is not None

    # Case B: Token expired 35 days ago (> 30 days) -> Rejected with 401
    token_35d = make_token_with_expiry(test_user.id, now - timedelta(days=35))
    res_35d = test_client.post(
        "/api/sos/beacon",
        json={
            "id": str(uuid.uuid4()),
            "type": "MED",
            "station_id": test_station.id,
        },
        headers={"Authorization": f"Bearer {token_35d}"},
    )
    assert res_35d.status_code == 401


def test_auto_raise_from_silence_and_muster(db_session, test_user, test_station):
    # Silence hook
    inc_silence = raise_sos_from_silence(
        db=db_session,
        user=test_user,
        subject="Rover Team Beta (Overdue 4h)",
        station_id=test_station.id,
    )
    assert inc_silence.is_sos is True
    assert inc_silence.source == "auto_silence"
    assert "auto-raised, verify" in inc_silence.description

    # Muster hook
    inc_muster = raise_sos_from_muster(
        db=db_session,
        user=test_user,
        incident_id=inc_silence.id,
        unaccounted_names=["Dr. Rao", "Tech Sharma"],
        station_id=test_station.id,
    )
    assert inc_muster.is_sos is True
    assert inc_muster.source == "auto_muster"
    assert inc_muster.type == "MISSING"
    assert inc_muster.people_affected == 2
    assert "auto-raised, verify" in inc_muster.description


def test_curl_beacon_stream_ack_escalate_flow(test_client, db_session, test_user, test_station):
    """
    Verifies Phase 1 completion criterion:
    curl can raise a beacon, stream it over SSE, acknowledge it, and escalate it.
    """
    token = create_access_token({"sub": test_user.id})
    sos_id = str(uuid.uuid4())

    # 1. Raise beacon
    res_beacon = test_client.post(
        "/api/sos/beacon",
        json={
            "id": sos_id,
            "type": "EVAC",
            "station_id": test_station.id,
            "device_timestamp": datetime.now(timezone.utc).isoformat(),
            "people_count": 12,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_beacon.status_code == 200
    assert res_beacon.json()["id"] == sos_id

    # 2. Acknowledge it
    res_ack = test_client.post(
        f"/api/sos/{sos_id}/ack",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_ack.status_code == 200
    assert res_ack.json()["incident"]["acknowledged_by"] == test_user.id

    # 3. Escalate it
    res_esc = test_client.post(
        f"/api/sos/{sos_id}/escalate",
        json={"level": 2, "note": "Immediate air evacuation requested"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_esc.status_code == 200
    assert res_esc.json()["incident"]["escalation_level"] == 2

    # 4. Connect to SSE stream with Last-Event-ID=0 to verify events received
    res_stream = test_client.get(
        "/api/sos/stream?max_events=1",
        headers={"Authorization": f"Bearer {token}", "Last-Event-ID": "0"},
    )
    assert res_stream.status_code == 200
    assert "event: " in res_stream.text or "id: " in res_stream.text




