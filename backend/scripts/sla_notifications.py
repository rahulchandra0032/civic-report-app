import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, select, update
from app.database import async_session
from app.models.issue import Issue, IssueStatus
from app.services.notification_service import notification_service


async def check_and_notify_sla():
    async with async_session() as session:
        breached = await session.execute(text("""
            SELECT
                i.id, i.title, i.severity,
                EXTRACT(EPOCH FROM (NOW() - i.sla_deadline)) / 3600 AS hours_overdue
            FROM issues i
            WHERE i.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
            AND i.sla_deadline < NOW()
        """))
        for row in breached.fetchall():
            issue_id, title, severity, hours = row
            message = (
                f"🚨 HIGH PRIORITY: Issue '{title}' is {round(hours, 1)}h past its SLA deadline. "
                f"(Severity: {severity}). Click to review: "
                f"http://localhost:3000/issues?id={issue_id}"
            )
            await notification_service.notify_admin(session, message)
            await notification_service.send_sms(
                "+919999999999",  # configurable admin phone
                message
            )

        at_risk = await session.execute(text("""
            SELECT
                i.id, i.title, i.severity, i.reporter_id,
                EXTRACT(EPOCH FROM (i.sla_deadline - NOW())) / 3600 AS hours_remaining
            FROM issues i
            WHERE i.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
            AND i.sla_deadline > NOW()
            AND i.sla_deadline < NOW() + INTERVAL '12 hours'
        """))
        for row in at_risk.fetchall():
            issue_id, title, severity, reporter_id, hours = row
            await notification_service.send_push(
                reporter_id,
                "⏰ SLA Deadline Approaching",
                f"Your issue '{title}' has only {round(hours, 1)}h left for resolution."
            )


async def main():
    while True:
        print("Checking SLA deadlines...")
        await check_and_notify_sla()
        print("Sleeping for 1 hour...")
        await asyncio.sleep(3600)


if __name__ == "__main__":
    asyncio.run(main())
