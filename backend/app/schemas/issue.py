from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.issue import IssueStatus, SeverityLevel


class IssueCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    category: str = Field(..., max_length=100)
    image_url: str
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[IssueStatus] = None
    severity: Optional[SeverityLevel] = None
    image_url_after: Optional[str] = None


class IssueAssign(BaseModel):
    assigned_to: UUID
    notes: Optional[str] = None


class IssueResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    category: str
    status: IssueStatus
    severity: SeverityLevel
    severity_score: Optional[float]
    image_url_before: str
    image_url_after: Optional[str]
    latitude: float
    longitude: float
    address: Optional[str]
    ward_id: Optional[int]
    reporter_id: UUID
    upvotes: int
    ai_confidence: Optional[float]
    created_at: datetime
    updated_at: datetime
    assigned_at: Optional[datetime]
    resolved_at: Optional[datetime]
    sla_deadline: Optional[datetime]

    class Config:
        from_attributes = True


class IssueListResponse(BaseModel):
    issues: list[IssueResponse]
    total: int
    page: int
    per_page: int
