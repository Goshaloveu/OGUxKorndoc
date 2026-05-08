import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from shared.database import get_db
from shared.models import AuditLog, Document, User
from shared.security import get_current_user, hash_password, verify_password
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["profile"])


class UserProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    role: str
    is_active: bool
    created_at: datetime
    last_login: datetime | None


class ProfileResponse(BaseModel):
    user: UserProfileOut
    my_documents_count: int
    recent_uploads: list[dict]
    recent_searches: list[dict]


class DocumentOut(BaseModel):
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
    org_id: int | None
    uploaded_at: datetime
    updated_at: datetime
    indexed_at: datetime | None
    page_count: int | None
    chunk_count: int | None
    tags: list


class DocumentListOut(BaseModel):
    items: list[DocumentOut]
    total: int
    page: int
    limit: int


class UpdateProfileRequest(BaseModel):
    username: str | None = None
    email: str | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.get("/", response_model=ProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Count user's documents
    count_result = await db.execute(
        select(func.count(Document.id)).where(Document.uploaded_by == current_user.id)
    )
    my_documents_count = count_result.scalar_one() or 0

    # Recent uploads (last 5)
    recent_result = await db.execute(
        select(Document)
        .where(Document.uploaded_by == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .limit(5)
    )
    recent_docs = recent_result.scalars().all()
    recent_uploads = [
        {"id": d.id, "title": d.title, "status": d.status, "uploaded_at": d.uploaded_at.isoformat()}
        for d in recent_docs
    ]

    # Recent searches (last 5 search audit logs)
    search_result = await db.execute(
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id, AuditLog.action == "search")
        .order_by(AuditLog.created_at.desc())
        .limit(5)
    )
    search_logs = search_result.scalars().all()
    recent_searches = [
        {
            "query": log.details.get("query", ""),
            "created_at": log.created_at.isoformat(),
        }
        for log in search_logs
    ]

    return ProfileResponse(
        user=UserProfileOut.model_validate(current_user),
        my_documents_count=my_documents_count,
        recent_uploads=recent_uploads,
        recent_searches=recent_searches,
    )


@router.get("/documents", response_model=DocumentListOut)
async def get_my_documents(
    page: int = 1,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * limit

    total_result = await db.execute(
        select(func.count(Document.id)).where(Document.uploaded_by == current_user.id)
    )
    total = total_result.scalar_one() or 0

    docs_result = await db.execute(
        select(Document)
        .where(Document.uploaded_by == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = docs_result.scalars().all()

    return DocumentListOut(
        items=[DocumentOut.model_validate(d) for d in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.patch("/", response_model=UserProfileOut)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.username is not None:
        # Check uniqueness
        existing = await db.execute(
            select(User).where(User.username == body.username, User.id != current_user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Имя пользователя уже занято")
        current_user.username = body.username

    if body.email is not None:
        existing = await db.execute(
            select(User).where(User.email == body.email, User.id != current_user.id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email уже используется")
        current_user.email = body.email

    await db.commit()
    await db.refresh(current_user)
    return UserProfileOut.model_validate(current_user)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен быть не менее 6 символов")

    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()
    logger.info("User %s changed password", current_user.email)
