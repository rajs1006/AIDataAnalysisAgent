from app.agents import ReActAgent


async def get_react_agent() -> ReActAgent:
    """Get ReActAgent instance."""
    return ReActAgent()
