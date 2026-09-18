"""
浏览器插件 API 路由
处理来自 Chrome 插件的岗位捕获和状态更新

V2: 异步解耦 - 岗位捕获立即返回 202，AI 分析在后台执行
"""
from datetime import datetime
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import JobRecord
from ..schemas import (
    AsyncTaskResponse,
    MarkCommunicatedRequest,
    PluginJobCaptureRequest,
)
from ..services.plugin_service import capture_job_from_plugin, run_analysis_background

router = APIRouter(prefix="/api/plugin", tags=["浏览器插件"])


@router.post("/job-capture", response_model=AsyncTaskResponse)
def job_capture(
    request: PluginJobCaptureRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    插件发送岗位信息并异步触发 AI 匹配分析

    处理逻辑：
    1. 本地结构化解析 + 保存岗位记录（同步，立即完成）
    2. 若有简历且需要分析，将 LLM 分析推入后台执行（BackgroundTasks）
    3. 异步任务返回 202 Accepted + analysis_status="pending"，无须分析时返回 200 OK
    4. 包含防御性兼容字段，并在 needs_new_bg_task 为真时才入队，防止并发覆盖
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

    # 仅在需要新后台任务时才加入 BackgroundTasks，防止重复并发运行
    if result.get("needs_new_bg_task", False) and result["analysis_status"] == "pending":
        background_tasks.add_task(run_analysis_background, result["job_record_id"])

    # 异步任务动态设置 202 Accepted，同步直接完成的（如无简历）返回 200 OK
    if result["analysis_status"] == "pending":
        response.status_code = status.HTTP_202_ACCEPTED

    return AsyncTaskResponse(
        job_record_id=result["job_record_id"],
        status=result["status"],
        analysis_status=result["analysis_status"],
        message=result["message"],
        job_tags=result.get("job_tags", []),
        hr_name=result.get("hr_name"),
        hr_status=result.get("hr_status"),
        hr_active_score=result.get("hr_active_score"),
        match_score=result.get("match_score"),
        score_level=result.get("score_level"),
        recommendation=result.get("recommendation"),
        should_recommend=result.get("should_recommend", False),
        composite_score=result.get("composite_score"),
    )


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
