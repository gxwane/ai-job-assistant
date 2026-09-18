"""
数据库连接、会话管理与启动期自动模式迁移
"""
import time
import logging
from sqlalchemy import (
    create_engine, text, event, inspect,
    Integer, SmallInteger, BigInteger, Boolean, Float, Numeric, String, Text, JSON, DateTime,
)
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

logger = logging.getLogger(__name__)

# 创建数据库引擎
# SQLite 需要 check_same_thread=False 才能在 FastAPI 多线程中使用
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,  # 设置为 True 可以查看 SQL 日志
)

# SQLite 开启 WAL 模式提升并发读写能力
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

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


def _get_safe_default_clause(col) -> str:
    """
    为新增列推导安全的 DEFAULT 子句，防止 SQLite 报错：
    Cannot add a NOT NULL column with default value NULL
    """
    if col.server_default is not None:
        arg = str(col.server_default.arg)
        if (arg.startswith("'") and arg.endswith("'")) or arg.replace("-", "").isdigit():
            return f"DEFAULT {arg}"

    type_cls = type(col.type)
    if issubclass(type_cls, (Integer, SmallInteger, BigInteger, Boolean)):
        return "DEFAULT 0"
    elif issubclass(type_cls, (Float, Numeric)):
        return "DEFAULT 0.0"
    elif issubclass(type_cls, (String, Text)):
        return "DEFAULT ''"
    elif issubclass(type_cls, JSON):
        return "DEFAULT '{}'"
    elif issubclass(type_cls, DateTime):
        return "DEFAULT CURRENT_TIMESTAMP"
    return "DEFAULT ''"


def auto_migrate_schema(target_engine=None, metadata=None, max_retries=3) -> dict:
    """
    【P2-T2】启动期无感数据库结构自检测与自动增量模式同步

    比对 metadata 定义与数据库实际存在的列，安全自动追加缺失的字段。
    彻底规避 SQLite 的 ADD COLUMN UNIQUE 语法限制、NOT NULL 默认值缺失报错与多进程写锁争抢。
    """
    eng = target_engine or engine
    meta = metadata or Base.metadata

    if "sqlite" not in str(eng.url):
        return {"migrated_count": 0, "status": "skipped_non_sqlite"}

    for attempt in range(1, max_retries + 1):
        try:
            migrated_cols = []
            with eng.connect() as conn:
                inspector = inspect(conn)
                existing_tables = set(inspector.get_table_names())

                for table_name, table in meta.tables.items():
                    if table_name not in existing_tables:
                        continue

                    existing_cols = {c["name"] for c in inspector.get_columns(table_name)}

                    for col in table.columns:
                        if col.name in existing_cols:
                            continue

                        # 1. 动态获取方言类型字符串
                        col_type_str = col.type.compile(eng.dialect)

                        # 2. 规避 SQLite 严禁在 ADD COLUMN 中使用 UNIQUE/PRIMARY KEY 约束
                        # 处理默认值与非空约束
                        if col.nullable is False:
                            default_clause = _get_safe_default_clause(col)
                            constraint_clause = f"NOT NULL {default_clause}"
                        else:
                            if col.server_default is not None:
                                default_clause = _get_safe_default_clause(col)
                                constraint_clause = default_clause
                            else:
                                constraint_clause = ""

                        # 3. 外键引用支持
                        fk_clause = ""
                        if col.foreign_keys:
                            fk = next(iter(col.foreign_keys))
                            fk_clause = f"REFERENCES {fk.column.table.name}({fk.column.name})"

                        # 组合 DDL 并执行
                        ddl_parts = [f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type_str}"]
                        if constraint_clause:
                            ddl_parts.append(constraint_clause)
                        if fk_clause:
                            ddl_parts.append(fk_clause)

                        ddl = " ".join(ddl_parts)
                        logger.info(f"[DB自动迁移] 执行: {ddl}")
                        print(f"[DB自动迁移] 为 {table_name} 表补充列: {col.name} ({col_type_str})")
                        conn.execute(text(ddl))
                        conn.commit()
                        migrated_cols.append(f"{table_name}.{col.name}")

                        # 4. 后置处理索引与唯一索引（防存量重复数据冲突）
                        if col.unique:
                            idx_name = f"uq_{table_name}_{col.name}"
                            try:
                                conn.execute(text(f"CREATE UNIQUE INDEX IF NOT EXISTS {idx_name} ON {table_name}({col.name})"))
                                conn.commit()
                            except Exception as uq_err:
                                logger.warning(f"[DB自动迁移] 无法为 {table_name}.{col.name} 创建唯一索引 (可能存在重复默认值): {uq_err}")
                        elif col.index:
                            idx_name = f"ix_{table_name}_{col.name}"
                            try:
                                conn.execute(text(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name}({col.name})"))
                                conn.commit()
                            except Exception as ix_err:
                                logger.warning(f"[DB自动迁移] 无法为 {table_name}.{col.name} 创建普通索引: {ix_err}")

            return {"migrated_count": len(migrated_cols), "migrated_cols": migrated_cols, "status": "success"}

        except Exception as e:
            if "locked" in str(e).lower() and attempt < max_retries:
                time.sleep(0.2 * attempt)
                continue
            logger.warning(f"[DB自动迁移] 迁移检测异常跳过: {e}")
            return {"migrated_count": 0, "status": "error", "error": str(e)}

    return {"migrated_count": 0, "status": "max_retries_exceeded"}


def _migrate():
    """兼容旧接口调用，内部委托给 auto_migrate_schema"""
    return auto_migrate_schema(engine, Base.metadata)


def _reset_dangling_tasks():
    """重置服务异常退出导致的悬挂 running 状态为 pending"""
    if "sqlite" not in DATABASE_URL:
        return
    try:
        with engine.connect() as conn:
            conn.execute(text("UPDATE job_records SET analysis_status = 'pending' WHERE analysis_status = 'running'"))
            conn.commit()
    except Exception as e:
        logger.warning(f"[DB] 重置悬挂任务跳过: {e}")


def init_db():
    """初始化数据库，创建所有表并执行自动模式自检与任务重置"""
    Base.metadata.create_all(bind=engine)
    auto_migrate_schema(engine, Base.metadata)
    _reset_dangling_tasks()
