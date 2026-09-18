"""
系统配置中心与大模型设置 API 路由
- 支持图形化查看与配置大模型供应商 (DeepSeek/SiliconFlow/DashScope/Ollama/OpenAI/Custom)
- 免重启即时热更新运行态 LLM 客户端
- 支持一键连通性极速探测 (1-token ping) 与智能中文排障诊断
"""
import re
import time
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL
from ..database import get_db
from ..models import SystemSetting
from ..schemas import (
    SystemSettingResponse,
    SystemSettingTestRequest,
    SystemSettingTestResponse,
    SystemSettingUpdateRequest,
)
from ..services.llm_client import llm_client

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _mask_key(key: str | None) -> str:
    """安全脱敏 API Key"""
    if not key or key == "your_deepseek_api_key_here":
        return ""
    if len(key) <= 8:
        return "****"
    return f"{key[:4]}****{key[-4:]}"


def _get_or_create_setting(db: Session) -> tuple[SystemSetting, str]:
    """获取或初始化系统配置单例 (ID=1)"""
    setting = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
    if setting:
        return setting, "database"

    # 若数据库尚未初始化过，则根据环境配置创建默认单例
    default_provider = "deepseek"
    default_base = DEEPSEEK_BASE_URL or "https://api.deepseek.com"
    default_model = DEEPSEEK_MODEL or "deepseek-chat"
    default_key = DEEPSEEK_API_KEY if DEEPSEEK_API_KEY != "your_deepseek_api_key_here" else ""

    setting = SystemSetting(
        id=1,
        provider=default_provider,
        base_url=default_base,
        model=default_model,
        api_key=default_key,
        temperature=0.3,
        max_tokens=4096,
        is_mock_mode=None,
    )
    db.add(setting)
    try:
        db.commit()
        db.refresh(setting)
        return setting, "env"
    except Exception:
        db.rollback()
        # 回退为只读对象
        return setting, "default"


@router.get("", response_model=SystemSettingResponse)
def get_settings(db: Session = Depends(get_db)):
    """获取当前系统大模型配置与运行状态"""
    setting, source = _get_or_create_setting(db)

    effective_key = setting.api_key or DEEPSEEK_API_KEY or ""
    has_key = bool(effective_key and effective_key != "your_deepseek_api_key_here")

    return SystemSettingResponse(
        provider=setting.provider,
        base_url=setting.base_url,
        model=setting.model,
        masked_api_key=_mask_key(effective_key),
        has_api_key=has_key,
        temperature=setting.temperature or 0.3,
        max_tokens=setting.max_tokens or 4096,
        is_mock_mode=setting.is_mock_mode,
        active_mock_mode=llm_client.mock_mode,
        source=source,
        updated_at=setting.updated_at or datetime.now(),
    )


@router.post("", response_model=SystemSettingResponse)
def update_settings(req: SystemSettingUpdateRequest, db: Session = Depends(get_db)):
    """保存配置并即时热更新运行态客户端"""
    setting, _ = _get_or_create_setting(db)

    setting.provider = req.provider.strip()
    setting.base_url = req.base_url.strip().rstrip("/")
    setting.model = req.model.strip()
    setting.temperature = req.temperature
    setting.max_tokens = req.max_tokens
    setting.is_mock_mode = req.is_mock_mode

    # 防误清空机制：只有提供了不带星号的非空新 Key，才更新存储密钥
    if req.api_key is not None:
        new_key = req.api_key.strip()
        if new_key and "*" not in new_key:
            setting.api_key = new_key
        elif new_key == "":
            setting.api_key = ""

    db.commit()
    db.refresh(setting)

    # 毫秒级热替换当前运行态单例
    llm_client.reload(
        api_key=setting.api_key,
        base_url=setting.base_url,
        model=setting.model,
        mock_mode=setting.is_mock_mode,
    )

    effective_key = setting.api_key or DEEPSEEK_API_KEY or ""
    has_key = bool(effective_key and effective_key != "your_deepseek_api_key_here")

    return SystemSettingResponse(
        provider=setting.provider,
        base_url=setting.base_url,
        model=setting.model,
        masked_api_key=_mask_key(effective_key),
        has_api_key=has_key,
        temperature=setting.temperature,
        max_tokens=setting.max_tokens,
        is_mock_mode=setting.is_mock_mode,
        active_mock_mode=llm_client.mock_mode,
        source="database",
        updated_at=setting.updated_at or datetime.now(),
    )


