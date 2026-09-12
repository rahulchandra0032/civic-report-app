from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.models.issue import Issue, IssueUpvote, IssueStatus, SeverityLevel
from app.schemas.issue import IssueCreate, IssueUpdate, IssueResponse, IssueListResponse
from app.api.v1.deps import get_current_user

router = APIRouter(prefix="/issues", tags=["Issues"])

CATEGORY_WEIGHTS = {
    "pothole": {"weight": 20, "department": "PWD"},
    "garbage": {"weight": 15, "department": "Municipal"},
    "streetlight": {"weight": 12, "department": "Electrical"},
    "water_leak": {"weight": 18, "department": "Water Supply"},
    "drainage": {"weight": 16, "department": "Drainage"},
    "road_damage": {"weight": 19, "department": "PWD"},
}


def calculate_severity_score(category: str, upvotes: int) -> tuple[SeverityLevel, float]:
    cat = CATEGORY_WEIGHTS.get(category, {"weight": 10})
    category_score = cat["weight"]
    upvote_score = min(upvotes * 5, 30)
    total = category_score + upvote_score

    if total >= 70:
        return SeverityLevel.CRITICAL, total
    elif total >= 50:
        return SeverityLevel.HIGH, total
    elif total >= 30:
        return SeverityLevel.MEDIUM, total
    else:
        return SeverityLevel.LOW, total


def calculate_sla_deadline(severity: SeverityLevel) -> datetime:
    hours_map = {
        SeverityLevel.CRITICAL: 24,
        SeverityLevel.HIGH: 48,
        SeverityLevel.MEDIUM: 72,
        SeverityLevel.LOW: 120,
    }
    return datetime.utcnow() + timedelta(hours=hours_map[severity])


@router.post("", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    issue_data: IssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    severity, score = calculate_severity_score(issue_data.category, 1)
    sla_deadline = calculate_sla_deadline(severity)

    issue = Issue(
        title=issue_data.title,
        description=issue_data.description,
        category=issue_data.category,
        severity=severity,
        severity_score=score,
        image_url_before=issue_data.image_url,
        latitude=issue_data.latitude,
        longitude=issue_data.longitude,
        address=issue_data.address,
        reporter_id=current_user.id,
        sla_deadline=sla_deadline,
        upvotes=1
    )
    db.add(issue)
    await db.flush()

    upvote = IssueUpvote(issue_id=issue.id, user_id=current_user.id)
    db.add(upvote)
    await db.flush()

    return IssueResponse.model_validate(issue)


@router.get("", response_model=IssueListResponse)
async def list_issues(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    status_filter: Optional[IssueStatus] = None,
    severity: Optional[SeverityLevel] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Issue)
    count_query = select(func.count(Issue.id))

    if category:
        query = query.where(Issue.category == category)
        count_query = count_query.where(Issue.category == category)
    if status_filter:
        query = query.where(Issue.status == status_filter)
        count_query = count_query.where(Issue.status == status_filter)
    if severity:
        query = query.where(Issue.severity == severity)
        count_query = count_query.where(Issue.severity == severity)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * per_page
    query = query.order_by(Issue.created_at.desc()).offset(offset).limit(per_page)
    result = await db.execute(query)
    issues = result.scalars().all()

    return IssueListResponse(
        issues=[IssueResponse.model_validate(i) for i in issues],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/my", response_model=IssueListResponse)
async def my_issues(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count_query = select(func.count(Issue.id)).where(Issue.reporter_id == current_user.id)
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    offset = (page - 1) * per_page
    query = (
        select(Issue)
        .where(Issue.reporter_id == current_user.id)
        .order_by(Issue.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    result = await db.execute(query)
    issues = result.scalars().all()

    return IssueListResponse(
        issues=[IssueResponse.model_validate(i) for i in issues],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return IssueResponse.model_validate(issue)


@router.patch("/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: UUID,
    update_data: IssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    update_dict = update_data.model_dump(exclude_unset=True)

    if "status" in update_dict:
        if update_dict["status"] == IssueStatus.RESOLVED:
            issue.resolved_at = datetime.utcnow()
        elif update_dict["status"] == IssueStatus.ASSIGNED:
            issue.assigned_at = datetime.utcnow()

    for field, value in update_dict.items():
        setattr(issue, field, value)

    await db.flush()
    return IssueResponse.model_validate(issue)


@router.post("/{issue_id}/upvote", response_model=IssueResponse)
async def upvote_issue(
    issue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    existing = await db.execute(
        select(IssueUpvote).where(
            and_(IssueUpvote.issue_id == issue_id, IssueUpvote.user_id == current_user.id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already upvoted")

    upvote = IssueUpvote(issue_id=issue_id, user_id=current_user.id)
    db.add(upvote)
    issue.upvotes += 1

    severity, score = calculate_severity_score(issue.category, issue.upvotes)
    issue.severity = severity
    issue.severity_score = score

    await db.flush()
    return IssueResponse.model_validate(issue)
