"""
插件服务
处理来自浏览器插件的岗位捕获和分析
V3: 异步解耦 - 同步保存 + BackgroundTasks 后台分析
"""
import json
import logging
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..models import Resume, JobRecord
from .analysis_service import analyze_job_match
from .job_parser import parse_job_text, clean_job_tags_for_matching

logger = logging.getLogger(__name__)

# 默认推荐阈值
DEFAULT_RECOMMEND_THRESHOLD = 70


def capture_job_from_plugin(
    db: Session,
    resume_id: int | None,
    job_title: str,
    job_description: str,
    job_url: str,
    company: str | None = None,
    salary: str | None = None,
    location: str | None = None,
    captured_page_url: str | None = None,
    card_index: int | None = None,
    job_unique_key: str | None = None,
    scan_session_id: str | None = None,
) -> dict:
    """
    【同步阶段】处理插件捕获的岗位信息

    只执行本地快速操作，立即返回：
    1. 对 job_description 调用结构化解析引擎（本地，约 50ms）
    2. 去重查询（同公司+同岗位）
    3. 保存 / 更新 JobRecord（包含防御性防并发覆盖）
    4. 返回 job_record_id 及 needs_new_bg_task 供路由层调度和插件侧轮询

    LLM 分析（耗时 3~15 秒）由 run_analysis_background() 在后台完成。
    """
    # ---- Step 0: 本地结构化解析（快速）----
    parsed = parse_job_text(job_description)
    job_tags = parsed["job_tags"]
    clean_jd = parsed["clean_job_description"]
    raw_job_text = parsed["raw_job_text"]
    hr_name = parsed["hr_name"]
    hr_status = parsed["hr_status"]
    hr_active_score = parsed["hr_active_score"]

    # 序列化 job_tags
    job_tags_str = json.dumps(job_tags, ensure_ascii=False) if job_tags else None

    # 如果没有指定简历，尝试使用最新上传的简历
    effective_resume_id = resume_id
    if not effective_resume_id:
        latest_resume = db.query(Resume).order_by(Resume.id.desc()).first()
        if latest_resume:
            effective_resume_id = latest_resume.id
            logger.info(f"未指定简历，自动使用最新简历 ID={effective_resume_id}")

    # 决定 analysis_status
    # 有简历 → pending（等待后台 LLM）；无简历 → done（无需分析）
    analysis_status = "pending" if effective_resume_id else "done"

    # ---- Step 1: 去重（同公司+同岗位）----
    existing = (
        db.query(JobRecord)
        .filter(
            JobRecord.company == company,
            JobRecord.job_title == job_title,
        )
        .first()
        if company
        else None
    )

    needs_new_bg_task = False

    if existing:
        # 更新已有记录的基本元数据字段
        existing.job_description = clean_jd if clean_jd else job_description
        existing.job_url = job_url
        existing.salary = salary
        existing.location = location
        existing.captured_page_url = captured_page_url
        existing.card_index = card_index
        existing.raw_job_text = raw_job_text
        existing.clean_job_description = clean_jd
        existing.job_tags = job_tags_str
        existing.hr_name = hr_name
        existing.hr_status = hr_status
        existing.hr_active_score = hr_active_score

        if effective_resume_id:
            existing.resume_id = effective_resume_id
            # S3: 仅当已完成或之前失败时，才重置状态重新分析，防止覆盖 running/pending
            if existing.analysis_status in ("done", "failed"):
                existing.analysis_status = "pending"
                needs_new_bg_task = True
            else:
                needs_new_bg_task = False
        else:
            existing.analysis_status = "done"
            needs_new_bg_task = False

        db.commit()
        db.refresh(existing)
        logger.info(f"[去重] 同公司+同岗位已存在 ID={existing.id}，状态={existing.analysis_status}，派发新任务={needs_new_bg_task}")
        job_record = existing
    else:
        # 新建记录
        needs_new_bg_task = (analysis_status == "pending")
        job_record = JobRecord(
            resume_id=effective_resume_id,
            job_title=job_title,
            company=company,
            salary=salary,
            location=location,
            job_url=job_url,
            job_description=clean_jd if clean_jd else job_description,
            status="captured",
            analysis_status=analysis_status,
            source="boss_plugin",
            captured_page_url=captured_page_url,
            card_index=card_index,
            job_unique_key=job_unique_key,
            scan_session_id=scan_session_id,
            raw_job_text=raw_job_text,
            clean_job_description=clean_jd,
            job_tags=job_tags_str,
            hr_name=hr_name,
            hr_status=hr_status,
            hr_active_score=hr_active_score,
        )
        db.add(job_record)
        db.commit()
        db.refresh(job_record)

    return {
        "success": True,
        "job_record_id": job_record.id,
        "analysis_status": job_record.analysis_status,
        "status": job_record.status,
        "needs_new_bg_task": needs_new_bg_task,
        "job_tags": job_tags,
        "hr_name": hr_name,
        "hr_status": hr_status,
        "hr_active_score": hr_active_score,
        "match_score": job_record.match_score,
        "score_level": job_record.score_level,
        "recommendation": job_record.recommendation,
        "should_recommend": (job_record.status == "recommended"),
        "composite_score": job_record.composite_score,
        "message": (
            "已保存岗位，AI 分析进行中，请稍候查询结果..."
            if effective_resume_id
            else "未选择简历，已保存岗位记录，可上传简历后重新分析"
        ),
    }


