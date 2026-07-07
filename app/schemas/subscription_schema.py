from typing import List, Optional

from pydantic import BaseModel, Field


class SubscribeRequest(BaseModel):
    plan_slug: str
    billing_cycle: str = "monthly"


class CancelRequest(BaseModel):
    reason: Optional[str] = None


class RenewRequest(BaseModel):
    billing_cycle: Optional[str] = None


class PlanFeatureResponse(BaseModel):
    feature_key: str
    feature_name: str
    is_enabled: bool


class PlanResponse(BaseModel):
    id: int
    name: str
    slug: str
    monthly_price: float
    yearly_price: float
    features_json: dict = {}
    features: List[PlanFeatureResponse] = []


class SubscriptionResponse(BaseModel):
    plan_name: str = "FREE"
    plan_slug: str = "free"
    status: str = "active"
    billing_cycle: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_remaining: Optional[int] = None
    auto_renew: bool = False
