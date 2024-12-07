from typing import List, Dict, Any, Optional
from langchain.agents import AgentExecutor, ZeroShotAgent, create_openai_functions_agent
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain_core.tools import BaseTool, Tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
import logging
import json
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.config import settings
from app.models.schema.agent import (
    SearchContext,
    QueryRequest,
    SuggestedCorrection,
    ReActAction,
    ReActState,
    ReActActionType,
    AnalysisResult,
    SearchResult,
)
from app.models.database.connectors import FolderConnector
from app.prompts.prompt_manager import PromptManager
from app.utils.agent.tools import ReActTools, ParserUtils
from app.utils.asynctools import sync_wrapper

logger = logging.getLogger(__name__)


class PromptExecutor:
    """Handles prompt execution and formatting"""

    def __init__(self, prompt_manager: PromptManager, llm: ChatOpenAI):
        self.prompt_manager = prompt_manager
        self.llm = llm

    async def execute_analysis_prompt(
        self, query: str, results: List[Dict], history: List[Dict]
    ) -> Dict[str, Any]:
        """Execute analysis prompt and parse results"""
        try:
            prompt = self.prompt_manager.get_prompt("analysis_prompt").format(
                query=query,
                results=json.dumps(results, indent=2),
                history=json.dumps(history, indent=2),
            )

            response = self.llm.predict(prompt)

            analysis = json.loads(response)
            return {
                "relevance_score": float(analysis.get("relevance", 0)),
                "completeness_score": float(analysis.get("completeness", 0)),
                "next_action": analysis.get("next_action", "clarify"),
                "missing_info": analysis.get("missing_info", []),
                "suggested_refinements": analysis.get("refinements", []),
                "key_points": analysis.get("key_points", []),
            }
        except Exception as e:
            logger.error(f"Analysis prompt execution failed: {str(e)}")
            return {
                "relevance_score": 0,
                "completeness_score": 0,
                "next_action": "error",
                "missing_info": ["Error in analysis"],
                "suggested_refinements": [],
                "key_points": [],
            }

    async def execute_clarification_prompt(
        self, query: str, missing_info: List[str], context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Execute clarification prompt for focused follow-up questions"""
        try:
            prompt = self.prompt_manager.get_prompt("clarification_prompt").format(
                query=query,
                missing_info=json.dumps(missing_info, indent=2),
                context=json.dumps(context, indent=2) if context else "{}",
            )

            response = self.llm.predict(prompt)
            clarification = json.loads(response)

            return {
                "questions": clarification.get("questions", []),
                "suggestions": clarification.get("suggestions", []),
                "priority": clarification.get("priority", "low"),
                "explanation": clarification.get(
                    "explanation", "Additional information needed"
                ),
            }
        except Exception as e:
            logger.error(f"Clarification prompt execution failed: {str(e)}")
            return {
                "questions": ["Could you please provide more information?"],
                "suggestions": [],
                "priority": "high",
                "explanation": f"Error generating clarification: {str(e)}",
            }

    async def execute_error_handling_prompt(
        self,
        error: str,
        context: str,
        error_type: Optional[str] = None,
        attempts: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Execute error handling prompt for sophisticated error responses"""
        try:
            print(
                "------------- ================ execute_error_handling_prompt ",
            )
            prompt = self.prompt_manager.get_prompt("error_handling_prompt").format(
                error=error,
                context=context,
                error_type=error_type or "unknown",
                attempts=attempts or 1,
            )

            response = self.llm.predict(prompt)
            error_response = json.loads(response)

            return {
                "message": error_response.get("message", f"An error occurred: {error}"),
                "suggestions": error_response.get("suggestions", []),
                "severity": error_response.get("severity", "high"),
                "recovery_possible": error_response.get("recovery_possible", True),
                "next_steps": error_response.get("next_steps", ["Please try again"]),
            }
        except Exception as e:
            logger.error(f"Error handling prompt execution failed: {str(e)}")
            return error
            # return {
            #     "message": f"An unexpected error occurred: {error}",
            #     "suggestions": ["Please try again with a different query"],
            #     "severity": "high",
            #     "recovery_possible": False,
            #     "next_steps": ["Contact support if the issue persists"],
            # }

    async def format_response(
        self, content: str, metadata: Dict[str, Any], response_type: str = "answer"
    ) -> str:
        """Format various types of responses consistently"""
        try:
            print(
                "------------- ================ format_response ",
                content,
                response_type,
            )
            format_prompt = self.prompt_manager.get_prompt(
                "response_format_prompt"
            ).format(
                content=content,
                metadata=json.dumps(metadata, indent=2),
                response_type=response_type,
            )

            formatted_response = self.llm.predict(format_prompt)
            return formatted_response

        except Exception as e:
            logger.error(f"Response formatting failed: {str(e)}")
            return content


class ReActAgent:
    """ReAct agent with enhanced prompt handling"""

    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY, model="gpt-4", temperature=0.7
        )
        self.prompt_manager = PromptManager()
        self.prompt_executor = PromptExecutor(self.prompt_manager, self.llm)
        self.tools = ReActTools(self.prompt_executor)
        self.state = ReActState()

    # def _create_agent_prompt(self) -> ChatPromptTemplate:
    #     """Create the agent's prompt template"""
    #     return ChatPromptTemplate.from_messages(
    #         [
    #             ("system", self.prompt_manager.get_prompt("system_prompt")),
    #             MessagesPlaceholder(variable_name="chat_history"),
    #             ("human", "{input}"),
    #             MessagesPlaceholder(variable_name="agent_scratchpad"),
    #         ]
    #     )

    def _create_agent_prompt(self) -> ChatPromptTemplate:
        """Create the agent's prompt template"""
        return ChatPromptTemplate.from_messages(
            [
                SystemMessage(content=self.prompt_manager.get_prompt("system_prompt")),
                MessagesPlaceholder(variable_name="chat_history"),
                HumanMessage(content="{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

    async def create_tools(
        self, rag_functions: Dict, connector: FolderConnector, user_id: str
    ) -> List[BaseTool]:
        """Create agent tools with enhanced prompt handling"""

        self.connector = connector
        self.user_id = user_id
        self.rag_functions = rag_functions

        return [
            Tool(
                name="search_documents",
                description="Search through documents using RAG with enhanced analysis, provide the query as input",
                func=sync_wrapper(self.search_documents),
                # coroutine=self.search_documents,
                return_direct=False,
            ),
            Tool(
                name="provide_answer",
                description="Provide final answer with completeness check, sources and key point",
                func=sync_wrapper(self.provide_answer),
                # coroutine=self.provide_answer,
                return_direct=True,
            ),
        ]

    async def search_documents(self, query: str) -> str:
        """Search documents with analysis and refinement"""
        try:
            self.state.search_count += 1

            # Execute search with ReActTools
            search_result = await self.tools.search_documents(
                query=query,
                search_rag_func=self.rag_functions["search_rag"]["handler"],
                connector=self.connector,
                user_id=self.user_id,
            )

            # Analyze results using analysis prompt
            analysis = await self.prompt_executor.execute_analysis_prompt(
                query=query,
                results=search_result["results"],
                history=self.state.chat_history,
            )

            # Store results in state
            self.state.search_results.extend(search_result["results"])

            # Handle next action based on analysis
            if analysis["next_action"] == "clarify":
                clarification = await self.prompt_executor.execute_clarification_prompt(
                    query=query, missing_info=analysis["missing_info"]
                )
                return f"Need clarification: {clarification}"

            elif analysis["next_action"] == "refine":
                # Add refinement info to state
                self.state.suggested_refinements = analysis["suggested_refinements"]
                return (
                    f"Results found but may need refinement.\n"
                    f"Relevance: {analysis['relevance_score']:.2f}\n"
                    f"Suggested refinements: {', '.join(analysis['suggested_refinements'])}"
                )

            else:
                return (
                    f"Search completed successfully.\n"
                    f"Relevance: {analysis['relevance_score']:.2f}\n"
                    f"Completeness: {analysis['completeness_score']:.2f}\n"
                    f"Found {len(search_result['results'])} relevant documents."
                )

        except Exception as e:
            error_message = await self.prompt_executor.execute_error_handling_prompt(
                error=str(e), context=f"Query: {query}"
            )
            return error_message

    async def provide_answer(self, answer: str) -> str:
        """Provide answer with result analysis"""
        try:
            if not self.state.search_results:
                return "Error: Cannot provide answer without searching first."

            # Analyze answer completeness
            analysis = await self.prompt_executor.execute_analysis_prompt(
                query=self.state.chat_history[-1]["content"],
                results=self.state.search_results,
                history=self.state.chat_history,
            )

            if analysis["completeness_score"] < 0.8:
                clarification = await self.prompt_executor.execute_clarification_prompt(
                    query=self.state.chat_history[-1]["content"],
                    missing_info=analysis["missing_info"],
                )
                return f"{answer}\n\nNote: {clarification}"

            # Format final answer
            formatted_answer = await self.tools.format_final_answer(
                query=self.state.chat_history[-1]["content"],
                results=self.state.search_results,
                analysis=analysis,
            )

            # Update state
            self.state.has_final_answer = True
            self.state.chat_history.append(
                {
                    "role": "assistant",
                    "content": formatted_answer,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

            return formatted_answer

        except Exception as e:
            error_message = await self.prompt_executor.execute_error_handling_prompt(
                error=str(e), context="Providing final answer"
            )
            return error_message

    async def generate_response(
        self,
        connector: FolderConnector,
        user_id: str,
        context: List[SearchContext],
        query_params: QueryRequest,
        rag_functions: Dict,
    ) -> str:
        """Generate response with enhanced prompt handling"""
        try:
            # Reset state
            self.state = ReActState()
            self.tools = ReActTools(self.prompt_executor)

            # Add query to history
            self.state.chat_history.append(
                {
                    "role": "user",
                    "content": query_params.query,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

            # Create tools and prompt
            tools = await self.create_tools(rag_functions, connector, user_id)
            prompt = self._create_agent_prompt()

            # Create and execute agent
            agent = create_openai_functions_agent(
                llm=self.llm,
                prompt=prompt,
                tools=tools,
            )

            agent_executor = AgentExecutor(
                agent=agent,
                tools=tools,
                verbose=True,
                max_iterations=5,
                handle_parsing_errors=True,
                early_stopping_method="generate",  # Prevent premature stopping
                return_intermediate_steps=True,
                parser=ParserUtils(),
            )

            result = await agent_executor.ainvoke(
                {
                    "input": query_params.query,
                    "chat_history": self.state.chat_history,
                    "agent_scratchpad": [],
                }
            )

            if not result or not result.get("output"):
                return await self._handle_empty_result(query_params.query)

            return await self._handle_response(result["output"], query_params.query)

        except Exception as e:
            error_message = await self.prompt_executor.execute_error_handling_prompt(
                error=str(e), context=f"Processing query: {query_params.query}"
            )
            await self._handle_error(error_message, query_params.query)

    async def _handle_empty_result(self, query: str) -> str:
        """Handle empty results with clarification"""
        if self.state.search_count == 0:
            return await self.prompt_executor.execute_error_handling_prompt(
                error="No search performed", context=query
            )

        return await self.prompt_executor.execute_clarification_prompt(
            query=query, missing_info=["No results found"]
        )

    async def _handle_error(self, error: str, query: str) -> str:
        """Handle errors gracefully with formatted responses"""
        logger.error(f"Error processing query '{query}': {error}")

        metadata = {
            "error_type": type(error).__name__,
            "query": query,
            "search_count": self.state.search_count,
            "has_results": bool(self.state.search_results),
        }

        return await self.prompt_executor.format_response(
            content=str(error), metadata=metadata, response_type="error"
        )

    async def _handle_response(self, result: str, query: str) -> str:
        """Handle errors gracefully with formatted responses"""
        logger.error(f"Query parsed successfully '{query}': {result}")

        metadata = {
            "query": query,
            "search_count": self.state.search_count,
            "has_results": bool(self.state.search_results),
        }

        return await self.prompt_executor.format_response(
            content=str(result), metadata=metadata, response_type="success"
        )


def format_chat_history(history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Format chat history for prompt"""
    formatted = []
    for msg in history[-5:]:
        if msg["role"] == "user":
            formatted.append({"role": "human", "content": msg["content"]})
        elif msg["role"] == "assistant":
            formatted.append({"role": "assistant", "content": msg["content"]})
    return formatted
