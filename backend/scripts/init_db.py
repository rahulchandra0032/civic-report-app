from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, async_session


async def init_db():
    """Create PostGIS extension + all tables for deployment."""
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))

    import app.models  # noqa: F401
    from app.database import Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created.")


async def seed_admin(phone: str = "9999999999", name: str = "Admin"):
    from app.models.user import User, UserRole
    from sqlalchemy import select

    async with async_session() as session:
        result = await session.execute(select(User).where(User.phone == phone))
        if not result.scalar_one_or_none():
            user = User(phone=phone, name=name, role=UserRole.ADMIN)
            session.add(user)
            await session.commit()
            print(f"Admin created: {phone} ({name})")
        else:
            print(f"Admin already exists: {phone}")


async def seed_wards_if_empty():
    from sqlalchemy import select, text
    from app.models.ward import Ward
    import json as _json

    async with async_session() as session:
        result = await session.execute(select(Ward).limit(1))
        if result.scalar_one_or_none():
            print("Wards already seeded.")
            return

        geojson_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data", "sample_wards.geojson"
        )
        if not os.path.exists(geojson_path):
            print("No sample wards file found; skipping ward seed.")
            return

        with open(geojson_path) as f:
            geojson = _json.load(f)

        for feature in geojson["features"]:
            props = feature["properties"]
            geom = feature["geometry"]
            await session.execute(
                text("""
                    INSERT INTO wards (ward_number, district, state, boundary)
                    VALUES (:ward_number, :district, :state,
                            ST_SetSRID(ST_GeomFromGeoJSON(:geom), 4326))
                """),
                {
                    "ward_number": props["ward_number"],
                    "district": props["district"],
                    "state": props.get("state", "Jharkhand"),
                    "geom": _json.dumps(geom),
                },
            )
        await session.commit()
        print(f"Seeded {len(geojson['features'])} wards.")


async def main():
    await init_db()
    await seed_admin()
    await seed_wards_if_empty()
    print("Database ready for deployment.")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())