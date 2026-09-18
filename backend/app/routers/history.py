"""
历史记录 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from ..database import get_db
from ..models import AnalysisRecord, Resume
from ..schemas import (
    HistoryListItem,
    HistoryDetailResponse,
    BatchDeleteRequest,
    DeleteResponse,
    BatchDeleteResponse,
    PaginatedResponse,
)

router = APIRouter(prefix="/api/history", tags=["历史记录"])


@router.get("/list", response_model=PaginatedResponse[HistoryListItem])
def list_history(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页条数"),
    db: Session = Depends(get_db),
):
    """
    获取历史分析记录（分页）
    按创建时间倒序排列
    """
    base_query = db.query(AnalysisRecord)
    total = base_query.count()
    offset = (page - 1) * page_size
    records = (
        base_query.order_by(desc(AnalysisRecord.created_at))
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


@router.get("/{record_id}", response_model=HistoryDetailResponse)
def get_history_detail(record_id: int, db: Session = Depends(get_db)):
    """
    获取某条分析记录的详细信息（含简历信息）
    """
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    # 附带简历信息
    resume = db.query(Resume).filter(Resume.id == record.resume_id).first()

    return HistoryDetailResponse(
        id=record.id,
        resume_id=record.resume_id,
        job_title=record.job_title,
        job_description=record.job_description,
        match_score=record.match_score,
        result_json=record.result_json,
        created_at=record.created_at,
        resume_filename=resume.filename if resume else None,
        resume_content=resume.content if resume else None,
    )


@router.delete("/{record_id}", response_model=DeleteResponse)
def delete_history(record_id: int, db: Session = Depends(get_db)):
    """
    删除单条历史分析记录
    只删除分析记录，不影响关联的简历数据
    """
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    db.delete(record)
    db.commit()

    return DeleteResponse(
        message="删除成功",
        deleted_id=record_id,
    )


@router.post("/batch-delete", response_model=BatchDeleteResponse)
def batch_delete_history(
    request: BatchDeleteRequest,
    db: Session = Depends(get_db),
):
    """
    批量删除历史分析记录
    只删除分析记录，不影响关联的简历数据
    """
    ids = request.ids

    # 查询存在的记录
    records = db.query(AnalysisRecord).filter(AnalysisRecord.id.in_(ids)).all()
    existing_ids = [r.id for r in records]

    if not existing_ids:
        return BatchDeleteResponse(
            message="没有可删除的记录",
            deleted_count=0,
            deleted_ids=[],
        )

    # 批量删除
    db.query(AnalysisRecord).filter(AnalysisRecord.id.in_(existing_ids)).delete(synchronize_session=False)
    db.commit()

    return BatchDeleteResponse(
        message="批量删除成功",
        deleted_count=len(existing_ids),
        deleted_ids=existing_ids,
    )
