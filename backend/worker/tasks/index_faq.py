"""Celery tasks for indexing FAQ entries into the dedicated Qdrant collection."""

from __future__ import annotations

import logging
import uuid

from celery_app import celery_app, get_embedder, get_sparse_embedder
from shared.config import settings

logger = logging.getLogger(__name__)


def _get_qdrant_client():
    from qdrant_client import QdrantClient

    return QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)


def _create_collection(client) -> None:
    from qdrant_client.http.models import (
        Distance,
        SparseIndexParams,
        SparseVectorParams,
        VectorParams,
    )

    client.create_collection(
        collection_name=settings.qdrant_faq_collection,
        vectors_config={
            "dense": VectorParams(size=settings.embedding_dim, distance=Distance.COSINE)
        },
        sparse_vectors_config={
            "sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False))
        },
    )
    logger.info("Created Qdrant FAQ collection '%s'", settings.qdrant_faq_collection)


def _ensure_collection(client) -> None:
    from qdrant_client.http.exceptions import UnexpectedResponse

    existing = [c.name for c in client.get_collections().collections]
    if settings.qdrant_faq_collection not in existing:
        try:
            _create_collection(client)
        except UnexpectedResponse as exc:
            if exc.status_code != 409:
                raise
        return

    info = client.get_collection(settings.qdrant_faq_collection)
    params = info.config.params
    vectors_config = params.vectors
    sparse_vectors_config = params.sparse_vectors or {}
    dense_config = vectors_config.get("dense") if isinstance(vectors_config, dict) else None
    sparse_config = (
        sparse_vectors_config.get("sparse") if isinstance(sparse_vectors_config, dict) else None
    )
    if dense_config is None or sparse_config is None:
        raise RuntimeError(
            f"Qdrant collection '{settings.qdrant_faq_collection}' must use named vectors "
            "'dense' and 'sparse' for FAQ search."
        )
    if dense_config.size != settings.embedding_dim:
        raise RuntimeError(
            f"Qdrant collection '{settings.qdrant_faq_collection}' dense vector size is "
            f"{dense_config.size}, expected {settings.embedding_dim}."
        )


def _faq_point_id(faq_id: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"faq-{faq_id}"))


def _delete_faq_point(client, faq_id: int) -> None:
    from qdrant_client.http.models import PointIdsList

    client.delete(
        collection_name=settings.qdrant_faq_collection,
        points_selector=PointIdsList(points=[_faq_point_id(faq_id)]),
    )


def _to_qdrant_sparse_vector(sparse_embedding):
    from qdrant_client.http.models import SparseVector

    return SparseVector(
        indices=sparse_embedding.indices.tolist(),
        values=sparse_embedding.values.tolist(),
    )


def _get_faq_info(faq_id: int) -> dict | None:
    import psycopg2
    import psycopg2.extras

    dsn = (
        f"host={settings.postgres_host} port={settings.postgres_port} "
        f"dbname={settings.postgres_db} user={settings.postgres_user} "
        f"password={settings.postgres_password}"
    )
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT id, question, answer, is_published, updated_at "
                "FROM faq_items WHERE id = %s",
                (faq_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


@celery_app.task(
    bind=True,
    name="worker.tasks.index_faq.index_faq_entry",
    max_retries=3,
    default_retry_delay=60,
)
def index_faq_entry(self, faq_id: int) -> None:
    """Embed one FAQ question+answer and upsert it into the FAQ Qdrant collection."""
    logger.info("Starting FAQ indexing for faq_id=%d", faq_id)
    try:
        qdrant = _get_qdrant_client()
        _ensure_collection(qdrant)
        faq = _get_faq_info(faq_id)
        if faq is None:
            _delete_faq_point(qdrant, faq_id)
            logger.info("Deleted FAQ point for missing faq_id=%d", faq_id)
            return

        if not faq["is_published"]:
            _delete_faq_point(qdrant, faq_id)
            logger.info("Deleted FAQ point for unpublished faq_id=%d", faq_id)
            return

        text = f"{faq['question']}\n\n{faq['answer']}"
        embedder = get_embedder()
        vector = embedder.encode([text], show_progress_bar=False)[0]
        sparse_embedder = get_sparse_embedder()
        sparse_vector = next(sparse_embedder.embed([text]))

        from qdrant_client.http.models import PointStruct

        qdrant.upsert(
            collection_name=settings.qdrant_faq_collection,
            points=[
                PointStruct(
                    id=_faq_point_id(faq_id),
                    vector={
                        "dense": vector.tolist(),
                        "sparse": _to_qdrant_sparse_vector(sparse_vector),
                    },
                    payload={
                        "faq_id": faq_id,
                        "question": faq["question"],
                        "answer": faq["answer"],
                        "tags": [],
                        "is_active": faq["is_published"],
                        "updated_at": faq["updated_at"].isoformat(),
                    },
                )
            ],
        )
        logger.info("FAQ %d indexed into Qdrant", faq_id)
    except Exception as exc:
        logger.exception("Error indexing FAQ %d: %s", faq_id, exc)
        raise self.retry(exc=exc, countdown=60) from None
