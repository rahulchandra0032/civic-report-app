from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.ward import Ward
from app.models.issue import Issue, IssueStatus, SeverityLevel
from app.schemas.issue import IssueResponse, IssueListResponse
from app.api.v1.deps import get_current_user, require_admin
from app.services.geo_service import (
    get_nearby_issues,
    get_heatmap_data,
    get_ward_for_point,
    get_ward_issues_density
)
import json

router = APIRouter(prefix="/wards", tags=["Wards & Geo"])


@router.get("", response_model=list[dict])
async def list_wards(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Ward))
    wards = result.scalars().all()
    return [
        {
            "id": w.id,
            "ward_number": w.ward_number,
            "district": w.district,
            "state": w.state
        }
        for w in wards
    ]


@router.get("/boundaries", response_model=dict)
async def get_ward_boundaries(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = text("""
        SELECT id, ward_number, district, state,
               ST_AsGeoJSON(boundary) AS boundary
        FROM wards
    """)
    result = await db.execute(query)
    rows = result.fetchall()

    features = []
    for row in rows:
        features.append({
            "type": "Feature",
            "id": row[0],
            "properties": {
                "ward_number": row[1],
                "district": row[2],
                "state": row[3]
            },
            "geometry": json.loads(row[4]) if row[4] else None
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/{ward_id}/density")
async def ward_density(
    ward_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    data = await get_ward_issues_density(db, ward_id)
    if not data:
        raise HTTPException(status_code=404, detail="Ward not found")
    return {
        "ward_id": data[0],
        "ward_number": data[1],
        "district": data[2],
        "total_issues": data[3],
        "pending_count": data[4],
        "resolved_count": data[5],
        "avg_severity": float(data[6]) if data[6] else 0
    }


@router.post("/import-boundaries")
async def import_ward_boundaries(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    content = await file.read()
    geojson = json.loads(content)

    if geojson.get("type") != "FeatureCollection":
        raise HTTPException(status_code=400, detail="Invalid GeoJSON: expected FeatureCollection")

    imported = 0
    for feature in geojson["features"]:
        props = feature.get("properties", {})
        geom = feature.get("geometry")

        if not geom:
            continue

        ward = Ward(
            ward_number=props.get("ward_number", 0),
            district=props.get("district", "Unknown"),
            state=props.get("state", "Jharkhand"),
        )
        db.add(ward)
        await db.flush()

        await db.execute(text("""
            UPDATE wards
            SET boundary = ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326)
            WHERE id = :ward_id
        """), {"geom": json.dumps(geom), "ward_id": ward.id})
        imported += 1

    return {"message": f"Imported {imported} ward boundaries"}
