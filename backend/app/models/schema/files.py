from pydantic import BaseModel, Field


class DeleteDocumentRequest(BaseModel):
    document_id: str = Field(..., description="Unique identifier of the document")
    connector_id: str = Field(..., description="Unique identifier of the connector")


