from functools import lru_cache
import yaml
from pathlib import Path
from typing import Dict


class PromptManager:
    @lru_cache(maxsize=1)
    def load_prompts(self, file_path="langgraph_prompt.yml") -> Dict[str, str]:
        prompt_path = Path(__file__).parent / "files" / file_path
        with open(prompt_path) as f:
            return yaml.safe_load(f)

    def get_system_prompt(self) -> str:
        prompts = self.load_prompts()
        return prompts["system_prompt"]

    def get_prompt(self, key: str) -> str:
        prompts = self.load_prompts()
        return prompts[key]
