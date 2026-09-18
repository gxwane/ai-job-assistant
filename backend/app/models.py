"""
数据库模型定义
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base


class Resume(Base):
    """简历表"""
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False, comment="原始文件名")
    file_path = Column(String(500), nullable=False, comment="文件保存路径")
    content = Column(Text, nullable=False, comment="解析后的简历文本")
    content_hash = Column(String(64), nullable=True, unique=True, comment="简历内容MD5哈希，用于去重")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")

    # 关联分析记录
    analysis_records = relationship("AnalysisRecord", back_populates="resume", cascade="all, delete-orphan")
    # 关联插件岗位记录
    job_records = relationship("JobRecord", back_populates="resume")


class AnalysisRecord(Base):
    """分析记录表"""
    __tablename__ = "analysis_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, comment="关联的简历ID")
    job_title = Column(String(255), nullable=False, comment="岗位名称")
    job_description = Column(Text, nullable=False, comment="岗位JD原文")
    match_score = Column(Integer, nullable=False, comment="匹配度评分 0-100")
    result_json = Column(JSON, nullable=False, comment="完整分析结果JSON")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")

    # 关联简历
    resume = relationship("Resume", back_populates="analysis_records")


class JobRecord(Base):
    """插件捕获的岗位记录表 - 用于Boss直聘等渠道的岗位流转跟踪"""
    __tablename__ = "job_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True, comment="关联的简历ID（可为空）")
    job_title = Column(String(255), nullable=False, comment="岗位名称")
    company = Column(String(255), nullable=True, comment="公司名称")
    salary = Column(String(100), nullable=True, comment="薪资范围")
    location = Column(String(100), nullable=True, comment="工作地点")
    job_url = Column(String(1000), nullable=False, comment="岗位链接")
    job_description = Column(Text, nullable=False, comment="岗位JD文本")

    # 匹配分析结果
    match_score = Column(Integer, nullable=True, comment="匹配度评分 0-100")
    score_level = Column(String(50), nullable=True, comment="评分等级")
    recommendation = Column(String(500), nullable=True, comment="投递建议")
    score_breakdown = Column(JSON, nullable=True, comment="分项评分明细")
    analysis_result_json = Column(JSON, nullable=True, comment="完整分析结果JSON")

    # 面试题（收到面试后按需生成）
    interview_questions_json = Column(JSON, nullable=True, comment="面试高频问答题JSON（30题，按概率排序）")

    # 自动筛选新增字段
    captured_page_url = Column(String(1000), nullable=True, comment="捕获时的列表页URL")
    card_index = Column(Integer, nullable=True, comment="岗位在列表中序号")
    job_unique_key = Column(String(128), nullable=True, comment="岗位唯一标识（去重用）")
    scan_session_id = Column(String(64), nullable=True, comment="扫描批次ID")

    # 岗位结构化解析字段
    job_tags = Column(Text, nullable=True, comment="岗位标签/技能标签（JSON数组字符串）")
    clean_job_description = Column(Text, nullable=True, comment="清洗后的岗位JD正文")
    raw_job_text = Column(Text, nullable=True, comment="原始提取文本（插件传入的原始JD）")
    hr_name = Column(String(50), nullable=True, comment="HR姓名")
    hr_status = Column(String(50), nullable=True, comment="HR活跃状态")
    hr_active_score = Column(Integer, nullable=True, comment="HR活跃分值（0-100）")
    composite_score = Column(Integer, nullable=True, comment="综合推荐指数 = match_score*0.8 + hr_active_score*0.2")

    # 状态流转
    status = Column(String(50), nullable=False, default="captured", comment="状态：captured/analyzed/recommended/communicated/ignored/interview")
    analysis_status = Column(String(20), nullable=False, server_default="done", default="done", comment="AI分析异步状态：pending/running/done/failed")
    source = Column(String(50), nullable=False, default="boss_plugin", comment="来源：boss_plugin/manual")
    communicated_at = Column(DateTime, nullable=True, comment="沟通时间")
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), comment="更新时间")

    # 关联简历
    resume = relationship("Resume", back_populates="job_records")
