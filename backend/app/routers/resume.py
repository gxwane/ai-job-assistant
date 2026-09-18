"""
简历上传 API 路由
"""
import hashlib
import os
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session

from ..config import ALLOWED_EXTENSIONS, UPLOAD_DIR
from ..database import get_db
from ..models import Resume
from ..schemas import ResumeResponse
from ..services.resume_parser import parse_resume

router = APIRouter(prefix="/api/resume", tags=["简历管理"])


def _compute_hash(text: str) -> str:
    """计算文本的MD5哈希（去重用）。先做归一化：去首尾空白、合并连续空白。"""
    normalized = " ".join(text.strip().split())
    return hashlib.md5(normalized.encode("utf-8")).hexdigest()


@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    上传简历文件（支持 PDF、Word、TXT）
    解析文本、去重后保存记录
    """
    # 1. 校验文件类型
    if not file.filename:
        raise HTTPException(status_code=400, detail="请选择文件")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"只支持 {ALLOWED_EXTENSIONS} 格式")

    # 2. 生成唯一文件名并保存
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # 3. 解析简历文本
    try:
        resume_text = parse_resume(file_path, file.filename)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"简历解析失败：{str(e)}")

    if not resume_text.strip():
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail="无法从文件中提取文本，请确认文件内容")

    # 4. 去重：检查是否有相同内容的简历
    content_hash = _compute_hash(resume_text)
    existing = db.query(Resume).filter(Resume.content_hash == content_hash).first()

    if existing:
        # 内容重复 → 删除刚保存的文件，刷新已有简历的时间戳使其成为"最新"
        if os.path.exists(file_path):
            os.remove(file_path)
        existing.created_at = datetime.now(UTC)
        db.commit()
        db.refresh(existing)
        print(f"[去重] 简历内容重复，刷新已有简历 ID={existing.id} ({existing.filename}) 为最新")
        return ResumeResponse(
            resume_id=existing.id,
            filename=existing.filename,
            content=existing.content,
        )

    # 5. 保存新简历
    resume = Resume(
        filename=file.filename,
        file_path=file_path,
        content=resume_text,
        content_hash=content_hash,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    return ResumeResponse(
        resume_id=resume.id,
        filename=resume.filename,
        content=resume.content,
    )


@router.get("/list")
def list_resumes(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页条数"),
    db: Session = Depends(get_db),
):
    """获取简历列表（分页）"""
    base_query = db.query(Resume)
    total = base_query.count()
    offset = (page - 1) * page_size
    resumes = base_query.order_by(desc(Resume.created_at)).offset(offset).limit(page_size).all()
    return {
        "items": [
            {
                "resume_id": r.id,
                "filename": r.filename,
                "content_preview": r.content[:120].replace("\n", " ") if r.content else "",
                "content_length": len(r.content) if r.content else 0,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "analysis_count": len(r.analysis_records),
                "job_record_count": len(r.job_records),
            }
            for r in resumes
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/default")
def get_default_resume(db: Session = Depends(get_db)):
    """
    获取最新上传的简历作为默认匹配简历
    """
    resume = db.query(Resume).order_by(desc(Resume.id)).first()
    if resume:
        return {
            "resume_id": resume.id,
            "filename": resume.filename,
            "has_resume": True,
        }
    return {
        "resume_id": None,
        "filename": None,
        "has_resume": False,
    }


@router.get("/{resume_id}/file")
def get_resume_file(resume_id: int, db: Session = Depends(get_db)):
    """获取简历原始文件（PDF/Word预览用）"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    if not resume.file_path or not os.path.exists(resume.file_path):
        raise HTTPException(status_code=404, detail="文件不存在或已被删除")
    # 根据扩展名设置MIME
    ext = resume.filename.rsplit('.', 1)[-1].lower() if '.' in resume.filename else ''
    media_map = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'txt': 'text/plain; charset=utf-8',
    }
    media_type = media_map.get(ext, 'application/octet-stream')
    return FileResponse(
        resume.file_path,
        media_type=media_type,
        filename=resume.filename,
    )


@router.get("/{resume_id}")
def get_resume_detail(resume_id: int, db: Session = Depends(get_db)):
    """获取单个简历详情（预览用）"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")
    return {
        "resume_id": resume.id,
        "filename": resume.filename,
        "content": resume.content,
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
        "file_ext": resume.filename.rsplit('.', 1)[-1].lower() if '.' in resume.filename else '',
    }


@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    """删除指定简历（级联删除关联的分析记录，插件岗位记录保留但取消关联）"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="简历不存在")

    # 清理上传的文件
    if resume.file_path and os.path.exists(resume.file_path):
        try:
            os.remove(resume.file_path)
        except OSError:
            pass

    deleted_id = resume.id
    db.delete(resume)
    db.commit()

    return {"message": "简历已删除", "deleted_id": deleted_id}


class BatchDeleteRequest(BaseModel):
    ids: list[int]


@router.post("/batch-delete")
def batch_delete_resumes(request: BatchDeleteRequest, db: Session = Depends(get_db)):
    """批量删除简历"""
    ids = request.ids
    records = db.query(Resume).filter(Resume.id.in_(ids)).all()
    deleted_ids = []
    for r in records:
        if r.file_path and os.path.exists(r.file_path):
            try:
                os.remove(r.file_path)
            except OSError:
                pass
        deleted_ids.append(r.id)
        db.delete(r)
    db.commit()
    return {"message": "批量删除成功", "deleted_count": len(deleted_ids), "deleted_ids": deleted_ids}
