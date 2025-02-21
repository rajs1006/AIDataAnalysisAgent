from app.core.logging_config import get_logger
from typing import Dict, Any, List, Optional, Union
from haystack import component, Document
from haystack.components.retrievers.in_memory import InMemoryBM25Retriever
from haystack_integrations.components.retrievers.qdrant import QdrantEmbeddingRetriever
from haystack.components.joiners import DocumentJoiner


logger = get_logger(__name__)


@component
class EnhancedHybridRetriever:
    """Enhanced hybrid retriever combining dense and sparse retrieval"""

    def __init__(
        self,
        document_store,
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        dense_weight: float = 0.7,
        sparse_weight: float = 0.3,
        top_k: int = 10,
    ):
        # super().__init__()

        # Initialize retrievers using official integrations
        self.dense_retriever = QdrantEmbeddingRetriever(
            document_store=document_store, model=embedding_model, top_k=top_k
        )

        self.sparse_retriever = InMemoryBM25Retriever(
            document_store=document_store, top_k=top_k
        )

        self.joiner = DocumentJoiner(
            joining_fn=self._weighted_join,
            weights={"dense": dense_weight, "sparse": sparse_weight},
        )

        self.top_k = top_k

    @component.output_types(documents=List[Document])
    async def run(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: Optional[int] = None,
    ) -> Dict[str, Any]:
        try:
            # Get results from both retrievers
            dense_results = await self.dense_retriever.run(
                query=query, filters=filters, top_k=top_k or self.top_k
            )

            sparse_results = await self.sparse_retriever.run(
                query=query, filters=filters, top_k=top_k or self.top_k
            )

            # Combine results
            joined_results = await self.joiner.run(
                documents_1=dense_results["documents"],
                documents_2=sparse_results["documents"],
            )

            return {
                "documents": joined_results["documents"],
                "retrieval_details": {
                    "dense_results": len(dense_results["documents"]),
                    "sparse_results": len(sparse_results["documents"]),
                    "total_results": len(joined_results["documents"]),
                },
            }

        except Exception as e:
            logger.error(
                "Hybrid retrieval failed: {str(e)}",
            )
            raise

    def _weighted_join(
        self,
        dense_docs: List[Document],
        sparse_docs: List[Document],
        weights: Dict[str, float],
    ) -> List[Document]:
        """Custom weighted joining of results"""
        # Create score mapping
        doc_scores = {}

        # Process dense results
        for doc in dense_docs:
            doc_scores[doc.id] = {"doc": doc, "score": doc.score * weights["dense"]}

        # Process sparse results
        for doc in sparse_docs:
            if doc.id in doc_scores:
                doc_scores[doc.id]["score"] += doc.score * weights["sparse"]
            else:
                doc_scores[doc.id] = {
                    "doc": doc,
                    "score": doc.score * weights["sparse"],
                }

        # Sort and return top results
        sorted_docs = sorted(
            doc_scores.values(), key=lambda x: x["score"], reverse=True
        )

        return [item["doc"] for item in sorted_docs[: self.top_k]]
