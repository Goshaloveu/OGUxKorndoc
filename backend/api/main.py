import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastembed import SparseTextEmbedding
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.http.models import Distance, SparseIndexParams, SparseVectorParams, VectorParams
from routers import admin, auth, chat, documents, faq, organizations, profile, search, users
from sentence_transformers import SentenceTransformer
from shared.config import settings
from shared.llm import ChatLLM

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def _ensure_qdrant_collection() -> None:
    """Create or validate the hybrid-search Qdrant collection."""
    client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
    existing = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection not in existing:
        try:
            client.create_collection(
                collection_name=settings.qdrant_collection,
                vectors_config={
                    "dense": VectorParams(size=settings.embedding_dim, distance=Distance.COSINE)
                },
                sparse_vectors_config={
                    "sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False))
                },
            )
            logger.info(
                "Created Qdrant collection '%s' for hybrid search",
                settings.qdrant_collection,
            )
        except UnexpectedResponse as exc:
            if exc.status_code != 409:
                raise
        return

    info = client.get_collection(settings.qdrant_collection)
    params = info.config.params
    vectors_config = params.vectors
    sparse_vectors_config = params.sparse_vectors or {}
    dense_config = vectors_config.get("dense") if isinstance(vectors_config, dict) else None
    sparse_config = (
        sparse_vectors_config.get("sparse") if isinstance(sparse_vectors_config, dict) else None
    )
    if dense_config is None or sparse_config is None:
        raise RuntimeError(
            f"Qdrant collection '{settings.qdrant_collection}' must use named vectors "
            "'dense' and 'sparse' for hybrid search. Recreate it and run reindex_all_documents."
        )
    if dense_config.size != settings.embedding_dim:
        raise RuntimeError(
            f"Qdrant collection '{settings.qdrant_collection}' dense vector size is "
            f"{dense_config.size}, expected {settings.embedding_dim}"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading embedding model: %s", settings.embedding_model)
    app.state.embedder = SentenceTransformer(settings.embedding_model)
    logger.info("Embedding model loaded")

    logger.info("Loading sparse embedding model: %s", settings.sparse_embedding_model)
    app.state.sparse_embedder = SparseTextEmbedding(model_name=settings.sparse_embedding_model)
    logger.info("Sparse embedding model loaded")

    _ensure_qdrant_collection()
    app.state.llm = ChatLLM()
    yield
    await app.state.llm.close()
    logger.info("Shutting down")


app = FastAPI(
    title="DocSearch API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(search.router)
app.include_router(faq.router)
app.include_router(admin.router)
app.include_router(profile.router)
app.include_router(organizations.router)
app.include_router(chat.router)
app.include_router(users.router)


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}
