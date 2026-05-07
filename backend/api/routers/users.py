"""
Users API router.

GET /api/users/lookup  lookup active users by email or username
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from shared.database import get_db
from shared.models import User
from shared.security import get_current_user
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/users", tags=["users"])

LOOKUP_LIMIT = 10


class UserLookupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str


@router.get("/lookup", response_model=list[UserLookupOut])
async def lookup_users(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lookup active users by partial email or username match."""
    del current_user

    query = q.strip()
    if not query:
        return []

    pattern = f"%{query}%"
    result = await db.execute(
        select(User)
        .where(
            User.is_active.is_(True),
            or_(User.email.ilike(pattern), User.username.ilike(pattern)),
        )
        .order_by(User.username, User.email)
        .limit(LOOKUP_LIMIT)
    )
    return [UserLookupOut.model_validate(user) for user in result.scalars().all()]
