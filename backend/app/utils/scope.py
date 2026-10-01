from fastapi import HTTPException, status
from sqlalchemy.orm import Query

from app.services.permission_service import PermissionService


def scope_query(
    query: Query,
    model,
    user,
    permission: str,
) -> Query:
    permission_name = PermissionService.ALIAS_MAP.get(
        permission,
        permission,
    )

    role = getattr(user, "role", None)
    role_name = getattr(role, "name", role)
    role_permissions = PermissionService.PERMISSION_MATRIX.get(
        role_name,
        {},
    )
    scope = role_permissions.get(permission_name, "none")

    if scope == "none":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied for {permission}",
        )

    if scope == "all":
        return query

    if scope == "own_station":
        station_column = getattr(model, "station_id", None)
        user_station_id = getattr(user, "station_id", None)

        if station_column is None or user_station_id is None:
            return query

        return query.filter(station_column == user_station_id)

    if scope == "own":
        created_by_column = getattr(model, "created_by", None)

        if created_by_column is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Model has no created_by scope for {permission}",
            )

        return query.filter(created_by_column == user.id)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Unsupported permission scope for {permission}",
    )
