from app.core.logging_config import get_logger
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from beanie import PydanticObjectId
from app.models.database.users import User
from app.models.database.conversation import Message
from app.models.database.billing import ModelPricing



logger = get_logger(__name__)
class ModelPricingCRUD:
    @staticmethod
    async def create(data: dict) -> ModelPricing:
        pricing = ModelPricing(**data)
        await pricing.insert()
        return pricing

    @staticmethod
    async def get_by_id(pricing_id: str) -> Optional[ModelPricing]:
        return await ModelPricing.get(PydanticObjectId(pricing_id))

    @staticmethod
    async def get_active_pricing(
        model_name: Optional[str] = None,
    ) -> List[ModelPricing]:
        query = {"status": "active"}
        if model_name:
            query["model_name"] = model_name
        return await ModelPricing.find(query).to_list()

    @staticmethod
    async def update(pricing_id: str, data: dict) -> Optional[ModelPricing]:
        pricing = await ModelPricing.get(PydanticObjectId(pricing_id))
        if not pricing:
            return None

        data["updated_at"] = datetime.utcnow()
        await pricing.update({"$set": data})
        return await ModelPricing.get(PydanticObjectId(pricing_id))

    @staticmethod
    async def get_pricing_history(model_name: str) -> List[ModelPricing]:
        return (
            await ModelPricing.find({"model_name": model_name})
            .sort(-ModelPricing.effective_date)
            .to_list()
        )


class BillingCRUD:
    @staticmethod
    async def get_user_usage(
        user_id: str, start_date: datetime, end_date: datetime
    ) -> List[Dict]:
        pipeline = [
            {
                "$match": {
                    "user_id": str(user_id),
                    "created_at": {"$gte": start_date, "$lte": end_date},
                }
            },
            {
                "$project": {
                    "created_at": 1,
                    "metadata.usage_metrics": 1,
                    "metadata.usage_metrics.model": 1,
                }
            },
            {"$sort": {"created_at": 1}},
        ]

        return await Message.aggregate(pipeline).to_list()

    @staticmethod
    async def get_aggregate_usage(
        start_date: datetime, end_date: datetime
    ) -> List[Dict]:
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date, "$lte": end_date}}},
            {
                "$group": {
                    "_id": {
                        "hour": {
                            "$dateToString": {
                                "format": "%Y-%m-%d-%H",
                                "date": "$created_at",
                            }
                        },
                        "model": {
                            "$ifNull": [
                                "$metadata.usage_metrics.model",
                                "unknown",
                            ]  # Group null models as "unknown"
                        },
                    },
                    "prompt_tokens": {
                        "$sum": {
                            "$ifNull": ["$metadata.usage_metrics.prompt_tokens", 0]
                        }
                    },
                    "completion_tokens": {
                        "$sum": {
                            "$ifNull": ["$metadata.usage_metrics.completion_tokens", 0]
                        }
                    },
                    "total_tokens": {
                        "$sum": {"$ifNull": ["$metadata.usage_metrics.total_tokens", 0]}
                    },
                    "request_count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.hour": 1}},
        ]

        return await Message.aggregate(pipeline).to_list()

    @staticmethod
    async def get_hourly_usage(user_id: Optional[str], date: datetime) -> List[Dict]:
        match_stage = {"created_at": {"$gte": date, "$lt": date + timedelta(days=1)}}
        if user_id:
            match_stage["user_id"] = str(user_id)

        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": {
                        "hour": {"$hour": "$created_at"},
                        "model": {
                            "$ifNull": [
                                "$metadata.usage_metrics.model",
                                "unknown",
                            ]  # Group null models as "unknown"
                        },
                    },
                    "prompt_tokens": {
                        "$sum": {
                            "$ifNull": ["$metadata.usage_metrics.prompt_tokens", 0]
                        }
                    },
                    "completion_tokens": {
                        "$sum": {
                            "$ifNull": ["$metadata.usage_metrics.completion_tokens", 0]
                        }
                    },
                    "total_tokens": {
                        "$sum": {"$ifNull": ["$metadata.usage_metrics.total_tokens", 0]}
                    },
                    "request_count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.hour": 1}},
        ]

        return await Message.aggregate(pipeline).to_list()

    @staticmethod
    async def get_daily_usage(
        user_id: Optional[str], start_date: datetime, end_date: datetime
    ) -> List[Dict]:
        match_stage = {"created_at": {"$gte": start_date, "$lte": end_date}}
        if user_id:
            match_stage["user_id"] = str(user_id)

        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": {
                        "date": {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$created_at",
                            }
                        },
                        "model": {
                            "$ifNull": [
                                "$metadata.usage_metrics.model",
                                "unknown",
                            ]  # Group null models as "unknown"
                        },
                    },
                    "prompt_tokens": {
                        "$sum": {
                            "$ifNull": ["$metadata.usage_metrics.prompt_tokens", 0]
                        }
                    },
                    "completion_tokens": {
                        "$sum": {
                            "$ifNull": ["$metadata.usage_metrics.completion_tokens", 0]
                        }
                    },
                    "total_tokens": {
                        "$sum": {"$ifNull": ["$metadata.usage_metrics.total_tokens", 0]}
                    },
                    "request_count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.date": 1}},
        ]

        message_data = await Message.aggregate(pipeline).to_list()
        
        return message_data

    @staticmethod
    async def get_monthly_usage(
        user_id: Optional[str],
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict]:
        start_date = datetime(start_date.year, start_date.month or 1, 1)
        end_date = (
            datetime(end_date.year, end_date.month + 1, 1)
            if end_date.month < 12
            else datetime(end_date.year + 1, 1, 1)
        )

        match_stage = {"created_at": {"$gte": start_date, "$lt": end_date}}
        if user_id:
            match_stage["user_id"] = str(user_id)

        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": {
                        "month": {
                            "$dateToString": {"format": "%Y-%m", "date": "$created_at"}
                        },
                        "model": {
                            "$ifNull": [
                                "$metadata.usage_metrics.model",
                                "unknown",
                            ]  # Group null models as "unknown"
                        },
                    },
                    "prompt_tokens": {
                        "$sum": {
                            "$ifNull": ["$metadata.usage_metrics.prompt_tokens", 0]
                        }
                    },
                    "completion_tokens": {
                        "$sum": {
                            "$ifNull": ["$metadata.usage_metrics.completion_tokens", 0]
                        }
                    },
                    "total_tokens": {
                        "$sum": {"$ifNull": ["$metadata.usage_metrics.total_tokens", 0]}
                    },
                    "request_count": {"$sum": 1},
                }
            },
            {"$sort": {"_id.month": 1}},
        ]

        return await Message.aggregate(pipeline).to_list()
