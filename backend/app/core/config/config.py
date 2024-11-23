import os
from functools import lru_cache
from typing import Dict, Type
from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, validator


class BaseConfig(BaseSettings):
    APP_NAME: str = "AI Data Agent"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: list
    ENV: str = "development"
    DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    MONGODB_URL: str
    MONGODB_DB_NAME: str = "ai_data_agent"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"
    QDRANT_URL: str

    class Config:
        case_sensitive = True
        env_file = ".env"


class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True


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
