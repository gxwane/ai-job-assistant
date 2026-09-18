"""
P2-T1: BackgroundTasks 异步任务解耦测试

测试策略：
- 同步阶段测试（capture_job_from_plugin）：直接使用独立内存数据库验证状态流转与并发防覆盖。
- 异步阶段测试（run_analysis_background）：patch SessionLocal 与 LLM 分析服务，验证状态流转及异常流转。
- 面试题生成异步测试：直接调用路由函数，验证 BackgroundTasks 队列挂载与 200/202 动态状态码。
"""
from unittest.mock import patch

import pytest
from fastapi import BackgroundTasks, HTTPException, Response, status
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import JobRecord, Resume
from app.services.plugin_service import capture_job_from_plugin, run_analysis_background

# ========== 测试专用 in-memory DB ==========

@pytest.fixture
def mem_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture
def mem_session(mem_engine):
    Session = sessionmaker(bind=mem_engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def mem_session_factory(mem_engine):
    return sessionmaker(bind=mem_engine)


@pytest.fixture
def resume(mem_session):
    r = Resume(
        filename="test.pdf",
        file_path="/tmp/test.pdf",
        content="Python Django FastAPI 5年经验 本科",
        content_hash="p2t1_abc",
    )
    mem_session.add(r)
    mem_session.commit()
    mem_session.refresh(r)
    return r


# ========== 测试：capture_job_from_plugin 同步阶段 ==========

class TestCaptureJobFromPlugin:
    def test_returns_pending_when_resume_exists(self, mem_session, resume):
        """有简历时：同步保存并返回 analysis_status=pending，needs_new_bg_task=True"""
        result = capture_job_from_plugin(
            db=mem_session,
            resume_id=resume.id,
            job_title="Python后端工程师",
            company="测试科技",
            job_url="https://example.com/job/1",
            job_description="招聘 Python Django FastAPI 开发，要求本科学历",
        )

        assert result["success"] is True
        assert result["analysis_status"] == "pending"
        assert result["status"] == "captured"
        assert result["needs_new_bg_task"] is True
        assert result["job_record_id"] > 0

        # 验证数据库中已写入
        mem_session.expire_all()
        record = mem_session.query(JobRecord).filter(
            JobRecord.id == result["job_record_id"]
        ).first()
        assert record is not None
        assert record.analysis_status == "pending"
        assert record.resume_id == resume.id

    def test_returns_done_when_no_resume(self, mem_session):
        """无简历且系统无简历时：analysis_status=done，needs_new_bg_task=False"""
        result = capture_job_from_plugin(
            db=mem_session,
            resume_id=None,
            job_title="前端工程师",
            company="无简历公司",
            job_url="https://example.com/job/2",
            job_description="招聘 Vue React 前端开发",
        )

        assert result["success"] is True
        assert result["analysis_status"] == "done"
        assert result["status"] == "captured"
        assert result["needs_new_bg_task"] is False

    def test_auto_picks_latest_resume_when_id_is_none(self, mem_session, resume):
        """未指定 resume_id 但系统有简历时：自动绑定最新简历 → pending"""
        result = capture_job_from_plugin(
            db=mem_session,
            resume_id=None,
            job_title="算法工程师",
            company="AI公司",
            job_url="https://example.com/job/3",
            job_description="机器学习算法工程师，Python 深度学习",
        )

        assert result["success"] is True
        assert result["analysis_status"] == "pending"
        assert result["needs_new_bg_task"] is True

    def test_dedup_resets_analysis_status_when_done(self, mem_session, resume):
        """同公司+同岗位且之前分析已完成（done）：去重更新，重置为 pending 并允许派发新任务"""
        r1 = capture_job_from_plugin(
            db=mem_session,
            resume_id=resume.id,
            job_title="数据工程师",
            company="数据公司",
            job_url="https://example.com/job/4",
            job_description="Spark Hadoop 数据工程师",
        )
        record_id = r1["job_record_id"]

        # 手动设置为 done，模拟已完成分析
        mem_session.expire_all()
        record = mem_session.query(JobRecord).filter(JobRecord.id == record_id).first()
        record.analysis_status = "done"
        record.match_score = 75
        mem_session.commit()

        # 第二次捕获同一岗位（去重触发）
        r2 = capture_job_from_plugin(
            db=mem_session,
            resume_id=resume.id,
            job_title="数据工程师",
            company="数据公司",
            job_url="https://example.com/job/4",
            job_description="Spark Hadoop 数据工程师（更新版）",
        )
        assert r2["job_record_id"] == record_id
        assert r2["analysis_status"] == "pending"
        assert r2["needs_new_bg_task"] is True

    def test_dedup_does_not_override_running_task(self, mem_session, resume):
        """S3 并发保护：若同公司同岗位已有任务正在 running 中，去重时保持 running 状态，且 needs_new_bg_task=False"""
        r1 = capture_job_from_plugin(
            db=mem_session,
            resume_id=resume.id,
            job_title="架构师",
            company="高并发科技",
            job_url="https://example.com/job/5",
            job_description="招聘系统架构师",
        )
        record_id = r1["job_record_id"]

        # 模拟后台任务正在 running
        mem_session.expire_all()
        record = mem_session.query(JobRecord).filter(JobRecord.id == record_id).first()
        record.analysis_status = "running"
        mem_session.commit()

        # 此时又收到一次相同的请求
        r2 = capture_job_from_plugin(
            db=mem_session,
            resume_id=resume.id,
            job_title="架构师",
            company="高并发科技",
            job_url="https://example.com/job/5",
            job_description="招聘系统架构师（重复请求）",
        )
        assert r2["job_record_id"] == record_id
        assert r2["analysis_status"] == "running"
        assert r2["needs_new_bg_task"] is False


# ========== 测试：run_analysis_background 状态流转 ==========

class TestRunAnalysisBackground:
    def test_status_transitions_pending_to_done(
        self, mem_session, resume, mem_session_factory
    ):
        """直接调用后台函数，验证 pending → done 状态流转"""
        record = JobRecord(
            resume_id=resume.id,
            job_title="测试岗位",
            job_url="https://example.com/bg/1",
            job_description="Python Django 后端开发，本科以上",
            status="captured",
            analysis_status="pending",
            source="boss_plugin",
        )
        mem_session.add(record)
        mem_session.commit()
        mem_session.refresh(record)
        record_id = record.id

        mock_result = {
            "match_score": 80,
            "score_level": "高匹配",
            "recommendation": "建议投递",
            "score_breakdown": {"skill_score": 35},
            "summary": "匹配良好",
            "matched_points": ["Python"],
            "missing_skills": [],
            "resume_suggestions": [],
        }

        with patch(
            "app.services.plugin_service.analyze_job_match",
            return_value=mock_result,
        ), patch("app.services.plugin_service.SessionLocal", mem_session_factory):
            run_analysis_background(record_id)

        mem_session.expire_all()
        updated = mem_session.query(JobRecord).filter(JobRecord.id == record_id).first()
        assert updated.analysis_status == "done"
        assert updated.match_score == 80
        assert updated.status == "recommended"  # 80 >= 70

    def test_status_below_threshold_becomes_analyzed(
        self, mem_session, resume, mem_session_factory
    ):
        """低于 70 分时状态应为 analyzed，不是 recommended"""
        record = JobRecord(
            resume_id=resume.id,
            job_title="低分岗位",
            job_url="https://example.com/bg/1b",
            job_description="较难岗位",
            status="captured",
            analysis_status="pending",
            source="boss_plugin",
        )
        mem_session.add(record)
        mem_session.commit()
        mem_session.refresh(record)
        record_id = record.id

        mock_result = {
            "match_score": 55,
            "score_level": "低匹配",
            "recommendation": "谨慎投递",
            "score_breakdown": {},
            "summary": "匹配度较低",
            "matched_points": [],
            "missing_skills": ["Golang"],
            "resume_suggestions": [],
        }

        with patch(
            "app.services.plugin_service.analyze_job_match",
            return_value=mock_result,
        ), patch("app.services.plugin_service.SessionLocal", mem_session_factory):
            run_analysis_background(record_id)

        mem_session.expire_all()
        updated = mem_session.query(JobRecord).filter(JobRecord.id == record_id).first()
        assert updated.analysis_status == "done"
        assert updated.match_score == 55
        assert updated.status == "analyzed"  # 55 < 70

    def test_status_becomes_failed_on_exception(
        self, mem_session, resume, mem_session_factory
    ):
        """analyze_job_match 异常时 analysis_status 应变为 failed（S2验证）"""
        record = JobRecord(
            resume_id=resume.id,
            job_title="失败测试岗位",
            job_url="https://example.com/bg/2",
            job_description="测试异常处理",
            status="captured",
            analysis_status="pending",
            source="boss_plugin",
        )
        mem_session.add(record)
        mem_session.commit()
        mem_session.refresh(record)
        record_id = record.id

        with patch(
            "app.services.plugin_service.analyze_job_match",
            side_effect=Exception("LLM 超时"),
        ), patch("app.services.plugin_service.SessionLocal", mem_session_factory):
            run_analysis_background(record_id)

        mem_session.expire_all()
        updated = mem_session.query(JobRecord).filter(JobRecord.id == record_id).first()
        assert updated.analysis_status == "failed"

    def test_skip_if_already_done(self, mem_session, resume, mem_session_factory):
        """已完成的记录（analysis_status=done）不应被重复分析"""
        record = JobRecord(
            resume_id=resume.id,
            job_title="已完成岗位",
            job_url="https://example.com/bg/3",
            job_description="已完成测试",
            status="analyzed",
            analysis_status="done",
            match_score=75,
            source="boss_plugin",
        )
        mem_session.add(record)
        mem_session.commit()
        mem_session.refresh(record)
        record_id = record.id

        with patch(
            "app.services.plugin_service.analyze_job_match"
        ) as mock_analyze, patch("app.services.plugin_service.SessionLocal", mem_session_factory):
            run_analysis_background(record_id)
            mock_analyze.assert_not_called()  # LLM 不应被调用

    def test_skip_nonexistent_record(self, mem_session_factory):
        """不存在的 job_record_id 应静默跳过，不报错"""
        with patch("app.services.plugin_service.SessionLocal", mem_session_factory):
            run_analysis_background(99999)


# ========== 测试：面试题生成异步（直接调用路由函数） ==========

class TestInterviewQuestionsAsync:
    def test_generate_interview_questions_returns_queued_and_202(self, mem_session, resume):
        """首次生成：返回 queued=True 且动态设定 202 Accepted"""
        from app.routers.job_records import generate_interview_questions

        record = JobRecord(
            resume_id=resume.id,
            job_title="面试测试岗位",
            job_url="https://example.com/iq/1",
            job_description="Python 开发工程师",
            status="interview",
            analysis_status="done",
            source="boss_plugin",
        )
        mem_session.add(record)
        mem_session.commit()
        mem_session.refresh(record)

        bg = BackgroundTasks()
        resp = Response()
        result = generate_interview_questions(
            record_id=record.id,
            background_tasks=bg,
            response=resp,
            db=mem_session,
        )

        assert resp.status_code == status.HTTP_202_ACCEPTED
        assert result["queued"] is True
        assert result["exists"] is False
        assert result["cached"] is False

    def test_generate_interview_questions_cached_and_200(self, mem_session, resume):
        """已有面试题缓存：同步返回缓存且保持 200 OK，cached=True"""
        from app.routers.job_records import generate_interview_questions

        cached_data = [{"question": "测试问题", "answer": "测试答案"}]
        record = JobRecord(
            resume_id=resume.id,
            job_title="缓存面试岗位",
            job_url="https://example.com/iq/2",
            job_description="已有面试题",
            status="interview",
            analysis_status="done",
            interview_questions_json=cached_data,
            source="boss_plugin",
        )
        mem_session.add(record)
        mem_session.commit()
        mem_session.refresh(record)

        bg = BackgroundTasks()
        resp = Response()
        result = generate_interview_questions(
            record_id=record.id,
            background_tasks=bg,
            response=resp,
            db=mem_session,
        )

        # 默认 200，不会被改为 202
        assert resp.status_code == 200
        assert result["cached"] is True
        assert result["exists"] is True
        assert result["data"] == cached_data

    def test_generate_interview_questions_no_resume_raises(self, mem_session):
        """无关联简历时应抛出 HTTPException(400)"""
        from app.routers.job_records import generate_interview_questions

        record = JobRecord(
            resume_id=None,
            job_title="无简历岗位",
            job_url="https://example.com/iq/3",
            job_description="无简历测试",
            status="interview",
            analysis_status="done",
            source="boss_plugin",
        )
        mem_session.add(record)
        mem_session.commit()
        mem_session.refresh(record)

        bg = BackgroundTasks()
        resp = Response()
        with pytest.raises(HTTPException) as exc_info:
            generate_interview_questions(
                record_id=record.id,
                background_tasks=bg,
                response=resp,
                db=mem_session,
            )
        assert exc_info.value.status_code == 400
