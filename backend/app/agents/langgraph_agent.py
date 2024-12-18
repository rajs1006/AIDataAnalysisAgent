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
            return {
                "message": str(error) if isinstance(error, str) else "An unexpected error occurred",
                "suggestions": ["Please try again with a different query"],
                "severity": "high",
                "recovery_possible": False,
                "next_steps": ["Contact support if the issue persists"]
            }
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


class AgentMetrics:
    """Track agent performance metrics"""

    def __init__(self):
        self.search_latencies = []
        self.relevance_scores = []
        self.completion_scores = []
        self.error_counts = {"validation": 0, "parsing": 0, "search": 0, "system": 0}
        self.retry_counts = {}

    def add_search_latency(self, latency_ms: float):
        self.search_latencies.append(latency_ms)

    def add_relevance_score(self, score: float):
        self.relevance_scores.append(score)

    def add_completion_score(self, score: float):
        self.completion_scores.append(score)

    def add_error(self, error_type: str):
        if error_type in self.error_counts:
            self.error_counts[error_type] += 1

    def get_average_metrics(self) -> Dict[str, float]:
        return {
            "avg_latency": (
                sum(self.search_latencies) / len(self.search_latencies)
                if self.search_latencies
                else 0
            ),
            "avg_relevance": (
                sum(self.relevance_scores) / len(self.relevance_scores)
                if self.relevance_scores
                else 0
            ),
            "avg_completion": (
                sum(self.completion_scores) / len(self.completion_scores)
                if self.completion_scores
                else 0
            ),
        }


