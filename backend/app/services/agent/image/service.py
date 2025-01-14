import logging
import uuid
import io
import pytesseract

from typing import Dict, Any, Optional
from datetime import datetime
from app.agents import ReActAgent
from app.models.schema.agent import (
    QueryRequest,
    QueryResponse,
    Source,
    SearchContext,
    SearchParameters,
)

from app.core.store.vectorizer import VectorStore
from app.crud.image import ImageAgentCRUD
from app.models.schema.agent import ImageData
from app.models.schema.context.image import ImageMetadata
from app.models.schema.base.connector import FileStatus
from app.utils.image import ImageValidator

logger = logging.getLogger(__name__)


class ImageService:
    """Dynamic image processing with GPT-4 Vision"""

    def __init__(self, image_crud: ImageAgentCRUD, vector_store: VectorStore):
        self.crud = image_crud
        self.vector_store = vector_store
        self.image_validator = ImageValidator()

    async def get_search_contexts(
        self,
        user_id: str,
        conversation_id: str,
    ):
        image_context = await self.crud.context_files(
            user_id=user_id, conversation_id=conversation_id
        )

        search_contexts = []
        if image_context:
            for context in image_context.files:
                search_contexts.append(
                    SearchContext(content=context.content_text, metadata=context.config)
                )

        return search_contexts

    async def process_image(
        self,
        user_id: str,
        conversation_id: str,
        image_data: ImageData,
        agent: Optional[ReActAgent] = None,
    ) -> Dict:
        """Analyze image using GPT-4 Vision with dynamic field extraction"""
        try:
            content = image_data.content
            content_hash = content.__hash__

            # Get image from request
            image = self.image_validator.validate_and_process_image(image_data.dict())

            # Perform OCR
            ocr_text = pytesseract.image_to_string(image)
            # Call Vision API
            analysis_result = await agent.process_image(
                image_data=image_data.content, ocr_text=ocr_text
            )

            ## Create a dummy connector
            contexts = await self.crud.contexts(user_id=user_id)
            doc_id = f"{contexts.id}_{content_hash}"

            # Generate metadata
            metadata = {
                "doc_type": analysis_result["document_type"],
                "processing_date": datetime.utcnow().isoformat(),
                "reference_id": doc_id,
                "fields": analysis_result["fields"],
                "confidence_score": analysis_result.get("confidence_score", 0.0),
                "searchable_text": self._generate_searchable_text(analysis_result),
                "validation_notes": analysis_result.get("validation_notes", []),
            }

            # point_ids = await self.vector_store.store_document(
            #     collection_name=str(contexts.user_id),
            #     content=analysis_result["extracted_text"],
            #     doc_id=doc_id,
            #     metadata={
            #         "user_id": str(contexts.user_id),
            #         "connector_id": str(contexts.id),
            #         "parent_doc_id": doc_id,
            #         **metadata,
            #     },
            #     use_chunking=False,
            # )

            # Update metadata for each chunk
            image_metadata = ImageMetadata(
                conversation_id=conversation_id,
                file_id=doc_id,
                filename=image_data.filename,
                extension=image_data.mime_type,
                content=str(image_data.content),
                content_text=analysis_result["extracted_text"],
                content_hash=str(content_hash),
                doc_id=doc_id,
                status=FileStatus.ACTIVE,
                last_indexed=datetime.utcnow(),
                # vector_ids=point_ids,  # Store all chunk IDs
                # total_chunks=len(point_ids),
                config=metadata,
                size=len(image_data.content),
                last_modified=int(datetime.utcnow().timestamp()),
                created_at=int(datetime.utcnow().timestamp()),
            )

            await self.crud.update_context_metadata(str(contexts.id), image_metadata)

            return {"content": analysis_result, "metadata": metadata}

        except Exception as e:
            logger.error(f"Error in image analysis: {str(e)}")
            raise

    def _generate_searchable_text(self, analysis_result: Dict) -> str:
        """Generate searchable text from analysis result"""
        searchable_parts = [
            analysis_result["document_type"],
            analysis_result["extracted_text"],
        ]

        # Add all field values
        for field, value in analysis_result["fields"].items():
            if isinstance(value, (str, int, float)):
                searchable_parts.append(str(value))
            elif isinstance(value, dict):
                searchable_parts.extend(str(v) for v in value.values())
            elif isinstance(value, list):
                searchable_parts.extend(str(v) for v in value)

        return " ".join(searchable_parts)
