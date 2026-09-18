import json
import re
from collections import Counter
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import JobRecord, Resume
from ..services.pdf_report_service import (
    find_cn_font as _find_cn_font,
)
from ..services.pdf_report_service import (
    generate_job_report_pdf,
)
from ..services.pdf_report_service import (
    get_cn_font as _get_cn_font,
)

__all__ = ["_find_cn_font", "_get_cn_font", "router"]

router = APIRouter(prefix="/api/statistics", tags=["数据统计"])

# ==================== 统计接口 ====================

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    resume_count = db.query(Resume).count()
    total_jobs = db.query(JobRecord).count()
    recommended_jobs = db.query(JobRecord).filter(
        (JobRecord.status == "recommended") | (JobRecord.match_score >= 80)
    ).count()
    communicated_jobs = db.query(JobRecord).filter(
        JobRecord.status == "communicated"
    ).count()
    avg_score = db.query(func.avg(JobRecord.match_score)).filter(
        JobRecord.match_score.isnot(None)
    ).scalar()
    max_score = db.query(func.max(JobRecord.match_score)).filter(
        JobRecord.match_score.isnot(None)
    ).scalar()
    return {
        "resume_count": resume_count,
        "total_jobs": total_jobs,
        "recommended_jobs": recommended_jobs,
        "communicated_jobs": communicated_jobs,
        "average_score": round(avg_score or 0, 1),
        "max_score": max_score or 0,
    }


@router.get("/score-distribution")
def get_score_distribution(db: Session = Depends(get_db)):
    ranges = [
        ("90-100", 90, 101), ("80-89", 80, 90), ("70-79", 70, 80),
        ("60-69", 60, 70),
    ]
    result = []
    for label, lo, hi in ranges:
        count = db.query(JobRecord).filter(
            JobRecord.match_score >= lo, JobRecord.match_score < hi,
        ).count()
        result.append({"label": label, "count": count})
    below = db.query(JobRecord).filter(
        JobRecord.match_score < 60, JobRecord.match_score.isnot(None),
    ).count()
    result.append({"label": "60以下", "count": below})
    return {"ranges": result}


@router.get("/job-funnel")
def get_job_funnel(db: Session = Depends(get_db)):
    return {
        "total_jobs": db.query(JobRecord).count(),
        "recommended_jobs": db.query(JobRecord).filter(
            (JobRecord.status == "recommended") | (JobRecord.match_score >= 80)
        ).count(),
        "communicated_jobs": db.query(JobRecord).filter(JobRecord.status == "communicated").count(),
        "interview_jobs": db.query(JobRecord).filter(JobRecord.status == "interview").count(),
        "offer_jobs": db.query(JobRecord).filter(JobRecord.status == "offer").count(),
    }


@router.get("/hr-status-distribution")
def get_hr_status_distribution(db: Session = Depends(get_db)):
    """HR活跃状态分布统计"""
    from ..services.job_parser import HR_STATUS_LIST

    distribution = {}
    total_with_status = db.query(JobRecord).filter(
        JobRecord.hr_status.isnot(None), JobRecord.hr_status != ""
    ).count()

    for status in HR_STATUS_LIST:
        count = db.query(JobRecord).filter(JobRecord.hr_status == status).count()
        distribution[status] = count

    # 未知 = 空或NULL
    unknown = db.query(JobRecord).filter(
        (JobRecord.hr_status.is_(None)) | (JobRecord.hr_status == "")
    ).count()
    distribution["未知"] = unknown

    return {
        "distribution": distribution,
        "total": db.query(JobRecord).count(),
        "total_with_status": total_with_status,
    }


@router.get("/recent-recommended")
def get_recent_recommended(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    records = (
        db.query(JobRecord)
        .filter(JobRecord.match_score.isnot(None))
        .order_by(desc(JobRecord.created_at))
        .limit(limit).all()
    )
    return [
        {"id": r.id, "job_title": r.job_title, "company": r.company,
         "match_score": r.match_score, "status": r.status,
         "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in records
    ]


# ==================== PDF 导出 V2 ====================

@router.get("/report/pdf")
def export_pdf_report(db: Session = Depends(get_db)):
    """专业求职分析报告 PDF V2"""
    # 收集统计数据
    overview = get_overview(db)
    dist = get_score_distribution(db)
    funnel = get_job_funnel(db)
    recent = get_recent_recommended(50, db)
    hr_dist = get_hr_status_distribution(db)
    top10_high = (
        db.query(JobRecord)
        .filter(JobRecord.composite_score.isnot(None))
        .filter(JobRecord.match_score >= 70)
        .order_by(desc(JobRecord.composite_score))
        .limit(10).all()
    )

    latest_resume = db.query(Resume).order_by(desc(Resume.created_at)).first()
    resume_name = latest_resume.filename if latest_resume else "未上传简历"

    skill_counter = Counter()
    direction_counter = Counter()
    jobs_with_analysis = db.query(JobRecord).filter(
        JobRecord.analysis_result_json.isnot(None),
        JobRecord.match_score >= 60,
    ).all()
    for jr in jobs_with_analysis:
        try:
            data = jr.analysis_result_json
            if isinstance(data, str):
                data = json.loads(data)
            for skill in (data.get("missing_skills") or []):
                skill_counter[skill] += 1
            title = jr.job_title or ""
            dirs = re.split(r'[（(/\-]', title)
            if dirs:
                direction_counter[dirs[0].strip()] += 1
        except Exception:
            pass

    top_skills = skill_counter.most_common(10)
    top_directions = direction_counter.most_common(5)

    buf, filename = generate_job_report_pdf(
        overview=overview,
        dist=dist,
        funnel=funnel,
        recent=recent,
        hr_dist=hr_dist,
        top10_high=top10_high,
        resume_name=resume_name,
        top_skills=top_skills,
        top_directions=top_directions,
    )

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )
