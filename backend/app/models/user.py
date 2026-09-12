import uuid
import enum
from sqlalchemy import Column, String, Enum, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    WARD_OFFICER = "WARD_OFFICER"
    ADMIN = "ADMIN"
    FIELD_WORKER = "FIELD_WORKER"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CITIZEN, nullable=False)
    ward_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reported_issues = relationship("Issue", back_populates="reporter", foreign_keys="Issue.reporter_id")
