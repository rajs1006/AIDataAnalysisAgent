import os
from functools import lru_cache
from typing import Dict, Type
from pydantic_settings import BaseSettings


class BaseConfig(BaseSettings):
    PYTHONPATH: str = "/app"
    APP_NAME: str = "AI Data Agent"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: list
    ENV: str = "development"
    DEBUG: bool = False
    APP_PROTOCOL: str = "http"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_URL: str = f"{APP_PROTOCOL}://{APP_HOST}:{APP_PORT}/{API_V1_STR}"
    MONGODB_URL: str
    MONGODB_DB_NAME: str = "ai_data_agent"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    API_KEY_EXPIRE_MINUTES: int = 43200
    ALGORITHM: str = "EdDSA"
    API_ALGORITHM: str = "HS256"
    QDRANT_URL: str
    QDRANT_API_KEY: str = "6c683ce4-d5a711efb44f0f9cc1facf92" # This is a garbage value
    OPENAI_API_KEY: str
    WATCHER_PORT: int = 8001

    ONEDRIVE_CLIENT_ID: str
    ONEDRIVE_CLIENT_SECRET: str
    MICROSOFT_TENANT_ID: str
    ONEDRIVE_REDIRECT_URI: str

    class Config:
        case_sensitive = True
        env_file = ".env"


class DevelopmentConfig(BaseConfig):
    DEBUG: bool = False


class ProductionConfig(BaseConfig):
    DEBUG: bool = False


class TestingConfig(BaseConfig):
    DEBUG: bool = True
    TESTING: bool = True


@lru_cache()
def get_settings() -> BaseConfig:
    configs: Dict[str, Type[BaseConfig]] = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }
    env = os.getenv("ENV", "development")
    config_class = configs[env]
    return config_class()


settings = get_settings()