@router.post("/test", response_model=SystemSettingTestResponse)
def test_connection(req: SystemSettingTestRequest, db: Session = Depends(get_db)):
    """
    一键连通性极速探测
    - 发起超轻量 1-token ping 请求，测量响应延迟
    - 精准定位 401 密钥失效、404 端点路径错误、429 限流额度耗尽等问题
    """
    clean_base = req.base_url.strip().rstrip("/")
    clean_base = re.sub(r"/v1/?$", "", clean_base)
    endpoint = f"{clean_base}/v1/chat/completions"

    # 解析有效待测 API Key
    candidate_key = (req.api_key or "").strip()
    if not candidate_key or "*" in candidate_key:
        setting = db.query(SystemSetting).filter(SystemSetting.id == 1).first()
        if setting and setting.api_key:
            candidate_key = setting.api_key
        else:
            candidate_key = DEEPSEEK_API_KEY if DEEPSEEK_API_KEY != "your_deepseek_api_key_here" else ""

    headers = {
        "Content-Type": "application/json",
    }
    if candidate_key:
        headers["Authorization"] = f"Bearer {candidate_key}"
    elif req.provider != "ollama":
        return SystemSettingTestResponse(
            success=False,
            latency_ms=0,
            message="未提供 API Key，无法连接需鉴权的云端大模型服务。若使用本地 Ollama 请选择 Ollama 预设。",
            model_used=req.model,
            status_code=400,
        )

    payload = {
        "model": req.model.strip(),
        "messages": [{"role": "user", "content": "hi"}],
        "max_tokens": 1,
    }

    start_time = time.perf_counter()
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(endpoint, json=payload, headers=headers)
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            if resp.status_code == 200:
                return SystemSettingTestResponse(
                    success=True,
                    latency_ms=elapsed_ms,
                    message=f"连接成功！服务正常响应 (耗时 {elapsed_ms}ms)",
                    model_used=req.model,
                    status_code=200,
                )

            status_code = resp.status_code
            if status_code == 401:
                detail = "API Key 认证失败 (401)。建议：检查密钥是否输入正确、是否存在空格或已被平台撤销。"
            elif status_code == 404:
                detail = f"端点路径不存在 (404)。目标: {endpoint}。建议：检查 Base URL 是否正确，或是否重复添加了 /v1。"
            elif status_code == 429:
                detail = "请求过多或账户额度耗尽 (429)。建议：前往模型服务商控制台检查账户余额或流控策略。"
            elif status_code == 400:
                err_text = resp.text[:150]
                detail = f"请求参数错误 (400)。模型名称可能不存在: {req.model}。服务商返回: {err_text}"
            else:
                detail = f"服务商返回 HTTP {status_code}：{resp.text[:120]}"

            return SystemSettingTestResponse(
                success=False,
                latency_ms=elapsed_ms,
                message=detail,
                model_used=req.model,
                status_code=status_code,
            )

    except httpx.ConnectTimeout:
        return SystemSettingTestResponse(
            success=False,
            latency_ms=10000,
            message="连接超时 (10s)。目标服务器未能及时响应。若为本地 Ollama，请确认本机 11434 端口已开启。",
            model_used=req.model,
            status_code=504,
        )
    except httpx.ConnectError as e:
        return SystemSettingTestResponse(
            success=False,
            latency_ms=0,
            message=f"无法建立网络连接。请检查 Base URL 地址拼写是否正确或网络是否畅通。({str(e)[:80]})",
            model_used=req.model,
            status_code=502,
        )
    except Exception as e:
        return SystemSettingTestResponse(
            success=False,
            latency_ms=0,
            message=f"探测请求发生异常：{str(e)}",
            model_used=req.model,
            status_code=500,
        )
