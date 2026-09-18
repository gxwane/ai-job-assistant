"""
浏览器插件 API 路由
处理来自 Chrome 插件的岗位捕获和状态更新
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import JobRecord
from ..schemas import (
    PluginJobCaptureRequest,
    PluginJobCaptureResponse,
    MarkCommunicatedRequest,
)
from ..services.plugin_service import capture_job_from_plugin

router = APIRouter(prefix="/api/plugin", tags=["浏览器插件"])


@router.post("/job-capture", response_model=PluginJobCaptureResponse)
def job_capture(
    request: PluginJobCaptureRequest,
    db: Session = Depends(get_db),
):
    """
    插件发送岗位信息并触发匹配分析

    处理逻辑：
    1. 校验必填字段
    2. 如果 resume_id 为空 → 只保存岗位记录，不分析
    3. 如果 resume_id 有值 → 调用分析服务，保存结果
    4. 分数 >= 70 → status=recommended, should_recommend=true
    5. 分数 < 70 或分析失败 → status=analyzed, should_recommend=false
    """
    result = capture_job_from_plugin(
        db=db,
        resume_id=request.resume_id,
        job_title=request.job_title,
        job_description=request.job_description,
        job_url=request.job_url,
        company=request.company,
        salary=request.salary,
        location=request.location,
        captured_page_url=request.captured_page_url,
        card_index=request.card_index,
        job_unique_key=request.job_unique_key,
        scan_session_id=request.scan_session_id,
    )

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return PluginJobCaptureResponse(**result)


@router.post("/job-records/{record_id}/communicated")
def mark_communicated(
    record_id: int,
    request: MarkCommunicatedRequest = MarkCommunicatedRequest(),
    db: Session = Depends(get_db),
):
    """
    标记岗位为"已沟通"
    插件用户点击"一键沟通"后调用
    """
    record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="岗位记录不存在")

    record.status = "communicated"
    record.communicated_at = datetime.now()
    db.commit()

    return {
        "message": "已标记为已沟通",
        "record_id": record_id,
        "status": "communicated",
        "communicated_at": record.communicated_at.isoformat(),
    }


@router.post("/job-records/{record_id}/ignored")
def mark_ignored(
    record_id: int,
    db: Session = Depends(get_db),
):
    """
    标记岗位为"已忽略"
    """
    record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="岗位记录不存在")

    record.status = "ignored"
    db.commit()

    return {
        "message": "已标记为已忽略",
        "record_id": record_id,
        "status": "ignored",
    }


@router.post("/job-records/{record_id}/interview")
def mark_interview(
    record_id: int,
    db: Session = Depends(get_db),
):
    """
    标记岗位为"收到面试"
    """
    record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="岗位记录不存在")

    record.status = "interview"
    db.commit()

    return {
        "message": "已标记为收到面试",
        "record_id": record_id,
        "status": "interview",
    }
