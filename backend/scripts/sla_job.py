import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import async_session


async def process_sla_alerts():
    async with async_session() as session:
        breached = await session.execute(text("""
            SELECT
                i.id, i.title, i.category, i.severity, i.status,
                i.sla_deadline,
                EXTRACT(EPOCH FROM (NOW() - i.sla_deadline)) / 3600 AS hours_overdue,
                u.phone AS reporter_phone
            FROM issues i
            JOIN users u ON u.id = i.reporter_id
            WHERE i.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
            AND i.sla_deadline < NOW()
            ORDER BY i.sla_deadline ASC
        """))
        breaches = breached.fetchall()

        at_risk = await session.execute(text("""
            SELECT
                i.id, i.title, i.category, i.severity, i.status,
                i.sla_deadline,
                EXTRACT(EPOCH FROM (i.sla_deadline - NOW())) / 3600 AS hours_remaining
            FROM issues i
            WHERE i.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
            AND i.sla_deadline > NOW()
            AND i.sla_deadline < NOW() + INTERVAL '12 hours'
            ORDER BY i.sla_deadline ASC
        """))
        risks = at_risk.fetchall()

        return {
            "breached": [
                {
                    "id": str(row[0]),
                    "title": row[1],
                    "category": row[2],
                    "severity": row[3],
                    "status": row[4],
                    "hours_overdue": round(row[6], 1) if row[6] else 0,
                    "reporter_phone": row[7]
                }
                for row in breaches
            ],
            "at_risk": [
                {
                    "id": str(row[0]),
                    "title": row[1],
                    "category": row[2],
                    "severity": row[3],
                    "status": row[4],
                    "hours_remaining": round(row[6], 1) if row[6] else 0
                }
                for row in risks
            ]
        }


async def run_once():
    result = await process_sla_alerts()
    print(f"SLA check complete:")
    print(f"  Breached: {len(result['breached'])}")
    print(f"  At risk: {len(result['at_risk'])}")
    for breach in result['breached']:
        print(f"    BREACHED: {breach['title']} ({breach['hours_overdue']}h overdue)")
    for risk in result['at_risk']:
        print(f"    AT RISK: {risk['title']} ({risk['hours_remaining']}h left)")


async def run_loop(interval_minutes: int = 60):
    while True:
        await run_once()
        print(f"Waiting {interval_minutes} minutes for next check...")
        await asyncio.sleep(interval_minutes * 60)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=60, help="Check interval in minutes")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    args = parser.parse_args()

    if args.once:
        asyncio.run(run_once())
    else:
        asyncio.run(run_loop(args.interval))
