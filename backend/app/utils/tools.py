from bson import ObjectId
import hashlib
from fastapi import UploadFile

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):  # Added handler parameter
        if isinstance(v, ObjectId):
            return str(v)
        return v


# For UploadFile
async def get_file_hash(upload_file: UploadFile) -> str:
    # Use SHA-256 (recommended for file content)
    sha256_hash = hashlib.sha256()

    # Read and update hash in chunks for memory efficiency
    content = await upload_file.read()
    sha256_hash.update(content)

    # Get the hex digest
    hash_value = sha256_hash.hexdigest()

    # Reset file pointer for future reads
    await upload_file.seek(0)

    return hash_value


# For regular files or bytes
def get_content_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


# For large files (streaming approach)
def get_large_file_hash(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read file in chunks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()
