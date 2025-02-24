"""Main document processor implementation."""

import logging
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Any, Optional, Union, List
import mimetypes
import magic
import pandas as pd
import pdfplumber

from langchain_community.document_loaders import (
    PyPDFLoader,
    PDFMinerLoader,
    PDFPlumberLoader,
    CSVLoader,
    UnstructuredExcelLoader,
    TextLoader,
    Docx2txtLoader,
    UnstructuredImageLoader,
    UnstructuredFileLoader,
)
from pandas import DataFrame
from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.core.logging_config import get_logger
from app.core.files.blob_storage import BlobStorage
from app.core.files.hierarchy import FileHierarchyBuilder
from app.models.schema.base.hierarchy import BlobData
from app.agents.document_processor_agent import DocumentProcessorAgent
from app.utils.files import (
    generate_base_metadata,
    validate_pdf_content,
    post_process_pdf_content,
    post_process_content,
    calculate_quality_score,
    get_file_type,
)

logger = get_logger(__name__)


@dataclass
class ExtractionResult:
    """Container for extraction results."""

    content: Union[str, List[Dict]]
    parsed_content: str
    metadata: Dict[str, Any]
    blob_data: Optional[BlobData] = None
    data_frame: Optional[DataFrame] = None
    error: Optional[str] = None
    quality_score: float = 1.0


