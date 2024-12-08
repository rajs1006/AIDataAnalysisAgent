from typing import Dict, Any, Optional, List, Union
import numpy as np
import logging
from .document import BaseVectorizer


logger = logging.getLogger(__name__)


class TextVectorizer(BaseVectorizer):
    """Handles vectorization of text chunks"""

    async def create_embeddings(
        self,
        text: Union[str, List[str]],
        metadata: Optional[Dict[str, Any]] = None,
        batch_size: int = 32,
        chunk_size: int = 512,
        chunk_overlap: int = 50,
        use_chunking: bool = False,
    ) -> Union[np.ndarray, Dict[str, Any]]:
        try:
            if use_chunking:
                if isinstance(text, str):
                    chunks = self._create_chunks(text, chunk_size, chunk_overlap)
                    texts = [chunk["content"] for chunk in chunks]
                    metadata = metadata or {}
                    chunk_metadata = [
                        {
                            **metadata,
                            "chunk_id": chunk["chunk_id"],
                            "start_idx": chunk["start_idx"],
                            "end_idx": chunk["end_idx"],
                            "total_chunks": len(chunks),
                        }
                        for chunk in chunks
                    ]
                    # Create separate embeddings for each chunk
                    chunk_embeddings = []
                    for i in range(0, len(texts), batch_size):
                        batch = texts[i : i + batch_size]
                        batch_embeddings = self._batch_encode(batch)
                        chunk_embeddings.append(batch_embeddings)
                    embeddings = [emb for batch in chunk_embeddings for emb in batch]
                else:
                    raise ValueError("Chunking only supported for single text input")
            else:
                texts = [text] if isinstance(text, str) else text
                embeddings = self._batch_encode(texts, batch_size)
                chunk_metadata = (
                    [
                        {"content": t, **metadata, "index": idx}
                        for idx, t in enumerate(texts)
                    ]
                    if metadata
                    else [None]
                )

            return zip(texts, embeddings, chunk_metadata)

        except Exception as e:
            logger.error(f"Failed to create embeddings: {str(e)}")
            raise

    def _create_chunks(
        self, text: str, chunk_size: int = 512, chunk_overlap: int = 50
    ) -> List[Dict[str, Any]]:
        words = text.split()
        chunks = []
        start = 0
        chunk_id = 0

        while start < len(words):
            end = start + chunk_size
            chunk_text = " ".join(words[start:end])
            chunks.append(
                {
                    "chunk_id": chunk_id,
                    "content": chunk_text,
                    "start_idx": start,
                    "end_idx": min(end, len(words)),
                }
            )
            start = start + (chunk_size - chunk_overlap)
            chunk_id += 1

        return chunks
