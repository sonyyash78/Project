from typing import Optional
from pymongo import MongoClient
from pymongo.collection import Collection
from app.utils.config import MONGO_URI

_client: Optional[MongoClient] = None


def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client


def get_payments_collection() -> Collection:
    client = get_mongo_client()
    db = client.get_default_database()
    return db.payments


def get_collection(name: str) -> Collection:
    """Return a named collection from the default MongoDB database."""
    client = get_mongo_client()
    db = client.get_default_database()
    return db[name]
