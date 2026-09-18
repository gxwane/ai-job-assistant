"""
共享 pytest fixtures

- in_memory_db: SQLite :memory: + 创建所有表，每个测试函数级别隔离
- test_client: FastAPI TestClient（绑定 in_memory_db session）
- mock_llm_env: 强制开启 MOCK_MODE（不需要真实 API Key）
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app


# ── SQLite in-memory database ─────────────────────────────────────────────────

@pytest.fixture(scope="function")
def in_memory_engine():
    """每个测试函数使用独立的 SQLite :memory: 数据库"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(in_memory_engine):
    """提供一个绑定 in-memory 引擎的 SQLAlchemy Session"""
    Session = sessionmaker(bind=in_memory_engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


# ── FastAPI TestClient ─────────────────────────────────────────────────────────

@pytest.fixture(scope="function")
def test_client(in_memory_engine):
    """TestClient，DI 覆盖注入 in-memory DB session"""
    from fastapi.testclient import TestClient

    Session = sessionmaker(bind=in_memory_engine)

    def override_get_db():
        session = Session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
