import hmac
import hashlib
from typing import Any


def verify_checksum(key_secret: str, order_id: str, payment_id: str, signature: str) -> bool:
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    generated = hmac.new(key_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated, signature or "")


def verify_webhook_signature(key_secret: str, body: Any, signature: str) -> bool:
    # body must be raw string bytes when verifying — caller should pass exact raw body
    if isinstance(body, bytes):
        raw = body
    else:
        raw = str(body).encode("utf-8")
    generated = hmac.new(key_secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated, signature or "")
