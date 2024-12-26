from typing import List, Dict, Any, Optional
from haystack.components.retrievers import (
    InMemoryBM25Retriever,
    InMemoryEmbeddingRetriever,
)
from haystack.dataclasses import Document
from haystack.components.generators import OpenAIGenerator
from haystack.components.preprocessors import DocumentSplitter
import logging
from datetime import datetime
import json
from pydantic import BaseModel

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

logger = logging.getLogger(__name__)


class HaystackAgent:
    def __init__(self):
        # Initialize OpenAI Generator
        self.generator = OpenAIGenerator(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            generation_kwargs={"max_tokens": 1500},
        )

        self.vision_generator = OpenAIGenerator(
            model="gpt-4o-mini",
            api_key=settings.OPENAI_API_KEY,
            generation_kwargs={"max_tokens": 1500},
        )

        # Initialize Document Splitter
        self.splitter = DocumentSplitter(
            split_by="word", split_length=500, split_overlap=50
        )

        # Initialize Retrievers
        self.bm25_retriever = InMemoryBM25Retriever()
        self.embedding_retriever = InMemoryEmbeddingRetriever(
            model="BAAI/bge-small-en", embedding_dim=384
        )

        # Initialize state
        self.state = ReActState()

        # Store documents in memory
        self.documents = []

    async def _process_documents(self, documents: List[Document]) -> List[Document]:
        """Process documents through the splitter"""
        # Convert to format expected by splitter
        docs_dict = [{"content": doc.content, "meta": doc.meta} for doc in documents]
        split_docs = await self.splitter.run(documents=docs_dict)
        return [Document.from_dict(doc) for doc in split_docs["documents"]]

    async def _run_retrieval(self, query: str) -> List[Document]:
        """Run both retrievers and merge results"""
        # Run BM25 retrieval
        bm25_results = await self.bm25_retriever.run(
            query=query, documents=self.documents, top_k=3
        )

        # Run embedding retrieval
        embedding_results = await self.embedding_retriever.run(
            query=query, documents=self.documents, top_k=3
        )

        # Merge and deduplicate results
        all_docs = {}
        for doc in bm25_results["documents"] + embedding_results["documents"]:
            if doc.id not in all_docs:
                all_docs[doc.id] = doc

        return list(all_docs.values())

    async def generate_response(
        self,
        user_id: str,
        contexts: List[SearchContext],
        query_params: QueryRequest,
        rag_functions: Dict,
        conversation_history: List[Dict],
    ) -> str:
        """Generate response using Haystack components"""
        try:
            # Convert contexts to Haystack Documents
            if contexts:
                docs = [
                    Document(content=ctx.content, meta=ctx.metadata) for ctx in contexts
                ]
                processed_docs = await self._process_documents(docs)
                self.documents.extend(processed_docs)

            # Update state
            self.state.chat_history.extend(conversation_history)

            # Retrieve relevant documents
            retrieved_docs = await self._run_retrieval(query_params.query)

            # Format context and history
            context_str = "\n".join([doc.content for doc in retrieved_docs])
            history_str = json.dumps(
                [
                    {"role": msg["role"], "content": msg["content"]}
                    for msg in conversation_history[-5:]
                ]
            )

            # Generate response
            prompt = f"""
            Given the following context and conversation history, answer the question.
            Context: {context_str}
            History: {history_str}
            Question: {query_params.query}
            Answer:
            """

            response = await self.generator.run(prompt=prompt)
            return response["replies"][0] if response["replies"] else ""

        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return f"An error occurred: {str(e)}"

    async def process_image(self, image_data: str, ocr_text: str) -> Dict:
        """Process image using vision capabilities"""
        try:
            prompt = f"""
            Analyze the following image and OCR text.
            OCR Text: {ocr_text}
            Describe what you see and extract key information.
            """

            vision_result = await self.vision_generator.run(
                prompt=prompt, images=[image_data]
            )

            return json.loads(vision_result["replies"][0])

        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            return None

    async def summarize_conversation(
        self, conversation_history: List[Dict[str, str]], summary_type: str = "concise"
    ) -> Dict:
        """Summarize conversation"""
        try:
            # Format conversation
            conversation_str = "\n".join(
                [f"{msg['role']}: {msg['content']}" for msg in conversation_history]
            )

            # Generate summary
            summary_prompt = f"""
            Generate a {summary_type} summary of this conversation:
            {conversation_str}
            
            Include key points and important details.
            """

            summary_result = await self.generator.run(prompt=summary_prompt)
            summary = summary_result["replies"][0]

            # Extract key points
            key_points_prompt = f"Extract 3-5 key points from this summary:\n{summary}"
            key_points_result = await self.generator.run(prompt=key_points_prompt)
            key_points = key_points_result["replies"][0].split("\n")

            return {
                "summary": summary,
                "key_points": key_points,
                "metadata": {
                    "type": summary_type,
                    "message_count": len(conversation_history),
                    "generated_at": datetime.utcnow().isoformat(),
                },
            }

        except Exception as e:
            logger.error(f"Error summarizing conversation: {str(e)}")
            return None
