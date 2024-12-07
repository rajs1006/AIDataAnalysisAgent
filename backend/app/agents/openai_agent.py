from typing import List, Dict, Any, Optional
import logging
from openai import AsyncOpenAI
import json
from enum import Enum
import re

from app.core.config import settings
from app.models.schema.agent import SearchContext, QueryRequest, QueryResponse
from app.models.database.connectors import FolderConnector

logger = logging.getLogger(__name__)


class ActionType(str, Enum):
    SEARCH_RAG = "search_rag"
    SEARCH_VECTOR = "search_vector"
    FETCH_DOC = "fetch_doc"
    FINAL_ANSWER = "final_answer"
    CLARIFY = "clarify"
    COMBINE = "combine"


class ReActAgent:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.required_rag_search = False

    def _build_system_prompt(self) -> str:
        return """You are a precise AI assistant that follows the ReAct framework to answer questions using available knowledge sources.

MANDATORY RULES:
1. ALWAYS perform a search_rag action first before providing any final answer
2. NEVER provide a final answer without checking the RAG knowledge base
3. If search results are empty, explicitly state "No information found" and request clarification
4. Exhaust all search options before concluding no information exists

STEP-BY-STEP PROCESS:
1. REASON: Analyze what information is needed
2. ACTION: Choose from available actions:
   - search_rag: [REQUIRED FIRST STEP] Full document search from knowledge base
   - final_answer: Provide response (only after RAG search)

3. OBSERVE: Analyze results and determine next steps

ACTION FORMAT (must be valid JSON):
{
    "type": "action_type",
    "query": "search query",
    "doc_id": "optional_id"
}

EXAMPLES:
✓ Good:
REASONING: Need to search knowledge base for primary information
ACTION: {"type": "search_rag", "query": "detailed search terms"}

✗ Bad:
REASONING: This seems like a common query
ACTION: {"type": "final_answer", "query": "generic response without searching"}

CRITICAL: 
- Always perform search_rag first
- Provide specific, detailed search queries
- Verify information exists before answering
- Format actions as proper JSON with quoted properties"""

    def _extract_json_from_action(self, text: str) -> dict:
        try:
            match = re.search(r"ACTION:\s*({.*?})\s*(?:\n|$)", text, re.DOTALL)
            if not match:
                raise ValueError("No valid ACTION section found")

            json_str = match.group(1).strip()
            return json.loads(json_str)
        except Exception as e:
            logger.error(f"JSON extraction failed: {str(e)}")
            return {"type": "search_rag", "query": "Retrying search due to error"}

    async def _execute_step(
        self,
        response_content: str,
        context: List[SearchContext],
        rag_functions: Dict,
        connector: FolderConnector,
        user_id: str,
    ) -> Dict[str, Any]:
        try:
            action = self._extract_json_from_action(response_content)
            action_type = action.get("type")

            if action_type == ActionType.SEARCH_RAG:
                self.required_rag_search = True
                search_results = await rag_functions["search_rag"]["handler"](
                    connector=connector, user_id=user_id, query=action["query"]
                )
                return {
                    "observation": f"RAG search found {len(search_results)} documents"
                    + f": {search_results[0] if search_results else ''}",
                    "results": search_results,
                    "continue": True,
                }

            # elif action_type == ActionType.SEARCH_VECTOR:
            #     search_results = await rag_functions["search_vector"](action["query"])
            #     return {
            #         "observation": f"Vector search found {len(search_results)} results" + (f": {search_results[0] if search_results else ''}"),
            #         "results": search_results,
            #         "continue": True,
            #     }

            # elif action_type == ActionType.FETCH_DOC:
            #     doc = await rag_functions["fetch_doc"](action["doc_id"])
            #     return {
            #         "observation": f"Retrieved document: {str(doc)}",
            #         "results": [doc],
            #         "continue": True,
            #     }

            elif action_type == ActionType.CLARIFY:
                return {
                    "observation": "Clarification needed: " + action["query"],
                    "continue": False,
                }

            elif action_type == ActionType.COMBINE:
                return {
                    "observation": "Combining available information",
                    "continue": True,
                }

            elif action_type == ActionType.FINAL_ANSWER:
                return {
                    "observation": action["query"],
                    "continue": False,
                    "final_answer": True,
                }

            else:
                raise ValueError(f"Unknown action type: {action_type}")

        except Exception as e:
            logger.error(f"Step execution error: {str(e)}")
            raise

    async def generate_response(
        self,
        connector: FolderConnector,
        user_id: str,
        context: List[SearchContext],
        query_params: QueryRequest,
        rag_functions: Dict,
    ) -> str:
        try:
            self.required_rag_search = False
            messages = [
                {"role": "system", "content": self._build_system_prompt()},
                {"role": "user", "content": query_params.query},
            ]

            max_steps = 5
            current_step = 0
            final_answer = None

            while current_step < max_steps:
                response = await self.client.chat.completions.create(
                    model=query_params.model,
                    messages=messages,
                    temperature=query_params.temperature,
                    max_tokens=query_params.max_tokens,
                )

                response_content = response.choices[0].message.content
                result = await self._execute_step(
                    response_content, context, rag_functions, connector, user_id
                )

                messages.append({"role": "assistant", "content": response_content})
                messages.append(
                    {"role": "user", "content": f"OBSERVATION: {result['observation']}"}
                )

                if not result.get("continue", True):
                    if result.get("final_answer"):
                        if self.required_rag_search:
                            final_answer = result["observation"]
                        else:
                            final_answer = (
                                "Error: No RAG search performed. Please try again."
                            )
                    break

                current_step += 1

            if not final_answer:
                if not self.required_rag_search:
                    final_answer = "Error: Search was not performed. Please try again."
                else:
                    final_answer = "No definitive answer found after searching. Please rephrase your question or provide more context."

            return final_answer

        except Exception as e:
            logger.error(f"ReAct agent error: {str(e)}")
            raise
