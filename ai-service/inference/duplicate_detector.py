import imagehash
from PIL import Image
import io
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta


class DuplicateDetector:
    def __init__(self, hash_size: int = 16, similarity_threshold: float = 0.85):
        self.hash_size = hash_size
        self.similarity_threshold = similarity_threshold

    def compute_hash(self, image_bytes: bytes) -> imagehash.ImageHash:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return imagehash.phash(image, hash_size=self.hash_size)

    def compare(self, hash1: imagehash.ImageHash, hash2: imagehash.ImageHash) -> float:
        max_distance = self.hash_size * self.hash_size
        distance = hash1 - hash2
        return 1.0 - (distance / max_distance)

    async def find_duplicates(
        self,
        db: AsyncSession,
        image_bytes: bytes,
        latitude: float,
        longitude: float,
        radius_meters: float = 50,
        hours_window: int = 72
    ) -> list[dict]:
        new_hash = self.compute_hash(image_bytes)

        query = text("""
            SELECT
                id, title, category, status, severity,
                latitude, longitude, image_url_before,
                created_at,
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
            AND created_at >= NOW() - INTERVAL ':hours hours'
            AND status != 'REJECTED'
            ORDER BY created_at DESC
        """)
        result = await db.execute(query, {
            "lat": latitude,
            "lng": longitude,
            "radius": radius_meters,
            "hours": hours_window
        })
        nearby_issues = result.fetchall()

        duplicates = []
        for issue in nearby_issues:
            try:
                existing_hash = imagehash.phash(
                    Image.open(io.BytesIO(issue[7])).convert("RGB"),
                    hash_size=self.hash_size
                )
                similarity = self.compare(new_hash, existing_hash)

                if similarity >= self.similarity_threshold:
                    duplicates.append({
                        "issue_id": str(issue[0]),
                        "title": issue[1],
                        "category": issue[2],
                        "status": issue[3],
                        "similarity": round(similarity, 4),
                        "distance_meters": round(issue[9], 1) if issue[9] else 0,
                        "created_at": issue[8].isoformat() if issue[8] else None
                    })
            except Exception:
                continue

        return sorted(duplicates, key=lambda x: x["similarity"], reverse=True)
