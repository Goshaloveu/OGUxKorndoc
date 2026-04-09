"""
Search API router.

POST /api/search/       — semantic search over indexed documents
GET  /api/search/suggest — title autocomplete (accessible docs only)
"""

from __future__ import annotations

import logging
import re
import time
from datetime import datetime

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from shared.config import settings
from shared.database import get_db
from shared.models import AuditLog, Document, DocumentPermission, OrganizationMember, User
from shared.security import get_current_user
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class SearchFilters(BaseModel):
    file_type: str | None = None
    folder_path: str | None = None
    org_id: int | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None


class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    filters: SearchFilters = SearchFilters()


class SearchResult(BaseModel):
    document_id: int
    title: str
    snippet_html: str
    score: float
    file_type: str
    folder_path: str
    uploaded_at: datetime
    access_level: str


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total: int
    query_time_ms: int


# ---------------------------------------------------------------------------
# Snippet builder
# ---------------------------------------------------------------------------


def build_snippet(chunk_text: str, query: str, context_chars: int = 300) -> str:
    """
    Build an HTML snippet with <mark> highlights for matching query tokens.

    Algorithm (from CLAUDE.md section 7):
    1. Tokenise query: words > 2 chars, lower-case.
    2. Find position of the first matching token (re.IGNORECASE).
       Default to 0 if no match found.
    3. Extract ±context_chars window around the found position.
    4. Add "..." if text is truncated at either end.
    5. Wrap all token occurrences in <mark>.
    """
    query_tokens = [w.lower() for w in query.split() if len(w) > 2]

    # Step 2 — find first token occurrence
    pos = 0
    for token in query_tokens:
        m = re.search(re.escape(token), chunk_text, re.IGNORECASE)
        if m:
            pos = m.start()
            break

    # Step 3 — extract context window
    start = max(0, pos - context_chars)
    end = min(len(chunk_text), pos + context_chars)
    snippet = chunk_text[start:end]

    # Step 4 — truncation markers
    if start > 0:
        snippet = "..." + snippet
    if end < len(chunk_text):
        snippet = snippet + "..."

    # Step 5 — highlight tokens
    for token in query_tokens:
        pattern = re.compile(re.escape(token), re.IGNORECASE)
        snippet = pattern.sub(lambda m: f"<mark>{m.group()}</mark>", snippet)

    return snippet


# ---------------------------------------------------------------------------
# Access-control helpers
# ---------------------------------------------------------------------------


async def _get_user_access_info(
    user: User,
    db: AsyncSession,
) -> tuple[list[int], list[int]]:
    """
    Return (user_org_ids, permitted_doc_ids) for non-admin access filtering.
    Admin callers should skip this entirely.
    """
    org_result = await db.execute(
        select(OrganizationMember.org_id).where(OrganizationMember.user_id == user.id)
    )
    user_org_ids = [row[0] for row in org_result.all()]

    perm_result = await db.execute(
        select(DocumentPermission.document_id).where(DocumentPermission.user_id == user.id)
    )
    permitted_doc_ids = [row[0] for row in perm_result.all()]

    if user_org_ids:
        org_perm_result = await db.execute(
            select(DocumentPermission.document_id).where(
                DocumentPermission.org_id.in_(user_org_ids)
            )
        )
        permitted_doc_ids += [row[0] for row in org_perm_result.all()]

    return user_org_ids, permitted_doc_ids


def _build_qdrant_filter(
    user: User,
    user_org_ids: list[int],
    permitted_doc_ids: list[int],
    filters: SearchFilters,
):
    """Build a Qdrant Filter combining access-control and user-provided filters."""
    from qdrant_client.http.models import FieldCondition, Filter, MatchAny, MatchValue

    must_conditions = []

    # --- Access-control (non-admin) ---
    if user.role != "admin":
        access_conditions = [FieldCondition(key="uploaded_by", match=MatchValue(value=user.id))]
        if user_org_ids:
            access_conditions.append(FieldCondition(key="org_id", match=MatchAny(any=user_org_ids)))
        if permitted_doc_ids:
            access_conditions.append(
                FieldCondition(key="document_id", match=MatchAny(any=permitted_doc_ids))
            )
        must_conditions.append(Filter(should=access_conditions))

    # --- User-provided payload filters ---
    if filters.file_type:
        must_conditions.append(
            FieldCondition(key="file_type", match=MatchValue(value=filters.file_type))
        )
    if filters.folder_path:
        must_conditions.append(
            FieldCondition(key="folder_path", match=MatchValue(value=filters.folder_path))
        )

    return Filter(must=must_conditions) if must_conditions else None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/", response_model=SearchResponse)
