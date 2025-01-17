from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
import logging
from difflib import get_close_matches
import re
import json
from langchain.agents.format_scratchpad import format_to_openai_function_messages
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain_core.agents import AgentAction, AgentFinish
from app.models.schema.agent import SearchResult, AnalysisResult, SuggestedCorrection

logger = logging.getLogger(__name__)


class ParserUtils(OpenAIFunctionsAgentOutputParser):
    def parse(self, text: str) -> Union[AgentAction, AgentFinish]:
        """Parse with enforced termination on FINAL ANSWER"""
        try:
            # Get clean text
            cleaned_output = (
                text.content.strip() if hasattr(text, "content") else text.strip()
            )
            print("--------------------------")
            print(cleaned_output)
            print("--------------------------")

            # IMMEDIATE TERMINATION if we see FINAL ANSWER
            # if "FINAL ANSWER:" in cleaned_output:
            #     logger.info("Final answer found - terminating chain")
            #     return AgentFinish(
            #         return_values={"output": cleaned_output},
            #         log=cleaned_output,
            #     )
            if "FINAL ANSWER:" in cleaned_output:
                answer = cleaned_output.split("FINAL ANSWER:", 1)[1].strip()
                return AgentFinish(
                    return_values={
                        "output": cleaned_output,
                        "source_type": (
                            "context" if "type: context:" in text else "search"
                        ),
                    },
                    log=cleaned_output,
                )

            # Verify required format elements
            if "REASONING:" not in cleaned_output:
                raise ValueError("Missing REASONING section")

            # Only proceed to action parsing if proper format
            if "ACTION:" in cleaned_output and "FINAL ANSWER:" not in cleaned_output:
                try:
                    # Extract and validate reasoning
                    reasoning = (
                        cleaned_output.split("REASONING:", 1)[1]
                        .split("ACTION:", 1)[0]
                        .strip()
                    )
                    if not reasoning:
                        raise ValueError("Empty REASONING section")

                    # Extract and clean action JSON
                    action_part = cleaned_output.split("ACTION:", 1)[1].strip()
                    action_json = self._clean_and_validate_json(action_part)

                    # Validate required fields
                    if "type" not in action_json:
                        raise ValueError("Missing required field 'type' in action")

                    # Get tool input with validation
                    tool_input = action_json.get("query", action_json.get("answer", ""))
                    if not tool_input:
                        raise ValueError("Missing required input (query or answer)")

                    return AgentAction(
                        tool=action_json["type"],
                        tool_input=tool_input,
                        log=cleaned_output,
                    )
                except (json.JSONDecodeError, ValueError) as e:
                    logger.error(f"Action parsing error: {e}")
                    return AgentFinish(
                        return_values={
                            "output": f"FINAL ANSWER: Error in action format - {str(e)}"
                        },
                        log=cleaned_output,
                    )

            # Force termination for unrecognized formats
            return AgentFinish(
                return_values={"output": f"FINAL ANSWER: {cleaned_output}"},
                log=cleaned_output,
            )

        except Exception as e:
            logger.error(f"Parser error: {e}")
            return AgentFinish(
                return_values={
                    "output": f"FINAL ANSWER: Error in processing - {str(e)}"
                },
                log=str(e),
            )

    def _clean_and_validate_json(self, json_str: str) -> Dict:
        """Clean and validate JSON with strict formatting"""
        # Remove markdown and normalize braces
        cleaned = re.sub(r"```(?:json)?(.*?)```", r"\1", json_str, flags=re.DOTALL)
        cleaned = cleaned.replace("}}", "}").replace("{{", "{")
        cleaned = cleaned.strip()

        try:
            # Parse JSON
            parsed = json.loads(cleaned)

            # Validate structure
            if not isinstance(parsed, dict):
                raise ValueError("JSON must be an object")

            # Validate required fields based on type
            if parsed.get("type") == "search_documents":
                if not parsed.get("query"):
                    raise ValueError("Search action requires 'query' field")
            elif parsed.get("type") == "provide_answer":
                if not parsed.get("answer"):
                    raise ValueError("Answer action requires 'answer' field")
            else:
                raise ValueError(f"Invalid action type: {parsed.get('type')}")

            return parsed

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise ValueError(f"JSON validation failed: {str(e)}")


