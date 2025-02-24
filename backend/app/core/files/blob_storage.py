from app.core.logging_config import get_logger
import uuid
from typing import Optional, Union

from cachetools import TTLCache
from google.cloud import storage

from app.models.schema.base.hierarchy import BlobData
from app.core.exceptions.connector_exceptions import (
    BlobStorageException,
    FileSizeLimitException,
    FileNotFoundException,
)
from app.core.config.config import settings

logger = get_logger(__name__)


class BlobStorageCache:
    """Caching mechanism for blob storage with TTL."""

    _instance = None

    def __new__(cls):
        if not cls._instance:
            cls._instance = super().__new__(cls)
            cls._instance._cache = TTLCache(
                maxsize=1000, ttl=3600
            )  # 1000 items, 1-hour TTL
        return cls._instance

    def get(self, key):
        return self._cache.get(key)

    def set(self, key, value):
        self._cache[key] = value

    def delete(self, key):
        self._cache.pop(key, None)


class BlobStorage:
    """
    Asynchronous utility class for managing file blob storage using Google Cloud Storage.
    """

    MAX_FILE_SIZE = settings.GCS_MAX_FILE_SIZE  # 50 MB default limit
    BUCKET_NAME = settings.GCS_BUCKET  # Will be set from config
    _cache = BlobStorageCache()
    _storage_client = None

    @classmethod
    async def initialize_storage(cls, project=settings.GCS_PROJECT, credentials=None):
        """
        Initialize Google Cloud Storage client with optional project and credentials.

        Args:
            project (str, optional): Google Cloud project ID
            credentials (google.auth.credentials.Credentials, optional): Custom credentials
        """
        try:
            # If no custom credentials provided, attempt to use default
            if cls._storage_client is None:
                if project:
                    cls._storage_client = storage.Client(project=project)
                else:
                    cls._storage_client = storage.Client()

            # Validate bucket exists
            if not cls.BUCKET_NAME:
                raise BlobStorageException("Bucket name not set")

            bucket = cls._storage_client.bucket(cls.BUCKET_NAME)
            if not bucket.exists():
                raise BlobStorageException(f"Bucket {cls.BUCKET_NAME} does not exist")

            logger.info(f"GCS Bucket {cls.BUCKET_NAME} validated successfully")
        except Exception as e:
            logger.error(f"Failed to initialize GCS storage: {e}")
            raise BlobStorageException(f"Storage initialization failed: {e}")

    @classmethod
    async def store_blob(
        cls,
        blob_content: Union[bytes, str],
        filename: str,
        content_type: Optional[str] = None,
        max_size: Optional[int] = None,
    ) -> BlobData:
        """
        Asynchronously store blob data in Google Cloud Storage with size validation and caching.
        """
        # Convert to bytes if string
        if isinstance(blob_content, str):
            blob_content = blob_content.encode("utf-8")

        # Size validation
        max_file_size = max_size or cls.MAX_FILE_SIZE
        if len(blob_content) > max_file_size:
            logger.warning(
                f"File {filename} exceeds size limit of {max_file_size} bytes",
            )
            raise FileSizeLimitException(max_file_size)

        try:
            # Generate unique file ID
            file_id = str(uuid.uuid4())

            # Upload to GCS
            bucket = cls._storage_client.bucket(cls.BUCKET_NAME)
            blob = bucket.blob(f"blobs/{file_id}")

            # Upload blob
            blob.upload_from_string(
                blob_content,
                content_type=content_type or cls._guess_content_type(filename),
            )

            # Create blob data object
            blob_data = BlobData(
                file_id=file_id,
                mime_type=content_type or cls._guess_content_type(filename),
                size=len(blob_content),
                blob=blob_content,
                filename=filename,
                gcs_bucket=cls.BUCKET_NAME,
                gcs_path=f"blobs/{file_id}",
            )

            # Cache blob data
            cls._cache.set(file_id, blob_data)

            logger.info(
                f"Blob stored in GCS: {file_id} ({len(blob_content)} bytes)",
            )
            return blob_data

        except Exception as e:
            logger.error(
                f"Blob storage failed for {filename}: {e}",
            )
            raise BlobStorageException(f"Failed to store blob: {e}")

    @classmethod
    async def retrieve_blob(cls, file_id: str) -> BlobData:
        """
        Asynchronously retrieve blob data by file ID from Google Cloud Storage with caching.
        """
        # Check cache first
        cached_blob = cls._cache.get(file_id)
        if cached_blob:
            logger.info(
                f"Blob retrieved from cache: {file_id}",
            )
            return cached_blob

        try:
            # Retrieve from GCS
            bucket = cls._storage_client.bucket(cls.BUCKET_NAME)

            # Handle full GCS path or just file ID
            blob_path = file_id if file_id.startswith("blobs/") else f"blobs/{file_id}"
            blob = bucket.blob(blob_path)

            # Check blob exists
            if not blob.exists():
                logger.warning(
                    f"Blob not found: {file_id}",
                )
                raise FileNotFoundException(file_id)

            # Download blob content
            blob_content = blob.download_as_bytes()

            # Create blob data
            blob_data = BlobData(
                file_id=file_id,
                mime_type=blob.content_type or cls._guess_content_type(file_id),
                size=blob.size,
                blob=blob_content,
                filename=file_id,  # Default to file ID if original name lost
                gcs_bucket=cls.BUCKET_NAME,
                gcs_path=blob_path,
            )

            # Cache blob data
            cls._cache.set(file_id, blob_data)

            logger.info(
                f"Blob retrieved from GCS: {file_id} ({blob.size} bytes)",
            )
            return blob_data

        except FileNotFoundException:
            raise
        except Exception as e:
            logger.error(
                f"Blob retrieval failed: {e}",
            )
            raise BlobStorageException(f"Failed to retrieve blob: {e}")

    @classmethod
    async def delete_blob(cls, file_id: str):
        """
        Asynchronously delete blob from Google Cloud Storage.
        """
        try:
            # Delete from GCS
            bucket = cls._storage_client.bucket(cls.BUCKET_NAME)

            # Handle full GCS path or just file ID
            blob_path = file_id if file_id.startswith("blobs/") else f"blobs/{file_id}"
            blob = bucket.blob(blob_path)

            # Delete blob if exists
            if blob.exists():
                blob.delete()

                # Remove from cache
                cls._cache.delete(file_id)

                logger.info(
                    f"Blob deleted from GCS: {file_id}",
                )

        except Exception as e:
            logger.exception(
                f"Blob deletion failed: {e}",
            )
            raise BlobStorageException(f"Failed to delete blob: {e}")

    @staticmethod
    def _guess_content_type(file_path: str) -> str:
        """
        Guess content type based on file extension.
        """
        import mimetypes

        content_type, _ = mimetypes.guess_type(file_path)
        return content_type or "application/octet-stream"
