import uuid
import enum
from sqlalchemy import Column, String, Text, Enum, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class IssueStatus(str, enum.Enum):
    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    REJECTED = "REJECTED"


class SeverityLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    status = Column(Enum(IssueStatus), default=IssueStatus.PENDING, nullable=False)
    severity = Column(Enum(SeverityLevel), default=SeverityLevel.MEDIUM, nullable=False)
    severity_score = Column(Float, nullable=True)

    # Media
    image_url_before = Column(Text, nullable=False)
    image_url_after = Column(Text, nullable=True)

    # Location - using WKT for PostGIS
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text, nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)

    # Metadata
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    upvotes = Column(Integer, default=1)
    ai_confidence = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    reporter = relationship("User", back_populates="reported_issues", foreign_keys=[reporter_id])
    ward = relationship("Ward", back_populates="issues", foreign_keys=[ward_id])
    upvote_records = relationship("IssueUpvote", back_populates="issue")


class IssueUpvote(Base):
    __tablename__ = "issue_upvotes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    issue_id = Column(UUID(as_uuid=True), ForeignKey("issues.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    issue = relationship("Issue", back_populates="upvote_records")