class DocumentProcessor:
    """Handles document processing and text extraction."""

    def __init__(self):
        mimetypes.init()
        self.min_content_length = 50
        self.min_quality_score = 0.3

        # Define LangChain loaders for each file type
        self.langchain_loaders = {
            "pdf": [
                # (PyPDFLoader, "langchain_pypdf"),
                (PDFMinerLoader, "langchain_pdfminer"),
                # (PDFPlumberLoader, "langchain_pdfplumber"),
            ],
            "csv": [(CSVLoader, "langchain_csv")],
            "excel": [(UnstructuredExcelLoader, "langchain_excel")],
            "text": [(TextLoader, "langchain_text")],
            "doc": [(Docx2txtLoader, "langchain_docx")],
            "image": [(UnstructuredImageLoader, "langchain_image")],
        }

        # Initialize document processor agent
        self.document_processor_agent = DocumentProcessorAgent()
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    async def process_file(
        self, file_path: str, extension: str, store_blob: bool = True
    ) -> ExtractionResult:
        """Process a file and extract text with metadata."""
        try:
            mime_type = magic.from_file(file_path, mime=True)
            metadata = generate_base_metadata(file_path)

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

            metadata["path_segments"] = FileHierarchyBuilder.get_file_path_segments(
                metadata.get("file_path", "")
            )

            # Extract text based on file type
            result = await self._extract_content(file_path, mime_type)

            # Merge metadata
            metadata.update(result.metadata)

            # Post-process and validate content
            processed_content = post_process_content(result.parsed_content)

            # Use document processor agent
            try:
                processed_result = await self.document_processor_agent.process_document(
                    extracted_text=processed_content,
                    file_path=file_path,
                    metadata={"file_type": extension},
                )
                metadata["summary"] = processed_result.__dict__
                metadata["ai_metadata"] = processed_result.metadata.ai_metadata
            except Exception as agent_error:
                logger.error(f"Document processor agent failed: {agent_error}")

            quality_score = calculate_quality_score(processed_content, metadata)

            return ExtractionResult(
                content=result.content,
                parsed_content=result.parsed_content,
                metadata=metadata,
                blob_data=blob_data,
                data_frame=result.data_frame,
                quality_score=quality_score,
            )

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            return ExtractionResult(
                parsed_content="",
                metadata=(
                    metadata
                    if "metadata" in locals()
                    else generate_base_metadata(file_path)
                ),
                error=str(e),
                quality_score=0.0,
            )

    async def _extract_content(
        self, file_path: str, mime_type: str
    ) -> ExtractionResult:
        """Extract content using LangChain loaders first, then fallback methods."""
        file_type = get_file_type(mime_type)

        # Try appropriate extraction method based on file type
        if file_type == "pdf":
            return await self._extract_pdf(file_path)
        elif file_type == "csv":
            return await self._extract_csv(file_path)
        elif file_type == "excel":
            return await self._extract_excel(file_path)
        elif file_type == "doc":
            return await self._extract_doc(file_path)
        elif file_type == "text":
            return await self._extract_text(file_path)
        elif file_type == "image":
            return await self._extract_image(file_path)
        else:
            return await self._extract_fallback(file_path)

    async def _extract_pdf(self, file_path: str) -> ExtractionResult:
        """Extract text from PDF using LangChain loaders with fallbacks."""
        errors = []

        # Try LangChain PDF loaders first
        for loader_class, method_name in self.langchain_loaders["pdf"]:
            try:
                loader = loader_class(file_path)
                docs = loader.load()
                content = "\n".join(doc.page_content for doc in docs)

                metadata = {"extraction_method": method_name, "page_count": len(docs)}

                if validate_pdf_content(content, metadata, self.min_content_length):
                    processed_content = post_process_pdf_content(content)
                    return ExtractionResult(
                        content=content,
                        parsed_content=processed_content,
                        metadata=metadata,
                        quality_score=calculate_quality_score(
                            processed_content, metadata
                        ),
                    )
            except Exception as e:
                errors.append(f"{method_name}: {str(e)}")
                # If LangChain fails, try traditional methods
                try:
                    return await self._extract_pdf_traditional(file_path, errors)
                except Exception as e:
                    errors.append(f"Traditional PDF extraction failed: {str(e)}")
                    error_msg = "All PDF extraction methods failed:\n" + "\n".join(
                        errors
                    )
                    return ExtractionResult(
                        content="",
                        parsed_content="",
                        metadata=generate_base_metadata(file_path),
                        error=error_msg,
                        quality_score=0.0,
                    )

    async def _extract_csv(self, file_path: str) -> ExtractionResult:
        """Extract content from CSV using LangChain with pandas fallback."""
        try:
            # Try LangChain's CSVLoader first
            loader = CSVLoader(file_path)
            docs = loader.load()
            content = "\n".join(doc.page_content for doc in docs)

            # Get additional metadata with pandas
            df = pd.read_csv(file_path)
            metadata = {
                "extraction_method": "langchain_csv",
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": list(df.columns),
            }

            res = ExtractionResult(
                content=df.to_dict("records"),
                parsed_content=content,
                metadata=metadata,
                data_frame=df,
                quality_score=calculate_quality_score(content, metadata),
            )

            return res
        except Exception as e:
            # Fallback to pandas
            logger.error(f"failed to load csv with langchain {str(e)}")
            try:
                df = pd.read_csv(file_path)
                content = df.to_string()
                metadata = {
                    "extraction_method": "pandas",
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "columns": list(df.columns),
                }

                return ExtractionResult(
                    content=df.to_dict("records"),
                    parsed_content=content,
                    metadata=metadata,
                    quality_score=calculate_quality_score(content, metadata),
                )
            except Exception as e2:
                raise Exception(f"CSV extraction failed: {str(e)} -> {str(e2)}")

    async def _extract_excel(self, file_path: str) -> ExtractionResult:
        """Extract content from Excel using LangChain with pandas fallback."""
        try:
            # Try LangChain's UnstructuredExcelLoader first
            loader = UnstructuredExcelLoader(file_path)
            docs = loader.load()
            content = "\n".join(doc.page_content for doc in docs)

            # Get additional metadata with pandas
            excel_file = pd.ExcelFile(file_path)
            sheets_data = {}

            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                sheets_data[sheet_name] = {
                    "row_count": len(df),
                    "column_count": len(df.columns),
                    "columns": list(df.columns),
                }

            metadata = {
                "extraction_method": "langchain_excel",
                "sheets": sheets_data,
                "sheet_names": excel_file.sheet_names,
            }

            return ExtractionResult(
                parsed_content=content,
                metadata=metadata,
                quality_score=calculate_quality_score(content, metadata),
            )

        except Exception as e:
            # Fallback to pandas
            try:
                excel_file = pd.ExcelFile(file_path)
                contents = []
                sheets_data = {}

                for sheet_name in excel_file.sheet_names:
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    contents.append(f"Sheet: {sheet_name}\n{df.to_string()}")
                    sheets_data[sheet_name] = {
                        "row_count": len(df),
                        "column_count": len(df.columns),
                        "columns": list(df.columns),
                    }

                content = "\n\n".join(contents)
                metadata = {
                    "extraction_method": "pandas",
                    "sheets": sheets_data,
                    "sheet_names": excel_file.sheet_names,
                }

                return ExtractionResult(
                    parsed_content=content,
                    metadata=metadata,
                    quality_score=calculate_quality_score(content, metadata),
                )
            except Exception as e2:
                raise Exception(f"Excel extraction failed: {str(e)} -> {str(e2)}")

    async def _extract_doc(self, file_path: str) -> ExtractionResult:
        """Extract content from Word documents using LangChain."""
        try:
            loader = Docx2txtLoader(file_path)
            docs = loader.load()
            content = "\n".join(doc.page_content for doc in docs)

            metadata = {"extraction_method": "langchain_docx", "doc_count": len(docs)}

            return ExtractionResult(
                parsed_content=content,
                metadata=metadata,
                quality_score=calculate_quality_score(content, metadata),
            )
        except Exception as e:
            # Try UnstructuredFileLoader as fallback
            try:
                loader = UnstructuredFileLoader(file_path)
                docs = loader.load()
                content = "\n".join(doc.page_content for doc in docs)

                metadata = {
                    "extraction_method": "langchain_unstructured",
                    "doc_count": len(docs),
                }

                return ExtractionResult(
                    parsed_content=content,
                    metadata=metadata,
                    quality_score=calculate_quality_score(content, metadata),
                )
            except Exception as e2:
                raise Exception(
                    f"Word document extraction failed: {str(e)} -> {str(e2)}"
                )

    async def _extract_text(self, file_path: str) -> ExtractionResult:
        """Extract content from text files with encoding detection."""
        try:
            # Detect encoding
            with open(file_path, "rb") as file:
                raw_data = file.read()
                result = chardet.detect(raw_data)
                encoding = result["encoding"]
                confidence = result["confidence"]

            # Use LangChain's TextLoader
            loader = TextLoader(file_path, encoding=encoding)
            docs = loader.load()
            content = "\n".join(doc.page_content for doc in docs)

            metadata = {
                "extraction_method": "langchain_text",
                "encoding": encoding,
                "encoding_confidence": confidence,
                "doc_count": len(docs),
            }

            return ExtractionResult(
                parsed_content=content,
                metadata=metadata,
                quality_score=calculate_quality_score(content, metadata),
            )
        except Exception as e:
            # Fallback to basic file reading
            try:
                with open(file_path, "r", encoding=encoding) as file:
                    content = file.read()

                metadata = {
                    "extraction_method": "basic_text",
                    "encoding": encoding,
                    "encoding_confidence": confidence,
                }

                return ExtractionResult(
                    parsed_content=content,
                    metadata=metadata,
                    quality_score=calculate_quality_score(content, metadata),
                )
            except Exception as e2:
                raise Exception(f"Text extraction failed: {str(e)} -> {str(e2)}")

    async def _extract_image(self, file_path: str) -> ExtractionResult:
        """Extract text from images using LangChain."""
        try:
            loader = UnstructuredImageLoader(file_path)
            docs = loader.load()
            content = "\n".join(doc.page_content for doc in docs)

            metadata = {"extraction_method": "langchain_image", "doc_count": len(docs)}

            return ExtractionResult(
                parsed_content=content,
                metadata=metadata,
                quality_score=calculate_quality_score(content, metadata),
            )
        except Exception as e:
            raise Exception(f"Image extraction failed: {str(e)}")

    async def _extract_fallback(self, file_path: str) -> ExtractionResult:
        """Fallback extraction using LangChain's UnstructuredFileLoader."""
        try:
            loader = UnstructuredFileLoader(file_path)
            docs = loader.load()
            content = "\n".join(doc.page_content for doc in docs)

            metadata = {
                "extraction_method": "langchain_unstructured",
                "doc_count": len(docs),
            }

            return ExtractionResult(
                parsed_content=content,
                metadata=metadata,
                quality_score=calculate_quality_score(content, metadata),
            )
        except Exception as e:
            raise Exception(f"Fallback extraction failed: {str(e)}")

    async def _extract_pdf_traditional(
        self, file_path: str, errors: List[str]
    ) -> ExtractionResult:
        """Traditional PDF extraction methods."""
        # Try PDFPlumber
        try:
            with pdfplumber.open(file_path) as pdf:
                extracted_text = []
                metadata = {
                    "page_count": len(pdf.pages),
                    "pdf_info": pdf.metadata,
                    "extraction_method": "pdfplumber",
                }

                for i, page in enumerate(pdf.pages):
                    try:
                        text = page.extract_text(layout=True)
                        if text:
                            extracted_text.append(text)

                        # Handle tables
                        tables = page.extract_tables()
                        if tables:
                            metadata[f"page_{i+1}_tables"] = len(tables)
                            for table in tables:
                                if table:
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
                if validate_pdf_content(content, metadata, self.min_content_length):
                    return ExtractionResult(
                        parsed_content=post_process_pdf_content(content),
                        metadata=metadata,
                        quality_score=calculate_quality_score(content, metadata),
                    )
        except Exception as e:
            errors.append(f"PDFPlumber extraction failed: {str(e)}")

        # Try PDFMiner
        try:
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

            if validate_pdf_content(content, metadata, self.min_content_length):
                return ExtractionResult(
                    parsed_content=post_process_pdf_content(content),
                    metadata=metadata,
                    quality_score=calculate_quality_score(content, metadata),
                )
        except Exception as e:
            errors.append(f"PDFMiner extraction failed: {str(e)}")

        # Try PyPDF2
        try:
            from PyPDF2 import PdfReader

            extracted_text = []
            metadata = {}

            with open(file_path, "rb") as file:
                reader = PdfReader(file)
                metadata["page_count"] = len(reader.pages)
                metadata["extraction_method"] = "PyPDF2"

                for i, page in enumerate(reader.pages):
                    try:
                        text = page.extract_text()
                        if text.strip():
                            extracted_text.append(text)
                    except Exception as e:
                        metadata[f"page_{i+1}_error"] = str(e)
                        continue

            content = "\n\n".join(extracted_text)
            if validate_pdf_content(content, metadata, self.min_content_length):
                return ExtractionResult(
                    parsed_content=post_process_pdf_content(content),
                    metadata=metadata,
                    quality_score=calculate_quality_score(content, metadata),
                )
        except Exception as e:
            errors.append(f"PyPDF2 extraction failed: {str(e)}")

        # Try Tika as last resort
        try:
            from tika import parser

            parsed = parser.from_file(file_path)
            metadata = parsed.get("metadata", {})
            content = parsed.get("content", "")
            metadata["extraction_method"] = "tika"

            if content and validate_pdf_content(
                content, metadata, self.min_content_length
            ):
                return ExtractionResult(
                    parsed_content=post_process_pdf_content(content),
                    metadata=metadata,
                    quality_score=calculate_quality_score(content, metadata),
                )
        except Exception as e:
            errors.append(f"Tika extraction failed: {str(e)}")

        raise Exception("All traditional PDF extraction methods failed")
