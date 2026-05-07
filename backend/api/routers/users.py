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
from sqlalchemy import case, or_, func, select
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
    """Lookup active users by exact email or username prefix."""
    query = q.strip().lower()
    if not query:
        return []

    email_match = func.lower(User.email) == query
    username_match = func.lower(User.username).like(f"{query}%")

    result = await db.execute(
        select(User)
        .where(User.is_active.is_(True), email_match | username_match)
        .order_by(case((email_match, 0), else_=1), User.username)
        .limit(10)
    )
    return [UserLookupOut.model_validate(user) for user in result.scalars().all()]
