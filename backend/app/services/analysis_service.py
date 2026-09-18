"""
分析服务
组合简历解析、大模型调用、后端硬规则评分
"""
import json
import re
import logging
from .llm_client import llm_client
from ..prompts.job_match_prompt import JOB_MATCH_PROMPT

logger = logging.getLogger(__name__)


def analyze_job_match(resume_content: str, job_title: str, job_description: str) -> dict:
    """
    分析简历与岗位的匹配度
    Args:
        resume_content: 简历文本内容
        job_title: 岗位名称
        job_description: 岗位JD文本
    Returns:
        结构化的分析结果字典
    """
    # 构造 Prompt
    prompt = JOB_MATCH_PROMPT.format(
        resume_content=resume_content,
        job_title=job_title,
        job_description=job_description,
    )

    # 调用大模型（或 mock）
    system_prompt = "你是一名专业的求职顾问，擅长分析简历与岗位的匹配度。你必须严格使用中文回复，只输出JSON。"
    raw_response = llm_client.chat(
        system_prompt=system_prompt,
        user_prompt=prompt,
    )

    # 解析大模型返回的 JSON
    llm_result = _parse_llm_json(raw_response)

    # 数据校验和修正
    llm_result = _validate_and_fix(llm_result)

    # 后端硬规则计算最终分数
    final_result = calculate_final_score(llm_result, job_description)

    return final_result


def calculate_final_score(llm_result: dict, job_description: str) -> dict:
    """
    后端硬规则评分引擎
    根据大模型的结构化分析结果，计算最终的匹配分数

    硬性封顶规则（按优先级）：
    1. category_match=false → max 35
    2. core_skill_hit_rate < 0.15 → max 35
    3. core_skill_hit_rate < 0.30 → max 50
    4. matched_core_skills 为空 → max 40
    5. JD过短（<80字）→ max 45
    """
    score_cap_reasons = []
    final_cap = 100

    # 提取分项评分并裁剪到有效范围
    skill_score = max(0, min(40, int(llm_result.get("skill_score", 0))))
    project_score = max(0, min(30, int(llm_result.get("project_score", 0))))
    education_score = max(0, min(15, int(llm_result.get("education_score", 0))))
    potential_score = max(0, min(15, int(llm_result.get("potential_score", 0))))

    raw_total = skill_score + project_score + education_score + potential_score

    # 获取其他关键字段
    category_match = llm_result.get("category_match", True)
    core_skill_hit_rate = llm_result.get("core_skill_hit_rate", 0)
    matched_core_skills = llm_result.get("matched_core_skills", [])

    # 硬性封顶规则
    if category_match is False:
        cap = 35
        if cap < final_cap:
            final_cap = cap
            score_cap_reasons.append("岗位方向不匹配（category_match=false），分数上限35分")

    if isinstance(core_skill_hit_rate, (int, float)) and core_skill_hit_rate < 0.15:
        cap = 35
        if cap < final_cap:
            final_cap = cap
            score_cap_reasons.append(f"核心技能命中率过低（{core_skill_hit_rate:.0%} < 15%），分数上限35分")
    elif isinstance(core_skill_hit_rate, (int, float)) and core_skill_hit_rate < 0.30:
        cap = 50
        if cap < final_cap:
            final_cap = cap
            score_cap_reasons.append(f"核心技能命中率偏低（{core_skill_hit_rate:.0%} < 30%），分数上限50分")

    if not matched_core_skills or len(matched_core_skills) == 0:
        cap = 40
        if cap < final_cap:
            final_cap = cap
            score_cap_reasons.append("无任何核心技能匹配，分数上限40分")

    if len(job_description.strip()) < 80:
        cap = 45
        if cap < final_cap:
            final_cap = cap
            score_cap_reasons.append("岗位描述过短（不足80字），分析结果仅供参考，分数上限45分")

    # 应用封顶
    final_score = min(raw_total, final_cap)
    final_score = max(0, min(100, final_score))

    # 评分等级
    if final_score >= 85:
        score_level = "高度匹配"
    elif final_score >= 70:
        score_level = "良好匹配"
    elif final_score >= 50:
        score_level = "部分匹配"
    elif final_score >= 30:
        score_level = "勉强匹配"
    else:
        score_level = "不推荐"

    # 自动生成 recommendation
    recommendation = _generate_recommendation(final_score, score_level, category_match)

    # 构建分项评分明细
    score_breakdown = {
        "skill_score": skill_score,
        "project_score": project_score,
        "education_score": education_score,
        "potential_score": potential_score,
        "raw_total": raw_total,
        "final_cap": final_cap if final_cap < 100 else None,
        "final_score": final_score,
    }

    # 合并结果
    result = dict(llm_result)
    result["match_score"] = final_score
    result["score_breakdown"] = score_breakdown
    result["score_level"] = score_level
    result["recommendation"] = recommendation
    result["score_cap_reason"] = "；".join(score_cap_reasons) if score_cap_reasons else None
    result["risk_warnings"] = llm_result.get("risk_warnings", [])

    # 确保原有字段存在
    result.setdefault("summary", "分析完成，请查看详细结果。")

    return result


