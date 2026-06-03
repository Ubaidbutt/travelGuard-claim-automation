from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str  # service role key — bypasses RLS

    # Anthropic
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-6"          # Pass 2 — policy adjudicator
    claude_evidence_model: str = "claude-haiku-4-5-20251001"  # Pass 1 — evidence analyst

    # Pipeline — single source of truth for confidence thresholds.
    # These values are injected into the system prompt template and used
    # by the rule engine post-check, so both stay in sync automatically.
    confidence_approve: float = 0.80
    confidence_reject: float = 0.50
    human_review_threshold: float = 2500.0  # approved amounts above this (EUR) route to manual review

    # Demo protection
    demo_rate_limit: int = 5        # max demo runs per IP per hour
    demo_daily_cap: int = 50        # max total demo runs per day globally

    # App
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
