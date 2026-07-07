from app.utils.db_cursor import db_commit, get_cursor


def get_or_create_wallet(db, user_id: int):
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT id, balance, total_credited, total_debited FROM wallet WHERE user_id = %s",
        (user_id,),
    )
    w = cursor.fetchone()
    if not w:
        cursor.execute(
            "INSERT INTO wallet (user_id, balance, total_credited, total_debited) VALUES (%s, 0.00, 0.00, 0.00)",
            (user_id,),
        )
        db_commit(db)
        return {"id": cursor.lastrowid, "balance": 0.0, "total_credited": 0.0, "total_debited": 0.0}
    return {
        "id": w[0],
        "balance": float(w[1]),
        "total_credited": float(w[2]),
        "total_debited": float(w[3]),
    }


def mutate_wallet_balance(db, user_id: int, amount: float, tx_type: str, desc: str, ref_type=None, ref_id=None):
    cursor = get_cursor(db)
    cursor.execute(
        "SELECT id, balance, total_credited, total_debited FROM wallet WHERE user_id = %s FOR UPDATE",
        (user_id,),
    )
    w = cursor.fetchone()
    if not w:
        get_or_create_wallet(db, user_id)
        cursor.execute(
            "SELECT id, balance, total_credited, total_debited FROM wallet WHERE user_id = %s FOR UPDATE",
            (user_id,),
        )
        w = cursor.fetchone()

    wallet_id, balance, total_credited, total_debited = w[0], float(w[1]), float(w[2]), float(w[3])

    if tx_type == "credit":
        new_balance = balance + amount
        total_credited += amount
    elif tx_type == "debit":
        if balance < amount:
            raise ValueError("Insufficient wallet balance.")
        new_balance = balance - amount
        total_debited += amount
    else:
        raise ValueError("Invalid transaction type.")

    cursor.execute(
        "UPDATE wallet SET balance = %s, total_credited = %s, total_debited = %s WHERE id = %s",
        (new_balance, total_credited, total_debited, wallet_id),
    )
    cursor.execute(
        """
        INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, description, reference_type, reference_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (wallet_id, user_id, tx_type, amount, desc, ref_type, ref_id),
    )
    db_commit(db)
    return new_balance


def credit_wallet(db, user_id, amount, desc, ref_type=None, ref_id=None):
    return mutate_wallet_balance(db, user_id, amount, "credit", desc, ref_type, ref_id)


def debit_wallet(db, user_id, amount, desc, ref_type=None, ref_id=None):
    return mutate_wallet_balance(db, user_id, amount, "debit", desc, ref_type, ref_id)


def get_wallet_balance(db, user_id: int):
    wallet = get_or_create_wallet(db, user_id)
    return wallet["balance"]


def get_wallet_transactions(db, user_id: int, page: int = 1, limit: int = 20, type_filter: str = None):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    if type_filter:
        cursor.execute(
            """
            SELECT id, type, amount, description, reference_type, reference_id, created_at
            FROM wallet_transactions WHERE user_id = %s AND type = %s
            ORDER BY id DESC LIMIT %s OFFSET %s
            """,
            (user_id, type_filter, limit, offset),
        )
    else:
        cursor.execute(
            """
            SELECT id, type, amount, description, reference_type, reference_id, created_at
            FROM wallet_transactions WHERE user_id = %s
            ORDER BY id DESC LIMIT %s OFFSET %s
            """,
            (user_id, limit, offset),
        )
    rows = cursor.fetchall()
    return [
        {
            "id": r[0],
            "type": r[1],
            "amount": float(r[2]),
            "description": r[3],
            "reference_type": r[4],
            "reference_id": r[5],
            "created_at": r[6].isoformat() if r[6] else None,
        }
        for r in rows
    ]


def get_all_wallet_transactions(db, page: int = 1, limit: int = 50):
    offset = (page - 1) * limit
    cursor = get_cursor(db)
    cursor.execute(
        """
        SELECT wt.id, wt.user_id, u.name, wt.type, wt.amount, wt.description, wt.created_at
        FROM wallet_transactions wt JOIN users u ON wt.user_id = u.id
        ORDER BY wt.id DESC LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    rows = cursor.fetchall()
    return [
        {
            "id": r[0],
            "user_id": r[1],
            "user_name": r[2],
            "type": r[3],
            "amount": float(r[4]),
            "description": r[5],
            "created_at": r[6].isoformat() if r[6] else None,
        }
        for r in rows
    ]


def get_wallet_analytics(db):
    cursor = get_cursor(db)
    cursor.execute("SELECT SUM(balance), SUM(total_credited), SUM(total_debited) FROM wallet")
    row = cursor.fetchone()
    cursor.execute("SELECT COUNT(id) FROM wallet WHERE balance > 0")
    active_wallets = cursor.fetchone()[0] or 0
    return {
        "total_balance": float(row[0] or 0),
        "total_credited": float(row[1] or 0),
        "total_debited": float(row[2] or 0),
        "active_wallets": active_wallets,
    }