def _generate_recommendation(score: int, level: str, category_match: bool) -> str:
    """根据分数和等级自动生成投递建议"""
    if not category_match:
        return "该岗位与您的职业方向差异较大，不建议投递。建议寻找与自身技术栈和职业方向更匹配的岗位。"
    if score >= 85:
        return "匹配度很高，强烈推荐投递！您的技能和经验与该岗位高度契合，面试成功率较高。"
    if score >= 70:
        return "匹配度良好，建议投递。您的核心技能基本满足岗位要求，可在面试中重点展示相关项目经验。"
    if score >= 50:
        return "匹配度中等，可尝试投递。建议针对缺失技能进行短期补充学习，提升竞争力。"
    if score >= 30:
        return "匹配度偏低，谨慎投递。您的技能与该岗位要求差距较大，建议先通过学习和项目积累弥补短板。"
    return "匹配度很低，不建议投递。建议重新评估职业方向，寻找与自身背景更匹配的岗位机会。"


def _parse_llm_json(raw_text: str) -> dict:
    """
    从大模型返回内容中提取 JSON
    处理可能包含 markdown 代码块标记的情况
    增强容错：多层 fallback，无法解析时返回低分默认结果
    """
    text = raw_text.strip()

    # 匹配 ```json ... ``` 或 ``` ... ```
    code_block_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if code_block_match:
        text = code_block_match.group(1).strip()

    def try_parse(t: str) -> dict:
        """尝试多种方式解析 JSON"""
        # 方式1：直接解析
        try:
            return json.loads(t)
        except json.JSONDecodeError:
            pass

        # 方式2：找到 JSON 对象的起止位置
        start = t.find("{")
        end = t.rfind("}") + 1
        if start != -1 and end > start:
            try:
                return json.loads(t[start:end])
            except json.JSONDecodeError:
                pass

        # 方式3：尝试修复常见错误（如尾部多余逗号）
        if start != -1 and end > start:
            json_str = t[start:end]
            # 移除尾部逗号（在 } 或 ] 之前）
            json_str = re.sub(r',\s*}', '}', json_str)
            json_str = re.sub(r',\s*]', ']', json_str)
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass

        raise ValueError("无法解析 JSON")

    try:
        return try_parse(text)
    except (ValueError, json.JSONDecodeError) as e:
        logger.warning(f"JSON解析失败，返回默认低分结果。原始响应前200字符: {raw_text[:200]}")
        # Fallback：返回低分默认结果，避免整个分析流程崩溃
        return _fallback_result(str(e))


def _fallback_result(error_msg: str) -> dict:
    """解析失败时的兜底结果"""
    return {
        "resume_category": "未知",
        "job_category": "未知",
        "category_match": False,
        "category_reason": f"大模型返回解析失败：{error_msg[:100]}",
        "core_job_skills": [],
        "resume_skills": [],
        "matched_core_skills": [],
        "missing_core_skills": [],
        "core_skill_hit_rate": 0.0,
        "skill_score": 0,
        "project_score": 0,
        "education_score": 0,
        "potential_score": 0,
        "risk_warnings": ["大模型返回数据解析失败，评分结果不可用，请重试"],
        "summary": "分析过程出现异常，请重新分析或检查网络连接。",
        "matched_points": [],
        "missing_skills": [],
        "resume_suggestions": [],
        "interview_questions": [],
    }


def _validate_and_fix(result: dict) -> dict:
    """
    校验和修正大模型返回的分析结果
    确保必需字段存在且格式正确
    """
    # 确保分项评分在合理范围
    for field, max_val in [("skill_score", 40), ("project_score", 30),
                            ("education_score", 15), ("potential_score", 15)]:
        val = result.get(field, 0)
        if not isinstance(val, (int, float)):
            val = 0
        result[field] = max(0, min(max_val, int(val)))

    # 确保 core_skill_hit_rate 在 0-1 之间
    rate = result.get("core_skill_hit_rate", 0)
    if not isinstance(rate, (int, float)):
        rate = 0
    result["core_skill_hit_rate"] = max(0.0, min(1.0, float(rate)))

    # 确保布尔字段
    result["category_match"] = bool(result.get("category_match", True))

    # 确保字符串字段存在
    for field in ["resume_category", "job_category", "category_reason"]:
        if not result.get(field):
            result[field] = "未知"

    # 确保列表字段存在
    for field in ["core_job_skills", "resume_skills", "matched_core_skills",
                   "missing_core_skills", "risk_warnings", "matched_points",
                   "missing_skills", "resume_suggestions"]:
        if not isinstance(result.get(field), list):
            result[field] = []

    # 确保 summary 存在
    if not result.get("summary"):
        result["summary"] = "分析完成，请查看详细结果。"

    # 确保 interview_questions 格式正确
    questions = result.get("interview_questions", [])
    if not isinstance(questions, list):
        questions = []
    result["interview_questions"] = [
        {"question": q.get("question", ""), "answer": q.get("answer", "")}
        if isinstance(q, dict) else {"question": str(q), "answer": ""}
        for q in questions
    ]

    return result
