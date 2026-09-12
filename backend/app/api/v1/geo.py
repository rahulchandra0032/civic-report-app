from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.api.v1.deps import get_current_user
from app.services.geo_service import get_nearby_issues, get_heatmap_data

router = APIRouter(prefix="/geo", tags=["Geo Queries"])


@router.get("/nearby")
async def nearby_issues(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: float = Query(1000, ge=100, le=10000),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    issues = await get_nearby_issues(db, lat, lng, radius, limit)
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row[9], row[8]]
                },
                "properties": {
                    "id": str(row[0]),
                    "title": row[1],
                    "category": row[3],
                    "status": row[4],
                    "severity": row[5],
                    "distance_meters": round(row[18], 1) if len(row) > 18 else None
                }
            }
            for row in issues
        ]
    }


@router.get("/heatmap")
async def heatmap(
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_heatmap_data(db, category, status_filter, days)
