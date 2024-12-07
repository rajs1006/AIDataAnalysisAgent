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
        """Parse text into agent action/finish"""

        if hasattr(text, "content"):
            cleaned_output = text.content.strip()
        else:
            cleaned_output = text.strip()

        # Check for action block
        if "ACTION:" in cleaned_output:
            try:
                # Extract the action JSON part
                action_part = cleaned_output.split("ACTION:", 1)[1].strip()

                # Clean up common formatting issues
                action_part = action_part.replace("}}", "}")
                action_part = action_part.replace("{{", "{")

                # Parse the JSON
                action_dict = json.loads(action_part)

                # Return both AgentAction and the raw action dict
                return AgentAction(
                    tool=action_dict["type"],
                    tool_input=action_dict.get("query", action_dict.get("answer", "")),
                    log=cleaned_output,
                    raw_action=action_dict,  # Store the raw action
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse action: {e}")
                raise ValueError(f"Could not parse action: {action_part}")

        # Check for final answer
        if "FINAL ANSWER:" in cleaned_output:
            return AgentFinish(
                return_values={
                    "output": cleaned_output.split("FINAL ANSWER:")[-1].strip()
                },
                log=cleaned_output,
            )

        # If we can't parse it as an action or final answer, try to parse the whole text
        try:
            action_dict = json.loads(cleaned_output)
            if "type" in action_dict:
                return AgentAction(
                    tool=action_dict["type"],
                    tool_input=action_dict.get("query", action_dict.get("answer", "")),
                    log=cleaned_output,
                    raw_action=action_dict,
                )
        except:
            raise ValueError(f"Could not parse LLM output: {cleaned_output}")


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


class ReActTools:
    """Enhanced tools with integrated prompt handling"""

    def __init__(self, prompt_executor):
        self.prior_searches = []
        self.relevance_threshold = 0.6
        self.search_utils = SearchUtils()
        self.prompt_executor = prompt_executor

    async def search_documents(
        self,
        query: str,
        search_rag_func: Any,
        user_id: str,
        limit: int = 5,
    ) -> Dict[str, Any]:
        """Execute RAG search with enhanced analysis"""
        try:
            # Process typos and variations
            typo_info = self.search_utils._process_typos(
                query, [s for s in self.prior_searches]
            )
            query_variations = self.search_utils._generate_query_variations(
                query, typo_info
            )

            # Track history
            self.prior_searches.append(query)

            # Execute searches
            all_results = []
            total_score = 0

            for variation in query_variations:
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

            # Deduplicate and sort
            unique_results = self._deduplicate_results(all_results)

            return {
                "results": unique_results,
                "total_results": len(unique_results),
                "average_score": total_score / len(all_results) if all_results else 0,
                "search_query": query,
                "metadata": self.search_utils.format_search_metadata(
                    typo_info, query_variations
                ),
            }

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

    # async def analyze_results(
    #     self, search_results: Dict[str, Any], original_query: str
    # ) -> AnalysisResult:
    #     """Analyze search results using analysis prompt"""
    #     try:
    #         # Get analysis from prompt executor
    #         analysis = await self.prompt_executor.execute_analysis_prompt(
    #             query=original_query,
    #             results=search_results["results"],
    #             history=[{"query": original_query}],
    #         )

    #         # Extract key information
    #         all_content = " ".join([r["content"] for r in search_results["results"]])
    #         source_ref = "; ".join(set(r["source"] for r in search_results["results"]))

    #         return AnalysisResult(
    #             relevance_score=analysis["relevance_score"],
    #             key_points=analysis.get("key_points", []),
    #             missing_info=analysis.get("missing_info", []),
    #             source_reference=source_ref,
    #             completeness_score=analysis.get("completeness_score", 0),
    #             next_action=analysis.get("next_action", "clarify"),
    #         )

    #     except Exception as e:
    #         logger.error(f"Analysis error: {str(e)}")
    #         return AnalysisResult(
    #             relevance_score=0.0,
    #             key_points=[],
    #             missing_info=["Error analyzing results"],
    #             source_reference="",
    #             completeness_score=0.0,
    #             next_action="error",
    #         )

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
