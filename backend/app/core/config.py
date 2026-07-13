# import os
# from pathlib import Path

# from pydantic import Field
# from pydantic_settings import BaseSettings


# class Settings(BaseSettings):
#     """Application configuration loaded from `.env`.

#     Uses ``pydantic-settings`` to read environment variables with type safety.
#     """

#     # Core app metadata
#     APP_NAME: str = Field("CM Enterprises", env="APP_NAME")
#     APP_VERSION: str = Field("1.0.0", env="APP_VERSION")
#     DEBUG: bool = Field(False, env="DEBUG")

#     # CORS origins (comma‑separated list)
#     ALLOWED_ORIGINS: str = Field("http://localhost:3000", env="ALLOWED_ORIGINS")

#     # Database URL – required
#     DATABASE_URL: str = Field(..., env="DATABASE_URL")

#     # JWT configuration
#     SECRET_KEY: str = Field(..., env="SECRET_KEY")
#     ALGORITHM: str = Field("HS256", env="ALGORITHM")
#     ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
#     REFRESH_TOKEN_EXPIRE_DAYS: int = Field(7, env="REFRESH_TOKEN_EXPIRE_DAYS")

#     class Config:
#         # Resolve the .env file located at the project root
#         env_file = str(Path(__file__).resolve().parents[3] / ".env")
#         env_file_encoding = "utf-8"
#         case_sensitive = False


# # Export a singleton for easy import throughout the project
# settings = Settings()
#from pydantic_settings import BaseSettings
import os
# from pydantic_settings import BaseSettings
from pydantic import Field
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    APP_NAME: str = "CM Enterprises"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()