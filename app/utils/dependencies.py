from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.models.user_model import User
from app.utils.jwt_handler import get_current_user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


get_current_admin_user = get_admin_user
