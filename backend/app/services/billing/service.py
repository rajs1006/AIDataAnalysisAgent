from app.core.logging_config import get_logger
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from fastapi import HTTPException, status

from app.crud.billing import BillingCRUD, ModelPricingCRUD
from app.models.schema.billing import (
    UsageAnalytics,
    OverallStats,
    TimeSeriesData,
    TimeSeriesEntry,
    DailyUsage,
    MonthlyUsage,
    TokenUsage,
    CostBreakdown,
    ModelUsage,
    ModelPricingCreate,
    ModelPricingUpdate,
    ModelPricingStatusUpdate,
)
from app.models.database.billing import ModelPricing


logger = get_logger(__name__)


class BillingService:
    def __init__(self, billing_crud: BillingCRUD, model_pricing_crud: ModelPricingCRUD):
        self.crud = billing_crud
        self.pricing_crud = model_pricing_crud

    async def get_usage_analytics(
        self,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> UsageAnalytics:
        """Get usage analytics for a user or all users"""
        try:
            # Set default date range if not provided
            end_date = end_date or datetime.utcnow()
            start_date = start_date or (end_date - timedelta(days=30))
            # Get model pricing for calculations
            model_pricing = {
                model.model_name: model
                for model in await self.pricing_crud.get_active_pricing()
            }

            # Get usage data
            hourly_data = await self._get_hourly_analytics(
                user_id, end_date, model_pricing
            )
            daily_data = await self._get_daily_analytics(
                user_id, start_date, end_date, model_pricing
            )
            monthly_data = await self._get_monthly_analytics(
                user_id, start_date, end_date, model_pricing
            )

            # Calculate overall stats
            overall_stats = self._calculate_overall_stats(daily_data)

            return UsageAnalytics(
                overall_stats=overall_stats,
                time_series_data=TimeSeriesData(
                    hourly=hourly_data, daily=daily_data, monthly=monthly_data
                ),
            )

        except Exception as e:
            logger.exception("Error getting usage analytics", e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get usage analytics: {str(e)}",
            )

    async def create_model_pricing(self, data: ModelPricingCreate) -> ModelPricing:
        """Create new model pricing"""
        try:
            # Check if active pricing exists for this model
            existing = await self.pricing_crud.get_active_pricing(data.model_name)
            if existing:
                # Deactivate existing pricing
                for pricing in existing:
                    await self.pricing_crud.update(
                        str(pricing.id), {"status": "inactive"}
                    )

            # Create new pricing
            return await self.pricing_crud.create(data.dict())
        except Exception as e:
            logger.error(
                "Error creating model pricing: {str(e)}",
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create model pricing: {str(e)}",
            )

    async def update_model_pricing(
        self, pricing_id: str, data: ModelPricingUpdate
    ) -> ModelPricing:
        """Update model pricing"""
        try:
            updated = await self.pricing_crud.update(
                pricing_id, data.dict(exclude_unset=True)
            )
            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Model pricing not found",
                )
            return updated
        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                "Error updating model pricing: {str(e)}",
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update model pricing: {str(e)}",
            )

    async def update_pricing_status(
        self, pricing_id: str, data: ModelPricingStatusUpdate
    ) -> ModelPricing:
        """Update model pricing status"""
        try:
            updated = await self.pricing_crud.update(
                pricing_id, {"status": data.status}
            )
            if not updated:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Model pricing not found",
                )
            return updated
        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                "Error updating model pricing status: {str(e)}",
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update model pricing status: {str(e)}",
            )

    async def get_pricing_history(self, model_name: str) -> List[ModelPricing]:
        """Get pricing history for a model"""
        try:
            return await self.pricing_crud.get_pricing_history(model_name)
        except Exception as e:
            logger.error(
                "Error getting pricing history: {str(e)}",
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get pricing history: {str(e)}",
            )

    async def _get_hourly_analytics(
        self,
        user_id: Optional[str],
        date: datetime,
        model_pricing: Dict[str, ModelPricing],
    ) -> List[TimeSeriesEntry]:
        """Get hourly usage analytics"""
        hourly_usage = await self.crud.get_hourly_usage(user_id, date)
        hourly_entries = []

        for hour in range(24):
            hour_data = [
                usage for usage in hourly_usage if usage["_id"]["hour"] == hour
            ]

            entry = self._create_time_series_entry(
                timestamp=datetime(date.year, date.month, date.day, hour),
                usage_data=hour_data,
                model_pricing=model_pricing,
            )
            hourly_entries.append(entry)

        return hourly_entries

    async def _get_daily_analytics(
        self,
        user_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
        model_pricing: Dict[str, ModelPricing],
    ) -> List[DailyUsage]:
        """Get daily usage analytics"""
        daily_usage = await self.crud.get_daily_usage(user_id, start_date, end_date)
        daily_entries = []

        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            day_data = [
                usage for usage in daily_usage if usage["_id"]["date"] == date_str
            ]

            entry = self._create_daily_entry(
                date=date_str, usage_data=day_data, model_pricing=model_pricing
            )
            daily_entries.append(entry)
            current_date += timedelta(days=1)

        return daily_entries

    async def _get_monthly_analytics(
        self,
        user_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
        model_pricing: Dict[str, ModelPricing],
    ) -> List[MonthlyUsage]:
        """Get monthly usage analytics"""
        monthly_usage = await self.crud.get_monthly_usage(user_id, start_date, end_date)
        monthly_entries = []

        for usage_data in monthly_usage:
            entry = self._create_monthly_entry(
                month=usage_data["_id"]["month"],
                usage_data=[usage_data],
                model_pricing=model_pricing,
            )
            monthly_entries.append(entry)

        return monthly_entries

    def _calculate_overall_stats(self, daily_data: List[DailyUsage]) -> OverallStats:
        """Calculate overall statistics from daily data"""
        total_tokens = 0
        total_cost = 0.0
        total_requests = 0

        for day in daily_data:
            total_tokens += day.total_tokens.total_tokens
            total_cost += day.cost.total_cost
            for model_usage in day.models_used.values():
                total_requests += model_usage.requests

        return OverallStats(
            total_tokens=total_tokens,
            total_cost=total_cost,
            average_tokens_per_request=(
                total_tokens / total_requests if total_requests > 0 else 0
            ),
            total_requests=total_requests,
        )

    def _create_time_series_entry(
        self,
        timestamp: datetime,
        usage_data: List[Dict],
        model_pricing: Dict[str, ModelPricing],
    ) -> TimeSeriesEntry:
        """Create a time series entry from usage data"""
        token_usage = TokenUsage()
        cost_breakdown = CostBreakdown()
        models_used = {}

        for usage in usage_data:
            model_name = usage["_id"]["model"]
            pricing = model_pricing.get(model_name)
            if not pricing:
                continue

            # Update token counts
            token_usage.prompt_tokens += usage["prompt_tokens"]
            token_usage.completion_tokens += usage["completion_tokens"]
            token_usage.total_tokens += usage["total_tokens"]

            # Calculate costs
            prompt_cost = usage["prompt_tokens"] * pricing.prompt_token_cost
            completion_cost = usage["completion_tokens"] * pricing.completion_token_cost
            total_cost = prompt_cost + completion_cost

            # Update cost breakdown
            cost_breakdown.prompt_cost += prompt_cost
            cost_breakdown.completion_cost += completion_cost
            cost_breakdown.total_cost += total_cost

            # Update model usage
            if model_name not in models_used:
                models_used[model_name] = ModelUsage()
            models_used[model_name].requests += usage["request_count"]
            models_used[model_name].tokens += usage["total_tokens"]
            models_used[model_name].cost += total_cost

        return TimeSeriesEntry(
            timestamp=timestamp,
            total_tokens=token_usage,
            cost=cost_breakdown,
            models_used=models_used,
        )

    def _create_daily_entry(
        self, date: str, usage_data: List[Dict], model_pricing: Dict[str, ModelPricing]
    ) -> DailyUsage:
        """Create a daily usage entry from usage data"""
        token_usage = TokenUsage()
        cost_breakdown = CostBreakdown()
        models_used = {}

        for usage in usage_data:
            model_name = usage["_id"]["model"]
            pricing = model_pricing.get(model_name)
            if not pricing:
                continue

            # Update token counts
            token_usage.prompt_tokens += usage["prompt_tokens"]
            token_usage.completion_tokens += usage["completion_tokens"]
            token_usage.total_tokens += usage["total_tokens"]

            # Calculate costs
            prompt_cost = usage["prompt_tokens"] * pricing.prompt_token_cost
            completion_cost = usage["completion_tokens"] * pricing.completion_token_cost
            total_cost = prompt_cost + completion_cost

            # Update cost breakdown
            cost_breakdown.prompt_cost += prompt_cost
            cost_breakdown.completion_cost += completion_cost
            cost_breakdown.total_cost += total_cost

            # Update model usage
            if model_name not in models_used:
                models_used[model_name] = ModelUsage()
            models_used[model_name].requests += usage["request_count"]
            models_used[model_name].tokens += usage["total_tokens"]
            models_used[model_name].cost += total_cost

        return DailyUsage(
            date=date,
            total_tokens=token_usage,
            cost=cost_breakdown,
            models_used=models_used,
        )

    def _create_monthly_entry(
        self, month: str, usage_data: List[Dict], model_pricing: Dict[str, ModelPricing]
    ) -> MonthlyUsage:
        """Create a monthly usage entry from usage data"""
        token_usage = TokenUsage()
        cost_breakdown = CostBreakdown()
        models_used = {}

        for usage in usage_data:
            model_name = usage["_id"]["model"]
            pricing = model_pricing.get(model_name)
            if not pricing:
                continue

            # Update token counts
            token_usage.prompt_tokens += usage["prompt_tokens"]
            token_usage.completion_tokens += usage["completion_tokens"]
            token_usage.total_tokens += usage["total_tokens"]

            # Calculate costs
            prompt_cost = usage["prompt_tokens"] * pricing.prompt_token_cost
            completion_cost = usage["completion_tokens"] * pricing.completion_token_cost
            total_cost = prompt_cost + completion_cost

            # Update cost breakdown
            cost_breakdown.prompt_cost += prompt_cost
            cost_breakdown.completion_cost += completion_cost
            cost_breakdown.total_cost += total_cost

            # Update model usage
            if model_name not in models_used:
                models_used[model_name] = ModelUsage()
            models_used[model_name].requests += usage["request_count"]
            models_used[model_name].tokens += usage["total_tokens"]
            models_used[model_name].cost += total_cost

        return MonthlyUsage(
            month=month,
            total_tokens=token_usage,
            cost=cost_breakdown,
            models_used=models_used,
        )
