from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.dependencies import get_db, get_current_user
from app.modules.areas.schema import RouteOut, AreaOut
from app.modules.areas import service

router = APIRouter()


@router.get("/routes", response_model=List[RouteOut])
def list_routes(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all routes with their child areas."""
    return service.get_routes(db)


@router.get("/", response_model=List[AreaOut])
def list_areas(
    route_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """List all areas, optionally filtered by route_id."""
    return service.get_areas(db, route_id=route_id)
