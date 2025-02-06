from typing import Dict, Any, Optional
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

    summary: Dict[str, Any] = Field(..., description="Tiptap formatted content")
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
        self, file_content: base64, extracted_text: str, file_type: str
    ) -> Dict[str, Any]:
        """Make OpenAI API request with retry logic"""
        try:
            logger.info(f"Making OpenAI API request for {file_type} file")

            # Prepare system and user prompts
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
            print(response)
            return json.loads(response.content), response.response_metadata

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response: {str(e)}")
            raise APIError("Invalid response format from API")
        except Exception as e:
            logger.exception(f"OpenAI API request failed: {str(e)} {e}")
            import traceback

            traceback.print_exc()()
            # raise APIError(f"API request failed: {str(e)}")

    async def process_document(
        self, file_path: str, extracted_text: str, metadata: Optional[dict]
    ) -> ProcessingResponse:
        """
        Process a document and its extracted text

        Args:
            file_path: Path to the file
            extracted_text: Text extracted from the file

        Returns:
            ProcessingResponse object containing processed content and metadata
        """
        try:
            # Convert path to Path object and validate
            path = Path(file_path)
            if not path.exists():
                raise DocumentProcessingError(f"File not found: {file_path}")

            # Detect file type
            file_type = self._detect_file_type(metadata["file_type"])
            logger.info(f"Processing {file_type} file: {path}")

            # Read and encode file
            with open(path, "rb") as file:
                base64_file = base64.b64encode(file.read()).decode("utf-8")

            # Process with OpenAI
            response_data = await self._make_openai_request(
                file_content=base64_file,
                extracted_text=extracted_text,
                file_type=file_type,
            )
            logger.info(f"Successfully processed response {response_data}")

            # Prepare metadata
            metadata = ProcessingMetadata(
                file_path=path,
                file_type=file_type,
                file_size=path.stat().st_size,
                ai_metadata=response_data[1],
            )
            logger.info(f"Successfully processed {path}")

            return ProcessingResponse(
                summary=response_data[0],
                metadata=metadata,
                error_details=None,
            )

        except Exception as e:
            logger.error(f"Document processing failed: {str(e)}", exc_info=True)
            raise DocumentProcessingError(f"Failed to process document: {str(e)}")
