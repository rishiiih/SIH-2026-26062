import os
import sys
import uuid

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models.user import User
from app.models.role import Role, Permission, RolePermission
from app.models.station import Station
from app.models.cargo import Consignment, CustodyLog
from app.models.sync import ChangeLog, SyncCursor, SyncReceipt

# Ensures the sync handlers are registered during tests.
import app.sync


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(engine)
    return engine


@pytest.fixture(scope="function")
def connection(engine):
    connection = engine.connect()
    transaction = connection.begin()

    yield connection

    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def db_session(connection):
    transaction = connection.begin_nested()
    session = Session(bind=connection)

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, ended_transaction):
        if ended_transaction.nested and not ended_transaction._parent.nested:
            try:
                session.begin_nested()
            except Exception:
                pass

    yield session

    session.close()

    if transaction.is_active:
        transaction.rollback()


@pytest.fixture
def test_station(db_session):
    station = Station(
        name="Station Alpha",
        code="STA-01",
        location="Alpha Base",
        latitude=0,
        longitude=0,
        region="POLAR",
        timezone="UTC",
    )

    db_session.add(station)
    db_session.flush()

    return station


@pytest.fixture
def test_station_beta(db_session):
    station = Station(
        name="Station Beta",
        code="STA-02",
        location="Beta Base",
        latitude=0,
        longitude=0,
        region="POLAR",
        timezone="UTC",
    )

    db_session.add(station)
    db_session.flush()

    return station


@pytest.fixture
def test_permission(db_session):
    permission = Permission(
        name="consignment:create",
        description="Create consignment",
        resource="consignment",
        action="create",
    )

    db_session.add(permission)
    db_session.flush()

    return permission


@pytest.fixture
def test_role(db_session, test_permission):
    role = Role(name="Station Leader")
    db_session.add(role)
    db_session.flush()

    db_session.add(
        RolePermission(
            role_id=role.id,
            permission_id=test_permission.id,
        )
    )

    db_session.flush()

    return role


@pytest.fixture
def command_role(db_session, test_permission):
    role = Role(name="Command")
    db_session.add(role)
    db_session.flush()

    db_session.add(
        RolePermission(
            role_id=role.id,
            permission_id=test_permission.id,
        )
    )

    db_session.flush()

    return role


@pytest.fixture
def make_user(db_session, test_role, command_role, test_station):
    def _make_user(
        username=None,
        email=None,
        role_name="Station Leader",
        station_id=None,
        full_name="Test User",
    ):
        user_id = str(uuid.uuid4())
        username_value = username or f"user_{user_id[:8]}"
        email_value = email or f"{username_value}@example.com"
        selected_station_id = (
            station_id if station_id is not None else test_station.id
        )

        if role_name == "Station Leader":
            selected_role_id = test_role.id
        elif role_name == "Command":
            selected_role_id = command_role.id
        else:
            raise ValueError(f"Role {role_name} not found in test setup.")

        user = User(
            id=user_id,
            username=username_value,
            email=email_value,
            password_hash="fakehash",
            full_name=full_name,
            role_id=selected_role_id,
            station_id=selected_station_id,
            is_active=True,
        )

        db_session.add(user)
        db_session.flush()

        return user

    return _make_user


@pytest.fixture
def test_user(make_user):
    return make_user()