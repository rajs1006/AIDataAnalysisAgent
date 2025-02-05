from app.core.logging_config import get_logger
from typing import List, Union
import numpy as np
from functools import lru_cache
from sentence_transformers import SentenceTransformer



logger = get_logger(__name__)
class BaseVectorizer:
    """Base class for vectorization operations"""

    @lru_cache(maxsize=1)
    def _get_model(self, model_name: str = "all-mpnet-base-v2") -> SentenceTransformer:
        """Get or initialize the model"""
        try:
            return SentenceTransformer(model_name)
        except Exception as e:
            logger.error("Failed to load model {model_name}: {str(e)}", )
            raise

    def _batch_encode(
        self, texts: Union[str, List[str]], batch_size: int = 32
    ) -> np.ndarray:
        """Encode texts in batches"""
        if isinstance(texts, str):
            texts = [texts]

        model = self._get_model()
        embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            batch_embeddings = model.encode(batch)
            if isinstance(batch_embeddings, np.ndarray):
                batch_embeddings = batch_embeddings.tolist()
            embeddings.extend(batch_embeddings)

        return embeddings
