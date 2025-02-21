"""MongoDB connector using Beanie ODM for structured data."""

from typing import Dict, Any, List, Optional
from functools import lru_cache
import pandas as pd
import json
from datetime import datetime
from beanie import PydanticObjectId

from app.core.logging_config import get_logger
from app.models.database.connectors.connector import FileDocument, Connector
from app.models.schema.base.connector import FileStatusEnum

logger = get_logger(__name__)


class MongoDBConnector:
    """Handles MongoDB operations using Beanie ODM."""

    async def store_structured_data(
        self,
        data: pd.DataFrame,
        connector_id: PydanticObjectId,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Store structured data with connector context using Beanie."""
        try:
            # Convert DataFrame to records
            records = json.loads(data.to_json(orient="records"))
            
            # Get the connector
            connector = await Connector.get(connector_id)
            if not connector:
                raise ValueError(f"Connector not found: {connector_id}")

            # Create file documents
            file_docs = []
            for record in records:
                file_doc = FileDocument(
                    filename=f"structured_data_{datetime.utcnow().timestamp()}",
                    extension=".json",
                    size=len(json.dumps(record)),
                    last_modified=datetime.utcnow(),
                    created_at=datetime.utcnow(),
                    content_hash=str(hash(json.dumps(record, sort_keys=True))),
                    content=json.dumps(record),
                    status=FileStatusEnum.ACTIVE,
                    ai_metadata=metadata
                )
                await file_doc.save()
                file_docs.append(file_doc)

            # Link files to connector
            connector.files.extend(file_docs)
            await connector.save()

            return True

        except Exception as e:
            logger.error(f"Failed to store structured data: {str(e)}")
            raise

    @lru_cache(maxsize=1000)
    async def query_structured_data(
        self,
        connector_ids: List[PydanticObjectId],
        filters: Optional[Dict[str, Any]] = None,
        projection: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Query structured data with caching using Beanie."""
        try:
            # Build query
            query = {"status": FileStatusEnum.ACTIVE}
            
            # Add connector filter
            if connector_ids:
                connectors = await Connector.find({"_id": {"$in": connector_ids}}).to_list()
                file_ids = []
                for connector in connectors:
                    file_ids.extend([file.id for file in connector.files])
                if file_ids:
                    query["_id"] = {"$in": file_ids}

            # Add additional filters
            if filters:
                query.update(filters)

            # Execute query
            files = await FileDocument.find(query, projection).to_list()
            
            # Extract content
            results = []
            for file in files:
                if file.content:
                    try:
                        content = json.loads(file.content)
                        results.append(content)
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse content for file {file.id}")

            return results

        except Exception as e:
            logger.error(f"Failed to query structured data: {str(e)}")
            raise

    async def get_file_schema(
        self, 
        connector_id: PydanticObjectId
    ) -> Dict[str, Any]:
        """Get schema information for files in a connector."""
        try:
            connector = await Connector.get(connector_id)
            if not connector or not connector.files:
                return {}

            # Get sample file
            sample_file = await FileDocument.get(connector.files[0].id)
            if not sample_file or not sample_file.content:
                return {}

            try:
                content = json.loads(sample_file.content)
                fields = list(content.keys())
            except json.JSONDecodeError:
                return {}

            return {
                "fields": fields,
                "metadata": sample_file.ai_metadata or {},
                "connector_id": str(connector_id)
            }

        except Exception as e:
            logger.error(f"Failed to get file schema: {str(e)}")
            raise

    async def analyze_data(
        self, 
        connector_id: PydanticObjectId, 
        fields: List[str]
    ) -> Dict[str, Any]:
        """Analyze structured data for specific fields."""
        try:
            connector = await Connector.get(connector_id)
            if not connector or not connector.files:
                return {}

            # Collect all values for specified fields
            field_values = {field: [] for field in fields}
            
            for file_link in connector.files:
                file = await FileDocument.get(file_link.id)
                if file and file.content:
                    try:
                        content = json.loads(file.content)
                        for field in fields:
                            if field in content:
                                field_values[field].append(content[field])
                    except json.JSONDecodeError:
                        continue

            analysis = {
                "record_count": len(connector.files),
                "fields": {}
            }

            # Calculate statistics for each field
            for field, values in field_values.items():
                if not values:
                    continue

                if all(isinstance(v, (int, float)) for v in values if v is not None):
                    # Numerical field
                    non_null_values = [v for v in values if v is not None]
                    if non_null_values:
                        analysis["fields"][field] = {
                            "type": "numeric",
                            "stats": {
                                "min": min(non_null_values),
                                "max": max(non_null_values),
                                "avg": sum(non_null_values) / len(non_null_values)
                            }
                        }
                else:
                    # Categorical field
                    value_counts = {}
                    for v in values:
                        if v is not None:
                            str_v = str(v)
                            value_counts[str_v] = value_counts.get(str_v, 0) + 1

                    analysis["fields"][field] = {
                        "type": "categorical",
                        "stats": {
                            "unique_values": len(value_counts),
                            "top_values": dict(
                                sorted(
                                    value_counts.items(),
                                    key=lambda x: x[1],
                                    reverse=True
                                )[:5]
                            )
                        }
                    }

            return analysis

        except Exception as e:
            logger.error(f"Failed to analyze data: {str(e)}")
            raise

    def clear_cache(self):
        """Clear query cache."""
        self.query_structured_data.cache_clear()

    async def cleanup(self):
        """Cleanup resources."""
        self.clear_cache()