class SearchUtils:
    """Utilities for search enhancement"""

    @staticmethod
    def _process_typos(query: str, context: List[str]) -> Dict[str, Any]:
        """Advanced typo detection and correction"""
        corrections: Dict[str, SuggestedCorrection] = {}
        words = re.findall(r"\w+", query.lower())
        context_words = set()

        # Build context vocabulary
        for ctx in context:
            context_words.update(re.findall(r"\w+", ctx.lower()))

        # Find corrections with confidence scores
        for word in words:
            matches = get_close_matches(word, list(context_words), n=3, cutoff=0.6)
            if matches and matches[0] != word:
                confidence = 1.0 - (
                    sum(1 for a, b in zip(word, matches[0]) if a != b)
                    / max(len(word), len(matches[0]))
                )
                corrections[word] = SuggestedCorrection(
                    original=word, correction=matches[0], confidence=confidence
                )

        return {
            "has_typos": bool(corrections),
            "corrections": {k: v.correction for k, v in corrections.items()},
            "confidence_scores": {k: v.confidence for k, v in corrections.items()},
        }

    @staticmethod
    def _generate_query_variations(query: str, typo_info: Dict[str, Any]) -> List[str]:
        """Generate multiple search variations"""
        variations = [query]

        # Add corrected version if typos found
        if typo_info["has_typos"]:
            corrected_query = query
            for original, correction in typo_info["corrections"].items():
                corrected_query = re.sub(
                    rf"\b{original}\b", correction, corrected_query, flags=re.IGNORECASE
                )
            variations.append(corrected_query)

        # Add variations without special characters
        cleaned = re.sub(r"[^\w\s]", " ", query)
        if cleaned != query:
            variations.append(cleaned)

        # Add keyword-focused variation
        keywords = re.findall(r"\w+", query)
        if len(keywords) > 2:
            variations.append(" ".join(sorted(keywords, key=len, reverse=True)[:3]))

        return list(
            dict.fromkeys(variations)
        )  # Remove duplicates while preserving order

    @staticmethod
    def format_search_metadata(typo_info: Dict[str, Any], variations: List[str]) -> str:
        """Format search metadata for observation"""
        metadata = []

        if typo_info["has_typos"]:
            corrections = [
                f"'{k}' → '{v}' ({typo_info['confidence_scores'][k]:.2f})"
                for k, v in typo_info["corrections"].items()
            ]
            metadata.append(f"Corrected typos: {', '.join(corrections)}")

        if len(variations) > 1:
            metadata.append(f"Generated {len(variations)} query variations")
            metadata.append(f"Variations: {', '.join(variations)}")

        return "\n".join(metadata)


class QuestionDecomposer:
    """Decomposes complex questions into simpler sub-questions"""

    def __init__(self):
        self.question_types = {
            "what": self._handle_what,
            "how": self._handle_how,
            "why": self._handle_why,
            "when": self._handle_when,
            "where": self._handle_where,
            "who": self._handle_who,
            "comparison": self._handle_comparison,
            "list": self._handle_list,
        }

    def decompose(self, query: str) -> List[str]:
        """Break down complex queries into sub-questions"""
        # Clean and normalize query
        query = query.strip().lower()

        # Detect query type
        query_type = self._detect_query_type(query)

        # Handle based on type
        if query_type in self.question_types:
            return self.question_types[query_type](query)

        # Default handling for unrecognized types
        return [query]

    def _detect_query_type(self, query: str) -> str:
        """Detect the type of question"""
        # Check for comparison keywords
        if any(word in query for word in ["compare", "difference", "versus", "vs"]):
            return "comparison"

        # Check for list keywords
        if any(word in query for word in ["list", "enumerate", "what are"]):
            return "list"

        # Check question words
        for word in ["what", "how", "why", "when", "where", "who"]:
            if query.startswith(word):
                return word

        return "what"  # Default type

    def _handle_what(self, query: str) -> List[str]:
        """Handle 'what' questions"""
        # For definition questions
        if "what is" in query or "what are" in query:
            return [
                query,
                f"Define {query.replace('what is', '').replace('what are', '').strip()}",
            ]
        return [query]

    def _handle_how(self, query: str) -> List[str]:
        """Handle 'how' questions"""
        sub_questions = [query]

        # For process questions
        if "how to" in query:
            topic = query.replace("how to", "").strip()
            sub_questions.extend(
                [
                    f"What are the steps to {topic}?",
                    f"What are common mistakes when {topic}?",
                    f"What tools or resources are needed to {topic}?",
                ]
            )

        return sub_questions

    def _handle_why(self, query: str) -> List[str]:
        """Handle 'why' questions"""
        topic = query.replace("why", "").strip()
        return [
            query,
            f"What are the reasons for {topic}?",
            f"What factors contribute to {topic}?",
        ]

    def _handle_when(self, query: str) -> List[str]:
        """Handle 'when' questions"""
        return [query]  # Simple temporal questions usually don't need decomposition

    def _handle_where(self, query: str) -> List[str]:
        """Handle 'where' questions"""
        return [query]  # Location questions usually don't need decomposition

    def _handle_who(self, query: str) -> List[str]:
        """Handle 'who' questions"""
        return [query]  # Identity questions usually don't need decomposition

    def _handle_comparison(self, query: str) -> List[str]:
        """Handle comparison questions"""
        # Extract comparison elements
        elements = self._extract_comparison_elements(query)
        if len(elements) < 2:
            return [query]

        return [
            query,
            f"What are the key features of {elements[0]}?",
            f"What are the key features of {elements[1]}?",
            f"What are the main differences between {elements[0]} and {elements[1]}?",
        ]

    def _handle_list(self, query: str) -> List[str]:
        """Handle list-type questions"""
        topic = (
            query.replace("list", "")
            .replace("enumerate", "")
            .replace("what are", "")
            .strip()
        )
        return [
            query,
            f"What are the most important {topic}?",
            f"What are common or well-known {topic}?",
        ]

    def _extract_comparison_elements(self, query: str) -> List[str]:
        """Extract elements being compared"""
        for separator in ["vs", "versus", "compare", "difference between"]:
            if separator in query:
                parts = query.split(separator)
                if len(parts) == 2:
                    return [p.strip() for p in parts]
        return []


