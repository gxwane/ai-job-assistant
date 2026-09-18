"""
P2-T2: 启动期无感数据库结构自检测与自动模式同步单元测试

验证要点：
1. 自动比对：精准识别数据库中缺失的列并安全追加
2. 多类型支持：Integer, Text, String, JSON, DateTime 等安全类型映射与默认值
3. SQLite 约束规避：针对 NOT NULL 安全补充默认常量，防止破坏存量数据
4. 索引后置处理：unique=True 和 index=True 自动后置创建独立索引，且具备容错能力
5. 幂等性保障：重复执行 0 变更，安全静默跳过
"""
import pytest
from sqlalchemy import (
    create_engine, text, inspect, MetaData, Table, Column,
    Integer, String, Text as SqlText, JSON, Boolean, DateTime
)
from app.database import auto_migrate_schema


@pytest.fixture
def temp_db(tmp_path):
    """创建专用于迁移测试的物理临时 SQLite 数据库"""
    db_file = tmp_path / "test_migration.db"
    engine = create_engine(f"sqlite:///{db_file.as_posix()}", echo=False)
    yield engine
    engine.dispose()


class TestAutoMigrateSchema:
    def test_auto_migrate_detects_and_adds_missing_columns(self, temp_db):
        """测试场景：数据库表创建时缺少某些列，auto_migrate_schema 能够自动反射并补全缺失列"""
        # 1. 模拟存量老旧数据库：仅有 id 和 title
        with temp_db.connect() as conn:
            conn.execute(text("""
                CREATE TABLE sample_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title VARCHAR(255) NOT NULL
                )
            """))
            # 插入一条存量数据，确保 ALTER TABLE 在有数据的情况下依然安全无误
            conn.execute(text("INSERT INTO sample_jobs (title) VALUES ('已存在的旧岗位')"))
            conn.commit()

        # 2. 模拟新版本代码模型：增加了 salary, is_remote, tags(JSON), description(NOT NULL)
        meta = MetaData()
        Table(
            "sample_jobs",
            meta,
            Column("id", Integer, primary_key=True),
            Column("title", String(255), nullable=False),
            Column("salary", String(100), nullable=True),
            Column("is_remote", Boolean, nullable=False, default=False),
            Column("tags", JSON, nullable=True),
            Column("description", SqlText, nullable=False),
        )

        # 3. 触发自动迁移
        result = auto_migrate_schema(target_engine=temp_db, metadata=meta)

        assert result["status"] == "success"
        assert result["migrated_count"] == 4
        assert "sample_jobs.salary" in result["migrated_cols"]
        assert "sample_jobs.is_remote" in result["migrated_cols"]
        assert "sample_jobs.tags" in result["migrated_cols"]
        assert "sample_jobs.description" in result["migrated_cols"]

        # 4. 验证数据库反射出的列是否已全部存在
        with temp_db.connect() as conn:
            inspector = inspect(conn)
            cols = {c["name"] for c in inspector.get_columns("sample_jobs")}
            assert {"id", "title", "salary", "is_remote", "tags", "description"}.issubset(cols)

            # 验证存量数据依然健在，且新列被正确填充了默认值
            row = conn.execute(text("SELECT id, title, salary, is_remote, description FROM sample_jobs WHERE id = 1")).first()
            assert row[1] == "已存在的旧岗位"
            assert row[2] is None
            assert row[3] == 0
            assert row[4] == ""

    def test_auto_migrate_is_idempotent(self, temp_db):
        """测试场景：重复调用 auto_migrate_schema 必须是幂等的，不执行重复 ALTER"""
        meta = MetaData()
        Table(
            "idempotent_test",
            meta,
            Column("id", Integer, primary_key=True),
            Column("name", String(100)),
            Column("extra", String(100)),
        )

        # 首次建立基础表（少 extra 列）
        with temp_db.connect() as conn:
            conn.execute(text("CREATE TABLE idempotent_test (id INTEGER PRIMARY KEY, name VARCHAR(100))"))
            conn.commit()

        # 首次运行：补齐 extra
        r1 = auto_migrate_schema(target_engine=temp_db, metadata=meta)
        assert r1["migrated_count"] == 1

        # 第二次运行：无需任何变更
        r2 = auto_migrate_schema(target_engine=temp_db, metadata=meta)
        assert r2["migrated_count"] == 0
        assert r2["status"] == "success"

    def test_auto_migrate_handles_indexes_and_unique_indexes(self, temp_db):
        """测试场景：新增带有 unique=True 和 index=True 的列时，规避 SQLite ADD COLUMN 限制，后置创建索引"""
        with temp_db.connect() as conn:
            conn.execute(text("CREATE TABLE index_test (id INTEGER PRIMARY KEY)"))
            conn.commit()

        meta = MetaData()
        Table(
            "index_test",
            meta,
            Column("id", Integer, primary_key=True),
            Column("unique_code", String(64), unique=True),
            Column("search_keyword", String(100), index=True),
        )

        # 触发迁移
        res = auto_migrate_schema(target_engine=temp_db, metadata=meta)
        assert res["status"] == "success"
        assert res["migrated_count"] == 2

        # 验证索引确实后置生成了
        with temp_db.connect() as conn:
            inspector = inspect(conn)
            indexes = inspector.get_indexes("index_test")
            index_names = {idx["name"] for idx in indexes}
            assert "uq_index_test_unique_code" in index_names or any("unique_code" in idx["column_names"] for idx in indexes)
            assert "ix_index_test_search_keyword" in index_names or any("search_keyword" in idx["column_names"] for idx in indexes)

    def test_auto_migrate_skips_nonexistent_table(self, temp_db):
        """测试场景：若数据库中尚不存在该表，auto_migrate_schema 应安全跳过（交由 create_all 负责）"""
        meta = MetaData()
        Table(
            "nonexistent_table",
            meta,
            Column("id", Integer, primary_key=True),
            Column("foo", String(50)),
        )

        res = auto_migrate_schema(target_engine=temp_db, metadata=meta)
        assert res["status"] == "success"
        assert res["migrated_count"] == 0
