import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Dict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # API key for Google Gemini (supports loading from GEMINI_API_KEY environment variable)
    gemini_api_key: str = Field(default="", validation_alias="gemini_api_key")
    project_name: str = "FounderOS"
    environment: str = "development"
    
    # Configurable advisor weights
    advisor_weights: Dict[str, float] = Field(
        default={
            "CEO": 0.25,
            "CTO": 0.25,
            "Investor": 0.25,
            "Product Manager": 0.25,
            "Marketing Strategist": 0.10,
            "Legal Advisor": 0.10,
            "Finance Advisor": 0.10,
            "Security Architect": 0.10,
            "UX Advisor": 0.10,
            "Competition Analyst": 0.10
        }
    )

    @property
    def get_api_key(self) -> str:
        # Fallback to direct os.environ if pydantic didn't pick it up or if it was empty
        return self.gemini_api_key or os.getenv("GEMINI_API_KEY", "")

settings = Settings()
