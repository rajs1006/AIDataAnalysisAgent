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
    QDRANT_API_KEY: str = "6c683ce4-d5a711efb44f0f9cc1facf92"  # This is a garbage value
    OPENAI_API_KEY: str
    WATCHER_PORT: int = 8001

    # Add new environment variables for document processing agent
    SUMMARY_MODEL_ENDPOINT: str = "https://api.openai.com/v1/chat/completions"
    SUMMARY_MODEL_NAME: str = "gpt-4o-mini"
    SUMMARY_MAX_TOKEN: int = 16384

    ONEDRIVE_CLIENT_ID: str
    ONEDRIVE_CLIENT_SECRET: str
    MICROSOFT_TENANT_ID: str
    ONEDRIVE_REDIRECT_URI: str

    # Email configuration
    EMAIL_FROM: str
    EMAIL_PASSWORD: str
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587

    # Web URL for verification links
    WEB_URL: str = "http://localhost:3000"
    ADMIN_EMAIL: str = "admin@andrual.com"

    # Collaborator settings
    MAX_COLLABORATORS_PER_USER: int = 5
    COLLABORATOR_INVITE_EXPIRY_HOURS: int = 48

    # Google Cloud Storage Configuration
    GOOGLE_APPLICATION_CREDENTIALS: str
    GCS_PROJECT: str = "dataanalysisagent"
    GCS_BUCKET: str = "andrual"
    GCS_MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50 MB default limit

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

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
