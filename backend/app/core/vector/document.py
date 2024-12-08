from typing import Dict, Any, Optional, List, Union
import numpy as np
import logging
from .base import BaseVectorizer

logger = logging.getLogger(__name__)


class DocumentVectorizer(BaseVectorizer):
    """Handles vectorization of complete documents"""

    def _create_chunks(
        self, text: str, chunk_size: int = 512, chunk_overlap: int = 50
    ) -> List[str]:
        """Split text into overlapping chunks."""
        if not text:
            return []

        # Clean and normalize text
        text = text.replace("\n", " ").replace("\r", " ")
        text = " ".join(text.split())  # Normalize whitespace

        chunks = []
        start = 0
        text_len = len(text.split())

        while start < text_len:
            # Find end of chunk
            end = start + chunk_size

            # Get chunk words
            chunk_words = text.split()[start:end]

            # Create chunk
            chunk = " ".join(chunk_words)
            chunks.append(chunk)

            # Move start pointer, accounting for overlap
            start = start + (chunk_size - chunk_overlap)

        return chunks

    async def create_embeddings(
        self,
        text: str,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        collection_name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Union[np.ndarray, List[Dict[str, Any]]]:
        """
        Create embeddings for document text with chunking support.

        Args:
            text: Document text to vectorize
            chunk_size: Maximum number of words per chunk
            chunk_overlap: Number of overlapping words between chunks
            collection_name: If provided, stores vectors in this collection
            metadata: Additional metadata to store with vectors

        Returns:
            If collection_name is None: numpy array of embeddings
            If collection_name is provided: List of stored vector metadata
        """
        try:
            # Create text chunks
            chunks = self._create_chunks(text, chunk_size, chunk_overlap)
            if not chunks:
                logger.warning("No chunks created from input text")
                return np.array([]) if not collection_name else []

            # Create embeddings
            embeddings = self._batch_encode(chunks)

            # If collection name provided, store in vector database
            if collection_name:
                # Initialize metadata if None
                metadata = metadata or {}

                # Add chunk information to metadata
                chunk_metadata = []
                for idx, chunk in enumerate(chunks):
                    chunk_metadata.append(
                        {
                            "content": chunk,
                            "chunk_index": idx,
                            "total_chunks": len(chunks),
                            **metadata,
                        }
                    )

                # Store vectors
                await self.vector_store.init_collection(collection_name)
                await self.vector_store.store_vectors(
                    collection_name=collection_name,
                    vectors=embeddings,
                    metadata=chunk_metadata,
                )

                return [
                    {"content": chunk, "metadata": meta}
                    for chunk, meta in zip(chunks, chunk_metadata)
                ]

            return embeddings

        except Exception as e:
            logger.error(f"Failed to create document embedding: {str(e)}")
            raise

    async def vectorize_documents(
        self,
        documents: List[Dict[str, str]],
        collection_name: str,
        text_key: str = "content",
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Vectorize multiple documents and store them in the vector database.

        Args:
            documents: List of document dictionaries
            collection_name: Name of collection to store vectors
            text_key: Key in document dict containing text content
            chunk_size: Maximum number of words per chunk
            chunk_overlap: Number of overlapping words between chunks

        Returns:
            List of stored vector metadata
        """
        try:
            all_results = []

            for doc in documents:
                # Extract text and metadata
                text = doc.pop(text_key, "")
                metadata = doc  # Remaining fields are metadata

                # Create and store embeddings
                results = await self.create_embedding(
                    text=text,
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap,
                    collection_name=collection_name,
                    metadata=metadata,
                )

                all_results.extend(results)

            return all_results

        except Exception as e:
            logger.error(f"Failed to vectorize documents: {str(e)}")
            raise
