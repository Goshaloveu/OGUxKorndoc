"""
Organizations API router.

GET    /api/organizations/                    my organizations
POST   /api/organizations/                    create organization
GET    /api/organizations/{id}                details + members
POST   /api/organizations/{id}/members        add member
DELETE /api/organizations/{id}/members/{uid}   remove member
"""

from __future__ import annotations

import logging
import re
import unicodedata
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from shared.database import get_db
from shared.models import Organization, OrganizationMember, User
from shared.security import get_current_user
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    created_by: int
    created_at: datetime


class MemberOut(BaseModel):
    id: int
    user_id: int
    username: str
    email: str
    role: str
    joined_at: datetime


class OrganizationDetailOut(BaseModel):
    id: int
    name: str
    slug: str
    created_by: int
    created_at: datetime
    members: list[MemberOut]


class CreateOrganizationRequest(BaseModel):
    name: str


class AddMemberRequest(BaseModel):
    user_id: int
    role: str = "member"  # "owner" | "member"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _slugify(name: str) -> str:
    """Transliterate and slugify a name."""
    # Basic cyrillic transliteration
    _tr = {
        "а": "a",
        "б": "b",
        "в": "v",
        "г": "g",
        "д": "d",
        "е": "e",
        "ё": "yo",
        "ж": "zh",
        "з": "z",
        "и": "i",
        "й": "y",
        "к": "k",
        "л": "l",
        "м": "m",
        "н": "n",
        "о": "o",
        "п": "p",
        "р": "r",
        "с": "s",
        "т": "t",
        "у": "u",
        "ф": "f",
        "х": "kh",
        "ц": "ts",
        "ч": "ch",
        "ш": "sh",
        "щ": "shch",
        "ъ": "",
        "ы": "y",
        "ь": "",
        "э": "e",
        "ю": "yu",
        "я": "ya",
    }
    result = []
    for ch in name.lower():
        if ch in _tr:
            result.append(_tr[ch])
        else:
            result.append(ch)
    text = "".join(result)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "org"


async def _ensure_unique_slug(slug: str, db: AsyncSession) -> str:
    """Append a numeric suffix if slug is already taken."""
    base = slug
    counter = 0
    while True:
        candidate = f"{base}-{counter}" if counter else base
        exists = await db.execute(
            select(Organization.id).where(Organization.slug == candidate).limit(1)
        )
        if exists.scalar_one_or_none() is None:
            return candidate
        counter += 1


async def _check_org_access(
    org_id: int,
    current_user: User,
    db: AsyncSession,
    require_owner: bool = False,
) -> Organization:
    """Check that user has access to organization. Returns org on success."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Организация не найдена")

    if current_user.role == "admin":
        return org

    member_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == current_user.id,
        )
    )
    member = member_result.scalar_one_or_none()

    if member is None:
        raise HTTPException(status_code=403, detail="Вы не состоите в этой организации")

    if require_owner and member.role != "owner":
        raise HTTPException(status_code=403, detail="Требуются права владельца организации")

    return org


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[OrganizationOut])
async def list_my_organizations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List organizations the current user belongs to."""
    result = await db.execute(
        select(Organization)
        .join(OrganizationMember, OrganizationMember.org_id == Organization.id)
        .where(OrganizationMember.user_id == current_user.id)
        .order_by(Organization.name)
    )
    return [OrganizationOut.model_validate(org) for org in result.scalars().all()]


@router.post("/", response_model=OrganizationOut, status_code=201)
async def create_organization(
    body: CreateOrganizationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization. Creator becomes owner."""
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Название организации не может быть пустым")

    slug = await _ensure_unique_slug(_slugify(name), db)

    org = Organization(
        name=name,
        slug=slug,
        created_by=current_user.id,
    )
    db.add(org)
    await db.flush()

    member = OrganizationMember(
        org_id=org.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    await db.commit()
    await db.refresh(org)

    logger.info("User %s created organization %s (slug=%s)", current_user.email, name, slug)
    return OrganizationOut.model_validate(org)


@router.get("/{org_id}", response_model=OrganizationDetailOut)
async def get_organization(
    org_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get organization details with member list."""
    org = await _check_org_access(org_id, current_user, db)

    members_result = await db.execute(
        select(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .where(OrganizationMember.org_id == org_id)
        .order_by(OrganizationMember.role, User.username)
    )
    members = [
        MemberOut(
            id=m.id,
            user_id=m.user_id,
            username=u.username,
            email=u.email,
            role=m.role,
            joined_at=m.joined_at,
        )
        for m, u in members_result.all()
    ]

    return OrganizationDetailOut(
        id=org.id,
        name=org.name,
        slug=org.slug,
        created_by=org.created_by,
        created_at=org.created_at,
        members=members,
    )


@router.post("/{org_id}/members", response_model=MemberOut, status_code=201)
async def add_member(
    org_id: int,
    body: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a member to the organization (org owner or admin only)."""
    await _check_org_access(org_id, current_user, db, require_owner=True)

    if body.role not in ("owner", "member"):
        raise HTTPException(status_code=400, detail="Роль должна быть 'owner' или 'member'")

    # Check user exists
    target_user = await db.get(User, body.user_id)
    if target_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Check not already a member
    existing = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == body.user_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Пользователь уже состоит в организации")

    member = OrganizationMember(
        org_id=org_id,
        user_id=body.user_id,
        role=body.role,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return MemberOut(
        id=member.id,
        user_id=member.user_id,
        username=target_user.username,
        email=target_user.email,
        role=member.role,
        joined_at=member.joined_at,
    )


@router.delete("/{org_id}/members/{user_id}", status_code=204)
async def remove_member(
    org_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the organization (org owner or admin only)."""
    await _check_org_access(org_id, current_user, db, require_owner=True)

    member_result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.org_id == org_id,
            OrganizationMember.user_id == user_id,
        )
    )
    member = member_result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Участник не найден")

    # Prevent removing the last owner
    if member.role == "owner":
        owner_count_result = await db.execute(
            select(OrganizationMember).where(
                OrganizationMember.org_id == org_id,
                OrganizationMember.role == "owner",
            )
        )
        owners = owner_count_result.scalars().all()
        if len(owners) <= 1:
            raise HTTPException(
                status_code=400, detail="Нельзя удалить последнего владельца организации"
            )

    await db.delete(member)
    await db.commit()
