import asyncio
from typing import Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import os


class NotificationService:
    def __init__(self):
        self.sms_enabled = os.getenv("SMS_ENABLED", "false").lower() == "true"
        self.push_enabled = os.getenv("PUSH_ENABLED", "false").lower() == "true"

    async def send_sms(self, phone: str, message: str) -> bool:
        if not self.sms_enabled:
            print(f"[SMS-DEBUG] To: {phone} | {message}")
            return True

        try:
            # Integration point: Twilio/MSG91/other SMS gateway
            # await twilio_client.messages.create(
            #     body=message,
            #     from_="+919999999999",
            #     to=f"+91{phone}"
            # )
            print(f"[SMS] Sent to {phone}")
            return True
        except Exception as e:
            print(f"[SMS] Failed to send to {phone}: {e}")
            return False

    async def send_push(self, user_id: str, title: str, body: str) -> bool:
        if not self.push_enabled:
            print(f"[PUSH-DEBUG] To: {user_id} | {title}: {body}")
            return True

        try:
            # Integration point: FCM/Expo Push Notifications
            print(f"[PUSH] Sent to {user_id}")
            return True
        except Exception as e:
            print(f"[PUSH] Failed to send to {user_id}: {e}")
            return False

    async def notify_reporter(self, db: AsyncSession, issue_id: str, update_type: str, data: dict):
        query = text("""
            SELECT u.phone FROM issues i
            JOIN users u ON u.id = i.reporter_id
            WHERE i.id = :issue_id
        """)
        result = await db.execute(query, {"issue_id": issue_id})
        row = result.fetchone()
        if not row:
            return

        phone = row[0]

        messages = {
            "status_update": f"📢 Your issue has been updated to {data.get('status', 'new status')}.",
            "resolved": f"✅ Great news! Your issue has been resolved. Thank you for reporting!",
            "assigned": f"🔧 Your issue has been assigned to an officer.",
            "sla_breach": f"🚨 We apologize, your issue is behind schedule. We're working on it.",
        }

        message = messages.get(update_type)
        if not message:
            message = f"Update on your issue: {data.get('message', '')}"

        await self.send_sms(phone, message)

    async def notify_admin(self, db: AsyncSession, message: str):
        query = text("""
            SELECT id, phone FROM users WHERE role = 'ADMIN'
        """)
        result = await db.execute(query)
        admins = result.fetchall()

        for admin in admins:
            await self.send_sms(admin[1], message)

    async def schedule_notice(self, db: AsyncSession, issue_id: str, hours_before: int):
        query = text("""
            SELECT i.title, i.sla_deadline, i.reporter_id
            FROM issues i WHERE i.id = :issue_id
        """)
        result = await db.execute(query, {"issue_id": issue_id})
        row = result.fetchone()
        if not row:
            return

        title, deadline, reporter_id = row
        if deadline:
            await self.send_push(
                reporter_id,
                "⏰ SLA Reminder",
                f"Your issue '{title}' has {hours_before}h left until deadline."
            )


notification_service = NotificationService()
