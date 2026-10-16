from fastapi import HTTPException, status

class EntityNotFoundError(HTTPException):
    def __init__(self, detail: str = "Requested resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

class ForbiddenAccessError(HTTPException):
    def __init__(self, detail: str = "Access forbidden. Ownership or privilege required."):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

class TokenExpiredOrRevokedError(HTTPException):
    def __init__(self, detail: str = "Interview session token has expired or has been revoked."):
        super().__init__(status_code=status.HTTP_410_GONE, detail=detail)

class InvalidFileUploadError(HTTPException, ValueError):
    def __init__(self, detail: str = "Invalid file"):
        HTTPException.__init__(self, status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
        ValueError.__init__(self, detail)

class RateLimitExceededError(HTTPException):
    def __init__(self, detail: str = "Too many requests. Please try again later."):
        super().__init__(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)

class LLMError(Exception):
    """Raised when an LLM provider fails parse, validation, timeout, or rate-limiting."""
    pass
