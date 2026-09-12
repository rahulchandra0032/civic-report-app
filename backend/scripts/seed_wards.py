import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, async_session
from app.models.ward import Ward


async def seed_wards():
    geojson_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_wards.geojson")

    with open(geojson_path) as f:
        geojson = json.load(f)

    async with engine.begin() as conn:
        for feature in geojson["features"]:
            props = feature["properties"]
            geom = feature["geometry"]

            result = await conn.execute(
                text("""
                    INSERT INTO wards (ward_number, district, state, boundary)
                    VALUES (:ward_number, :district, :state,
                            ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326))
                    RETURNING id
                """),
                {
                    "ward_number": props["ward_number"],
                    "district": props["district"],
                    "state": props.get("state", "Jharkhand"),
                    "geom": json.dumps(geom)
                }
            )
            ward_id = result.fetchone()[0]
            print(f"Inserted ward {props['ward_number']} (ID: {ward_id})")

    print(f"\nDone! Inserted {len(geojson['features'])} wards.")


if __name__ == "__main__":
    asyncio.run(seed_wards())
