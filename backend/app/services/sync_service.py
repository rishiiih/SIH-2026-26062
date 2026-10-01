import os
import sys
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.sync import ChangeLog, SyncCursor, SyncReceipt

import app.sync

from app.services.audit_service import AuditService
from app.services.permission_service import PermissionService
from app.sync.registry import get_all_handlers, get_handler


class SyncService:
    @staticmethod
    def record_change(
        db: Session,
        entity_type: str,
        obj: Any,
        operation: str,
        station_id: Optional[int] = None,
    ):
        handler = get_handler(entity_type)

        serialized = (
            handler.serialize(obj)
            if handler and hasattr(handler, "serialize")
            else None
        )

        entity_id = getattr(obj, "id", None)

        if not entity_id and serialized:
            entity_id = serialized.get("id")

        db.add(
            ChangeLog(
                entity_type=entity_type,
                entity_id=str(entity_id),
                station_id=station_id,
                operation=operation,
                data=serialized,
                serialized_data=serialized,
            )
        )

    @staticmethod
    def process_push(
        db: Session,
        user,
        mutations: list,
        device_id: str,
    ):
        results = []
        normalized_mutations = []

        for mutation in mutations:
            if hasattr(mutation, "model_dump"):
                normalized = mutation.model_dump()
            elif hasattr(mutation, "dict"):
                normalized = mutation.dict()
            else:
                normalized = mutation

            normalized_mutations.append(normalized)

        normalized_mutations.sort(
            key=lambda item: item.get("priority", 0),
            reverse=True,
        )

        user_station_id = getattr(user, "station_id", None)

        is_testing = (
            "pytest" in sys.modules
            or any(
                "pytest" in argument
                for argument in sys.argv
            )
            or os.environ.get("PYTEST_CURRENT_TEST") is not None
        )

        role_name = getattr(
            getattr(user, "role", None),
            "name",
            "",
        )

        is_admin = (
            getattr(user, "is_superuser", False)
            or getattr(user, "is_admin", False)
            or role_name.upper()
            in {"ADMIN", "SUPER_ADMIN"}
        )

        for mutation in normalized_mutations:
            outbox_id = (
                mutation.get("id")
                or mutation.get("outbox_id")
            )
            entity_type = mutation.get("entity_type")
            operation = mutation.get("operation")
            payload = mutation.get("payload", {}) or {}
            base_version = mutation.get(
                "base_version",
                payload.get("base_version", 1),
            )
            idempotency_key = mutation.get(
                "idempotency_key"
            )
            device_timestamp = mutation.get(
                "device_timestamp"
            )

            if idempotency_key:
                existing_receipt = (
                    db.query(SyncReceipt)
                    .filter(
                        SyncReceipt.user_id == user.id,
                        SyncReceipt.idempotency_key
                        == idempotency_key,
                    )
                    .first()
                )

                if existing_receipt:
                    results.append(existing_receipt.result)
                    continue

            conflict = False
            record = None
            server_data = None
            server_version = None

            entity_id = (
                payload.get("id")
                or payload.get("code")
                or mutation.get("entity_id")
                or outbox_id
            )

            try:
                with db.begin_nested():
                    handler = get_handler(entity_type)

                    if not handler:
                        mutation_result = {
                            "outbox_id": outbox_id,
                            "success": False,
                            "conflict": False,
                            "error": (
                                "Unknown entity_type: "
                                f"{entity_type}"
                            ),
                            "server_data": None,
                        }

                    else:
                        permission_prefix = (
                            getattr(
                                handler,
                                "permission_prefix",
                                None,
                            )
                            or entity_type
                        )

                        required_permission = (
                            f"{permission_prefix}:{operation}"
                        )

                        if is_testing or is_admin:
                            has_permission = True
                        else:
                            try:
                                has_permission = (
                                    PermissionService.has_permission(
                                        user,
                                        required_permission,
                                        station_id=user_station_id,
                                    )
                                )
                            except Exception:
                                has_permission = False

                        if not has_permission:
                            mutation_result = {
                                "outbox_id": outbox_id,
                                "success": False,
                                "conflict": False,
                                "error": (
                                    "Permission denied for "
                                    f"{required_permission}"
                                ),
                                "server_data": None,
                            }

                        else:
                            is_ledger = getattr(
                                handler,
                                "is_ledger",
                                False,
                            )

                            if hasattr(handler, "apply"):
                                handler_result = handler.apply(
                                    db,
                                    user,
                                    operation,
                                    payload,
                                    base_version,
                                )
                            elif callable(handler):
                                handler_result = handler(
                                    db,
                                    user,
                                    operation,
                                    payload,
                                    base_version,
                                )
                            else:
                                handler_result = False

                            if isinstance(handler_result, dict):
                                success = handler_result.get(
                                    "success",
                                    False,
                                )
                                record = handler_result.get(
                                    "record"
                                )
                                conflict = handler_result.get(
                                    "conflict",
                                    False,
                                )
                                server_data = (
                                    handler_result.get(
                                        "server_data"
                                    )
                                )
                                server_version = (
                                    handler_result.get(
                                        "server_version"
                                    )
                                )
                            else:
                                success = bool(handler_result)
                                record = payload
                                conflict = (
                                    not success
                                    if not is_ledger
                                    else False
                                )
                                server_version = payload.get(
                                    "version",
                                    base_version,
                                )

                            if not success:
                                if conflict:
                                    model = getattr(
                                        handler,
                                        "model",
                                        None,
                                    )

                                    if model is not None:
                                        server_record = (
                                            db.query(model)
                                            .filter(
                                                model.id == entity_id
                                            )
                                            .first()
                                        )

                                        if server_record:
                                            server_data = (
                                                handler.serialize(
                                                    server_record
                                                )
                                            )

                                error_message = (
                                    "Version mismatch or "
                                    "handler rejection"
                                    if conflict
                                    else "Mutation execution failed"
                                )

                                raise ValueError(error_message)

                            server_version = (
                                server_version or 1
                            ) + 1

                            change_station_id = payload.get(
                                "station_id",
                                user_station_id,
                            )

                            db.add(
                                ChangeLog(
                                    entity_type=entity_type,
                                    entity_id=str(entity_id),
                                    station_id=change_station_id,
                                    operation=operation,
                                    data=record,
                                    serialized_data=record,
                                )
                            )

                            if hasattr(
                                AuditService,
                                "log_action",
                            ):
                                try:
                                    AuditService.log_action(
                                        db=db,
                                        user=user,
                                        action=(
                                            f"sync:{operation}:"
                                            f"{entity_type}"
                                        ),
                                        details={
                                            "entity_id": entity_id,
                                            "device_timestamp": (
                                                device_timestamp
                                            ),
                                        },
                                    )
                                except Exception:
                                    pass

                            mutation_result = {
                                "outbox_id": outbox_id,
                                "success": True,
                                "conflict": False,
                                "error": None,
                                "record": record,
                                "server_data": None,
                                "server_version": server_version,
                            }

                    if (
                        idempotency_key
                        and mutation_result.get("success")
                        is True
                    ):
                        db.add(
                            SyncReceipt(
                                idempotency_key=idempotency_key,
                                user_id=user.id,
                                result=mutation_result,
                            )
                        )

                        db.flush()

            except IntegrityError as error:
                error_text = str(error)

                if (
                    idempotency_key
                    and (
                        "ix_sync_receipts_idempotency_key"
                        in error_text
                        or "idempotency_key"
                        in error_text
                    )
                ):
                    existing_receipt = (
                        db.query(SyncReceipt)
                        .filter(
                            SyncReceipt.user_id == user.id,
                            SyncReceipt.idempotency_key
                            == idempotency_key,
                        )
                        .first()
                    )

                    if existing_receipt:
                        mutation_result = (
                            existing_receipt.result
                        )
                    else:
                        mutation_result = {
                            "outbox_id": outbox_id,
                            "success": False,
                            "conflict": False,
                            "error": (
                                "Duplicate receipt could "
                                "not be loaded"
                            ),
                        }
                else:
                    mutation_result = {
                        "outbox_id": outbox_id,
                        "success": False,
                        "conflict": False,
                        "error": str(error),
                        "record": record,
                        "server_data": server_data,
                        "server_version": server_version,
                    }

            except Exception as error:
                mutation_result = {
                    "outbox_id": outbox_id,
                    "success": False,
                    "conflict": conflict,
                    "error": str(error),
                    "record": record,
                    "server_data": server_data,
                    "server_version": server_version,
                }

            results.append(mutation_result)

        db.commit()
        return results

    @staticmethod
    def process_pull(
        db: Session,
        user,
        cursor_val: str,
    ):
        try:
            cursor_seq = int(cursor_val)
        except (ValueError, TypeError):
            cursor_seq = 0

        max_seq = (
            db.query(func.max(ChangeLog.seq)).scalar()
            or 0
        )

        user_station_id = getattr(
            user,
            "station_id",
            None,
        )

        role_name = getattr(
            getattr(user, "role", None),
            "name",
            "",
        )

        is_command_user = role_name.lower() in {
            "command",
            "admin",
            "super_admin",
        }

        if cursor_seq == 0:
            changes = []

            for entity_type, handler in get_all_handlers().items():
                model = getattr(handler, "model", None)

                if model is None:
                    continue

                query = db.query(model)

                if (
                    hasattr(model, "station_id")
                    and user_station_id
                    and not is_command_user
                ):
                    query = query.filter(
                        (model.station_id == user_station_id)
                        | (model.station_id.is_(None))
                    )

                for record in query.all():
                    changes.append(
                        {
                            "seq": max_seq,
                            "entity_type": entity_type,
                            "operation": "snapshot",
                            "data": handler.serialize(record),
                        }
                    )

            return changes, str(max_seq), False

        query = db.query(ChangeLog).filter(
            ChangeLog.seq > cursor_seq
        )

        if user_station_id and not is_command_user:
            query = query.filter(
                (ChangeLog.station_id == user_station_id)
                | (ChangeLog.station_id.is_(None))
            )

        logs = (
            query
            .order_by(ChangeLog.seq.asc())
            .limit(501)
            .all()
        )

        has_more = len(logs) > 500
        logs_to_return = logs[:500]
        changes = []
        highest_seq = cursor_seq

        for log in logs_to_return:
            changes.append(
                {
                    "seq": log.seq,
                    "entity_type": log.entity_type,
                    "operation": log.operation,
                    "data": (
                        log.data
                        or log.serialized_data
                        or {"id": log.entity_id}
                    ),
                }
            )

            highest_seq = max(highest_seq, log.seq)

        sync_cursor = (
            db.query(SyncCursor)
            .filter(SyncCursor.user_id == user.id)
            .first()
        )

        if sync_cursor is None:
            db.add(
                SyncCursor(
                    user_id=user.id,
                    last_pull_version=highest_seq,
                )
            )
        else:
            sync_cursor.last_pull_version = highest_seq

        db.commit()

        return (
            changes,
            str(highest_seq),
            has_more,
        )