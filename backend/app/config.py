"""Environment-driven application settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Engineering College Predictor (MH-CET & JEE-Main)"
    DATABASE_URL: str = "sqlite:///./dev.db"

    # Auth
    JWT_SECRET: str = "CHANGE_ME_super_secret_key_min_32_chars_long_please"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Default admin (change in .env before deploying!)
    ADMIN_EMAIL: str = "admin@engpredictor.com"
    ADMIN_PASSWORD: str = "Admin@12345"
    ADMIN_NAME: str = "Administrator"

    FRONTEND_ORIGINS: str = "http://localhost:3000"

    # Unified engineering cutoff dataset (MH-CET + JEE-Main)
    DATASET_PATH: str = "data/engineering_cutoffs.csv.gz"

    # Prediction inclusion window (admin-configurable at runtime)
    # percentile mode: include cutoffs at/below (percentile + upper), and a
    #   small reach band above via the same upper buffer.
    PCT_UPPER_BUFFER: float = 2.0     # percentile points above student
    PCT_LOWER_BUFFER: float = 100.0   # percentile points below student (100 = no lower bound)
    RANK_LOWER_BUFFER: int = 2000     # JEE rank: down to rank - this
    RANK_UPPER_BUFFER: int = 15000    # JEE rank: up to rank + this

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]


settings = Settings()
