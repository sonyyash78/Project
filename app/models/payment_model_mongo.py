from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from bson.objectid import ObjectId

from app.database.mongo import get_payments_collection


def _now():
    return datetime.utcnow()


def create_payment(doc: Dict[str, Any]) -> str:
    coll = get_payments_collection()
    doc.setdefault("created_at", _now())
    res = coll.insert_one(doc)
    return str(res.inserted_id)


def get_payment_by_order_id(order_id: str) -> Optional[Dict[str, Any]]:
    coll = get_payments_collection()
    return coll.find_one({"order_id": order_id})


def get_payment_by_payment_id(payment_id: str) -> Optional[Dict[str, Any]]:
    coll = get_payments_collection()
    return coll.find_one({"payment_id": payment_id})


def update_payment_by_order(order_id: str, patch: Dict[str, Any]) -> bool:
    coll = get_payments_collection()
    patch["updated_at"] = _now()
    res = coll.update_one({"order_id": order_id}, {"$set": patch})
    return res.modified_count > 0


def save_webhook_event(event: Dict[str, Any]) -> str:
    coll = get_payments_collection()
    evt = {"webhook_event": event, "received_at": _now()}
    res = coll.insert_one(evt)
    return str(res.inserted_id)


def list_user_payments(user_id: str, page: int = 1, limit: int = 20):
    coll = get_payments_collection()
    skip = (page - 1) * limit
    cursor = coll.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(limit)
    return list(cursor)
