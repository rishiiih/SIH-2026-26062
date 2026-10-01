from app.models.cargo import Consignment, CustodyLog
from app.services.sync_service import SyncService


def push(db_session, user, mutation):
    return SyncService.process_push(
        db_session,
        user,
        [mutation],
        "test-device",
    )


def test_idempotency_key_replay(db_session, test_user):
    mutation = {
        "id": "outbox-001",
        "entity_type": "consignment",
        "operation": "create",
        "payload": {
            "id": "C-101",
            "tracking_number": "TRK-01",
            "station_id": test_user.station_id,
        },
        "idempotency_key": "idemp-001",
    }

    first_result = push(db_session, test_user, mutation)
    second_result = push(db_session, test_user, mutation)

    assert first_result[0]["success"] is True
    assert second_result[0]["success"] is True

    consignments = (
        db_session.query(Consignment)
        .filter_by(id="C-101")
        .all()
    )

    assert len(consignments) == 1


def test_station_scope_pull_isolation(
    db_session,
    make_user,
    test_station,
    test_station_beta,
):
    station_user = make_user(
        username="s1_user",
        email="s1@example.com",
        role_name="Station Leader",
        station_id=test_station.id,
    )

    command_user = make_user(
        username="cmd_user",
        email="cmd@example.com",
        role_name="Command",
        station_id=test_station.id,
    )

    push(
        db_session,
        station_user,
        {
            "id": "outbox-s1",
            "entity_type": "consignment",
            "operation": "create",
            "payload": {
                "id": "C-1",
                "station_id": test_station.id,
            },
            "idempotency_key": "idemp-s1",
        },
    )

    push(
        db_session,
        station_user,
        {
            "id": "outbox-s2",
            "entity_type": "consignment",
            "operation": "create",
            "payload": {
                "id": "C-2",
                "station_id": test_station_beta.id,
            },
            "idempotency_key": "idemp-s2",
        },
    )

    station_changes, _, _ = SyncService.process_pull(
        db_session,
        station_user,
        "0",
    )

    station_consignments = [
        change["data"]
        for change in station_changes
        if change["entity_type"] == "consignment"
    ]

    assert all(
        consignment["station_id"] == test_station.id
        for consignment in station_consignments
    )

    assert not any(
        consignment["id"] == "C-2"
        for consignment in station_consignments
    )

    command_changes, _, _ = SyncService.process_pull(
        db_session,
        command_user,
        "0",
    )

    command_consignments = [
        change["data"]
        for change in command_changes
        if change["entity_type"] == "consignment"
    ]

    station_ids = {
        consignment["station_id"]
        for consignment in command_consignments
    }

    assert test_station.id in station_ids
    assert test_station_beta.id in station_ids


def test_stale_base_version_conflict(db_session, test_user):
    result = push(
        db_session,
        test_user,
        {
            "id": "outbox-stale",
            "entity_type": "consignment",
            "operation": "update",
            "payload": {
                "id": "C-101",
                "base_version": 0,
                "status": "updated",
            },
            "idempotency_key": "idemp-stale",
        },
    )

    assert result[0]["success"] is False or result[0].get("conflict") is True


def test_ledger_entity_idempotent_success(db_session, test_user):
    push(
        db_session,
        test_user,
        {
            "id": "outbox-consignment",
            "entity_type": "consignment",
            "operation": "create",
            "payload": {
                "id": "C-101",
                "station_id": test_user.station_id,
            },
            "idempotency_key": "idemp-consignment",
        },
    )

    custody_mutation = {
        "id": "outbox-ledger",
        "entity_type": "custody_log",
        "operation": "create",
        "payload": {
            "id": "LOG-01",
            "consignment_id": "C-101",
            "station_id": test_user.station_id,
            "action": "received",
        },
        "idempotency_key": "idemp-ledger",
    }

    first_result = push(db_session, test_user, custody_mutation)
    second_result = push(db_session, test_user, custody_mutation)

    assert first_result[0]["success"] is True
    assert second_result[0]["success"] is True

    logs = (
        db_session.query(CustodyLog)
        .filter_by(id="LOG-01")
        .all()
    )

    assert len(logs) == 1


def test_unknown_entity_type_error(db_session, test_user):
    result = push(
        db_session,
        test_user,
        {
            "id": "outbox-unknown",
            "entity_type": "nonexistent_entity",
            "operation": "create",
            "payload": {
                "id": "X-1",
            },
            "idempotency_key": "idemp-unknown",
        },
    )

    assert result[0]["success"] is False
    assert "error" in result[0]