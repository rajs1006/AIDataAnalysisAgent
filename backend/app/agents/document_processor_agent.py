from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
import json
import base64
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.core.config.config import get_settings
from app.core.logging_config import get_logger
from app.core.exceptions.document_processor import (
    DocumentProcessingError,
    ConfigurationError,
    APIError,
    InvalidFileTypeError,
)
from app.agents.prompts.prompt_manager import PromptManager

logger = get_logger(__name__)


class ProcessingMetadata(BaseModel):
    """Metadata for document processing"""

    file_path: Path = Field(..., description="Path to the file")
    file_type: str = Field(..., description="Type of file")
    file_size: int = Field(..., description="File size in bytes")
    ai_metadata: Dict[str, Any] = Field(..., description="Contents token usage")


class ProcessingResponse(BaseModel):
    """Model for processing response"""

    document_type: str = Field(..., description="type of to the document")
    keypoints: List[str] = Field(..., description="keypoints related to the document")
    summary: str = Field(..., description="Brief summary content")
    actionable_items: List[str] = Field(..., description="Items for taking action")
    metadata: ProcessingMetadata = Field(..., description="Processing metadata")
    error_details: Optional[Dict[str, Any]] = Field(
        None, description="Any processing errors"
    )


class DocumentProcessorAgent:
    """
    Document processor that handles multiple file formats with OpenAI Vision API
    """

    SUPPORTED_FORMATS = {
        "pdf": [".pdf"],
        "text": [".txt", ".md", ".csv", ".json"],
        "excel": [".xlsx", ".xls"],
        "xml": [".xml", ".xhtml"],
        "image": [".png", ".jpg", ".jpeg", ".tiff", ".bmp"],
    }

    def __init__(self):
        self._load_configuration()
        self.current_file_path = None
        self.current_file_type = None

    def _load_configuration(self) -> None:
        """Load and validate configuration and prompts"""
        try:
            self.settings = get_settings()
            self.llm = ChatOpenAI(
                api_key=self.settings.OPENAI_API_KEY,
                model=self.settings.SUMMARY_MODEL_NAME,
                max_tokens=self.settings.SUMMARY_MAX_TOKEN,
                temperature=0.3,
            )

            self.prompts = PromptManager().load_prompts(
                file_path="document_processor.yml"
            )

            # Validate required prompt sections
            required_sections = [
                "system_prompt",
                "document_processing_prompt",
                "file_specific_guidelines",
            ]
            missing_sections = [
                section for section in required_sections if section not in self.prompts
            ]
            if missing_sections:
                raise ConfigurationError(
                    f"Missing prompt sections: {', '.join(missing_sections)}"
                )

            logger.info("Configuration and prompts loaded successfully")
        except Exception as e:
            logger.error(f"Configuration loading failed: {str(e)}")
            raise ConfigurationError(f"Failed to load configuration: {str(e)}")

    def _detect_file_type(self, file_type: str) -> str:
        """Detect file type from extension"""
        extension = file_type.lower()
        for f_type, extensions in self.SUPPORTED_FORMATS.items():
            if extension in extensions:
                return f_type
        raise InvalidFileTypeError(f"Unsupported file type: {extension}")

    def _prepare_system_prompt(self, file_type: str) -> str:
        """Prepare system prompt with file-specific guidelines"""
        try:
            file_guidelines = self.prompts["file_specific_guidelines"].get(
                file_type, ""
            )
            system_prompt = self.prompts["system_prompt"]

            return f"{system_prompt}\n\nFor this {file_type} file:\n{file_guidelines}"
        except Exception as e:
            logger.error(f"Failed to prepare system prompt: {str(e)}")
            raise DocumentProcessingError("Failed to prepare system prompt")

    def _prepare_user_prompt(self, file_type: str, extracted_text: str) -> str:
        """Prepare user prompt with file-specific content"""
        try:
            return self.prompts["document_processing_prompt"].format(
                file_type=file_type, extracted_text=extracted_text
            )
        except Exception as e:
            logger.error(f"Failed to prepare user prompt: {str(e)}")
            raise DocumentProcessingError("Failed to prepare user prompt")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry_error_callback=lambda retry_state: retry_state.outcome.result(),
    )
    async def _make_openai_request(
        self, file_content: str, extracted_text: str, file_type: str
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """Make OpenAI API request with retry logic"""
        try:
            logger.info(f"Making OpenAI API request for {file_type} file")

            system_prompt = self._prepare_system_prompt(file_type)
            user_prompt = self._prepare_user_prompt(file_type, extracted_text)

            response = await self.llm.ainvoke(
                [
                    SystemMessage(content=system_prompt),
                    HumanMessage(
                        content=[
                            {"type": "text", "text": user_prompt},
                        ]
                    ),
                ]
            )
            # Parse the content JSON and get metadata
            content = json.loads(response.content)
            metadata = response.response_metadata

            return content, metadata

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response: {str(e)}")
            raise APIError("Invalid response format from API")
        except Exception as e:
            logger.error(f"OpenAI API request failed: {str(e)}")
            raise APIError(f"API request failed: {str(e)}")

    async def process_document(
        self, file_path: str, extracted_text: str, metadata: Optional[dict]
    ) -> ProcessingResponse:
        """Process a document and its extracted text"""
        try:
            # Convert path to Path object and validate
            path = Path(file_path)
            if not path.exists():
                raise DocumentProcessingError(f"File not found: {file_path}")

            # Set current file information
            self.current_file_path = path
            self.current_file_type = metadata["file_type"]

            # Detect file type
            file_type = self._detect_file_type(metadata["file_type"])
            logger.info(f"Processing {file_type} file: {path}")

            # Read and encode file
            with open(path, "rb") as file:
                base64_file = base64.b64encode(file.read()).decode("utf-8")

            # Process with OpenAI
            content, response_metadata = await self._make_openai_request(
                file_content=base64_file,
                extracted_text=extracted_text,
                file_type=file_type,
            )

            # Create the response structure
            response_data = {"content": content, "response_metadata": response_metadata}

            # Parse the response
            processing_response = self._create_processing_response(
                response_data=response_data, file_size=path.stat().st_size
            )

            logger.info(f"Successfully processed {path}")
            return processing_response

        except Exception as e:
            logger.error(f"Document processing failed: {str(e)}", exc_info=True)
            raise DocumentProcessingError(f"Failed to process document: {str(e)}")

    def _create_processing_response(
        self, response_data: Dict[str, Any], file_size: int
    ) -> ProcessingResponse:
        """Create ProcessingResponse from OpenAI response"""
        try:
            content = response_data["content"]

            # Create metadata
            metadata = ProcessingMetadata(
                file_path=self.current_file_path,
                file_type=self.current_file_type,
                file_size=file_size,
                ai_metadata={
                    "token_usage": response_data["response_metadata"].get(
                        "token_usage", {}
                    ),
                    "model": response_data["response_metadata"].get(
                        "model_name", "unknown"
                    ),
                    "system_fingerprint": response_data["response_metadata"].get(
                        "system_fingerprint", "unknown"
                    ),
                },
            )

            # Create and return the full response
            return ProcessingResponse(
                document_type=content["document_type"],
                keypoints=content["keypoints"],
                summary=content["summary"],
                actionable_items=content["actionable_items"],
                metadata=metadata,
                error_details=None,
            )

        except Exception as e:
            error_details = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "response_data": str(response_data),
            }
            logger.error(f"Failed to create processing response: {error_details}")

            # Return error response
            return ProcessingResponse(
                document_type="error",
                keypoints=[],
                summary=f"Failed to create response: {str(e)}",
                actionable_items=[],
                metadata=ProcessingMetadata(
                    file_path=self.current_file_path,
                    file_type=self.current_file_type,
                    file_size=file_size,
                    ai_metadata={"error": str(e)},
                ),
                error_details=error_details,
            )
