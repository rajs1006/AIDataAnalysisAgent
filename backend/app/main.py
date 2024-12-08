# main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models import document_models
from app.core.config import settings
import logging

logger = logging.getLogger(__file__)

app = FastAPI(
    title=settings.APP_NAME,
    description="Connect with you data using AI agents",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def startup_event():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME], document_models=document_models
    )


# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#     # Log the request details
#     logging.info(f"Incoming request: {request.method} {request.url}")
#     body = await request.body()
#     logging.info(f"Request body: {body.decode('utf-8') if body else 'No body'}")

#     # Process the request and get the response
#     response = await call_next(request)

#     # Log the response details
#     logging.info(f"Response status: {response.status_code}")
#     return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG
    )
