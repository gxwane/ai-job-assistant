"""
岗位匹配分析 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AnalysisRecord, Resume
from ..schemas import AnalysisRequest, AnalysisResponse
from ..services.analysis_service import analyze_job_match

router = APIRouter(prefix="/api/analysis", tags=["岗位分析"])


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(
    request: AnalysisRequest,
    db: Session = Depends(get_db),
):
    """
    分析简历与岗位的匹配度
    1. 根据 resume_id 获取简历文本
    2. 调用大模型分析
    3. 保存记录并返回结果
    """
    # 1. 获取简历
    resume = db.query(Resume).filter(Resume.id == request.resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    # 2. 调用分析服务
    try:
        result_dict = analyze_job_match(
            resume_content=resume.content,
            job_title=request.job_title,
            job_description=request.job_description,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分析失败：{str(e)}")

    # 3. 保存分析记录
    record = AnalysisRecord(
        resume_id=request.resume_id,
        job_title=request.job_title,
        job_description=request.job_description,
        match_score=result_dict["match_score"],
        result_json=result_dict,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return AnalysisResponse(
        id=record.id,
        resume_id=record.resume_id,
        job_title=record.job_title,
        match_score=record.match_score,
        result_json=result_dict,
        created_at=record.created_at,
    )
