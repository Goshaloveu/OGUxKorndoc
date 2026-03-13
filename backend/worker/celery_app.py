"""
Celery application for the document processing worker.

The embedding model is loaded once at module initialisation (singleton pattern)
so it is shared across all tasks executed by the same worker process.
"""

import logging
import os
import sys

from celery import Celery

# Ensure shared/ is importable (mounted at /app/shared in Docker, or at
# backend/shared when running locally from the repo root).
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from shared.config import settings  # noqa: E402

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Celery app
# ---------------------------------------------------------------------------

celery_app = Celery(
    "docsearch_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["tasks.process_document"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# ---------------------------------------------------------------------------
# Embedding model singleton
# Loaded once when the worker process starts (module-level init).
# ---------------------------------------------------------------------------

_embedder = None


def get_embedder():
    """Return the embedding model singleton, loading it on first call."""
    global _embedder
    if _embedder is None:
        logger.info("Loading embedding model: %s", settings.embedding_model)
        from sentence_transformers import SentenceTransformer

        _embedder = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded (dim=%d)", settings.embedding_dim)
    return _embedder
