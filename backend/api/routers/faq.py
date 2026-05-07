from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from shared.database import get_db
from shared.models import FAQItem
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/faq", tags=["faq"])


class PublicFAQItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    answer: str
    order: int
    updated_at: datetime


@router.get("", response_model=list[PublicFAQItemOut])
async def list_public_faq(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FAQItem)
        .where(FAQItem.is_published == True)  # noqa: E712
        .order_by(FAQItem.order.asc(), FAQItem.created_at.asc(), FAQItem.id.asc())
    )
    return [PublicFAQItemOut.model_validate(item) for item in result.scalars().all()]
