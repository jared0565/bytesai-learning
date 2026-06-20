"""Graphite configuration defaults and environment overrides."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class Config:
    """Immutable runtime configuration."""

    output_dir: Path = Path("graph-out")
    cache_dir: Path = Path(".cache/graphite")
    cache_version: str = "v1"
    workers: int = 4
    max_file_size: int = 1_000_000  # bytes
    max_files: int | None = None
    include_dotfiles: bool = False
    llm_mode: str = "none"  # none | local | cloud
    llm_provider: str = "ollama"
    llm_model: str | None = None
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    seed: int = 42
    verbose: bool = False

    def to_dict(self) -> dict[str, Any]:
        from dataclasses import asdict
        return asdict(self)

    @classmethod
    def from_env(cls, overrides: dict[str, str] | None = None) -> "Config":
        """Build config from environment variables and CLI overrides."""
        env = {k.lower(): v for k, v in os.environ.items() if k.upper().startswith("GRAPHITE_")}
        if overrides:
            env.update({k.lower(): v for k, v in overrides.items()})

        def _path(key: str, default: Path) -> Path:
            return Path(env[key]) if key in env else default

        def _int(key: str, default: int) -> int:
            return int(env[key]) if key in env and env[key].isdigit() else default

        def _opt_int(key: str, default: int | None) -> int | None:
            if key in env and env[key].isdigit():
                return int(env[key])
            return default

        def _bool(key: str, default: bool) -> bool:
            return env.get(key, str(default).lower()).lower() in ("1", "true", "yes", "on")

        return cls(
            output_dir=_path("graphite_output_dir", Path("graph-out")),
            cache_dir=_path("graphite_cache_dir", Path(".cache/graphite")),
            cache_version=env.get("graphite_cache_version", "v1"),
            workers=_int("graphite_workers", 4),
            max_file_size=_int("graphite_max_file_size", 1_000_000),
            max_files=_opt_int("graphite_max_files", None),
            include_dotfiles=_bool("graphite_include_dotfiles", False),
            llm_mode=env.get("graphite_llm", "none"),
            llm_provider=env.get("graphite_llm_provider", "ollama"),
            llm_model=env.get("graphite_llm_model"),
            llm_base_url=env.get("graphite_llm_base_url"),
            llm_api_key=env.get("graphite_llm_api_key"),
            seed=_int("graphite_seed", 42),
            verbose=_bool("graphite_verbose", False),
        )
