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
from shared.models import (
    AuditLog,
    Document,
    DocumentPermission,
    Organization,
    OrganizationMember,
    User,
)
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
    pending_docs: int
    processing_docs: int
    error_docs: int
    total_users: int
    active_users: int
    total_orgs: int
    searches_today: int
    uploads_today: int


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
    response_ms: int | None = None


class HealthOut(BaseModel):
    postgres: ServiceHealth
    redis: ServiceHealth
    qdrant: ServiceHealth
    minio: ServiceHealth
    checked_at: datetime


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

    # Self-protection: admin cannot demote or deactivate themselves
    if user_id == admin.id:
        if body.role is not None and body.role != "admin":
            raise HTTPException(status_code=400, detail="Нельзя снять с себя роль администратора")
        if body.is_active is not None and not body.is_active:
            raise HTTPException(status_code=400, detail="Нельзя деактивировать собственный аккаунт")

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
    today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

    (
        total_docs,
        indexed_docs,
        pending_docs,
        processing_docs,
        error_docs,
        total_users,
        active_users,
        total_orgs,
        searches_today,
        uploads_today,
    ) = await asyncio.gather(
        db.execute(select(func.count(Document.id))),
        db.execute(select(func.count(Document.id)).where(Document.status == "indexed")),
        db.execute(select(func.count(Document.id)).where(Document.status == "pending")),
        db.execute(select(func.count(Document.id)).where(Document.status == "processing")),
        db.execute(select(func.count(Document.id)).where(Document.status == "error")),
        db.execute(select(func.count(User.id))),
        db.execute(select(func.count(User.id)).where(User.is_active == True)),  # noqa: E712
        db.execute(select(func.count(Organization.id))),
        db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.action == "search",
                AuditLog.created_at >= today_start,
            )
        ),
        db.execute(
            select(func.count(AuditLog.id)).where(
                AuditLog.action == "upload",
                AuditLog.created_at >= today_start,
            )
        ),
    )

    return StatsOut(
        total_docs=total_docs.scalar() or 0,
        indexed_docs=indexed_docs.scalar() or 0,
        pending_docs=pending_docs.scalar() or 0,
        processing_docs=processing_docs.scalar() or 0,
        error_docs=error_docs.scalar() or 0,
        total_users=total_users.scalar() or 0,
        active_users=active_users.scalar() or 0,
        total_orgs=total_orgs.scalar() or 0,
        searches_today=searches_today.scalar() or 0,
        uploads_today=uploads_today.scalar() or 0,
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
    member_count: int = 0
    creator_username: str | None = None


class AdminOrgListOut(BaseModel):
    items: list[AdminOrgOut]
    total: int
    page: int
    limit: int


class UpdateOrgRequest(BaseModel):
    name: str | None = None


class AdminDocOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    filename: str
    file_type: str
    file_size: int
    folder_path: str
    status: str
    error_message: str | None
    uploaded_by: int
    uploaded_by_username: str | None = None
    org_id: int | None
    org_name: str | None = None
    uploaded_at: datetime
    updated_at: datetime
    indexed_at: datetime | None
    page_count: int | None
    chunk_count: int | None
    tags: list


class AdminDocListOut(BaseModel):
    items: list[AdminDocOut]
    total: int
    page: int
    limit: int


class AdminUpdateDocRequest(BaseModel):
    title: str | None = None
    tags: list[str] | None = None
    folder_path: str | None = None


class AdminPermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    document_id: int
    user_id: int | None
    org_id: int | None
    level: str
    granted_by: int
    granted_at: datetime
    user_username: str | None = None
    user_email: str | None = None
    org_name: str | None = None
    granted_by_username: str | None = None


class AdminAddPermissionRequest(BaseModel):
    user_id: int | None = None
    org_id: int | None = None
    level: str


# ---------------------------------------------------------------------------
# Organizations CRUD
# ---------------------------------------------------------------------------


@router.get("/organizations", response_model=AdminOrgListOut)
async def list_organizations(
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations with member counts (admin only)."""
    query = select(Organization)
    if search:
        query = query.where(
            or_(
                Organization.name.ilike(f"%{search}%"),
                Organization.slug.ilike(f"%{search}%"),
            )
        )

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(query.order_by(Organization.name).offset(offset).limit(limit))
    orgs = result.scalars().all()

    # Enrich with member counts and creator usernames
    org_ids = [o.id for o in orgs]
    creator_ids = list({o.created_by for o in orgs})

    member_counts: dict[int, int] = {}
    if org_ids:
        mc_result = await db.execute(
            select(OrganizationMember.org_id, func.count(OrganizationMember.id))
            .where(OrganizationMember.org_id.in_(org_ids))
            .group_by(OrganizationMember.org_id)
        )
        member_counts = dict(mc_result.all())

    creator_map: dict[int, str] = {}
    if creator_ids:
        cr_result = await db.execute(select(User.id, User.username).where(User.id.in_(creator_ids)))
        creator_map = {r["id"]: r["username"] for r in cr_result.mappings().all()}

    items = [
        AdminOrgOut(
            id=o.id,
            name=o.name,
            slug=o.slug,
            created_by=o.created_by,
            created_at=o.created_at,
            member_count=member_counts.get(o.id, 0),
            creator_username=creator_map.get(o.created_by),
        )
        for o in orgs
    ]

    return AdminOrgListOut(items=items, total=total, page=page, limit=limit)


@router.patch("/organizations/{org_id}", response_model=AdminOrgOut)
async def update_organization(
    org_id: int,
    body: UpdateOrgRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update organization name (admin only)."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Организация не найдена")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Название не может быть пустым")
        org.name = name

    await db.commit()
    await db.refresh(org)

    # Get member count
    mc = await db.execute(
        select(func.count(OrganizationMember.id)).where(OrganizationMember.org_id == org_id)
    )
    member_count = mc.scalar() or 0

    creator = await db.get(User, org.created_by)
    return AdminOrgOut(
        id=org.id,
        name=org.name,
        slug=org.slug,
        created_by=org.created_by,
        created_at=org.created_at,
        member_count=member_count,
        creator_username=creator.username if creator else None,
    )


@router.delete("/organizations/{org_id}", status_code=204)
async def delete_organization(
    org_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete an organization. Removes all memberships (CASCADE). Documents org_id set to NULL."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Организация не найдена")

    # Detach documents from this org
    doc_result = await db.execute(select(Document).where(Document.org_id == org_id))
    for doc in doc_result.scalars().all():
        doc.org_id = None

    # Remove org-level document permissions
    perm_result = await db.execute(
        select(DocumentPermission).where(DocumentPermission.org_id == org_id)
    )
    for perm in perm_result.scalars().all():
        await db.delete(perm)

    await db.delete(org)
    await db.commit()
    logger.info("Admin %s deleted organization %d", admin.email, org_id)


# ---------------------------------------------------------------------------
# Documents CRUD (admin)
# ---------------------------------------------------------------------------


@router.get("/documents", response_model=AdminDocListOut)
async def list_all_documents(
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    status: str | None = None,
    file_type: str | None = None,
    org_id: int | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all documents in the system (admin only)."""
    query = select(Document)

    if search:
        query = query.where(
            or_(
                Document.title.ilike(f"%{search}%"),
                Document.filename.ilike(f"%{search}%"),
            )
        )
    if status:
        query = query.where(Document.status == status)
    if file_type:
        query = query.where(Document.file_type == file_type)
    if org_id is not None:
        query = query.where(Document.org_id == org_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(Document.uploaded_at.desc()).offset(offset).limit(limit)
    )
    documents = result.scalars().all()

    # Enrich with usernames and org names
    uploader_ids = list({d.uploaded_by for d in documents})
    org_ids = list({d.org_id for d in documents if d.org_id is not None})

    username_map: dict[int, str] = {}
    if uploader_ids:
        uname_result = await db.execute(
            select(User.id, User.username).where(User.id.in_(uploader_ids))
        )
        username_map = {r["id"]: r["username"] for r in uname_result.mappings().all()}

    org_name_map: dict[int, str] = {}
    if org_ids:
        org_result = await db.execute(
            select(Organization.id, Organization.name).where(Organization.id.in_(org_ids))
        )
        org_name_map = {r["id"]: r["name"] for r in org_result.mappings().all()}

    items = [
        AdminDocOut(
            id=d.id,
            title=d.title,
            filename=d.filename,
            file_type=d.file_type,
            file_size=d.file_size,
            folder_path=d.folder_path,
            status=d.status,
            error_message=d.error_message,
            uploaded_by=d.uploaded_by,
            uploaded_by_username=username_map.get(d.uploaded_by),
            org_id=d.org_id,
            org_name=org_name_map.get(d.org_id) if d.org_id else None,
            uploaded_at=d.uploaded_at,
            updated_at=d.updated_at,
            indexed_at=d.indexed_at,
            page_count=d.page_count,
            chunk_count=d.chunk_count,
            tags=d.tags,
        )
        for d in documents
    ]

    return AdminDocListOut(items=items, total=total, page=page, limit=limit)


@router.patch("/documents/{document_id}", response_model=AdminDocOut)
async def admin_update_document(
    document_id: int,
    body: AdminUpdateDocRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update document metadata (admin only)."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Документ не найден")

    if body.title is not None:
        doc.title = body.title
    if body.tags is not None:
        doc.tags = body.tags
    if body.folder_path is not None:
        doc.folder_path = body.folder_path

    await db.commit()
    await db.refresh(doc)

    uploader = await db.get(User, doc.uploaded_by)
    org_name = None
    if doc.org_id:
        org = await db.get(Organization, doc.org_id)
        org_name = org.name if org else None

    return AdminDocOut(
        id=doc.id,
        title=doc.title,
        filename=doc.filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        folder_path=doc.folder_path,
        status=doc.status,
        error_message=doc.error_message,
        uploaded_by=doc.uploaded_by,
        uploaded_by_username=uploader.username if uploader else None,
        org_id=doc.org_id,
        org_name=org_name,
        uploaded_at=doc.uploaded_at,
        updated_at=doc.updated_at,
        indexed_at=doc.indexed_at,
        page_count=doc.page_count,
        chunk_count=doc.chunk_count,
        tags=doc.tags,
    )


@router.delete("/documents/{document_id}", status_code=204)
async def admin_delete_document(
    document_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document including MinIO file and Qdrant vectors (admin only)."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Документ не найден")

    loop = asyncio.get_running_loop()

    # Delete from MinIO
    try:
        from shared.minio_client import delete_file

        await loop.run_in_executor(None, delete_file, doc.minio_path)
    except Exception as exc:
        logger.warning("Failed to delete MinIO object %s: %s", doc.minio_path, exc)

    # Delete vectors from Qdrant
    try:
        _delete_qdrant_vectors(document_id)
    except Exception as exc:
        logger.warning("Failed to delete Qdrant vectors for doc %d: %s", document_id, exc)

    audit = AuditLog(
        user_id=admin.id,
        action="delete",
        resource_type="document",
        resource_id=str(document_id),
        details={"title": doc.title, "filename": doc.filename, "admin_action": True},
    )
    db.add(audit)
    await db.delete(doc)
    await db.commit()
    logger.info("Admin %s deleted document %d", admin.email, document_id)


@router.get("/documents/{document_id}/permissions", response_model=list[AdminPermissionOut])
async def admin_list_permissions(
    document_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all permissions for a document (admin only)."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Документ не найден")

    result = await db.execute(
        select(DocumentPermission).where(DocumentPermission.document_id == document_id)
    )
    perms = result.scalars().all()

    # Enrich with user/org names
    user_ids = list({p.user_id for p in perms if p.user_id} | {p.granted_by for p in perms})
    org_ids = list({p.org_id for p in perms if p.org_id})

    user_map: dict[int, tuple[str, str]] = {}
    if user_ids:
        u_result = await db.execute(
            select(User.id, User.username, User.email).where(User.id.in_(user_ids))
        )
        user_map = {r["id"]: (r["username"], r["email"]) for r in u_result.mappings().all()}

    org_map: dict[int, str] = {}
    if org_ids:
        o_result = await db.execute(
            select(Organization.id, Organization.name).where(Organization.id.in_(org_ids))
        )
        org_map = {r["id"]: r["name"] for r in o_result.mappings().all()}

    items = []
    for p in perms:
        u_info = user_map.get(p.user_id) if p.user_id else None
        g_info = user_map.get(p.granted_by)
        items.append(
            AdminPermissionOut(
                id=p.id,
                document_id=p.document_id,
                user_id=p.user_id,
                org_id=p.org_id,
                level=p.level,
                granted_by=p.granted_by,
                granted_at=p.granted_at,
                user_username=u_info[0] if u_info else None,
                user_email=u_info[1] if u_info else None,
                org_name=org_map.get(p.org_id) if p.org_id else None,
                granted_by_username=g_info[0] if g_info else None,
            )
        )

    return items


@router.post(
    "/documents/{document_id}/permissions",
    response_model=AdminPermissionOut,
    status_code=201,
)
async def admin_add_permission(
    document_id: int,
    body: AdminAddPermissionRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Grant access to a document (admin only)."""
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Документ не найден")

    if body.level not in ("viewer", "editor", "owner"):
        raise HTTPException(status_code=400, detail="Уровень должен быть viewer, editor или owner")

    if (body.user_id is None) == (body.org_id is None):
        raise HTTPException(status_code=400, detail="Укажите ровно одно из: user_id или org_id")

    # Validate target exists
    if body.user_id:
        target = await db.get(User, body.user_id)
        if target is None:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
    if body.org_id:
        target_org = await db.get(Organization, body.org_id)
        if target_org is None:
            raise HTTPException(status_code=404, detail="Организация не найдена")

    # Check duplicate
    dup_query = select(DocumentPermission).where(DocumentPermission.document_id == document_id)
    if body.user_id:
        dup_query = dup_query.where(DocumentPermission.user_id == body.user_id)
    else:
        dup_query = dup_query.where(DocumentPermission.org_id == body.org_id)
    existing = await db.execute(dup_query)
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Доступ уже выдан этому субъекту")

    perm = DocumentPermission(
        document_id=document_id,
        user_id=body.user_id,
        org_id=body.org_id,
        level=body.level,
        granted_by=admin.id,
    )
    db.add(perm)
    await db.commit()
    await db.refresh(perm)

    # Enrich
    u_info = None
    if perm.user_id:
        u = await db.get(User, perm.user_id)
        u_info = (u.username, u.email) if u else None
    org_name = None
    if perm.org_id:
        o = await db.get(Organization, perm.org_id)
        org_name = o.name if o else None
    g = await db.get(User, perm.granted_by)

    return AdminPermissionOut(
        id=perm.id,
        document_id=perm.document_id,
        user_id=perm.user_id,
        org_id=perm.org_id,
        level=perm.level,
        granted_by=perm.granted_by,
        granted_at=perm.granted_at,
        user_username=u_info[0] if u_info else None,
        user_email=u_info[1] if u_info else None,
        org_name=org_name,
        granted_by_username=g.username if g else None,
    )


@router.delete("/documents/{document_id}/permissions/{permission_id}", status_code=204)
async def admin_remove_permission(
    document_id: int,
    permission_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a permission (admin only)."""
    perm = await db.get(DocumentPermission, permission_id)
    if perm is None or perm.document_id != document_id:
        raise HTTPException(status_code=404, detail="Разрешение не найдено")

    await db.delete(perm)
    await db.commit()


def _delete_qdrant_vectors(document_id: int) -> None:
    """Delete all vectors associated with a document from Qdrant."""
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port, timeout=10)
        client.delete(
            collection_name=settings.qdrant_collection,
            points_selector=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
            ),
        )
    except Exception as exc:
        logger.warning("Qdrant vector deletion failed for doc %d: %s", document_id, exc)


@router.get("/system/health", response_model=HealthOut)
async def system_health(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Check connectivity to all backing services (admin only)."""
    import time

    # PostgreSQL — reuse the existing session
    try:
        t0 = time.monotonic()
        await db.execute(text("SELECT 1"))
        pg_health = ServiceHealth(status="ok", response_ms=int((time.monotonic() - t0) * 1000))
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
        checked_at=datetime.now(UTC),
    )


# ---------------------------------------------------------------------------
# Sync helpers for health checks (run in thread pool)
# ---------------------------------------------------------------------------


def _check_redis() -> ServiceHealth:
    import time

    try:
        import redis as redis_lib

        r = redis_lib.from_url(
            settings.redis_url,
            socket_connect_timeout=1.5,
            socket_timeout=1.5,
        )
        t0 = time.monotonic()
        r.ping()
        return ServiceHealth(status="ok", response_ms=int((time.monotonic() - t0) * 1000))
    except Exception as exc:
        return ServiceHealth(status="error", error=str(exc))


def _check_qdrant() -> ServiceHealth:
    import time

    try:
        from qdrant_client import QdrantClient

        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port, timeout=1.5)
        t0 = time.monotonic()
        client.get_collections()
        return ServiceHealth(status="ok", response_ms=int((time.monotonic() - t0) * 1000))
    except Exception as exc:
        return ServiceHealth(status="error", error=str(exc))


def _check_minio() -> ServiceHealth:
    import time

    try:
        import boto3
        from botocore.config import Config

        scheme = "https" if settings.minio_secure else "http"
        client = boto3.client(
            "s3",
            endpoint_url=f"{scheme}://{settings.minio_endpoint}",
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            region_name="us-east-1",
            config=Config(connect_timeout=1.5, read_timeout=1.5, retries={"max_attempts": 0}),
        )
        t0 = time.monotonic()
        client.list_buckets()
        return ServiceHealth(status="ok", response_ms=int((time.monotonic() - t0) * 1000))
    except Exception as exc:
        return ServiceHealth(status="error", error=str(exc))
