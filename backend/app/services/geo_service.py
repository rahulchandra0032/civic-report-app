from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from shapely.geometry import shape, mapping
import json


async def get_ward_for_point(db: AsyncSession, lat: float, lng: float) -> Optional[int]:
    query = text("""
        SELECT id FROM wards
        WHERE ST_Contains(
            boundary,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
        )
        LIMIT 1
    """)
    result = await db.execute(query, {"lat": lat, "lng": lng})
    row = result.fetchone()
    return row[0] if row else None


async def get_nearby_issues(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_meters: float = 1000,
    limit: int = 50
):
    query = text("""
        SELECT
            id, title, description, category, status, severity,
            severity_score, image_url_before, latitude, longitude,
            address, ward_id, reporter_id, upvotes, ai_confidence,
            created_at, updated_at,
            ST_Distance(
                location::geography,
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            ) AS distance_meters
        FROM issues
        WHERE ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            :radius
        )
        ORDER BY distance_meters ASC
        LIMIT :limit
    """)
    result = await db.execute(query, {
        "lat": lat, "lng": lng,
        "radius": radius_meters, "limit": limit
    })
    return result.fetchall()


async def get_heatmap_data(
    db: AsyncSession,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    days: int = 30
):
    base_query = """
        SELECT
            latitude AS lat,
            longitude AS lng,
            COUNT(*) AS weight,
            severity,
            category
        FROM issues
        WHERE created_at >= NOW() - INTERVAL '%s days'
    """
    params = [days]

    if category:
        base_query += " AND category = :category"
        params.append(category)

    if status_filter:
        base_query += " AND status = :status"
        params.append(status_filter)

    base_query += """
        GROUP BY latitude, longitude, severity, category
        ORDER BY weight DESC
    """

    result = await db.execute(text(base_query), params)
    rows = result.fetchall()

    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [row[1], row[0]]
            },
            "properties": {
                "weight": row[2],
                "severity": row[3],
                "category": row[4]
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }


async def get_ward_issues_density(db: AsyncSession, ward_id: int):
    query = text("""
        SELECT
            w.id AS ward_id,
            w.ward_number,
            w.district,
            COUNT(i.id) AS total_issues,
            COUNT(CASE WHEN i.status = 'PENDING' THEN 1 END) AS pending_count,
            COUNT(CASE WHEN i.status = 'RESOLVED' THEN 1 END) AS resolved_count,
            AVG(i.severity_score) AS avg_severity
        FROM wards w
        LEFT JOIN issues i ON i.ward_id = w.id
        WHERE w.id = :ward_id
        GROUP BY w.id, w.ward_number, w.district
    """)
    result = await db.execute(query, {"ward_id": ward_id})
    return result.fetchone()
