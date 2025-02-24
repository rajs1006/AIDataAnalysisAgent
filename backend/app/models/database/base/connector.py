# from beanie import Document, Indexed, PydanticObjectId, Link
# from pydantic import Field
# from datetime import datetime, timedelta
# from typing import Optional, Dict, List
# from app.models.schema.base.connector import ConnectorStatusEnum, FileStatusEnum
# from app.models.schema.base.connector import ConnectorTypeEnum


# class FileDocument(Document):
#     filename: str
#     extension: str
#     size: int
#     last_modified: datetime  # milliseconds timestamp
#     created_at: datetime  # milliseconds timestamp
#     content_hash: str
#     content: Optional[str] = None
#     summary: Optional[dict] = None
#     file_path: Optional[str] = None
#     status: FileStatusEnum = FileStatusEnum.ACTIVE
#     doc_id: Optional[str] = None
#     last_indexed: Optional[datetime] = None
#     vector_ids: Optional[list] = None
#     error_message: Optional[str] = None
#     total_chunks: Optional[int] = None

#     # blob metadata
#     blob_file_id: Optional[str] = None
#     blob_content_type: Optional[str] = None
#     blob_size: Optional[int] = None
#     blob_filename: Optional[str] = None
#     blob_gcs_bucket: Optional[str] = None
#     blob_gcs_path: Optional[str] = None

#     ai_metadata: Optional[dict] = None

#     class Settings:
#         name = "files"
#         indexes = [
#             "filename",
#             "status",
#             "content_hash",
#         ]

#     class Config:
#         json_encoders = {datetime: lambda v: int(v.timestamp() * 1000)}


# class Connector(Document):
#     id: Optional[PydanticObjectId] = None
#     user_id: str
#     name: str = Field(..., min_length=1, max_length=255)
#     path: Optional[str] = None
#     description: Optional[str] = None
#     connector_type: Optional[ConnectorTypeEnum] = None
#     config: Optional[Dict] = None
#     supported_extensions: List[str] = [".pdf", ".doc", ".docx", ".txt", ".csv"]
#     enabled: bool = True
#     created_at: datetime = Field(default_factory=datetime.utcnow)
#     updated_at: datetime = Field(default_factory=datetime.utcnow)
#     last_sync: Optional[datetime] = None
#     status: str = ConnectorStatusEnum.ACTIVE
#     error_message: Optional[str] = None
#     files: List[Link[FileDocument]] = Field(default_factory=list)

#     async def pre_save(self):
#         self.updated_at = datetime.utcnow()

#     class Config:
#         json_encoders = {
#             datetime: lambda v: int(
#                 v.timestamp() * 1000
#             )  # Convert to milliseconds timestamp
#         }

#     def dict(self, *args, **kwargs):
#         d = super().dict(*args, **kwargs)
#         # Convert datetime objects to millisecond timestamps
#         if "created_at" in d:
#             d["created_at"] = int(d["created_at"].timestamp() * 1000)
#         if "updated_at" in d:
#             d["updated_at"] = int(d["updated_at"].timestamp() * 1000)
#         if "last_sync" in d and d["last_sync"]:
#             d["last_sync"] = int(d["last_sync"].timestamp() * 1000)
#         return d

#     class Settings:
#         name = "connectors"
#         indexes = [
#             "user_id",
#             "connector_type",
#             ("user_id", "name"),
#         ]

#     async def delete_all_files(self) -> None:
#         """Delete all files associated with this connector"""
#         try:
#             # Fetch all files
#             for file_link in self.files:
#                 file_doc = await FileDocument.get(file_link.id)
#                 if file_doc:
#                     await file_doc.delete()

#             # Clear the files list
#             self.files = []
#             await self.save()
#         except Exception as e:
#             raise

#     async def pre_delete(self) -> None:
#         """Pre-delete hook to clean up files before connector deletion"""
#         await self.delete_all_files()
