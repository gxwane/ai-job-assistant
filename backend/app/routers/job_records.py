"""
岗位记录管理 API 路由
管理插件捕获的岗位记录（CRUD + 状态筛选 + 批量操作 + 面试题生成）
"""
import json
import logging
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
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
from ..services.llm_client import llm_client
from ..prompts.job_match_prompt import INTERVIEW_QUESTIONS_PROMPT

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
    """获取单条岗位记录详情（含分析结果JSON）"""
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


@router.post("/{record_id}/generate-interview-questions")
def generate_interview_questions(record_id: int, db: Session = Depends(get_db)):
    """
    为大模型生成30道面试高频问答题（按概率排序）
    仅在收到面试后被调用，避免浪费大模型资源
    """
    record = db.query(JobRecord).filter(JobRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="岗位记录不存在")

    # 已生成过则直接返回缓存
    if record.interview_questions_json:
        return {
            "exists": True,
            "cached": True,
            "data": record.interview_questions_json,
        }

    # 获取简历内容
    resume_text = ""
    if record.resume_id:
        resume = db.query(Resume).filter(Resume.id == record.resume_id).first()
        if resume:
            resume_text = resume.content

    if not resume_text:
        raise HTTPException(status_code=400, detail="该岗位未关联简历，无法生成面试题")

    # 调用大模型生成面试题
    prompt = INTERVIEW_QUESTIONS_PROMPT.format(
        resume_content=resume_text[:4000],
        job_title=record.job_title,
        job_description=record.job_description[:3000],
    )

    system_prompt = "你是一名资深技术面试官。你必须严格使用中文回复，只输出JSON，不要任何额外文本。"
    try:
        raw_response = llm_client.chat_stream(
            system_prompt=system_prompt,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=16384,
            timeout=240.0,  # 流式输出，4分钟兜底超时
        )
        questions_data = _parse_interview_json(raw_response)
    except Exception as e:
        raw = raw_response[:300] if 'raw_response' in dir() else ''
        logger.error(f"面试题生成失败: {e}\n原始响应前300: {raw}")
        raise HTTPException(status_code=500, detail=f"面试题生成失败：{str(e)}")

    # 保存到数据库
    record.interview_questions_json = questions_data
    db.commit()

    return {
        "exists": True,
        "cached": False,
        "data": questions_data,
    }


def _parse_interview_json(raw_text: str) -> dict:
    """兼容大模型返回的各种JSON格式问题（含截断修复）"""
    text = raw_text.strip()

    # 去掉markdown代码块
    m = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if m:
        text = m.group(1).strip()

    # 找到JSON起止
    start = text.find("{")
    end = text.rfind("}") + 1
    if start == -1 or end <= start:
        raise ValueError("未找到有效JSON")

    json_str = text[start:end]

    # 尝试多种修复
    errors = []
    for attempt in range(5):
        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            errors.append(str(e))
            if attempt == 0:
                # 修复1: 移除尾部逗号
                json_str = re.sub(r',\s*}', '}', json_str)
                json_str = re.sub(r',\s*]', ']', json_str)
            elif attempt == 1:
                # 修复2: 单引号改双引号
                json_str = re.sub(r"'", '"', json_str)
            elif attempt == 2:
                # 修复3: 去掉未转义控制字符
                json_str = re.sub(r'[\x00-\x1f\x7f]', ' ', json_str)
            elif attempt == 3:
                # 修复4: 补全截断的JSON（缺少 } 或 ]）
                json_str = _close_truncated_json(json_str)
            elif attempt == 4:
                # 修复5: 去掉最后不完整的元素再试
                last_comma = json_str.rfind(',\n')
                if last_comma > 0:
                    json_str = json_str[:last_comma] + '\n  ]\n}'
                    json_str = _close_truncated_json(json_str)

    raise ValueError(f"JSON解析全部失败: {'; '.join(errors[:2])}")


def _close_truncated_json(s: str) -> str:
    """补全被截断的JSON：统计未闭合的括号并补上"""
    stack = []
    in_string = False
    escape = False
    for ch in s:
        if escape:
            escape = False
            continue
        if ch == '\\' and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in '{[':
            stack.append(ch)
        elif ch == '}':
            if stack and stack[-1] == '{':
                stack.pop()
        elif ch == ']':
            if stack and stack[-1] == '[':
                stack.pop()

    # 去掉可能被截断的最后一个不完整元素
    s = re.sub(r',\s*$', '', s)
    s = re.sub(r'"[^"]*$', '"', s)
    s = re.sub(r'[^\s]*$', '', s)
    s = s.rstrip()

    # 补上缺失的闭合括号
    for ch in reversed(stack):
        s += ']' if ch == '[' else '}'
    return s
