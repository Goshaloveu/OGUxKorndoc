from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # PostgreSQL
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "docsearch"
    postgres_user: str = "docsearch"
    postgres_password: str = "docsearch_secret"

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # MinIO
    minio_endpoint: str = "minio:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin123"
    minio_bucket: str = "documents"
    minio_secure: bool = False
    # Public URL for presigned downloads (browser-accessible). In Docker, minio:9000
    # is not accessible from browser, so we rewrite to this address.
    minio_public_url: str = "http://localhost:9000"

    # Qdrant
    qdrant_host: str = "qdrant"
    qdrant_port: int = 6333
    qdrant_collection: str = "documents"
    qdrant_recreate_on_mismatch: bool = False

    # JWT
    secret_key: str = "supersecretkey_change_in_production_minimum_32_chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # Embedding
    embedding_model: str = "google/embeddinggemma-300m"
    sparse_embedding_model: str = "Qdrant/bm25"
    embedding_dim: int = 768
    chunk_size: int = 2048
    chunk_overlap: int = 256

    # LLM proxy (OpenAI-compatible). Switch provider by changing only these 3 vars.
    llm_provider: str = "deepseek"
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"
    llm_max_tokens: int = 4096
    llm_temperature: float = 0.7

    # App
    environment: str = "development"
    log_level: str = "INFO"

    @property
    def allow_qdrant_recreate_on_mismatch(self) -> bool:
        return self.qdrant_recreate_on_mismatch or self.environment.lower() in {
            "dev",
            "development",
            "local",
        }

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


settings = Settings()
