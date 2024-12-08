from pathlib import Path
from dataclasses import dataclass


@dataclass
class BuildPaths:
    temp_dir: Path
    build_dir: Path
    dist_dir: Path
    env_path: Path
