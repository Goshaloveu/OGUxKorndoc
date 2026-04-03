"""
Admin API router — only accessible to users with role="admin".

GET    /api/admin/users            list all users
POST   /api/admin/users            create user
PATCH  /api/admin/users/{id}       update role / is_active
DELETE /api/admin/users/{id}       deactivate (is_active=False)
GET    /api/admin/stats            system statistics
GET    /api/admin/audit-logs       paginated audit log with filters
POST   /api/admin/reindex/{id}     reset document status and re-queue processing
GET    /api/admin/system/health    connectivity check for all services
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime

from dependencies import require_admin
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from shared.config import settings
from shared.database import get_db
from shared.models import AuditLog, Document, Organization, User
from shared.security import hash_password
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None


class UserListOut(BaseModel):
    items: list[UserOut]
    total: int
    page: int
    limit: int


class CreateUserRequest(BaseModel):
    email: str
    username: str
    password: str
    role: str = "user"


class UpdateUserRequest(BaseModel):
    role: str | None = None
    is_active: bool | None = None


class StatsOut(BaseModel):
    total_docs: int
    indexed_docs: int
    error_docs: int
    total_users: int
    searches_today: int


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    action: str
    resource_type: str
    resource_id: str | None
    details: dict
    ip_address: str | None
    created_at: datetime


class AuditLogListOut(BaseModel):
    items: list[AuditLogOut]
    total: int
    page: int
    limit: int


class ServiceHealth(BaseModel):
    status: str  # "ok" | "error"
    error: str | None = None


class HealthOut(BaseModel):
    postgres: ServiceHealth
    redis: ServiceHealth
    qdrant: ServiceHealth
    minio: ServiceHealth


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/users", response_model=UserListOut)
async def list_users(
    page: int = 1,
    limit: int = 20,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all users (admin only)."""
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
    )
    users = result.scalars().all()
    return UserListOut(
        items=[UserOut.model_validate(u) for u in users],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/users", response_model=UserOut, status_code=201)
async def create_user(
    body: CreateUserRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user (admin only)."""
    existing = await db.execute(
        select(User).where(or_(User.email == body.email, User.username == body.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email или username уже занят")

    if body.role not in ("admin", "user"):
        raise HTTPException(status_code=400, detail="Роль должна быть 'admin' или 'user'")

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=hash_password(body.password),
        role=body.role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("Admin %s created user %s", admin.email, user.email)
    return UserOut.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    body: UpdateUserRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update user role or active status (admin only)."""
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    if body.role is not None:
        if body.role not in ("admin", "user"):
            raise HTTPException(status_code=400, detail="Роль должна быть 'admin' или 'user'")
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a user (set is_active=False). Does not delete the record."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Нельзя деактивировать собственный аккаунт")

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    user.is_active = False
    await db.commit()


@router.get("/stats", response_model=StatsOut)
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Return system-wide statistics (admin only)."""
    total_docs = (await db.execute(select(func.count(Document.id)))).scalar() or 0
    indexed_docs = (
        await db.execute(select(func.count(Document.id)).where(Document.status == "indexed"))
    ).scalar() or 0
    error_docs = (
        await db.execute(select(func.count(Document.id)).where(Document.status == "error"))
    ).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    searches_today = (
        await db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.action == "search",
                AuditLog.created_at >= today_start,
            )
        )
    ).scalar() or 0

    return StatsOut(
        total_docs=total_docs,
        indexed_docs=indexed_docs,
        error_docs=error_docs,
        total_users=total_users,
        searches_today=searches_today,
    )


@router.get("/audit-logs", response_model=AuditLogListOut)
async def list_audit_logs(
    page: int = 1,
    limit: int = 20,
    user_id: int | None = None,
    action: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List audit logs with optional filters (admin only)."""
    query = select(AuditLog)

    if user_id is not None:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)
    if date_from:
        query = query.where(AuditLog.created_at >= date_from)
    if date_to:
        query = query.where(AuditLog.created_at <= date_to)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    )
    logs = result.scalars().all()

    return AuditLogListOut(
        items=[AuditLogOut.model_validate(log) for log in logs],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/reindex/{document_id}", status_code=202)
async def reindex_document(
    document_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset document status to 'pending' and re-queue processing (admin only)."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Документ не найден")

    doc.status = "pending"
    doc.error_message = None
    doc.chunk_count = None
    doc.indexed_at = None
    await db.commit()

    try:
        from celery_client import celery_app

        celery_app.send_task(
            "worker.tasks.process_document.process_document",
            args=[document_id],
        )
        logger.info("Admin %s queued reindex for document %d", admin.email, document_id)
    except Exception as exc:
        logger.warning("Failed to queue reindex task for doc %d: %s", document_id, exc)

    return {"detail": "Документ поставлен в очередь на переиндексацию", "document_id": document_id}


class AdminOrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    created_by: int
    created_at: datetime


@router.get("/organizations", response_model=list[AdminOrgOut])
async def list_organizations(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations (admin only)."""
    result = await db.execute(select(Organization).order_by(Organization.name))
    return [AdminOrgOut.model_validate(org) for org in result.scalars().all()]


@router.get("/system/health", response_model=HealthOut)
async def system_health(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Check connectivity to all backing services (admin only)."""
    # PostgreSQL — reuse the existing session
    try:
        await db.execute(text("SELECT 1"))
        pg_health = ServiceHealth(status="ok")
    except Exception as exc:
        pg_health = ServiceHealth(status="error", error=str(exc))

    # Blocking checks run in a thread pool so they don't block the event loop
    loop = asyncio.get_running_loop()
    redis_health, qdrant_health, minio_health = await asyncio.gather(
        loop.run_in_executor(None, _check_redis),
        loop.run_in_executor(None, _check_qdrant),
        loop.run_in_executor(None, _check_minio),
    )

    return HealthOut(
        postgres=pg_health,
        redis=redis_health,
        qdrant=qdrant_health,
        minio=minio_health,
    )


# ---------------------------------------------------------------------------
# Sync helpers for health checks (run in thread pool)
# ---------------------------------------------------------------------------


def _check_redis() -> ServiceHealth:
    try:
        import redis as redis_lib

        r = redis_lib.from_url(settings.redis_url, socket_connect_timeout=3)
        r.ping()
        return ServiceHealth(status="ok")
    except Exception as exc:
        return ServiceHealth(status="error", error=str(exc))


def _check_qdrant() -> ServiceHealth:
    try:
        from qdrant_client import QdrantClient

        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port, timeout=3)
        client.get_collections()
        return ServiceHealth(status="ok")
    except Exception as exc:
        return ServiceHealth(status="error", error=str(exc))


def _check_minio() -> ServiceHealth:
    try:
        from shared.minio_client import get_minio_client

        client = get_minio_client()
        client.list_buckets()
        return ServiceHealth(status="ok")
    except Exception as exc:
        return ServiceHealth(status="error", error=str(exc))
