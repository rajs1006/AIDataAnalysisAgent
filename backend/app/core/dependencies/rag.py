from app.agents.haystack_agent.pipeline import HaystackRAGPipeline
from app.agents.haystack_agent.config import HybridPipelineConfig


async def get_rag_pipeline() -> HaystackRAGPipeline:
    return HaystackRAGPipeline(
        config=HybridPipelineConfig(),
    )
