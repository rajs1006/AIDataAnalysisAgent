from app.agents.haystack.pipeline import HaystackRAGPipeline
from app.agents.haystack.config import HybridPipelineConfig
from app.agents.langchain.pipeline import EnhancedRAGPipeline


async def get_rag_pipeline() -> HaystackRAGPipeline:
    return HaystackRAGPipeline(
        config=HybridPipelineConfig(),
    )
