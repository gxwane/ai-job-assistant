"""
插件服务
处理来自浏览器插件的岗位捕获和分析
V2: 集成结构化解析引擎 + 硬性技能匹配 + 综合推荐指数
"""
import json
import logging
from sqlalchemy.orm import Session
from ..models import Resume, JobRecord
from .analysis_service import analyze_job_match
from .job_parser import parse_job_text

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
    处理插件捕获的岗位信息

    新逻辑：
    1. 对 job_description 调用结构化解析引擎
    2. AI分析使用 clean_job_description（而非原始文本）
    3. 硬性技能匹配基于 job_tags
    4. 计算 composite_score = match_score * 0.8 + hr_active_score * 0.2

    Returns:
        dict with full capture result including structured fields
    """
    # ---- Step 0: 结构化解析 ----
    parsed = parse_job_text(job_description)
    job_tags = parsed["job_tags"]
    clean_jd = parsed["clean_job_description"]
    raw_job_text = parsed["raw_job_text"]
    hr_name = parsed["hr_name"]
    hr_status = parsed["hr_status"]
    hr_active_score = parsed["hr_active_score"]

    # 如果没有解析出 clean_jd，回退到原始文本
    analysis_jd = clean_jd if clean_jd else job_description

    analysis_result = None
    match_score = None
    score_level = None
    recommendation = None
    should_recommend = False
    status = "captured"
    composite_score = None

    # 如果没有指定简历，尝试使用最新上传的简历
    if not resume_id:
        latest_resume = db.query(Resume).order_by(Resume.id.desc()).first()
        if latest_resume:
            resume_id = latest_resume.id
            logger.info(f"未指定简历，自动使用最新简历 ID={resume_id}")

    # 如果有简历ID，执行匹配分析
    if resume_id:
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            return {
                "success": False,
                "job_record_id": 0,
                "message": f"简历ID {resume_id} 不存在",
                "status": "captured",
                "should_recommend": False,
                "job_tags": job_tags,
                "hr_name": hr_name,
                "hr_status": hr_status,
                "hr_active_score": hr_active_score,
                "composite_score": composite_score,
            }

        # ---- Step 1: AI分析使用 clean_job_description ----
        try:
            analysis_result = analyze_job_match(
                resume_content=resume.content,
                job_title=job_title,
                job_description=analysis_jd,
            )
        except Exception as e:
            logger.error(f"分析失败: {e}")
            analysis_result = None

        if analysis_result:
            match_score = analysis_result.get("match_score", 0)

            # ---- Step 2: 硬性技能匹配（基于 job_tags） ----
            hard_skill_result = _hard_skill_match(job_tags, resume.content)
            if hard_skill_result["total_tags"] > 0:
                # 注入硬性技能匹配结果到 analysis_result
                analysis_result["job_tags"] = job_tags
                analysis_result["matched_job_tags"] = hard_skill_result["matched"]
                analysis_result["missing_job_tags"] = hard_skill_result["missing"]
                analysis_result["hard_skill_hit_rate"] = hard_skill_result["hit_rate"]

                # 硬性技能上限规则
                hit_rate = hard_skill_result["hit_rate"]
                for threshold, cap in [(0.2, 45), (0.4, 60), (0.6, 75)]:
                    if hit_rate < threshold:
                        orig_score = match_score
                        match_score = min(match_score, cap)
                        if orig_score > match_score:
                            cap_reasons = analysis_result.get("score_cap_reason", "")
                            new_reason = f"硬性技能标签命中率过低（{hit_rate:.0%} < {threshold:.0%}），分数上限{cap}分"
                            analysis_result["score_cap_reason"] = (
                                f"{cap_reasons}；{new_reason}" if cap_reasons else new_reason
                            )
                            if not analysis_result.get("risk_warnings"):
                                analysis_result["risk_warnings"] = []
                            analysis_result["risk_warnings"].append(new_reason)
                            analysis_result["match_score"] = match_score
                        break  # 只应用最严格的上限

            # ---- Step 3: 计算综合推荐指数 ----
            composite_score = round(match_score * 0.8 + hr_active_score * 0.2)
            analysis_result["composite_score"] = composite_score
            analysis_result["hr_status"] = hr_status
            analysis_result["hr_active_score"] = hr_active_score

            score_level = analysis_result.get("score_level", "")
            recommendation = analysis_result.get("recommendation", "")

            if match_score >= DEFAULT_RECOMMEND_THRESHOLD:
                status = "recommended"
                should_recommend = True
            else:
                status = "analyzed"
                should_recommend = False

    # 构建分析结果JSON
    analysis_json = analysis_result if analysis_result else None
    score_breakdown = analysis_result.get("score_breakdown") if analysis_result else None

    # 去重：同一公司+同一岗位视为重复
    existing = db.query(JobRecord).filter(
        JobRecord.company == company,
        JobRecord.job_title == job_title,
    ).first() if company else None

    # 序列化 job_tags
    job_tags_str = json.dumps(job_tags, ensure_ascii=False) if job_tags else None

    if existing:
        # 更新已有记录
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
        existing.composite_score = composite_score
        if resume_id:
            existing.resume_id = resume_id
        if analysis_json:
            existing.match_score = match_score
            existing.score_level = score_level
            existing.recommendation = recommendation
            existing.score_breakdown = score_breakdown
            existing.analysis_result_json = analysis_json
            existing.status = status
        db.commit()
        db.refresh(existing)
        logger.info(f"[去重] 同公司+同岗位已存在 ID={existing.id}，更新记录")
        job_record = existing
        is_duplicate = True
    else:
        # 新建记录
        job_record = JobRecord(
            resume_id=resume_id,
            job_title=job_title,
            company=company,
            salary=salary,
            location=location,
            job_url=job_url,
            job_description=clean_jd if clean_jd else job_description,
            match_score=match_score,
            score_level=score_level,
            recommendation=recommendation,
            score_breakdown=score_breakdown,
            analysis_result_json=analysis_json,
            status=status,
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
            composite_score=composite_score,
        )
        db.add(job_record)
        db.commit()
        db.refresh(job_record)
        is_duplicate = False

    # 构建响应消息
    if resume_id and analysis_result:
        message = f"分析完成，匹配度{score_level}，分数：{match_score}分"
        if is_duplicate:
            message += "（已有记录已更新）"
    elif resume_id and not analysis_result:
        message = "AI分析失败，已保存岗位记录，可稍后重新分析"
    else:
        message = "未选择简历，已保存岗位记录，可上传简历后重新分析"

    return {
        "success": True,
        "job_record_id": job_record.id,
        "match_score": match_score,
        "score_level": score_level,
        "recommendation": recommendation,
        "should_recommend": should_recommend,
        "status": status,
        "message": message,
        "job_tags": job_tags,
        "hr_name": hr_name,
        "hr_status": hr_status,
        "hr_active_score": hr_active_score,
        "composite_score": composite_score,
    }


def _hard_skill_match(job_tags: list, resume_text: str) -> dict:
    """
    硬性技能匹配：计算简历中命中了多少岗位标签

    Args:
        job_tags: 岗位标签列表
        resume_text: 简历全文

    Returns:
        {"total_tags": N, "matched": [...], "missing": [...], "hit_rate": 0.0-1.0}
    """
    from .job_parser import clean_job_tags_for_matching

    # 二次清洗：确保HR状态/姓名/噪声不进匹配
    job_tags = clean_job_tags_for_matching(job_tags)

    if not job_tags:
        return {"total_tags": 0, "matched": [], "missing": [], "hit_rate": 1.0}

    total = len(job_tags)
    matched = []
    missing = []

    resume_lower = resume_text.lower()

    for tag in job_tags:
        # 直接子串匹配（不区分大小写）
        if tag.lower() in resume_lower:
            matched.append(tag)
        else:
            # 对于缩写或复合词，尝试部分匹配
            # 如 "SpringCloud" 简历中可能写 "Spring Cloud"
            partial_match = False
            if len(tag) > 4:
                # 尝试在简历中找包含该标签片段的词
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
