"""MongoDB utility functions for the RAG pipeline."""

from typing import Dict, Any, List, Optional
from functools import lru_cache
import json

from motor.motor_asyncio import AsyncIOMotorClient
from langchain.chat_models import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

from app.core.logging_config import get_logger
from app.core.exceptions.agent_exception import MongoQueryError

logger = get_logger(__name__)


class MongoDBHandler:
    """Handles MongoDB operations with query generation and caching."""

    def __init__(
        self, client: AsyncIOMotorClient, model_name: str = "gpt-3.5-turbo-0125"
    ):
        self.client = client
        self.llm = ChatOpenAI(model_name=model_name, temperature=0)
        self._init_prompts()

    def _init_prompts(self):
        """Initialize MongoDB query generation prompts."""
        self.query_generation_template = PromptTemplate(
            input_variables=["query", "collections", "schema"],
            template="""Generate a MongoDB aggregation pipeline for the following query.

Natural Language Query: {query}

Available Collections and Schema:
{schema}

Required Collections: {collections}

The aggregation pipeline should:
1. Include necessary $match stages for filtering
2. Use $lookup for joining collections if needed
3. Include $group stages for any required aggregations
4. Apply proper sorting and limiting
5. Handle date ranges and numerical comparisons appropriately

Return the aggregation pipeline as a JSON array:
[
    {{"$stage": {...}}},
    {{"$stage": {...}}},
    ...
]""",
        )

        self.query_chain = LLMChain(llm=self.llm, prompt=self.query_generation_template)

    async def generate_query(
        self, query: str, collections: List[str], schema: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate MongoDB aggregation pipeline from natural language query."""
        try:
            # Generate pipeline using LLM
            result = await self.query_chain.arun(
                query=query,
                collections=", ".join(collections),
                schema=json.dumps(schema, indent=2),
            )

            try:
                # Parse the generated pipeline
                pipeline = json.loads(result)
                if not isinstance(pipeline, list):
                    raise ValueError("Generated pipeline must be a list of stages")

                # Basic pipeline validation
                for stage in pipeline:
                    if not isinstance(stage, dict):
                        raise ValueError("Each pipeline stage must be a dictionary")

                return pipeline

            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse generated pipeline: {str(e)}")
                raise MongoQueryError(f"Failed to parse generated pipeline: {str(e)}")

        except Exception as e:
            logger.error(f"Query generation failed: {str(e)}")
            raise MongoQueryError(f"Query generation failed: {str(e)}")

    async def execute_pipeline(
        self, collection: str, pipeline: List[Dict[str, Any]], user_id: str
    ) -> List[Dict[str, Any]]:
        """Execute MongoDB aggregation pipeline."""
        try:
            # Add user filter to pipeline
            user_filter = {"$match": {"user_id": user_id}}
            pipeline.insert(0, user_filter)

            # Execute pipeline
            results = await self.client[collection].aggregate(pipeline).to_list(None)
            return results

        except Exception as e:
            logger.error(f"Pipeline execution failed: {str(e)}")
            raise MongoQueryError(f"Pipeline execution failed: {str(e)}")

    @lru_cache(maxsize=100)
    async def get_collection_schema(
        self, collection: str, user_id: str
    ) -> Dict[str, Any]:
        """Get schema information for a collection."""
        try:
            # Get sample document
            sample = await self.client[collection].find_one(
                {"user_id": user_id}, {"_id": 0}
            )

            if not sample:
                return {}

            # Extract field names and types
            schema = {}
            for field, value in sample.items():
                if field != "user_id":
                    schema[field] = type(value).__name__

            return schema

        except Exception as e:
            logger.error(f"Failed to get collection schema: {str(e)}")
            raise MongoQueryError(f"Failed to get collection schema: {str(e)}")

    def clear_cache(self):
        """Clear all caches."""
        self.get_collection_schema.cache_clear()
