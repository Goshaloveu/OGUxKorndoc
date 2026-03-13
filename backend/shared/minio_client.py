import logging
from io import BytesIO

import boto3
from botocore.exceptions import ClientError

from shared.config import settings

logger = logging.getLogger(__name__)


def get_minio_client():
    """Create and return a boto3 S3 client configured for MinIO."""
    scheme = "https" if settings.minio_secure else "http"
    return boto3.client(
        "s3",
        endpoint_url=f"{scheme}://{settings.minio_endpoint}",
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        region_name="us-east-1",
    )


def ensure_bucket(client=None) -> None:
    """Create the configured bucket if it doesn't exist."""
    if client is None:
        client = get_minio_client()
    try:
        client.head_bucket(Bucket=settings.minio_bucket)
    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code in ("404", "NoSuchBucket"):
            client.create_bucket(Bucket=settings.minio_bucket)
            logger.info("Created MinIO bucket: %s", settings.minio_bucket)
        else:
            raise


def upload_file(
    file_data: bytes,
    object_name: str,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload file bytes to MinIO. Returns the object name (path)."""
    client = get_minio_client()
    ensure_bucket(client)
    client.put_object(
        Bucket=settings.minio_bucket,
        Key=object_name,
        Body=BytesIO(file_data),
        ContentType=content_type,
        ContentLength=len(file_data),
    )
    logger.info("Uploaded %s (%d bytes) to MinIO", object_name, len(file_data))
    return object_name


def download_file(object_name: str) -> bytes:
    """Download a file from MinIO and return its raw bytes."""
    client = get_minio_client()
    response = client.get_object(Bucket=settings.minio_bucket, Key=object_name)
    return response["Body"].read()


def delete_file(object_name: str) -> None:
    """Delete a file from MinIO."""
    client = get_minio_client()
    client.delete_object(Bucket=settings.minio_bucket, Key=object_name)
    logger.info("Deleted %s from MinIO bucket %s", object_name, settings.minio_bucket)
