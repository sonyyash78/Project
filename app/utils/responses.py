from fastapi import status


class ResponseDetail:
    EMAIL_EXISTS = (
        status.HTTP_409_CONFLICT,
        "Email already exists",
    )
    INVALID_CREDENTIALS = (
        status.HTTP_401_UNAUTHORIZED,
        "Invalid email or password",
    )
    NOT_FOUND = (
        status.HTTP_404_NOT_FOUND,
        "Resource not found",
    )
    FORBIDDEN = (
        status.HTTP_403_FORBIDDEN,
        "Access denied",
    )
    BAD_REQUEST = (
        status.HTTP_400_BAD_REQUEST,
        "Bad request",
    )
    DUPLICATE_RESOURCE = (
        status.HTTP_409_CONFLICT,
        "Duplicate resource",
    )
