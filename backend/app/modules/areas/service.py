from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.modules.areas.model import Route, Area


def get_routes(db: Session) -> List[Route]:
    return db.query(Route).options(joinedload(Route.areas)).order_by(Route.route_number).all()


def get_areas(db: Session, route_id: Optional[int] = None) -> List[Area]:
    query = db.query(Area).options(joinedload(Area.route))
    if route_id:
        query = query.filter(Area.route_id == route_id)
    return query.order_by(Area.name).all()
