# ADR 0002: Search Quality v1

Date: 2026-05-07

Status: Accepted

Owner: architect

Issue: MY-13

## Context

OGUxKorndoc already has semantic document search over Qdrant with one dense 768-dimensional
cosine vector per chunk. The current document pipeline extracts text, chunks it with a
2048/256 sliding window, embeds chunks with the configured singleton SentenceTransformer
model, and writes chunk payloads to the `documents` collection. The search endpoint embeds the
raw user query and runs a dense vector query with payload filters for access control.

The next implementation tasks B2, B3, and B4 need one shared decision for improving search
quality without changing the MVP stack or introducing Elasticsearch.

Qdrant Query API supports hybrid and multi-stage queries from v1.10.0. The target deployment is
Qdrant 1.17.0, so the required feature set is available. Qdrant official documentation describes
sparse text search with BM25 through FastEmbed and RRF fusion through `query_points` with
`prefetch`.

References:

- Qdrant Hybrid Queries: https://qdrant.tech/documentation/concepts/hybrid-queries/
- Qdrant Text Search: https://qdrant.tech/documentation/search/text-search/
- Qdrant Hybrid Search with FastEmbed: https://qdrant.tech/documentation/beginner-tutorials/hybrid-search-fastembed/

## Decision

### 1. Hybrid Document Search

Document chunks will be stored in Qdrant with named vectors:

- `dense`: 768-dimensional cosine vector from the configured dense embedding model.
- `sparse`: BM25 sparse vector generated through Qdrant FastEmbed.

The current dense embedding model contract remains fixed at 768 dimensions and cosine distance.
The active default in this codebase is `google/embeddinggemma-300m`; existing references to
`paraphrase-multilingual-mpnet-base-v2` are treated as historical/default-compatible 768-dim
configuration. Implementations must not load the dense model inside request handlers or Celery
task bodies. API loads it in FastAPI `lifespan`; worker loads it as a module singleton.

Search will use Qdrant `query_points` with two prefetches and RRF fusion:

- Dense prefetch: query vector from the singleton dense embedder, using `dense`.
- Sparse prefetch: query sparse vector from FastEmbed BM25, using `sparse`.
- Main query: `FusionQuery(fusion=Fusion.RRF)`.

The same access-control payload filter used by the current search endpoint must be applied to
both prefetches. RRF happens in Qdrant; application code still deduplicates by `document_id`,
enriches results from PostgreSQL, and builds `snippet_html`.

Qdrant collection creation must explicitly configure both vector slots:

- `vectors_config={"dense": VectorParams(size=768, distance=Distance.COSINE)}`
- `sparse_vectors_config={"sparse": SparseVectorParams()}`

Existing dense-only collections are not migrated in place. B2 must document and implement a
reindex path: recreate `documents` with named dense/sparse vectors, then re-run document
indexing.

### 2. Separate FAQ Collection

FAQ search will use a separate Qdrant collection named `faq`.

The `faq` collection is not mixed with document chunks:

- Collection: `faq`
- Dense vector: 768-dimensional cosine, named `dense`
- Sparse vector: BM25 FastEmbed sparse vector, named `sparse`
- Payload: `faq_id`, `question`, `answer`, `tags`, `is_active`, `updated_at`

FAQ data is authoritative in PostgreSQL and indexed from the FAQ table introduced by task C.
Qdrant is a derived index only. B3 must not store FAQ source-of-truth content only in Qdrant.

Document search and FAQ search are separate API paths. A user query can call one or both paths,
but each response must preserve its source type instead of merging FAQ rows into document
results. This keeps document access control and FAQ publication rules independent.

### 3. Query Rephrase

Query rephrase is an LLM preprocessing step that rewrites the user query into a concise search
query before vectorization. It uses the same backend LLM provider selected for A0; provider
credentials must come from `shared/config.py` settings and environment variables, never from
frontend code.

In v1, rephrase is enabled by default only for agent/RAG flows.

Normal document search remains deterministic by default:

- `POST /api/search/` uses the raw query unless `use_rephrase=true`.
- `POST /api/search/faq` uses the raw query unless `use_rephrase=true`.
- Agent/RAG backend calls set `use_rephrase=true`.

Reasoning:

- Normal search is an interactive UI path where added LLM latency and provider failures should
not affect the default search experience.
- Agent/RAG flows already depend on the LLM provider, so query rephrase is a natural part of
that pipeline.
- The explicit flag gives product room to enable rephrase in normal search later without another
API redesign.

When rephrase fails, the search must fall back to the original query and record
`rephrase_applied=false` in the response metadata. It must not fail the whole search request.

### 4. What We Do Not Do In v1

These items are deliberately out of scope for B2/B3/B4 and go to backlog:

- Fine-tuning dense embedding models.
- Building a gold standard relevance dataset.
- DeepEval or automated retrieval-quality evaluation suite.
- Augmented retrieval with generated hypothetical answers.
- Hierarchy-aware indexing for folder, section, heading, or table structure.
- Cross-encoder reranking.
- Elasticsearch or any additional search engine.

## Consequences

Positive:

- Exact corporate terms, IDs, abbreviations, and names get a lexical retrieval signal through
  BM25 sparse vectors.
- Dense semantic retrieval remains available for paraphrases and multilingual queries.
- Qdrant remains the only search backend.
- FAQ retrieval can be tuned and reindexed independently from document chunks.

Tradeoffs:

- Qdrant collections must be recreated or migrated to named vectors before hybrid search works.
- Worker indexing now computes two vector representations per chunk.
- Query latency increases because hybrid search performs dense and sparse prefetches.
- Rephrase behavior introduces provider latency only where explicitly enabled.

## Implementation Notes

B2 owns hybrid document indexing/search.

B3 owns FAQ table integration and the `faq` Qdrant collection after task C provides the FAQ
PostgreSQL model.

B4 owns LLM query rephrase and agent integration.

All three tasks must preserve the existing 50 MB upload limit in Nginx and FastAPI, current
document access levels, existing chunking settings, and singleton model-loading pattern.