class ReActAgent:
    """ReAct agent with enhanced prompt handling and state management"""

    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.OPENAI_API_KEY, model="gpt-4o-mini", temperature=0.7
        )
        self.prompt_manager = PromptManager()
        self.prompt_executor = PromptExecutor(self.prompt_manager, self.llm)
        self.tools = ReActTools(self.prompt_executor)
        self.state = ReActState()
        self.metrics = AgentMetrics()
        self.error_recovery = {
            "max_retries": 3,
            "backoff_factor": 1.5,
            "timeout_ms": 10000,
        }

    def _create_agent_prompt(self) -> ChatPromptTemplate:
        """Create the agent's prompt template"""
        return ChatPromptTemplate.from_messages(
            [
                SystemMessage(content=self.prompt_manager.get_system_prompt()),
                MessagesPlaceholder(variable_name="chat_history"),
                HumanMessage(content="{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

    async def create_tools(self, rag_functions: Dict, user_id: str) -> List[BaseTool]:
        """Create agent tools with enhanced prompt handling"""

        self.user_id = user_id
        self.rag_functions = rag_functions

        return [
            Tool(
                name="search_documents",
                description="Search through documents using RAG with enhanced analysis, provide the query as input",
                func=sync_wrapper(self.search_documents),
                coroutine=self.search_documents,
                return_direct=False,
            ),
            Tool(
                name="provide_answer",
                description="Provide final answer with completeness check, sources and key point",
                func=sync_wrapper(self.provide_answer),
                coroutine=self.provide_answer,
                return_direct=True,
            ),
        ]

    async def search_documents(self, query: str) -> str:
        """Search documents with enhanced error handling and recovery"""
        start_time = datetime.utcnow()
        retries = 0
        last_error = None

        while retries < self.error_recovery["max_retries"]:
            try:
                self.state.search_count += 1

                # Validate query
                if not query.strip():
                    return "FINAL ANSWER: Please provide a valid search query."

                # Execute search with timeout
                search_result = await self.tools.search_documents(
                    query=query,
                    search_rag_func=self.rag_functions["search_rag"]["handler"],
                    user_id=self.user_id,
                    timeout_ms=self.error_recovery["timeout_ms"],
                )

                # Get recent context from chat history
                recent_history = self.state.chat_history[-2:] if len(self.state.chat_history) > 1 else []
                
                # Analyze results with context
                analysis = await self.prompt_executor.execute_analysis_prompt(
                    query=query,
                    results=search_result["results"],
                    history=recent_history,
                )

                # Store results
                self.state.search_results.extend(search_result["results"])

                # DECISIVE COMPLETION CHECK
                if (
                    analysis["relevance_score"] >= 0.8
                    and analysis["completeness_score"] >= 0.7
                ):
                    final_answer = await self.tools.format_final_answer(
                        query=query,
                        results=self.state.search_results,
                        analysis=analysis,
                    )
                    return f"FINAL ANSWER: {final_answer}"

                # Handle other cases
                if analysis["next_action"] == "clarify":
                    clarification = (
                        await self.prompt_executor.execute_clarification_prompt(
                            query=query, missing_info=analysis["missing_info"]
                        )
                    )
                    return f"FINAL ANSWER: {clarification}"

                if analysis["next_action"] == "refine" and self.state.search_count < 2:
                    self.state.suggested_refinements = analysis["suggested_refinements"]
                    return (
                        f"Results need refinement. Relevance: {analysis['relevance_score']:.2f}. "
                        f"Trying: {', '.join(analysis['suggested_refinements'])}"
                    )

                # Force completion if we've searched too much
                final_attempt = await self.tools.format_final_answer(
                    query=query, results=self.state.search_results, analysis=analysis
                )
                return f"FINAL ANSWER: {final_attempt}"

            except Exception as e:
                error_message = (
                    await self.prompt_executor.execute_error_handling_prompt(
                        error=str(e), context=f"Query: {query}"
                    )
                )
                return f"FINAL ANSWER: {error_message}"

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
        user_id: str,
        context: List[SearchContext],
        query_params: QueryRequest,
        rag_functions: Dict,
        conversation_history: List[Dict],
    ) -> str:
        """Generate response with strict termination conditions"""
        try:
            # Reset state
            self.state = ReActState()
            self.tools = ReActTools(self.prompt_executor)

            # Add conversation history first, then new query
            self.state.chat_history.extend(conversation_history)
            self.state.chat_history.append(
                {
                    "role": "user",
                    "content": query_params.query,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

            # Create tools and prompt
            tools = await self.create_tools(rag_functions, user_id)
            prompt = self._create_agent_prompt()

            agent = (
                {
                    "input": lambda x: x["input"],
                    "chat_history": lambda x: format_chat_history(x["chat_history"]),
                    "agent_scratchpad": lambda x: format_to_openai_function_messages(
                        x["agent_scratchpad"]
                    ),
                }
                | prompt
                | self.llm
                | ParserUtils().parse
            )

            agent_executor = AgentExecutor(
                agent=agent,
                tools=tools,
                verbose=True,
                max_iterations=3,  # Reduced from 5 to force quicker decisions
                handle_parsing_errors=True,
                early_stopping_method="force",
                return_intermediate_steps=True,
            )

            # Reset search state
            self.state.search_results = []
            self.state.has_final_answer = False
            self.state.search_count = 0

            # Execute with strict timeout and state tracking
            result = await agent_executor.ainvoke(
                {
                    "input": query_params.query,
                    "chat_history": self.state.chat_history,
                    "agent_scratchpad": [],
                },
                {"state": self.state}  # Pass state to track across iterations
            )

            # Format the response for UI
            response = str(result.get("output", ""))
            if "FINAL ANSWER:" in response:
                # Strip the prefix and return clean answer
                return response.split("FINAL ANSWER:", 1)[1].strip()
            
            # If no FINAL ANSWER prefix, format appropriately
            formatted_response = await self._handle_response(response, query_params.query)
            return formatted_response

        except Exception as e:
            logger.error(f"Agent execution error: {str(e)}")
            return await self._handle_error(str(e), query_params.query)

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

    async def summarize_conversation(
        self,
        conversation_history: List[Dict[str, str]],
        summary_type: str = "concise",
    ) -> str:
        """
        Generate an AI-powered summary of the conversation history.

        Args:
            conversation_history: List of conversation messages
            summary_type: Type of summary to generate ("concise" or "detailed")

        Returns:
            str: Generated summary
        """
        try:
            if not conversation_history:
                return "No conversation history to summarize."

            # Create summary prompt based on type
            if summary_type == "concise":
                system_prompt = (
                    "Generate a brief, focused summary of this conversation. "
                    "Highlight only the most important points, decisions, and outcomes. "
                    "Keep the summary clear and actionable."
                )
                max_tokens = 150
            else:
                system_prompt = (
                    "Create a comprehensive summary of this conversation. "
                    "Include main topics discussed, key decisions made, important context, "
                    "and any action items or next steps identified. "
                    "Organize the summary in a clear, structured format."
                )
                max_tokens = 500

            # Format conversation for the prompt
            conversation_text = "\n".join(
                [f"{msg['role']}: {msg['content']}" for msg in conversation_history]
            )

            # Generate summary using the LLM
            summary = await self.llm.ainvoke(
                [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=conversation_text),
                ]
            )

            # Extract key information for metadata
            key_points = await self.llm.ainvoke(
                [
                    SystemMessage(
                        content="Extract 3-5 key points from this conversation summary:"
                    ),
                    HumanMessage(content=summary.content),
                ]
            )

            return {
                "summary": summary.content,
                "key_points": key_points.content.split("\n"),
                "metadata": {
                    "type": summary_type,
                    "message_count": len(conversation_history),
                    "generated_at": datetime.utcnow().isoformat(),
                },
            }

        except Exception as e:
            logger.error(f"Error generating conversation summary: {str(e)}")
            return None


def format_chat_history(history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """Format chat history for prompt"""
    formatted = []
    for msg in history[-5:]:
        if msg["role"] == "user":
            formatted.append({"role": "human", "content": msg["content"]})
        elif msg["role"] == "assistant":
            formatted.append({"role": "assistant", "content": msg["content"]})
    return formatted
