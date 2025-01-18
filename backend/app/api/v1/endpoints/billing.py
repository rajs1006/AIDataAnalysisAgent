from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime, timedelta
from typing import List, Optional

from app.core.dependencies import get_current_user
from app.models.database.users import User
from app.services.billing.service import BillingService
from app.models.schema.billing import (
    UsageAnalytics,
    ModelPricingCreate,
    ModelPricingUpdate,
    ModelPricingStatusUpdate,
)
from app.models.database.billing import ModelPricing
from app.core.dependencies.service import get_billing_service

router = APIRouter()


# Usage Analytics Endpoints
@router.get(
    "/",
    response_model=UsageAnalytics,
    responses={
        200: {"description": "Successfully retrieved user usage analytics"},
        404: {"description": "User not found"},
        500: {"description": "Internal server error during analytics processing"},
    },
)
async def get_user_usage_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_user),
    billing_service: BillingService = Depends(get_billing_service),
):
    """Get usage analytics for a specific user."""
    return await billing_service.get_usage_analytics(
        user_id=current_user.id, start_date=start_date, end_date=end_date
    )


@router.get(
    "/all",
    response_model=UsageAnalytics,
    responses={
        200: {"description": "Successfully retrieved aggregate usage analytics"},
        500: {"description": "Internal server error during analytics processing"},
    },
)
async def get_aggregate_usage_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    billing_service: BillingService = Depends(get_billing_service),
):
    """Get aggregate usage analytics for all users."""
    return await billing_service.get_usage_analytics(
        start_date=start_date, end_date=end_date
    )


# Model Pricing Management Endpoints
@router.post(
    "/models",
    response_model=ModelPricing,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "Successfully created model pricing"},
        400: {"description": "Invalid request"},
        500: {"description": "Internal server error during pricing creation"},
    },
)
async def create_model_pricing(
    data: ModelPricingCreate,
    billing_service: BillingService = Depends(get_billing_service),
):
    """Create new model pricing configuration."""
    return await billing_service.create_model_pricing(data)


@router.get(
    "/models",
    response_model=List[ModelPricing],
    responses={
        200: {"description": "Successfully retrieved all model pricing configurations"},
        500: {"description": "Internal server error during pricing retrieval"},
    },
)
async def list_model_pricing(
    current_user: User = Depends(get_current_user),
    billing_service: BillingService = Depends(get_billing_service),
):
    """Get list of all model pricing configurations."""
    return await billing_service.pricing_crud.get_active_pricing()


@router.get(
    "/models/{model_id}",
    response_model=ModelPricing,
    responses={
        200: {"description": "Successfully retrieved model pricing"},
        404: {"description": "Model pricing not found"},
        500: {"description": "Internal server error during pricing retrieval"},
    },
)
async def get_model_pricing(
    model_id: str,
    current_user: User = Depends(get_current_user),
    billing_service: BillingService = Depends(get_billing_service),
):
    """Get specific model pricing configuration."""
    pricing = await billing_service.pricing_crud.get_by_id(model_id)
    if not pricing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Model pricing not found"
        )
    return pricing


@router.put(
    "/models/{model_id}",
    response_model=ModelPricing,
    responses={
        200: {"description": "Successfully updated model pricing"},
        404: {"description": "Model pricing not found"},
        500: {"description": "Internal server error during pricing update"},
    },
)
async def update_model_pricing(
    model_id: str,
    data: ModelPricingUpdate,
    current_user: User = Depends(get_current_user),
    billing_service: BillingService = Depends(get_billing_service),
):
    """Update model pricing configuration."""
    return await billing_service.update_model_pricing(model_id, data)


@router.patch(
    "/models/{model_id}/status",
    response_model=ModelPricing,
    responses={
        200: {"description": "Successfully updated model pricing status"},
        404: {"description": "Model pricing not found"},
        500: {"description": "Internal server error during status update"},
    },
)
async def update_model_pricing_status(
    model_id: str,
    data: ModelPricingStatusUpdate,
    current_user: User = Depends(get_current_user),
    billing_service: BillingService = Depends(get_billing_service),
):
    """Update model pricing status."""
    return await billing_service.update_pricing_status(model_id, data)


@router.get(
    "/models/history/{model_name}",
    response_model=List[ModelPricing],
    responses={
        200: {"description": "Successfully retrieved model pricing history"},
        500: {"description": "Internal server error during history retrieval"},
    },
)
async def get_model_pricing_history(
    model_name: str,
    current_user: User = Depends(get_current_user),
    billing_service: BillingService = Depends(get_billing_service),
):
    """Get pricing history for a specific model."""
    return await billing_service.get_pricing_history(model_name)
