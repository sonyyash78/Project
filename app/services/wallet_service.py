from app.models import wallet_model


def get_wallet_details(db, user_id: int):
    wallet = wallet_model.get_or_create_wallet(db, user_id)
    transactions = wallet_model.get_wallet_transactions(db, user_id, page=1, limit=10)
    return {**wallet, "recent_transactions": transactions}


def credit(db, user_id: int, amount: float, source: str, ref_id=None):
    return wallet_model.credit_wallet(db, user_id, amount, source, "admin_credit", ref_id)


def debit(db, user_id: int, amount: float, purpose: str, ref_id=None):
    return wallet_model.debit_wallet(db, user_id, amount, purpose, "admin_debit", ref_id)


def get_transactions(db, user_id: int, page: int = 1, limit: int = 20, type_filter: str = None):
    items = wallet_model.get_wallet_transactions(db, user_id, page, limit, type_filter)
    balance = wallet_model.get_wallet_balance(db, user_id)
    return {"balance": balance, "transactions": items, "page": page, "limit": limit}
