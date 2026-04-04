from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Database ───────────────────────────────────────────────────────────────
    database_url: str

    # ── Supabase ───────────────────────────────────────────────────────────────
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # ── AI ────────────────────────────────────────────────────────────────────
    google_api_key: str

    # ── Ingestion ─────────────────────────────────────────────────────────────
    rapidapi_key: str

    # ── Server ────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
