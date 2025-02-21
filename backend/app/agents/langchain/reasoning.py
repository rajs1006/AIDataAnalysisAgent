"""Query enhancement and reasoning module."""

from typing import Dict, Any, List, Optional
from functools import lru_cache
from dataclasses import dataclass
import asyncio
from enum import Enum

from langchain.prompts import PromptTemplate
from langchain.chat_models import ChatOpenAI
from langchain.chains import LLMChain

from app.core.logging_config import get_logger
from app.core.exceptions.agent_exception import QueryEnhancementError

logger = get_logger(__name__)


class QueryType(Enum):
    STRUCTURED = "structured"
    UNSTRUCTURED = "unstructured"
    HYBRID = "hybrid"


@dataclass
class EnhancedQuery:
    """Container for enhanced query information."""

    original_query: str
    enhanced_query: str
    query_type: QueryType
    required_data_sources: List[str]
    reasoning: str
    temporal_context: Optional[Dict[str, Any]] = None
    numerical_filters: Optional[Dict[str, Any]] = None


class QueryEnhancer:
    """Enhances queries with reasoning and data source identification."""

    def __init__(self, model_name: str = "gpt-3.5-turbo-0125"):
        self.llm = ChatOpenAI(model_name=model_name, temperature=0)
        self._init_prompts()

    def _init_prompts(self):
        """Initialize prompt templates."""
        self.query_analysis_template = PromptTemplate(
            input_variables=["query"],
            template="""Analyze the following query and provide a structured enhancement:

Query: {query}

1. Identify the type of data needed (structured/unstructured/hybrid)
2. Identify required data sources (CSV, PDF, documents, etc.)
3. Extract any temporal context (dates, time periods)
4. Identify any numerical filters or calculations needed
5. Provide reasoning about how to best answer this query

Provide your analysis in the following format:
{
    "query_type": "structured/unstructured/hybrid",
    "enhanced_query": "improved version of the query",
    "data_sources": ["list", "of", "required", "sources"],
    "temporal_context": {"start": "date", "end": "date"} or null,
    "numerical_filters": {"field": "condition"} or null,
    "reasoning": "explanation of how to best answer this query"
}""",
        )

        self.query_enhancement_chain = LLMChain(
            llm=self.llm, prompt=self.query_analysis_template
        )

    @lru_cache(maxsize=1000)
    async def enhance_query(self, query: str) -> EnhancedQuery:
        """
        Enhance the query with reasoning and data source identification.
        Uses LRU cache for frequent queries.
        """
        try:
            # Get enhanced query analysis
            analysis = await self.query_enhancement_chain.arun(query=query)

            try:
                # Parse the JSON response
                import json

                result = json.loads(analysis)

                # Convert to EnhancedQuery object
                return EnhancedQuery(
                    original_query=query,
                    enhanced_query=result["enhanced_query"],
                    query_type=QueryType[result["query_type"].upper()],
                    required_data_sources=result["data_sources"],
                    reasoning=result["reasoning"],
                    temporal_context=result.get("temporal_context"),
                    numerical_filters=result.get("numerical_filters"),
                )
            except json.JSONDecodeError as e:
                raise QueryEnhancementError(f"Failed to parse query analysis: {str(e)}")

        except Exception as e:
            logger.error(f"Query enhancement failed: {str(e)}")
            raise QueryEnhancementError(f"Query enhancement failed: {str(e)}")

    def clear_cache(self):
        """Clear the query enhancement cache."""
        self.enhance_query.cache_clear()
