"""
面试题生成服务
负责基于岗位信息与简历内容，调用大模型流式生成高频面试问答题，并提供鲁棒的 JSON 截断容错修复能力。
"""
import json
import logging
import re

from ..prompts.job_match_prompt import INTERVIEW_QUESTIONS_PROMPT
from .llm_client import llm_client

logger = logging.getLogger(__name__)


def generate_job_interview_questions(job_title: str, job_description: str, resume_content: str) -> dict:
    """
    调用大模型为岗位和简历生成 30 道高频面试问答题

    Args:
        job_title: 岗位名称
        job_description: 岗位描述 JD
        resume_content: 候选人简历内容

    Returns:
        解析并校验后的面试题字典数据
    """
    prompt = INTERVIEW_QUESTIONS_PROMPT.format(
        resume_content=resume_content[:4000],
        job_title=job_title,
        job_description=job_description[:3000],
    )

    system_prompt = "你是一名资深技术面试官。你必须严格使用中文回复，只输出JSON，不要任何额外文本。"
    try:
        raw_response = llm_client.chat_stream(
            system_prompt=system_prompt,
            user_prompt=prompt,
            temperature=0.3,
            max_tokens=16384,
            timeout=240.0,
        )
        return parse_interview_json(raw_response)
    except Exception as e:
        raw = raw_response[:300] if "raw_response" in locals() else ""
        logger.error(f"面试题生成失败: {e}\n原始响应前300: {raw}")
        raise RuntimeError(f"面试题生成失败：{str(e)}") from e


def parse_interview_json(raw_text: str) -> dict:
    """
    鲁棒解析大模型返回的 JSON 字符串
    支持自动剔除 Markdown 标记、单双引号纠偏、控制字符清洗与截断括号自动闭合
    """
    text = raw_text.strip()

    # 去掉 Markdown 代码块包裹
    m = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if m:
        text = m.group(1).strip()

    # 截取 JSON 起止位置
    start = text.find("{")
    if start == -1:
        raise ValueError("未找到有效 JSON 起始位置")

    end = text.rfind("}") + 1
    json_str = text[start:end] if end > start else text[start:]

    errors = []
    for attempt in range(5):
        try:
            # 首次及后续每次均尝试自动闭合未完括号
            candidate = close_truncated_json(json_str) if attempt > 0 else json_str
            return json.loads(candidate)
        except json.JSONDecodeError as e:
            errors.append(str(e))
            if attempt == 0:
                # 修复1: 移除尾部多余逗号并尝试闭合
                json_str = re.sub(r",\s*}", "}", json_str)
                json_str = re.sub(r",\s*]", "]", json_str)
                json_str = close_truncated_json(json_str)
            elif attempt == 1:
                # 修复2: 单引号替换为双引号
                json_str = re.sub(r"'", '"', json_str)
            elif attempt == 2:
                # 修复3: 清洗控制字符
                json_str = re.sub(r"[\x00-\x1f\x7f]", " ", json_str)
            elif attempt == 3:
                # 修复4: 去除最后一个残缺的逗号项再闭合
                last_comma = json_str.rfind(",")
                if last_comma > 0:
                    json_str = json_str[:last_comma]
                    json_str = close_truncated_json(json_str)

    raise ValueError(f"JSON 解析全部失败: {'; '.join(errors[:2])}")


def close_truncated_json(s: str) -> str:
    """补全被截断的 JSON：闭合未完成的引号并按括号栈补齐闭包"""
    stack = []
    in_string = False
    escape = False

    for ch in s:
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch in "{[":
            stack.append(ch)
        elif ch == "}":
            if stack and stack[-1] == "{":
                stack.pop()
        elif ch == "]":
            if stack and stack[-1] == "[":
                stack.pop()

    # 若末尾字符串未闭合，先闭合引号
    if in_string:
        s += '"'

    s = s.rstrip()
    if s.endswith(","):
        s = s[:-1].rstrip()

    # 逆序压栈补齐闭合括号
    for ch in reversed(stack):
        s += "]" if ch == "[" else "}"

    return s

