from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Civic Issue Reporting System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/civic_reports"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/civic_reports"

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60 * 24 * 7  # 7 days

    # OTP
    OTP_EXPIRY_MINUTES: int = 5
    OTP_LENGTH: int = 6

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # SLA Thresholds (hours)
    SLA_CRITICAL: int = 24
    SLA_HIGH: int = 48
    SLA_MEDIUM: int = 72
    SLA_LOW: int = 120

    # AI Service
    AI_SERVICE_URL: str = "http://localhost:8001"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
