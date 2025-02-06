import logging
from pathlib import Path
import hashlib
from dataclasses import dataclass
from typing import Dict, Any, Optional, Union
import mimetypes
import pdfplumber
import magic
import re

from app.core.logging_config import get_logger
from app.core.files.blob_storage import BlobStorage
from app.core.files.hierarchy import FileHierarchyBuilder
from app.models.schema.base.hierarchy import BlobData
from app.agents.document_processor_agent import DocumentProcessorAgent

logger = get_logger(__name__)


@dataclass
class ExtractionResult:
    """Container for extraction results."""

    content: str
    metadata: Dict[str, Any]
    blob_data: Optional[BlobData] = None
    error: Optional[str] = None
    quality_score: float = 1.0


class DocumentProcessor:
    """Handles document processing and text extraction."""

    def __init__(self):
        # Initialize mime types
        mimetypes.init()
        # Configure minimum content quality thresholds
        self.min_content_length = 50
        self.min_quality_score = 0.3

        # Configure PDF processing options
        self.pdf_fallback_methods = [
            self._extract_pdf_with_pdfplumber,
            self._extract_pdf_with_pdfminer,
            self._extract_pdf_with_pypdf2,
            self._extract_pdf_with_tika,
        ]

        # Initialize document processor agent
        self.document_processor_agent = DocumentProcessorAgent()

    async def process_file(
        self, file_path: str, extension: str, store_blob: bool = True
    ) -> ExtractionResult:
        """
        Process a file and extract text with metadata.

        Args:
            file_path (str): Path to the file
            store_blob (bool): Whether to store the file blob

        Returns:
            ExtractionResult: Processed file data
        """
        try:
            # Detect file type
            mime_type = magic.from_file(file_path, mime=True)

            # Get basic metadata first
            metadata = self._generate_base_metadata(file_path)

            # Store blob if requested
            blob_data = None
            if store_blob:
                with open(file_path, "rb") as f:
                    blob_content = f.read()
                    blob_data = await BlobStorage.store_blob(
                        blob_content,
                        filename=Path(file_path).name,
                        content_type=mime_type,
                    )

            # Build path segments for hierarchy
            metadata["path_segments"] = FileHierarchyBuilder.get_file_path_segments(
                metadata.get("file_path", "")
            )

            # Extract text based on file type
            if mime_type == "application/pdf":
                result = self._extract_pdf(file_path)
            elif mime_type in [
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ]:
                result = self._extract_doc(file_path)
            elif mime_type.startswith("text/"):
                result = self._extract_text(file_path)
            elif mime_type.startswith("image/"):
                result = self._extract_image(file_path)
            else:
                # Fallback to textract for other formats
                result = self._extract_fallback(file_path)

            # Merge metadata
            metadata.update(result.metadata)

            # Post-process and validate content
            processed_content = self._post_process_content(result.content)

            # Use document processor agent to verify and summarize
            try:
                processed_result = await self.document_processor_agent.process_document(
                    extracted_text=processed_content,
                    file_path=file_path,
                    metadata={"file_type": extension},
                )
                metadata["summary"] = processed_result.summary
                metadata["ai_metadata"] = processed_result.metadata.ai_metadata
            except Exception as agent_error:
                logger.error(f"Document processor agent failed: {agent_error}")

            quality_score = self._calculate_quality_score(
                processed_content, result.metadata
            )

            return ExtractionResult(
                content=processed_content,
                metadata=metadata,
                blob_data=blob_data,
                quality_score=quality_score,
            )

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            return ExtractionResult(
                content="",
                metadata=(
                    metadata
                    if "metadata" in locals()
                    else self._generate_base_metadata(file_path)
                ),
                error=str(e),
                quality_score=0.0,
            )

    def _extract_pdf(self, file_path: str) -> ExtractionResult:
        """Extract text from PDF using multiple fallback methods."""
        errors = []
        metadata = {}

        # Try each extraction method until one succeeds
        for extraction_method in self.pdf_fallback_methods:
            try:
                result = extraction_method(file_path)

                # Validate the extracted content
                if self._validate_pdf_content(result.content, result.metadata):
                    # Post-process the content
                    processed_content = self._post_process_pdf_content(result.content)

                    # Update the result with processed content
                    result.content = processed_content
                    result.quality_score = self._calculate_quality_score(
                        processed_content, result.metadata
                    )

                    # Merge metadata
                    metadata.update(result.metadata)
                    return result
                else:
                    errors.append(
                        f"{extraction_method.__name__}: Content validation failed"
                    )
                    continue

            except Exception as e:
                errors.append(f"{extraction_method.__name__}: {str(e)}")
                continue

        # If all methods fail, return error result
        error_msg = "All PDF extraction methods failed:\n" + "\n".join(errors)
        return ExtractionResult(
            content="",
            metadata=self._generate_base_metadata(file_path),
            error=error_msg,
            quality_score=0.0,
        )

    def _extract_pdf_with_pdfplumber(self, file_path: str) -> ExtractionResult:
        """Extract text using pdfplumber with enhanced error handling."""
        try:
            extracted_text = []
            metadata = {}

            with pdfplumber.open(file_path) as pdf:
                metadata.update(
                    {
                        "page_count": len(pdf.pages),
                        "pdf_info": pdf.metadata,
                    }
                )

                for i, page in enumerate(pdf.pages):
                    try:
                        # Extract text with layout preservation
                        text = page.extract_text(layout=True)
                        if text:
                            extracted_text.append(text)

                        # Handle tables
                        tables = page.extract_tables()
                        if tables:
                            metadata[f"page_{i+1}_tables"] = len(tables)
                            for table in tables:
                                if table:  # Check if table exists
                                    table_text = "\n".join(
                                        [
                                            " | ".join(
                                                str(cell)
                                                for cell in row
                                                if cell is not None
                                            )
                                            for row in table
                                            if any(cell is not None for cell in row)
                                        ]
                                    )
                                    if table_text.strip():
                                        extracted_text.append(table_text)
                    except Exception as e:
                        metadata[f"page_{i+1}_error"] = str(e)
                        continue

            content = "\n\n".join(extracted_text)
            quality_score = self._calculate_quality_score(content, metadata)

            return ExtractionResult(
                content=content, metadata=metadata, quality_score=quality_score
            )
        except Exception as e:
            raise Exception(f"PDFPlumber extraction failed: {str(e)}")

    def _extract_pdf_with_pdfminer(self, file_path: str) -> ExtractionResult:
        """Extract text using pdfminer.six as fallback."""
        from pdfminer.high_level import extract_text_to_fp
        from pdfminer.layout import LAParams
        from io import StringIO

        output = StringIO()
        with open(file_path, "rb") as fp:
            extract_text_to_fp(
                fp, output, laparams=LAParams(), output_type="text", codec="utf-8"
            )

        content = output.getvalue()
        metadata = {"extraction_method": "pdfminer"}

        return ExtractionResult(
            content=content,
            metadata=metadata,
            quality_score=self._calculate_quality_score(content, metadata),
        )

    def _extract_pdf_with_pypdf2(self, file_path: str) -> ExtractionResult:
        """Extract text using PyPDF2 as fallback."""
        from PyPDF2 import PdfReader

        extracted_text = []
        metadata = {}

        with open(file_path, "rb") as file:
            reader = PdfReader(file)
            metadata["page_count"] = len(reader.pages)

            for i, page in enumerate(reader.pages):
                try:
                    text = page.extract_text()
                    if text.strip():
                        extracted_text.append(text)
                except Exception as e:
                    metadata[f"page_{i+1}_error"] = str(e)
                    continue

        content = "\n\n".join(extracted_text)
        metadata["extraction_method"] = "PyPDF2"

        return ExtractionResult(
            content=content,
            metadata=metadata,
            quality_score=self._calculate_quality_score(content, metadata),
        )

    def _extract_pdf_with_tika(self, file_path: str) -> ExtractionResult:
        """Extract text using Apache Tika as last resort."""
        try:
            from tika import parser

            parsed = parser.from_file(file_path)

            metadata = parsed.get("metadata", {})
            content = parsed.get("content", "")

            if not content:
                raise Exception("No content extracted")

            return ExtractionResult(
                content=content,
                metadata=metadata,
                quality_score=self._calculate_quality_score(content, metadata),
            )
        except Exception as e:
            raise Exception(f"Tika extraction failed: {str(e)}")

    def _validate_pdf_content(self, content: str, metadata: Dict) -> bool:
        """Validate extracted PDF content quality."""
        if not content or len(content.strip()) < self.min_content_length:
            return False

        # Check for common PDF extraction issues
        if (
            content.count("\ufffd") > len(content) * 0.1
        ):  # Too many replacement characters
            return False

        # Check for reasonable text-to-page ratio if page count available
        if "page_count" in metadata:
            avg_chars_per_page = len(content) / metadata["page_count"]
            if avg_chars_per_page < 100:  # Suspiciously low character count
                return False

        return True

    def _post_process_pdf_content(self, content: str) -> str:
        """Enhanced post-processing for PDF content."""
        if not content:
            return ""

        # Remove common PDF artifacts
        content = re.sub(r"(\n\s*){3,}", "\n\n", content)  # Excessive newlines
        content = re.sub(r"[^\S\n]+", " ", content)  # Multiple spaces
        content = re.sub(r"[^\x20-\x7E\n]", "", content)  # Non-printable characters

        # Fix common OCR/extraction issues
        content = re.sub(
            r"(?<=[a-z])(?=[A-Z])", " ", content
        )  # Missing spaces between words
        content = re.sub(r"[\u2018\u2019]", "'", content)  # Smart quotes
        content = re.sub(r"[\u201C\u201D]", '"', content)  # Smart double quotes

        return content.strip()

    def _generate_base_metadata(self, file_path: str) -> Dict:
        """Generate base metadata for a file with correct timestamp formats."""
        print("-----file_path----")
        print(file_path)
        path = Path(file_path)
        stats = path.stat()

        try:
            # Calculate content hash
            hash_md5 = hashlib.md5()
            hash_sha256 = hashlib.sha256()

            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
                    hash_sha256.update(chunk)

            # Convert timestamps to milliseconds integers
            last_modified_ms = int(stats.st_mtime * 1000)
            created_at_ms = int(stats.st_ctime * 1000)

            return {
                "filename": path.name,
                "extension": path.suffix.lower(),
                "size": stats.st_size,  # Required field
                "last_modified": last_modified_ms,  # Integer timestamp in milliseconds
                "created_at": created_at_ms,  # Integer timestamp in milliseconds
                "content_hash": hash_sha256.hexdigest(),
                "file_path": str(path),
            }
        except Exception as e:
            logger.error(f"Error generating metadata for {file_path}: {str(e)}")
            raise

    def _post_process_content(self, content: str) -> str:
        """Clean and normalize extracted text."""
        if not content:
            return ""

        # Basic cleaning
        content = content.replace("\x00", "")  # Remove null bytes
        content = " ".join(content.split())  # Normalize whitespace
        content = content.strip()

        # Remove very short lines (often headers/footers)
        lines = [line for line in content.split("\n") if len(line.strip()) > 20]
        return "\n".join(lines)

    def _calculate_quality_score(self, content: str, metadata: Dict) -> float:
        """Calculate quality score for extracted content."""
        if not content:
            return 0.0

        factors = []

        # Content length score
        length_score = min(1.0, len(content) / 1000)
        factors.append(length_score)

        # Word variety score
        words = content.lower().split()
        if words:
            unique_ratio = len(set(words)) / len(words)
            factors.append(unique_ratio)

        # Format-specific scores
        if "encoding_confidence" in metadata:
            factors.append(metadata["encoding_confidence"])

        # Calculate final score
        return sum(factors) / len(factors) if factors else 0.0

    @staticmethod
    def _humanize_size(size_bytes: int) -> str:
        """Convert bytes to human readable format."""
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024:
                return f"{size_bytes:.1f}{unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f}TB"

    def _extract_doc(self, file_path: str) -> ExtractionResult:
        """Placeholder for Word document extraction."""
        return ExtractionResult(
            content="",
            metadata=self._generate_base_metadata(file_path),
            quality_score=0.0,
        )

    def _extract_text(self, file_path: str) -> ExtractionResult:
        """Placeholder for text file extraction."""
        return ExtractionResult(
            content="",
            metadata=self._generate_base_metadata(file_path),
            quality_score=0.0,
        )

    def _extract_image(self, file_path: str) -> ExtractionResult:
        """Placeholder for image file extraction."""
        return ExtractionResult(
            content="",
            metadata=self._generate_base_metadata(file_path),
            quality_score=0.0,
        )

    def _extract_fallback(self, file_path: str) -> ExtractionResult:
        """Placeholder for fallback extraction method."""
        return ExtractionResult(
            content="",
            metadata=self._generate_base_metadata(file_path),
            quality_score=0.0,
        )
