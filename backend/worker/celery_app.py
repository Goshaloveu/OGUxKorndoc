"""
Celery application for the document processing worker.

The embedding model is loaded once per worker process via the
worker_process_init signal — before any task runs. This ensures
that even with Celery's prefork pool each forked process has its
own loaded copy and never loads on-demand inside a task.
"""

import logging
import os
import sys

from celery import Celery
from celery.signals import worker_process_init

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
# Loaded once per forked worker process via worker_process_init signal.
# ---------------------------------------------------------------------------

_embedder = None


@worker_process_init.connect
def _load_model_on_worker_init(**kwargs):
    """Pre-load the embedding model when each worker process starts."""
    global _embedder
    logger.info("Worker process init: loading embedding model %s", settings.embedding_model)
    from sentence_transformers import SentenceTransformer

    _embedder = SentenceTransformer(settings.embedding_model)
    logger.info("Embedding model loaded (dim=%d)", settings.embedding_dim)


def get_embedder():
    """Return the embedding model singleton (guaranteed loaded by worker_process_init)."""
    if _embedder is None:
        # Fallback: called outside prefork context (e.g. tests / solo pool)
        _load_model_on_worker_init()
    return _embedder
