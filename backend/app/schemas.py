"""
Pydantic 数据验证模型（请求/响应结构）
"""
from datetime import datetime
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """通用分页响应"""
    items: list[T] = Field(default_factory=list, description="当前页数据")
    total: int = Field(0, description="总记录数")
    page: int = Field(1, description="当前页码")
    page_size: int = Field(10, description="每页条数")

# ==================== 简历相关 ====================

class ResumeResponse(BaseModel):
    """简历上传后的返回数据"""
    resume_id: int
    filename: str
    content: str

    class Config:
        from_attributes = True


# ==================== 分析相关 ====================

class AnalysisRequest(BaseModel):
    """发起分析请求"""
    resume_id: int = Field(..., description="简历ID")
    job_title: str = Field(..., min_length=1, max_length=255, description="岗位名称")
    job_description: str = Field(..., min_length=10, description="岗位JD文本")


class InterviewQuestion(BaseModel):
    """面试问题"""
    question: str
    answer: str


class ScoreBreakdown(BaseModel):
    """分项评分明细"""
    skill_score: int = Field(..., ge=0, le=40, description="技能评分")
    project_score: int = Field(..., ge=0, le=30, description="项目经验评分")
    education_score: int = Field(..., ge=0, le=15, description="学历背景评分")
    potential_score: int = Field(..., ge=0, le=15, description="发展潜力评分")
    raw_total: int = Field(..., description="原始总分")
    final_cap: int | None = Field(None, description="触发的分数上限")
    final_score: int = Field(..., ge=0, le=100, description="最终分数")


class AnalysisResult(BaseModel):
    """分析结果（含新增的结构化评分字段）"""
    # 原有字段
    match_score: int = Field(..., ge=0, le=100, description="最终匹配度评分（后端计算）")
    summary: str = Field(..., description="总体评价")
    matched_points: list[str] = Field(default_factory=list, description="匹配优势")
    missing_skills: list[str] = Field(default_factory=list, description="缺失技能")
    resume_suggestions: list[str] = Field(default_factory=list, description="简历优化建议")
    interview_questions: list[InterviewQuestion] = Field(default_factory=list, description="面试高频问题")

    # 新增：方向判断
    resume_category: str = Field("", description="候选人职业方向")
    job_category: str = Field("", description="岗位要求的职业方向")
    category_match: bool = Field(True, description="方向是否匹配")
    category_reason: str = Field("", description="方向判断理由")

    # 新增：核心技能分析
    core_job_skills: list[str] = Field(default_factory=list, description="JD要求的关键硬技能")
    resume_skills: list[str] = Field(default_factory=list, description="候选人掌握的硬技能")
    matched_core_skills: list[str] = Field(default_factory=list, description="匹配的核心技能")
    missing_core_skills: list[str] = Field(default_factory=list, description="缺失的核心技能")
    core_skill_hit_rate: float = Field(0.0, ge=0.0, le=1.0, description="核心技能命中率")

    # 新增：后端计算的评分结果
    score_breakdown: dict[str, Any] | None = Field(None, description="分项评分明细")
    score_level: str = Field("", description="评分等级")
    recommendation: str = Field("", description="投递建议")
    score_cap_reason: str | None = Field(None, description="分数封顶原因")
    risk_warnings: list[str] = Field(default_factory=list, description="风险提示")


class AnalysisResponse(BaseModel):
    """分析接口的完整返回"""
    id: int
    resume_id: int
    job_title: str
    match_score: int
    result_json: AnalysisResult
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== 历史记录相关 ====================

class HistoryListItem(BaseModel):
    """历史记录列表项"""
    id: int
    resume_id: int
    job_title: str
    match_score: int
    created_at: datetime

    class Config:
        from_attributes = True


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    ids: list[int] = Field(..., min_length=1, description="要删除的记录ID列表")


class DeleteResponse(BaseModel):
    """单条删除响应"""
    message: str
    deleted_id: int


class BatchDeleteResponse(BaseModel):
    """批量删除响应"""
    message: str
    deleted_count: int
    deleted_ids: list[int]


class HistoryDetailResponse(BaseModel):
    """历史记录详情"""
    id: int
    resume_id: int
    job_title: str
    job_description: str
    match_score: int
    result_json: AnalysisResult
    created_at: datetime
    # 附带简历基本信息
    resume_filename: str | None = None
    resume_content: str | None = None

    class Config:
        from_attributes = True


# ==================== 插件相关 ====================

class PluginJobCaptureRequest(BaseModel):
    """插件发送岗位信息请求"""
    resume_id: int | None = Field(None, description="关联的简历ID，为空则只保存不分析")
    job_title: str = Field(..., min_length=1, max_length=255, description="岗位名称")
    company: str | None = Field(None, max_length=255, description="公司名称")
    salary: str | None = Field(None, max_length=100, description="薪资范围")
    location: str | None = Field(None, max_length=100, description="工作地点")
    job_url: str = Field(..., min_length=1, max_length=1000, description="岗位链接")
    job_description: str = Field(..., min_length=10, description="岗位JD文本")
    # 自动筛选新增字段
    captured_page_url: str | None = Field(None, max_length=1000, description="捕获时的列表页URL")
    card_index: int | None = Field(None, description="岗位在列表中序号")
    job_unique_key: str | None = Field(None, max_length=128, description="岗位唯一标识（去重用）")
    scan_session_id: str | None = Field(None, max_length=64, description="扫描批次ID")


