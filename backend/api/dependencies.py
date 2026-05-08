import logging

from fastapi import Depends, HTTPException
from shared.models import Document, DocumentPermission, OrganizationMember, User
from shared.security import get_current_user
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

LEVEL_RANK: dict[str, int] = {"viewer": 1, "editor": 2, "owner": 3}


async def check_document_access(
    document_id: int,
    required_level: str,
    current_user: User,
    db: AsyncSession,
) -> Document:
    """
    Verify that current_user has at least `required_level` access to the document.
    Returns the Document on success, raises HTTPException 404/403 otherwise.
    """
    doc = await db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Документ не найден")

    # 1. Admin — full access
    if current_user.role == "admin":
        return doc

    # 2. Uploader is always owner
    if doc.uploaded_by == current_user.id:
        return doc

    # 3. Get user's organization memberships
    org_result = await db.execute(
        select(OrganizationMember.org_id).where(OrganizationMember.user_id == current_user.id)
    )
    user_org_ids = [row[0] for row in org_result.all()]

    # 4. Find best permission level from explicit grants
    conditions = [DocumentPermission.user_id == current_user.id]
    if user_org_ids:
        conditions.append(DocumentPermission.org_id.in_(user_org_ids))

    perm_result = await db.execute(
        select(DocumentPermission).where(
            DocumentPermission.document_id == document_id,
            or_(*conditions),
        )
    )
    permissions = perm_result.scalars().all()

    if permissions:
        best_rank = max(LEVEL_RANK.get(p.level, 0) for p in permissions)
        if best_rank >= LEVEL_RANK.get(required_level, 1):
            return doc

    raise HTTPException(status_code=403, detail="Нет доступа к документу")


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that ensures the current user has admin role."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Требуются права администратора")
    return current_user