def run_analysis_background(job_record_id: int) -> None:
    """
    【异步阶段】后台 AI 分析任务（由 FastAPI BackgroundTasks 调度）

    独立创建 SQLAlchemy Session，避免路由层 Session 关闭后引发
    DetachedInstanceError。

    状态流转：
        pending → running → done（成功）
                          → failed（异常）
    """
    db: Session = SessionLocal()
    try:
        job_record = db.query(JobRecord).filter(JobRecord.id == job_record_id).first()
        if not job_record:
            logger.warning(f"[BG] job_record_id={job_record_id} 不存在，跳过分析")
            return

        # 已完成或正在运行则不重复执行
        if job_record.analysis_status in ("done", "running"):
            logger.info(f"[BG] job_record_id={job_record_id} 状态={job_record.analysis_status}，跳过")
            return

        # 标记为运行中
        job_record.analysis_status = "running"
        db.commit()

        # 获取简历
        resume = (
            db.query(Resume).filter(Resume.id == job_record.resume_id).first()
            if job_record.resume_id
            else None
        )
        if not resume:
            logger.warning(f"[BG] job_record_id={job_record_id} 简历不存在，跳过分析")
            job_record.analysis_status = "done"
            db.commit()
            return

        analysis_jd = job_record.clean_job_description or job_record.job_description

        # ---- LLM 分析 ----
        analysis_result = analyze_job_match(
            resume_content=resume.content,
            job_title=job_record.job_title,
            job_description=analysis_jd,
        )

        match_score = analysis_result.get("match_score", 0)

        # ---- 硬性技能匹配 ----
        job_tags_raw = job_record.job_tags
        job_tags = json.loads(job_tags_raw) if job_tags_raw else []
        job_tags_clean = clean_job_tags_for_matching(job_tags)
        hard_skill_result = _hard_skill_match(job_tags_clean, resume.content)

        if hard_skill_result["total_tags"] > 0:
            analysis_result["job_tags"] = job_tags
            analysis_result["matched_job_tags"] = hard_skill_result["matched"]
            analysis_result["missing_job_tags"] = hard_skill_result["missing"]
            analysis_result["hard_skill_hit_rate"] = hard_skill_result["hit_rate"]

            hit_rate = hard_skill_result["hit_rate"]
            for threshold, cap in [(0.2, 45), (0.4, 60), (0.6, 75)]:
                if hit_rate < threshold:
                    orig_score = match_score
                    match_score = min(match_score, cap)
                    if orig_score > match_score:
                        cap_reasons = analysis_result.get("score_cap_reason", "")
                        new_reason = (
                            f"硬性技能标签命中率过低（{hit_rate:.0%} < {threshold:.0%}），"
                            f"分数上限{cap}分"
                        )
                        analysis_result["score_cap_reason"] = (
                            f"{cap_reasons}；{new_reason}" if cap_reasons else new_reason
                        )
                        if not analysis_result.get("risk_warnings"):
                            analysis_result["risk_warnings"] = []
                        analysis_result["risk_warnings"].append(new_reason)
                        analysis_result["match_score"] = match_score
                    break

        # ---- 综合推荐指数 ----
        hr_active_score = job_record.hr_active_score or 0
        composite_score = round(match_score * 0.8 + hr_active_score * 0.2)
        analysis_result["composite_score"] = composite_score
        analysis_result["hr_status"] = job_record.hr_status
        analysis_result["hr_active_score"] = hr_active_score

        score_level = analysis_result.get("score_level", "")
        recommendation = analysis_result.get("recommendation", "")
        score_breakdown = analysis_result.get("score_breakdown")

        new_status = (
            "recommended" if match_score >= DEFAULT_RECOMMEND_THRESHOLD else "analyzed"
        )

        # ---- 写回数据库 ----
        job_record.match_score = match_score
        job_record.score_level = score_level
        job_record.recommendation = recommendation
        job_record.score_breakdown = score_breakdown
        job_record.analysis_result_json = analysis_result
        job_record.composite_score = composite_score
        job_record.status = new_status
        job_record.analysis_status = "done"
        db.commit()

        logger.info(
            f"[BG] job_record_id={job_record_id} 分析完成 "
            f"match_score={match_score} status={new_status}"
        )

    except Exception as e:
        logger.error(f"[BG] job_record_id={job_record_id} 分析异常: {e}", exc_info=True)
        try:
            job_record = db.query(JobRecord).filter(JobRecord.id == job_record_id).first()
            if job_record and job_record.analysis_status != "done":
                job_record.analysis_status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _hard_skill_match(job_tags: list, resume_text: str) -> dict:
    """
    硬性技能匹配：计算简历中命中了多少岗位标签

    Args:
        job_tags: 岗位标签列表（已经过 clean_job_tags_for_matching 清洗）
        resume_text: 简历全文

    Returns:
        {"total_tags": N, "matched": [...], "missing": [...], "hit_rate": 0.0-1.0}
    """
    if not job_tags:
        return {"total_tags": 0, "matched": [], "missing": [], "hit_rate": 1.0}

    total = len(job_tags)
    matched = []
    missing = []

    resume_lower = resume_text.lower()

    for tag in job_tags:
        if tag.lower() in resume_lower:
            matched.append(tag)
        else:
            partial_match = False
            if len(tag) > 4:
                tag_clean = tag.lower().replace(" ", "").replace("-", "").replace("_", "")
                resume_clean = resume_lower.replace(" ", "").replace("-", "").replace("_", "")
                if tag_clean in resume_clean:
                    matched.append(tag)
                    partial_match = True
            if not partial_match:
                missing.append(tag)

    hit_rate = len(matched) / total if total > 0 else 1.0
    return {
        "total_tags": total,
        "matched": matched,
        "missing": missing,
        "hit_rate": round(hit_rate, 2),
    }
