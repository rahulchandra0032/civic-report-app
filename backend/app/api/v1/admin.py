from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User, UserRole
from app.models.issue import Issue, IssueStatus, SeverityLevel
from app.models.assignment import Assignment, AuditLog
from app.schemas.issue import IssueResponse, IssueListResponse, IssueUpdate, IssueAssign
from app.schemas.response import SuccessResponse
from app.api.v1.deps import require_admin, require_ward_officer

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    total = await db.execute(select(func.count(Issue.id)))
    pending = await db.execute(
        select(func.count(Issue.id)).where(Issue.status == IssueStatus.PENDING)
    )
    assigned = await db.execute(
        select(func.count(Issue.id)).where(Issue.status == IssueStatus.ASSIGNED)
    )
    in_progress = await db.execute(
        select(func.count(Issue.id)).where(Issue.status == IssueStatus.IN_PROGRESS)
    )
    resolved = await db.execute(
        select(func.count(Issue.id)).where(Issue.status == IssueStatus.RESOLVED)
    )

    sla_breached = await db.execute(text("""
        SELECT COUNT(*) FROM issues
        WHERE status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
        AND sla_deadline < NOW()
    """))

    category_stats = await db.execute(text("""
        SELECT category, COUNT(*) as count
        FROM issues
        GROUP BY category
        ORDER BY count DESC
    """))

    severity_stats = await db.execute(text("""
        SELECT severity, COUNT(*) as count
        FROM issues
        GROUP BY severity
        ORDER BY count DESC
    """))

    recent_issues = await db.execute(
        select(Issue).order_by(Issue.created_at.desc()).limit(10)
    )

    return {
        "summary": {
            "total": total.scalar(),
            "pending": pending.scalar(),
            "assigned": assigned.scalar(),
            "in_progress": in_progress.scalar(),
            "resolved": resolved.scalar(),
            "sla_breached": sla_breached.scalar()
        },
        "by_category": {row[0]: row[1] for row in category_stats.fetchall()},
        "by_severity": {row[0]: row[1] for row in severity_stats.fetchall()},
        "recent_issues": [IssueResponse.model_validate(i) for i in recent_issues.scalars().all()]
    }


@router.get("/issues", response_model=IssueListResponse)
async def admin_list_issues(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    status_filter: Optional[IssueStatus] = None,
    severity: Optional[SeverityLevel] = None,
    ward_id: Optional[int] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    query = select(Issue)
    count_query = select(func.count(Issue.id))

    filters = []
    if category:
        filters.append(Issue.category == category)
    if status_filter:
        filters.append(Issue.status == status_filter)
    if severity:
        filters.append(Issue.severity == severity)
    if ward_id:
        filters.append(Issue.ward_id == ward_id)
    if search:
        filters.append(Issue.title.ilike(f"%{search}%"))

    if filters:
        combined = and_(*filters)
        query = query.where(combined)
        count_query = count_query.where(combined)

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


@router.patch("/issues/{issue_id}", response_model=IssueResponse)
async def admin_update_issue(
    issue_id: UUID,
    update_data: IssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    old_values = {
        "status": issue.status.value if issue.status else None,
        "severity": issue.severity.value if issue.severity else None
    }

    update_dict = update_data.model_dump(exclude_unset=True)

    if "status" in update_dict:
        if update_dict["status"] == IssueStatus.RESOLVED:
            issue.resolved_at = datetime.utcnow()
        elif update_dict["status"] == IssueStatus.ASSIGNED:
            issue.assigned_at = datetime.utcnow()

    for field, value in update_dict.items():
        setattr(issue, field, value)

    audit = AuditLog(
        issue_id=issue.id,
        action="status_update",
        old_value=old_values,
        new_value=update_dict,
        performed_by=current_user.id
    )
    db.add(audit)
    await db.flush()

    return IssueResponse.model_validate(issue)


@router.post("/assign", response_model=SuccessResponse)
async def assign_issue(
    assignment: IssueAssign,
    issue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    result = await db.execute(select(Issue).where(Issue.id == issue_id))
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    assign_record = Assignment(
        issue_id=issue.id,
        assigned_to=assignment.assigned_to,
        assigned_by=current_user.id,
        notes=assignment.notes
    )
    db.add(assign_record)

    issue.status = IssueStatus.ASSIGNED
    issue.assigned_at = datetime.utcnow()

    audit = AuditLog(
        issue_id=issue.id,
        action="assigned",
        new_value={"assigned_to": str(assignment.assigned_to)},
        performed_by=current_user.id
    )
    db.add(audit)
    await db.flush()

    return SuccessResponse(message="Issue assigned successfully")


@router.get("/sla-report")
async def sla_report(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    breached = await db.execute(text("""
        SELECT
            i.id, i.title, i.category, i.severity, i.status,
            i.sla_deadline, i.created_at,
            EXTRACT(EPOCH FROM (NOW() - i.sla_deadline)) / 3600 AS hours_overdue
        FROM issues i
        WHERE i.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
        AND i.sla_deadline < NOW()
        ORDER BY i.sla_deadline ASC
    """))

    at_risk = await db.execute(text("""
        SELECT
            i.id, i.title, i.category, i.severity, i.status,
            i.sla_deadline, i.created_at,
            EXTRACT(EPOCH FROM (i.sla_deadline - NOW())) / 3600 AS hours_remaining
        FROM issues i
        WHERE i.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
        AND i.sla_deadline > NOW()
        AND i.sla_deadline < NOW() + INTERVAL '12 hours'
        ORDER BY i.sla_deadline ASC
    """))

    compliance = await db.execute(text("""
        SELECT
            COUNT(CASE WHEN resolved_at <= sla_deadline THEN 1 END)::float /
            NULLIF(COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END), 0) * 100 AS compliance_rate
        FROM issues
        WHERE status = 'RESOLVED' AND sla_deadline IS NOT NULL
    """))

    return {
        "breached": [
            {
                "id": str(row[0]),
                "title": row[1],
                "category": row[2],
                "severity": row[3],
                "status": row[4],
                "sla_deadline": row[5].isoformat() if row[5] else None,
                "hours_overdue": round(row[7], 1) if row[7] else 0
            }
            for row in breached.fetchall()
        ],
        "at_risk": [
            {
                "id": str(row[0]),
                "title": row[1],
                "category": row[2],
                "severity": row[3],
                "status": row[4],
                "sla_deadline": row[5].isoformat() if row[5] else None,
                "hours_remaining": round(row[7], 1) if row[7] else 0
            }
            for row in at_risk.fetchall()
        ],
        "compliance_rate": round(compliance.scalar() or 0, 2)
    }
