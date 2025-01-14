from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime


class BaseDocumentStore(ABC):
    """Abstract base class for document stores"""

    @abstractmethod
    async def store_document(
        self,
        collection_name: str,
        doc_id: str,
        content: str,
        metadata: Dict[str, Any],
    ) -> str:
        """Store a document in the document store"""
        pass

    @abstractmethod
    async def search_similar(
        self,
        collection_name: str,
        query: str,
        limit: int = 5,
        metadata_filter: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Search for similar documents"""
        pass

    @abstractmethod
    async def delete_document(self, collection_name: str, doc_id: str) -> bool:
        """Delete a document from the store"""
        pass

    @abstractmethod
    async def get_document(
        self, collection_name: str, doc_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get a specific document by ID"""
        pass

    @abstractmethod
    async def update_document(
        self,
        collection_name: str,
        doc_id: str,
        content: str,
        metadata: Dict[str, Any],
    ) -> bool:
        """Update an existing document"""
        pass


class MetadataValidator:
    """Validates and normalizes metadata for documents"""

    @staticmethod
    def validate_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize metadata"""
        if not isinstance(metadata, dict):
            raise ValueError("Metadata must be a dictionary")

        # Ensure required fields
        required_fields = ["user_id", "connector_id"]
        for field in required_fields:
            if field not in metadata:
                raise ValueError(f"Missing required metadata field: {field}")

        # Add timestamp if not present
        if "timestamp" not in metadata:
            metadata["timestamp"] = int(datetime.utcnow().timestamp() * 1000)

        return metadata

