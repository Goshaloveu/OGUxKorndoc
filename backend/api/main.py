import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, documents, search
from sentence_transformers import SentenceTransformer
from shared.config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading embedding model: %s", settings.embedding_model)
    app.state.embedder = SentenceTransformer(settings.embedding_model)
    logger.info("Embedding model loaded")
    yield
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


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok"}
