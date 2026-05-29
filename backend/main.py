from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.claims import router as claims_router
from config import settings

app = FastAPI(title="Claims API", version="1.0.0")

# In development allow all localhost origins so any Next.js dev port works.
# In production restrict to the configured frontend URL.
if settings.environment == "development":
    allowed_origins = ["*"]
else:
    allowed_origins = [settings.frontend_url]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=settings.environment != "development",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(claims_router)


@app.get("/health")
def health():
    return {"status": "ok"}