async def search(
    query: SearchRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Semantic search over documents accessible to the current user."""
    start_time = time.monotonic()

    # 1. Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="search",
        resource_type="search",
        details={"query": query.query},
    )
    db.add(audit)
    await db.commit()

    # 2. Embed query
    embedder = request.app.state.embedder
    vector: list[float] = embedder.encode([query.query])[0].tolist()

    # 3. Build Qdrant filter
    user_org_ids: list[int] = []
    permitted_doc_ids: list[int] = []
    if current_user.role != "admin":
        user_org_ids, permitted_doc_ids = await _get_user_access_info(current_user, db)

    qdrant_filter = _build_qdrant_filter(
        current_user, user_org_ids, permitted_doc_ids, query.filters
    )

    # 4. Qdrant search (over-fetch for dedup)
    from qdrant_client import QdrantClient

    qdrant = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    search_limit = query.limit * 3

    try:
        response = qdrant.query_points(
            collection_name=settings.qdrant_collection,
            query=vector,
            query_filter=qdrant_filter,
            limit=search_limit,
            with_payload=True,
        )
        hits = response.points
    except Exception as exc:
        logger.warning("Qdrant search failed (collection may be empty): %s", exc)
        hits = []

    # 5. Deduplicate by document_id — keep the chunk with the best score
    best_by_doc: dict[int, tuple[float, dict]] = {}
    for hit in hits:
        if hit.payload is None:
            continue
        doc_id: int | None = hit.payload.get("document_id")
        if doc_id is None:
            continue
        if doc_id not in best_by_doc or hit.score > best_by_doc[doc_id][0]:
            best_by_doc[doc_id] = (hit.score, hit.payload)

    # 6. Enrich from PostgreSQL and apply remaining filters
    results: list[SearchResult] = []

    if best_by_doc:
        doc_ids = list(best_by_doc.keys())
        pg_result = await db.execute(select(Document).where(Document.id.in_(doc_ids)))
        pg_docs: dict[int, Document] = {d.id: d for d in pg_result.scalars().all()}

        # Apply PostgreSQL-side filters and collect candidates
        candidates: list[tuple[float, int]] = []
        for doc_id, (score, _payload) in best_by_doc.items():
            pg_doc = pg_docs.get(doc_id)
            if pg_doc is None:
                continue
            # Date range filter
            if query.filters.date_from:
                date_from = query.filters.date_from
                uploaded = pg_doc.uploaded_at
                # Strip tz for naive comparison if needed
                if uploaded.tzinfo is not None and date_from.tzinfo is None:
                    uploaded = uploaded.replace(tzinfo=None)
                if uploaded < date_from:
                    continue
            if query.filters.date_to:
                date_to = query.filters.date_to
                uploaded = pg_doc.uploaded_at
                if uploaded.tzinfo is not None and date_to.tzinfo is None:
                    uploaded = uploaded.replace(tzinfo=None)
                if uploaded > date_to:
                    continue
            # Org filter
            if query.filters.org_id is not None and pg_doc.org_id != query.filters.org_id:
                continue
            candidates.append((score, doc_id))

        # Sort by score descending, take top N
        candidates.sort(key=lambda x: x[0], reverse=True)
        candidates = candidates[: query.limit]

        # 7. Build result list
        for score, doc_id in candidates:
            pg_doc = pg_docs[doc_id]
            _score, payload = best_by_doc[doc_id]
            chunk_text: str = payload.get("text", "")
            snippet_html = build_snippet(chunk_text, query.query)

            # Determine the user's access level for this document
            if current_user.role == "admin" or pg_doc.uploaded_by == current_user.id:
                access_level = "owner"
            else:
                # Check explicit permissions
                perm_result = await db.execute(
                    select(DocumentPermission).where(
                        DocumentPermission.document_id == doc_id,
                        or_(
                            DocumentPermission.user_id == current_user.id,
                            DocumentPermission.org_id.in_(user_org_ids)
                            if user_org_ids
                            else DocumentPermission.id == -1,
                        ),
                    )
                )
                perms = perm_result.scalars().all()
                if perms:
                    from dependencies import LEVEL_RANK

                    best_rank = max(LEVEL_RANK.get(p.level, 0) for p in perms)
                    level_map = {v: k for k, v in LEVEL_RANK.items()}
                    access_level = level_map.get(best_rank, "viewer")
                else:
                    access_level = "viewer"

            results.append(
                SearchResult(
                    document_id=doc_id,
                    title=pg_doc.title,
                    snippet_html=snippet_html,
                    score=score,
                    file_type=pg_doc.file_type,
                    folder_path=pg_doc.folder_path,
                    uploaded_at=pg_doc.uploaded_at,
                    access_level=access_level,
                )
            )

    query_time_ms = int((time.monotonic() - start_time) * 1000)
    return SearchResponse(results=results, total=len(results), query_time_ms=query_time_ms)


@router.get("/suggest")
async def suggest(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[str]:
    """Autocomplete document titles for the query string (accessible docs only)."""
    if len(q) < 2:
        return []

    stmt = select(Document.title).where(Document.title.ilike(f"%{q}%"))

    if current_user.role != "admin":
        user_org_ids, permitted_doc_ids = await _get_user_access_info(current_user, db)

        access_conditions = [Document.uploaded_by == current_user.id]
        if user_org_ids:
            access_conditions.append(Document.org_id.in_(user_org_ids))
        if permitted_doc_ids:
            access_conditions.append(Document.id.in_(permitted_doc_ids))

        stmt = stmt.where(or_(*access_conditions))

    stmt = stmt.limit(10)
    result = await db.execute(stmt)
    return [row[0] for row in result.all()]