class PluginJobCaptureResponse(BaseModel):
    """插件捕获岗位的返回"""
    success: bool
    job_record_id: int
    match_score: int | None = None
    score_level: str | None = None
    recommendation: str | None = None
    should_recommend: bool = False
    status: str
    message: str
    # 新增：结构化解析结果
    job_tags: list = Field(default_factory=list, description="岗位标签/技能标签")
    hr_name: str | None = Field(None, description="HR姓名")
    hr_status: str | None = Field(None, description="HR活跃状态")
    hr_active_score: int | None = Field(None, description="HR活跃分值")
    composite_score: int | None = Field(None, description="综合推荐指数")


class MarkCommunicatedRequest(BaseModel):
    """标记已沟通请求"""
    message: str | None = Field(None, description="可选备注")


# ==================== 岗位记录管理相关 ====================

class JobRecordResponse(BaseModel):
    """岗位记录响应"""
    id: int
    resume_id: int | None = None
    job_title: str
    company: str | None = None
    salary: str | None = None
    location: str | None = None
    job_url: str
    job_description: str
    match_score: int | None = None
    score_level: str | None = None
    recommendation: str | None = None
    status: str
    source: str
    communicated_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None
    # 结构化解析字段
    job_tags: str | None = None
    clean_job_description: str | None = None
    raw_job_text: str | None = None
    hr_name: str | None = None
    hr_status: str | None = None
    hr_active_score: int | None = None
    composite_score: int | None = None
    # 异步分析状态
    analysis_status: str | None = None

    class Config:
        from_attributes = True


class JobRecordDetailResponse(JobRecordResponse):
    """岗位记录详情（含完整分析JSON）"""
    score_breakdown: dict[str, Any] | None = None
    analysis_result_json: dict[str, Any] | None = None


class BatchUpdateJobStatusRequest(BaseModel):
    """批量更新岗位状态请求"""
    ids: list[int] = Field(..., min_length=1, description="岗位记录ID列表")
    status: str = Field(..., description="目标状态：captured/analyzed/recommended/communicated/ignored/interview")


# ==================== OCR 相关 ====================

class OCRExtractRequest(BaseModel):
    """OCR字段提取请求"""
    imageBase64: str = Field(..., description="Base64编码的裁剪图片")
    fieldType: str = Field(..., description="字段类型：salary 或 company")


class OCRExtractResponse(BaseModel):
    """OCR字段提取响应（含详细调试信息）"""
    text: str
    fieldType: str
    rawText: str = ""
    cleanedText: str = ""
    valid: bool = False
    reason: str = ""
    strategy: str = ""
    detections: list = []
    processedImageBase64: str = ""


# ==================== 异步任务响应 ====================

class AsyncTaskResponse(BaseModel):
    """异步任务立即响应（202 Accepted）"""
    job_record_id: int = Field(..., description="岗位记录ID，用于后续轮询状态")
    status: str = Field(..., description="岗位状态：captured")
    analysis_status: str = Field(..., description="AI分析状态：pending/running/done/failed")
    message: str = Field(..., description="提示信息")
    # 快速解析结果（本地解析，无需等待LLM）
    job_tags: list = Field(default_factory=list, description="岗位技能标签（本地解析）")
    hr_name: str | None = Field(None, description="HR姓名（本地解析）")
    hr_status: str | None = Field(None, description="HR活跃状态（本地解析）")
    hr_active_score: int | None = Field(None, description="HR活跃分值（本地解析）")
    # 向后兼容与防御性兜底字段（异步分析完成前为 None/False）
    match_score: int | None = Field(None, description="匹配度评分")
    score_level: str | None = Field(None, description="评分等级")
    recommendation: str | None = Field(None, description="投递建议")
    should_recommend: bool = Field(False, description="是否建议沟通")
    composite_score: int | None = Field(None, description="综合推荐指数")


# ==================== 系统配置相关 ====================

class SystemSettingResponse(BaseModel):
    """系统配置响应模型"""
    provider: str = Field("deepseek", description="服务商标识")
    base_url: str = Field("https://api.deepseek.com", description="API Base URL")
    model: str = Field("deepseek-chat", description="模型名称")
    masked_api_key: str = Field("", description="脱敏后的API Key")
    has_api_key: bool = Field(False, description="是否已配置有效API Key")
    temperature: float = Field(0.3, description="温度参数")
    max_tokens: int = Field(4096, description="最大输出Token")
    is_mock_mode: bool | None = Field(None, description="是否显式强制Mock模式")
    active_mock_mode: bool = Field(True, description="当前实际生效是否为Mock模式")
    source: str = Field("database", description="配置来源: database / env / default")
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class SystemSettingUpdateRequest(BaseModel):
    """系统配置更新请求模型"""
    provider: str = Field("deepseek", description="服务商标识")
    base_url: str = Field(..., description="API Base URL")
    model: str = Field(..., description="模型名称")
    api_key: str | None = Field(None, description="API Key，若不修改传空或留掩码")
    temperature: float = Field(0.3, ge=0.0, le=2.0, description="温度参数")
    max_tokens: int = Field(4096, ge=256, le=32768, description="最大Token")
    is_mock_mode: bool | None = Field(None, description="是否显式启用Mock模式")


class SystemSettingTestRequest(BaseModel):
    """连通性测试请求模型"""
    provider: str = Field("deepseek", description="服务商标识")
    base_url: str = Field(..., description="待测试的 Base URL")
    model: str = Field(..., description="待测试的模型名称")
    api_key: str | None = Field(None, description="待测试的 API Key")


class SystemSettingTestResponse(BaseModel):
    """连通性测试结果响应模型"""
    success: bool = Field(..., description="是否连通成功")
    latency_ms: int = Field(0, description="请求往返延迟(毫秒)")
    message: str = Field(..., description="状态描述或友好排查建议")
    model_used: str = Field("", description="测试所使用的模型")
    status_code: int | None = Field(None, description="HTTP状态码")
