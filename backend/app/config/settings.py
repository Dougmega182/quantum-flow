import os

API_KEY = os.getenv("API_KEY", "change-me")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://quantum:quantum123@db:5432/quantum_flow")
ALLOW_ORIGINS = [o.strip() for o in os.getenv("ALLOW_ORIGINS", "*").split(",")]