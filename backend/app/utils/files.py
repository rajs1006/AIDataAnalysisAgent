"""Document processor utility functions and helper methods."""

import hashlib
from pathlib import Path
import re
from typing import Dict, Any
import chardet
import pandas as pd


def generate_base_metadata(file_path: str) -> Dict:
    """Generate base metadata for a file."""
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

        return {
            "filename": path.name,
            "extension": path.suffix.lower(),
            "size": stats.st_size,
            "last_modified": int(stats.st_mtime * 1000),
            "created_at": int(stats.st_ctime * 1000),
            "content_hash": hash_sha256.hexdigest(),
            "file_path": str(path),
        }
    except Exception as e:
        raise Exception(f"Error generating metadata for {file_path}: {str(e)}")


def validate_pdf_content(
    content: str, metadata: Dict, min_content_length: int = 50
) -> bool:
    """Validate extracted PDF content quality."""
    if not content or len(content.strip()) < min_content_length:
        return False

    # Check for common PDF extraction issues
    if content.count("\ufffd") > len(content) * 0.1:  # Too many replacement characters
        return False

    # Check for reasonable text-to-page ratio if page count available
    if "page_count" in metadata:
        avg_chars_per_page = len(content) / metadata["page_count"]
        if avg_chars_per_page < 100:  # Suspiciously low character count
            return False

    return True


def post_process_pdf_content(content: str) -> str:
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


def post_process_content(content: str) -> str:
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


def calculate_quality_score(content: str, metadata: Dict) -> float:
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


def humanize_size(size_bytes: int) -> str:
    """Convert bytes to human readable format."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f}{unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f}TB"


def get_file_type(mime_type: str) -> str:
    """Determine file type from MIME type."""
    if mime_type == "application/pdf":
        return "pdf"
    elif mime_type in ["text/csv", "application/csv"]:
        return "csv"
    elif mime_type in [
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]:
        return "excel"
    elif mime_type in [
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]:
        return "doc"
    elif mime_type.startswith("text/"):
        return "text"
    elif mime_type.startswith("image/"):
        return "image"
    return "unknown"
