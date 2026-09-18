"""
数据库连接和会话管理
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

# 创建数据库引擎
# SQLite 需要 check_same_thread=False 才能在 FastAPI 多线程中使用
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,  # 设置为 True 可以查看 SQL 日志
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 声明基类，所有模型继承自它
Base = declarative_base()


def get_db():
    """
    获取数据库会话的依赖注入函数
    每次请求创建一个会话，请求结束后关闭
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate():
    """处理SQLite数据库Schema迁移（create_all不会修改已有表）"""
    if "sqlite" not in DATABASE_URL:
        return
    try:
        with engine.connect() as conn:
            # 检查 content_hash 列是否存在
            result = conn.execute(text("PRAGMA table_info(resumes)"))
            columns = [row[1] for row in result.fetchall()]
            if "content_hash" not in columns:
                print("[DB迁移] 为 resumes 表添加 content_hash 列")
                conn.execute(text("ALTER TABLE resumes ADD COLUMN content_hash VARCHAR(64)"))
                conn.commit()
                print("[DB迁移] content_hash 列添加完成")

            # 检查 interview_questions_json 列
            result2 = conn.execute(text("PRAGMA table_info(job_records)"))
            jr_columns = [row[1] for row in result2.fetchall()]
            if "interview_questions_json" not in jr_columns:
                print("[DB迁移] 为 job_records 表添加 interview_questions_json 列")
                conn.execute(text("ALTER TABLE job_records ADD COLUMN interview_questions_json JSON"))
                conn.commit()
                print("[DB迁移] interview_questions_json 列添加完成")

            # 自动筛选新增字段
            for col_name, col_type in [
                ("captured_page_url", "VARCHAR(1000)"),
                ("card_index", "INTEGER"),
                ("job_unique_key", "VARCHAR(128)"),
                ("scan_session_id", "VARCHAR(64)"),
            ]:
                if col_name not in jr_columns:
                    print(f"[DB迁移] 为 job_records 表添加 {col_name} 列")
                    conn.execute(text(f"ALTER TABLE job_records ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"[DB迁移] {col_name} 列添加完成")

            # 岗位结构化解析新增字段
            for col_name, col_type in [
                ("job_tags", "TEXT"),
                ("clean_job_description", "TEXT"),
                ("raw_job_text", "TEXT"),
                ("hr_name", "VARCHAR(50)"),
                ("hr_status", "VARCHAR(50)"),
                ("hr_active_score", "INTEGER"),
                ("composite_score", "INTEGER"),
            ]:
                if col_name not in jr_columns:
                    print(f"[DB迁移] 为 job_records 表添加 {col_name} 列")
                    conn.execute(text(f"ALTER TABLE job_records ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"[DB迁移] {col_name} 列添加完成")
    except Exception as e:
        print(f"[DB迁移] 注意: {e}")


def init_db():
    """初始化数据库，创建所有表"""
    Base.metadata.create_all(bind=engine)
    _migrate()
