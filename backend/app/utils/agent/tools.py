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

            # IMMEDIATE TERMINATION if we see FINAL ANSWER
            if "FINAL ANSWER:" in cleaned_output:
                logger.info("Final answer found - terminating chain")
                return AgentFinish(
                    return_values={"output": cleaned_output},
                    log=cleaned_output,
                )

            # Only proceed to action parsing if no final answer
            if "ACTION:" in cleaned_output and "FINAL ANSWER:" not in cleaned_output:
                try:
                    action_part = cleaned_output.split("ACTION:", 1)[1].strip()
                    action_part = action_part.replace("}}", "}").replace("{{", "{")

                    action_dict = json.loads(action_part)
                    return AgentAction(
                        tool=action_dict["type"],
                        tool_input=action_dict.get(
                            "query", action_dict.get("answer", "")
                        ),
                        log=cleaned_output,
                    )
                except json.JSONDecodeError as e:
                    logger.error(f"JSON parse error: {e}")
                    return AgentFinish(
                        return_values={
                            "output": f"FINAL ANSWER: Error parsing action - {str(e)}"
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

    def _clean_json_string(self, json_str: str) -> str:
        """Minimal but reliable JSON cleaning"""
        # Remove only markdown and basic formatting issues
        json_str = re.sub(r"```(?:json)?(.*?)```", r"\1", json_str, flags=re.DOTALL)
        json_str = json_str.replace("}}", "}").replace("{{", "{")
        return json_str.strip()


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

                    for result in results:
                        # Extract key points using analysis prompt
                        analysis = await self.prompt_executor.execute_analysis_prompt(
                            query=variation,
                            results=[{"content": result.content}],
                            history=[{"query": query}],
                        )

                        all_results.append(
                            {
                                "content": result.content,
                                "score": result.score,
                                "key_points": analysis.get("key_points", []),
                                "source": result.metadata.get("file_path", "Unknown"),
                                "query_variation": variation,
                                "relevance": analysis.get("relevance_score", 0),
                            }
                        )
                        total_score += result.score

                except Exception as e:
                    logger.error(f"Error in search variation {variation}: {str(e)}")
                    continue

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

    async def analyze_results(
        self, search_results: Dict[str, Any], original_query: str
    ) -> AnalysisResult:
        """Analyze search results using analysis prompt"""
        try:
            # Return default result if no results
            if not search_results.get("results"):
                return AnalysisResult(
                    relevance_score=0.0,
                    key_points=[],
                    missing_info=["No results found"],
                    source_reference="",
                    completeness_score=0.0,
                    next_action="clarify",
                )

            # Get analysis from prompt executor
            analysis = await self.prompt_executor.execute_analysis_prompt(
                query=original_query,
                results=search_results["results"],
                history=[{"query": original_query}],
            )

            # Handle empty or invalid analysis
            if not analysis or not isinstance(analysis, dict):
                logger.error(f"Invalid analysis result: {analysis}")
                raise ValueError("Analysis returned invalid result")

            # Extract key information
            source_ref = "; ".join(
                set(r.get("source", "Unknown") for r in search_results["results"])
            )

            return AnalysisResult(
                relevance_score=float(analysis.get("relevance_score", 0.0)),
                key_points=analysis.get("key_points", []),
                missing_info=analysis.get("missing_info", []),
                source_reference=source_ref,
                completeness_score=float(analysis.get("completeness_score", 0.0)),
                next_action=analysis.get("next_action", "clarify"),
            )

        except Exception as e:
            logger.error(f"Analysis error: {str(e)}")
            return AnalysisResult(
                relevance_score=0.0,
                key_points=[],
                missing_info=[f"Error analyzing results: {str(e)}"],
                source_reference="",
                completeness_score=0.0,
                next_action="error",
            )

    async def format_final_answer(
        self, query: str, results: List[Dict], analysis: Dict[str, Any]
    ) -> str:
        """Format final answer based on analysis"""
        try:
            # Prepare metadata for formatting
            metadata = {
                "query": query,
                "sources": [r.get("source") for r in results],
                "key_points": analysis.get("key_points", []),
                "completeness_score": analysis.get("completeness_score", 0),
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
