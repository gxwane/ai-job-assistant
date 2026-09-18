"""
岗位记录管理 API 路由
管理插件捕获的岗位记录（CRUD + 状态筛选 + 批量操作 + 面试题生成）

V2: 面试题生成改为异步模式（BackgroundTasks），立即返回 202 Accepted
"""
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..database import get_db
from ..models import JobRecord, Resume
from ..schemas import (
    JobRecordResponse,
    JobRecordDetailResponse,
    BatchDeleteRequest,
    DeleteResponse,
    BatchDeleteResponse,
    BatchUpdateJobStatusRequest,
    PaginatedResponse,
)
from ..services.interview_service import generate_job_interview_questions

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/job-records", tags=["岗位记录管理"])


@router.get("", response_model=PaginatedResponse[JobRecordResponse])
def list_job_records(
    status: str | None = Query(None, description="按状态筛选"),
    keyword: str | None = Query(None, description="搜索岗位名/公司"),
    min_score: int | None = Query(None, description="最低分数筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页条数"),
    db: Session = Depends(get_db),
):
    """获取岗位记录列表，支持筛选/搜索/分页"""
    base = db.query(JobRecord)

    if status:
        base = base.filter(JobRecord.status == status)

    if keyword:
        pattern = f"%{keyword}%"
        base = base.filter(
            (JobRecord.job_title.ilike(pattern)) |
            (JobRecord.company.ilike(pattern))
        )

    if min_score is not None:
        base = base.filter(JobRecord.match_score >= min_score)

    total = base.count()
    offset = (page - 1) * page_size
    records = (
        base.order_by(desc(JobRecord.created_at))
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return PaginatedResponse(
        items=records,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{record_id}", response_model=JobRecordDetailResponse)
def get_job_record_detail(record_id: int, db: Session = Depends(get_db)):
    """获取单条岗位记录详情（含分析结果JSON），可用于轮询 analysis_status"""
    record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="岗位记录不存在")
    return record


@router.delete("/{record_id}", response_model=DeleteResponse)
def delete_job_record(record_id: int, db: Session = Depends(get_db)):
    """删除单条岗位记录"""
    record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="岗位记录不存在")

    db.delete(record)
    db.commit()

    return DeleteResponse(message="删除成功", deleted_id=record_id)


@router.post("/batch-delete", response_model=BatchDeleteResponse)
def batch_delete_job_records(
    request: BatchDeleteRequest,
    db: Session = Depends(get_db),
):
    """批量删除岗位记录"""
    ids = request.ids
    records = db.query(JobRecord).filter(JobRecord.id.in_(ids)).all()
    existing_ids = [r.id for r in records]

    if not existing_ids:
        return BatchDeleteResponse(
            message="没有可删除的记录",
            deleted_count=0,
            deleted_ids=[],
        )

    db.query(JobRecord).filter(JobRecord.id.in_(existing_ids)).delete(synchronize_session=False)
    db.commit()

    return BatchDeleteResponse(
        message="批量删除成功",
        deleted_count=len(existing_ids),
        deleted_ids=existing_ids,
    )


@router.post("/batch-status")
def batch_update_job_status(
    request: BatchUpdateJobStatusRequest,
    db: Session = Depends(get_db),
):
    """批量更新岗位状态"""
    valid_statuses = {"captured", "analyzed", "recommended", "communicated", "ignored", "interview"}
    if request.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"无效的状态值，可选：{', '.join(valid_statuses)}",
        )

    records = db.query(JobRecord).filter(JobRecord.id.in_(request.ids)).all()
    updated_count = 0
    for record in records:
        record.status = request.status
        updated_count += 1

    db.commit()

    return {
        "message": f"已更新 {updated_count} 条记录状态为 {request.status}",
        "updated_count": updated_count,
        "status": request.status,
    }


# ==================== 面试题生成 ====================

@router.get("/{record_id}/interview-questions")
def get_interview_questions(record_id: int, db: Session = Depends(get_db)):
    """获取已生成的面试题（如未生成则返回空并提示需生成）"""
    record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="岗位记录不存在")

    if record.interview_questions_json:
        return {
            "exists": True,
            "data": record.interview_questions_json,
        }
    return {
        "exists": False,
        "message": "面试题尚未生成，请点击生成按钮",
    }


def _generate_interview_questions_task(record_id: int) -> None:
    """
    【后台任务】生成面试题并写回数据库

    使用独立 Session，避免路由层 Session 关闭后引发 DetachedInstanceError。
    """
    from ..database import SessionLocal

    db: Session = SessionLocal()
    try:
        record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
        if not record or record.interview_questions_json:
            return  # 不存在或已生成，跳过

        resume_text = ""
        if record.resume_id:
            resume = db.query(Resume).filter(Resume.id == record.resume_id).first()
            if resume:
                resume_text = resume.content

        if not resume_text:
            logger.warning(f"[BG-IQ] record_id={record_id} 简历不存在，跳过面试题生成")
            return

        questions_data = generate_job_interview_questions(
            job_title=record.job_title,
            job_description=record.job_description,
            resume_content=resume_text,
        )

        record.interview_questions_json = questions_data
        db.commit()
        logger.info(f"[BG-IQ] record_id={record_id} 面试题生成完成")

    except Exception as e:
        logger.error(f"[BG-IQ] record_id={record_id} 生成失败: {e}", exc_info=True)
    finally:
        db.close()


@router.post("/{record_id}/generate-interview-questions")
def generate_interview_questions(
    record_id: int,
    background_tasks: BackgroundTasks,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    为大模型生成 30 道面试高频问答题（按概率排序）

    异步模式：立即返回 202 Accepted，生成任务在后台执行。
    若已有缓存直接返回 200 OK。
    可通过 GET /{record_id}/interview-questions 轮询结果（exists=True 表示完成）。

    仅在收到面试通知后被调用，避免浪费大模型资源。
    """
    record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="岗位记录不存在")

    # 已生成过则直接返回缓存（同步，无需后台，默认 200 OK）
    if record.interview_questions_json:
        return {
            "exists": True,
            "cached": True,
            "queued": False,
            "data": record.interview_questions_json,
        }

    # 校验简历是否存在（快速失败，避免后台任务无效运行）
    if not record.resume_id:
        raise HTTPException(status_code=400, detail="该岗位未关联简历，无法生成面试题")

    # 加入后台任务队列
    background_tasks.add_task(_generate_interview_questions_task, record_id)
    response.status_code = status.HTTP_202_ACCEPTED

    return {
        "exists": False,
        "cached": False,
        "queued": True,
        "message": "面试题生成已加入队列，预计 15~30 秒后完成，请稍后刷新查询",
    }
