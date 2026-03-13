"""
Celery task: full document processing pipeline.

Steps:
  1. Download file from MinIO to a temporary directory
  2. Set document status → "processing"
  3. Extract text based on file type (PyMuPDF / python-docx / openpyxl / plain text)
     with pytesseract OCR fallback for scan-only PDFs
  4. Sliding-window chunking (chunk_size / chunk_overlap from settings)
  5. Embed each chunk with the singleton sentence-transformer model
  6. Upsert chunks into Qdrant with access-control payload fields
  7. Update Document: status="indexed", indexed_at, chunk_count, page_count
  8. On error: status="error", error_message saved, retry after 60 s (max 3)
"""

from __future__ import annotations

import io
import logging
import uuid
from collections.abc import Generator
from datetime import UTC, datetime

from celery_app import celery_app, get_embedder
from shared.config import settings
from shared.minio_client import download_file

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Qdrant helpers (collection bootstrap + upsert)
# ---------------------------------------------------------------------------


def _get_qdrant_client():
    from qdrant_client import QdrantClient

    return QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)


def _ensure_collection(client) -> None:
    """Create the Qdrant collection if it does not exist yet."""
    from qdrant_client.http.models import Distance, VectorParams

    existing = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection not in existing:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=settings.embedding_dim, distance=Distance.COSINE),
        )
        logger.info(
            "Created Qdrant collection '%s' (dim=%d)",
            settings.qdrant_collection,
            settings.embedding_dim,
        )


# ---------------------------------------------------------------------------
# Text extraction
# ---------------------------------------------------------------------------


def _extract_text_pdf(file_data: bytes) -> tuple[str, int]:
    """Extract text from PDF.  Falls back to OCR if the page has no text layer."""
    import fitz  # PyMuPDF

    doc = fitz.open(stream=file_data, filetype="pdf")
    pages: list[str] = []
    for page in doc:
        text = page.get_text().strip()
        if not text:
            # OCR fallback via pytesseract
            try:
                import pytesseract
                from PIL import Image

                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                text = pytesseract.image_to_string(img, lang="rus+eng")
            except Exception as ocr_err:
                logger.warning("OCR failed for page %d: %s", page.number, ocr_err)
                text = ""
        pages.append(text)
    return "\n\n".join(pages), len(pages)


def _extract_text_docx(file_data: bytes) -> tuple[str, int]:
    import docx

    document = docx.Document(io.BytesIO(file_data))
    text = "\n".join(p.text for p in document.paragraphs)
    return text, 0


def _extract_text_xlsx(file_data: bytes) -> tuple[str, int]:
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(file_data), read_only=True)
    lines: list[str] = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows(values_only=True):
            lines.append("\t".join("" if c is None else str(c) for c in row))
    return "\n".join(lines), 0


def _extract_text(file_data: bytes, file_type: str) -> tuple[str, int]:
    """Return (full_text, page_count).  page_count is 0 for non-PDF formats."""
    if file_type == "pdf":
        return _extract_text_pdf(file_data)
    if file_type == "docx":
        return _extract_text_docx(file_data)
    if file_type == "xlsx":
        return _extract_text_xlsx(file_data)
    # txt / fallback
    return file_data.decode("utf-8", errors="replace"), 0


# ---------------------------------------------------------------------------
# Chunking
# ---------------------------------------------------------------------------


def _chunk_text(
    text: str,
    chunk_size: int = 2048,
    overlap: int = 256,
) -> Generator[str, None, None]:
    """Yield sliding-window chunks of *text*."""
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        yield text[start:end]
        if end == text_len:
            break
        start += chunk_size - overlap


# ---------------------------------------------------------------------------
# Synchronous DB helpers (called from Celery task, not async context)
# ---------------------------------------------------------------------------


def _update_document_status(
    document_id: int,
    status: str,
    *,
    error_message: str | None = None,
    chunk_count: int | None = None,
    page_count: int | None = None,
    indexed_at: datetime | None = None,
) -> None:
    """Synchronously update document fields using a psycopg2 connection."""
    import psycopg2

    dsn = (
        f"host={settings.postgres_host} port={settings.postgres_port} "
        f"dbname={settings.postgres_db} user={settings.postgres_user} "
        f"password={settings.postgres_password}"
    )
    conn = psycopg2.connect(dsn)
    try:
        with conn.cursor() as cur:
            fields = ["status = %s", "updated_at = now()"]
            values: list = [status]

            if error_message is not None:
                fields.append("error_message = %s")
                values.append(error_message)
            if chunk_count is not None:
                fields.append("chunk_count = %s")
                values.append(chunk_count)
            if page_count is not None:
                fields.append("page_count = %s")
                values.append(page_count)
            if indexed_at is not None:
                fields.append("indexed_at = %s")
                values.append(indexed_at)

            values.append(document_id)
            cur.execute(
                f"UPDATE documents SET {', '.join(fields)} WHERE id = %s",  # noqa: S608
                values,
            )
        conn.commit()
    finally:
        conn.close()


def _get_document_info(document_id: int) -> dict | None:
    """Fetch the minimal document fields needed for processing."""
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
                "SELECT id, title, minio_path, file_type, folder_path, uploaded_by, org_id "
                "FROM documents WHERE id = %s",
                (document_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Celery task
# ---------------------------------------------------------------------------


@celery_app.task(
    bind=True,
    name="worker.tasks.process_document.process_document",
    max_retries=3,
    default_retry_delay=60,
)
def process_document(self, document_id: int) -> None:
    """
    Full document processing pipeline:
    download → extract text → chunk → embed → upsert Qdrant → update status.
    """
    logger.info("Starting processing for document_id=%d", document_id)

    # 1. Fetch document metadata from PostgreSQL
    doc_info = _get_document_info(document_id)
    if doc_info is None:
        logger.error("Document %d not found in DB — skipping", document_id)
        return

    minio_path: str = doc_info["minio_path"]
    file_type: str = doc_info["file_type"]
    title: str = doc_info["title"]
    folder_path: str = doc_info["folder_path"]
    uploaded_by: int = doc_info["uploaded_by"]
    org_id: int | None = doc_info["org_id"]

    # 2. Update status → "processing"
    _update_document_status(document_id, "processing")

    try:
        # 3. Download from MinIO
        logger.info("Downloading %s from MinIO", minio_path)
        file_data = download_file(minio_path)

        # 4. Extract text
        logger.info("Extracting text from %s (type=%s)", minio_path, file_type)
        full_text, page_count = _extract_text(file_data, file_type)

        if not full_text.strip():
            logger.warning("Document %d produced empty text after extraction", document_id)

        # 5. Chunking
        chunks = list(_chunk_text(full_text, settings.chunk_size, settings.chunk_overlap))
        logger.info("Document %d split into %d chunks", document_id, len(chunks))

        # 6. Embed all chunks at once (batch for efficiency)
        embedder = get_embedder()
        vectors = embedder.encode(chunks, show_progress_bar=False, batch_size=32)

        # 7. Upsert into Qdrant
        qdrant = _get_qdrant_client()
        _ensure_collection(qdrant)

        from qdrant_client.http.models import PointStruct

        points: list[PointStruct] = []
        for idx, (chunk_text, vector) in enumerate(zip(chunks, vectors, strict=True)):
            point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{document_id}-{idx}"))
            points.append(
                PointStruct(
                    id=point_id,
                    vector=vector.tolist(),
                    payload={
                        "document_id": document_id,
                        "title": title,
                        "chunk_index": idx,
                        "text": chunk_text,
                        "file_type": file_type,
                        "folder_path": folder_path,
                        "uploaded_by": uploaded_by,
                        "org_id": org_id,
                    },
                )
            )

        # Upsert in batches of 100 to avoid large payloads
        batch_size = 100
        for i in range(0, len(points), batch_size):
            qdrant.upsert(
                collection_name=settings.qdrant_collection,
                points=points[i : i + batch_size],
            )
        logger.info("Upserted %d vectors to Qdrant for document %d", len(points), document_id)

        # 8. Update document: indexed
        _update_document_status(
            document_id,
            "indexed",
            chunk_count=len(chunks),
            page_count=page_count if page_count else None,
            indexed_at=datetime.now(tz=UTC),
        )
        logger.info("Document %d successfully indexed (%d chunks)", document_id, len(chunks))

    except Exception as exc:
        logger.exception("Error processing document %d: %s", document_id, exc)
        _update_document_status(
            document_id,
            "error",
            error_message=str(exc)[:1000],
        )
        raise self.retry(exc=exc, countdown=60) from None
