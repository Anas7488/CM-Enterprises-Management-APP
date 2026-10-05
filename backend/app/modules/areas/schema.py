from pydantic import BaseModel
from typing import List, Optional


class AreaOut(BaseModel):
    id: int
    name: str
    route_id: int

    class Config:
        from_attributes = True


class RouteOut(BaseModel):
    id: int
    route_number: int
    type: str
    areas: List[AreaOut] = []

    class Config:
        from_attributes = True
