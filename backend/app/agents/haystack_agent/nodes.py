from typing import List, Dict, Any, Optional, Union
import logging
from haystack.nodes.base import BaseComponent
from haystack.schema import Document
from sentence_transformers import CrossEncoder

logger = logging.getLogger(__name__)


class ReRankerNode(BaseComponent):
    """Node for reranking documents using cross-encoder"""

    outgoing_edges = 1

    def __init__(
        self,
        model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        threshold: float = 0.5,
        batch_size: int = 32,
        top_k: Optional[int] = None,
    ):
        super().__init__()
        self.model = CrossEncoder(model_name)
        self.threshold = threshold
        self.batch_size = batch_size
        self.top_k = top_k

    def run(
        self, query: str, documents: List[Document]
    ) -> Dict[str, Union[List[Document], str]]:
        """Rerank documents based on cross-encoder scores"""
        if not documents:
            return {"documents": []}

        try:
            # Create query-document pairs
            pairs = [(query, doc.content) for doc in documents]

            # Get scores from model
            scores = self.model.predict(
                pairs, batch_size=self.batch_size, show_progress_bar=False
            )

            # Filter and sort documents
            scored_docs = []
            for doc, score in zip(documents, scores):
                if score >= self.threshold:
                    doc.score = score  # Update score
                    scored_docs.append(doc)

            # Sort by score
            scored_docs.sort(key=lambda x: x.score, reverse=True)

            # Limit results if top_k specified
            if self.top_k:
                scored_docs = scored_docs[: self.top_k]

            return {"documents": scored_docs}

        except Exception as e:
            logger.error(f"Document reranking failed: {str(e)}")
            return {"documents": documents}  # Return original documents on error


class DocumentFilterNode(BaseComponent):
    """Node for filtering documents based on metadata or content"""

    outgoing_edges = 1

    def __init__(
        self,
        filters: Optional[Dict[str, Any]] = None,
        min_score: Optional[float] = None,
        custom_filters: Optional[List[callable]] = None,
    ):
        super().__init__()
        self.filters = filters or {}
        self.min_score = min_score
        self.custom_filters = custom_filters or []

    def run(self, documents: List[Document]) -> Dict[str, List[Document]]:
        """Filter documents based on criteria"""
        if not documents:
            return {"documents": []}

        filtered_docs = []
        for doc in documents:
            if self._should_keep_document(doc):
                filtered_docs.append(doc)

        return {"documents": filtered_docs}

    def _should_keep_document(self, doc: Document) -> bool:
        """Check if document meets all filter criteria"""
        # Check score threshold
        if self.min_score and doc.score < self.min_score:
            return False

        # Check metadata filters
        for key, value in self.filters.items():
            if key not in doc.meta or doc.meta[key] != value:
                return False

        # Apply custom filters
        for filter_fn in self.custom_filters:
            if not filter_fn(doc):
                return False

        return True


class DocumentMergerNode(BaseComponent):
    """Node for merging documents from multiple retrievers"""

    outgoing_edges = 1

    def __init__(
        self,
        weights: Optional[Dict[str, float]] = None,
        strategy: str = "weighted_merge",
    ):
        super().__init__()
        self.weights = weights or {}
        self.strategy = strategy

    def run(
        self, documents_dict: Dict[str, List[Document]]
    ) -> Dict[str, List[Document]]:
        """Merge documents from different sources"""
        if not documents_dict:
            return {"documents": []}

        try:
            all_docs = {}  # doc_id -> doc mapping

            # Process each source
            for source, docs in documents_dict.items():
                weight = self.weights.get(source, 1.0)

                for doc in docs:
                    doc_id = doc.id
                    if doc_id in all_docs:
                        # Update score based on strategy
                        if self.strategy == "weighted_merge":
                            all_docs[doc_id].score += doc.score * weight
                        elif self.strategy == "max_score":
                            all_docs[doc_id].score = max(
                                all_docs[doc_id].score, doc.score * weight
                            )
                    else:
                        doc.score *= weight
                        all_docs[doc_id] = doc

            # Sort by score
            merged_docs = sorted(all_docs.values(), key=lambda x: x.score, reverse=True)

            return {"documents": merged_docs}

        except Exception as e:
            logger.error(f"Document merging failed: {str(e)}")
            # Return documents from first source on error
            return {"documents": next(iter(documents_dict.values()), [])}
