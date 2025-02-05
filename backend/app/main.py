from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models import document_models
from app.core.config import settings
from app.core.logging_config import get_logger, log_method_call
from app.core.files.blob_storage import BlobStorage

# Initialize structured logger
logger = get_logger("application")

app = FastAPI(
    title=settings.APP_NAME,
    description="Connect with your data using AI agents",
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
@log_method_call()
async def startup_event():
    """
    Application startup event handler.
    Initializes database connection, blob storage, and logs startup information.
    """
    try:
        # Log application startup
        logger.info(
            "Application starting", 
            app_name=settings.APP_NAME, 
            version="1.0.0"
        )

        # Initialize database connection
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        await init_beanie(
            database=client[settings.MONGODB_DB_NAME], 
            document_models=document_models
        )

        logger.info(
            "Database connection established", 
            database=settings.MONGODB_DB_NAME
        )

        # Initialize blob storage
        await BlobStorage.initialize_storage()
        logger.info("Blob storage initialized")

    except Exception as e:
        logger.error(
            "Failed to start application", 
            error=str(e)
        )
        raise


@app.middleware("http")
@log_method_call()
async def log_requests(request: Request, call_next):
    """
    Middleware to log incoming requests and outgoing responses.
    
    Args:
        request (Request): Incoming HTTP request
        call_next (Callable): Next middleware or request handler
    
    Returns:
        Response: HTTP response
    """
    # Log request details
    logger.info(
        "Incoming request", 
        method=request.method, 
        url=str(request.url),
        client_host=request.client.host
    )

    # Process the request
    response = await call_next(request)

    # Log response details
    logger.info(
        "Request processed", 
        method=request.method, 
        url=str(request.url), 
        status_code=response.status_code
    )

    return response


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.DEBUG,
    )
