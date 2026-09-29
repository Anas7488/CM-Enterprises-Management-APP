from fastapi import HTTPException, status

def not_found(detail: str = "Not found"):
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

def unauthorized(detail: str = "Unauthorized"):
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)

def forbidden(detail: str = "Forbidden"):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

def bad_request(detail: str = "Bad request"):
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

def conflict(detail: str = "Already exists"):
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)