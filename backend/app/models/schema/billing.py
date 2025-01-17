from datetime import datetime
from typing import Optional, Dict, List
from beanie import Document, Indexed
from pydantic import BaseModel, Field


class ModelPricingCreate(BaseModel):
    model_name: str
    prompt_token_cost: float
    completion_token_cost: float
    description: Optional[str] = None


class ModelPricingUpdate(BaseModel):
    prompt_token_cost: Optional[float] = None
    completion_token_cost: Optional[float] = None
    description: Optional[str] = None


class ModelPricingStatusUpdate(BaseModel):
    status: str


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class CostBreakdown(BaseModel):
    prompt_cost: float = 0.0
    completion_cost: float = 0.0
    total_cost: float = 0.0


class ModelUsage(BaseModel):
    requests: int = 0
    tokens: int = 0
    cost: float = 0.0


class TimeSeriesEntry(BaseModel):
    timestamp: datetime
    total_tokens: TokenUsage
    cost: CostBreakdown
    models_used: Dict[str, ModelUsage]


class DailyUsage(BaseModel):
    date: str
    total_tokens: TokenUsage
    cost: CostBreakdown
    models_used: Dict[str, ModelUsage]


class MonthlyUsage(BaseModel):
    month: str
    total_tokens: TokenUsage
    cost: CostBreakdown
    models_used: Dict[str, ModelUsage]


class OverallStats(BaseModel):
    total_tokens: int
    total_cost: float
    average_tokens_per_request: float
    total_requests: int


class TimeSeriesData(BaseModel):
    hourly: List[TimeSeriesEntry]
    daily: List[DailyUsage]
    monthly: List[MonthlyUsage]


class UsageAnalytics(BaseModel):
    overall_stats: OverallStats
    time_series_data: TimeSeriesData