class SearchCache:
    """Cache for search results to avoid redundant searches"""

    def __init__(self, max_size: int = 100):
        self.cache = {}
        self.max_size = max_size
        self.query_variations = {}

    def get(self, query: str) -> Optional[Dict[str, Any]]:
        """Get cached results for a query"""
        normalized_query = self._normalize_query(query)
        return self.cache.get(normalized_query)

    def set(self, query: str, results: Dict[str, Any]):
        """Cache results for a query"""
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_query = next(iter(self.cache))
            del self.cache[oldest_query]

        normalized_query = self._normalize_query(query)
        self.cache[normalized_query] = results

    def _normalize_query(self, query: str) -> str:
        """Normalize query for consistent caching"""
        return " ".join(sorted(query.lower().split()))


class ReActTools:
    """Enhanced tools with integrated prompt handling and caching"""

    def __init__(self, prompt_executor):
        self.prior_searches = []
        self.relevance_threshold = 0.6
        self.search_utils = SearchUtils()
        self.prompt_executor = prompt_executor
        self.search_cache = SearchCache()
        self.question_decomposer = QuestionDecomposer()

    async def search_documents(
        self,
        query: str,
        search_rag_func: Any,
        user_id: str,
        limit: int = 5,
        timeout_ms: int = 10000,
    ) -> Dict[str, Any]:
        """Execute RAG search with enhanced analysis"""
        try:
            # Check cache first
            cached_results = self.search_cache.get(query)
            if cached_results:
                return cached_results

            # Process typos and generate variations
            typo_info = self.search_utils._process_typos(
                query, [s for s in self.prior_searches]
            )
            query_variations = self.search_utils._generate_query_variations(
                query, typo_info
            )

            # Track history
            self.prior_searches.append(query)

            # Decompose query if complex
            all_results = []
            total_score = 0

            # Execute search for main query and its variations
            for variation in query_variations:
                # Execute search with timeout
                try:

                    results = await search_rag_func(
                        user_id=user_id, query=variation, limit=limit
                    )

                    # If no results found, continue to next variation
                    if not results:
                        continue

                    for result in results:
                        # Extract key points using analysis prompt
                        analysis = await self.prompt_executor.execute_analysis_prompt(
                            query=variation,
                            results=[{"content": result.content}],
                            history=[{"query": query}],
                        )

                        # Boost relevance for general queries with good matches
                        relevance_score = analysis["content"].get("relevance", 0)
                        if any(
                            word in query.lower().split()
                            for word in ["who", "what", "tell", "describe", "explain"]
                        ):
                            # Boost score if we have CV-like content or biographical info
                            content_lower = result.content.lower()
                            if any(
                                term in content_lower
                                for term in [
                                    "experience",
                                    "education",
                                    "background",
                                    "skills",
                                    "about me",
                                ]
                            ):
                                relevance_score = max(0.8, relevance_score)

                        all_results.append(
                            {
                                "content": result.content,
                                "score": result.score,
                                "key_points": analysis["content"].get("key_points", []),
                                "source": result.metadata.get("file_path", "Unknown"),
                                "query_variation": variation,
                                "relevance": relevance_score,
                            }
                        )
                        total_score += result.score

                except Exception as e:
                    logger.error(f"Error in search variation {variation}: {str(e)}")
                    continue

            # If no results found after all variations, return clarification
            if not all_results:
                clarification = await self.prompt_executor.execute_clarification_prompt(
                    query=query,
                    missing_info=["No relevant information found in the documents"],
                )
                return {
                    "results": [],
                    "total_results": 0,
                    "average_score": 0,
                    "search_query": query,
                    "metadata": "No results found in documents",
                    "needs_clarification": True,
                    "clarification": clarification,
                }

            # Deduplicate and sort results
            unique_results = self._deduplicate_results(all_results)
            final_results = {
                "results": unique_results,
                "total_results": len(unique_results),
                "average_score": total_score / len(all_results) if all_results else 0,
                "search_query": query,
                "metadata": self.search_utils.format_search_metadata(
                    typo_info, query_variations
                ),
            }

            # Cache the results
            self.search_cache.set(query, final_results)
            return final_results

        except Exception as e:
            logger.error(f"Search error: {str(e)}")
            return {
                "error": str(e),
                "results": [],
                "total_results": 0,
                "average_score": 0,
                "search_query": query,
                "metadata": "",
            }

    def _deduplicate_results(
        self, results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Remove duplicates and sort by relevance"""
        seen_content = set()
        unique_results = []

        for result in sorted(results, key=lambda x: x["relevance"], reverse=True):
            content_hash = hash(result["content"])
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                unique_results.append(result)

        return unique_results

    async def format_final_answer(
        self, query: str, results: List[Dict], analysis: Dict[str, Any]
    ) -> str:
        """Format final answer based on analysis"""
        try:
            if analysis.get("source_type") == "context":
                return analysis["content"]

            # Early return for general queries with good results
            is_general_query = any(
                word in query.lower().split()
                for word in ["who", "what", "tell", "describe", "explain"]
            )
            has_direct_hit = any(
                result.get("relevance", 0) >= 0.7 for result in results
            )

            if is_general_query and has_direct_hit:
                best_result = max(results, key=lambda x: x.get("relevance", 0))
                return best_result["content"]

            # Prepare metadata for formatting
            metadata = {
                "query": query,
                "sources": [r.get("source") for r in results],
                "key_points": analysis["content"].get("key_points", []),
                "completeness_score": analysis["content"].get("completeness_score", 0),
                "missing_info": analysis.get("missing_info", []),
            }

            # Create content from results
            content = "\n".join([r.get("content", "") for r in results])

            # Use format_response for consistent formatting
            return await self.prompt_executor.format_response(
                content=content, metadata=metadata, response_type="answer"
            )

        except Exception as e:
            logger.error(f"Formatting error: {str(e)}")
            return "Error formatting response"

    def should_refine_search(
        self, analysis: Dict[str, Any], search_count: int
    ) -> tuple[bool, Optional[str]]:
        """Determine if search should be refined based on analysis"""
        if search_count >= 3:
            return False, None

        if analysis.get("next_action") == "refine":
            refined_query = self._generate_refined_query(
                self.prior_searches[-1],
                analysis.get("missing_info", []),
                analysis.get("suggested_refinements", []),
            )
            return True, refined_query

        return False, None

    def _generate_refined_query(
        self, last_query: str, missing_info: List[str], suggested_refinements: List[str]
    ) -> str:
        """Generate refined search query"""
        # Use suggested refinements if available
        if suggested_refinements:
            return f"{last_query} {' '.join(suggested_refinements)}"

        # Add specific terms based on missing info
        refinements = []
        for info in missing_info:
            if "when" in info.lower():
                refinements.append("date time period")
            elif "where" in info.lower():
                refinements.append("location place")
            elif "who" in info.lower():
                refinements.append("person name")
            elif "how" in info.lower():
                refinements.append("method process steps")
            elif "why" in info.lower():
                refinements.append("reason explanation cause")

        if refinements:
            return f"{last_query} {' '.join(refinements)}"

        # If no specific refinements, expand query with context terms
        expanded_terms = []
        if any(word in last_query.lower() for word in ["what", "how", "explain"]):
            expanded_terms.extend(["definition", "explanation", "details"])
        elif any(word in last_query.lower() for word in ["when", "where", "who"]):
            expanded_terms.extend(["specific", "exact", "details"])

        return (
            f"{last_query} {' '.join(expanded_terms)}" if expanded_terms else last_query
        )
