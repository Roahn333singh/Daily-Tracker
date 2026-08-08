import os
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Local default: SQLite under DATA_DIR (docker-compose volume = durable).
# Production on App Platform: set DATABASE_URL to Managed Postgres
# (host disk is ephemeral and wiped on every deploy).
_DEFAULT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(_DEFAULT_ROOT)))
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass

DB_PATH = Path(os.getenv("DATABASE_PATH", str(DATA_DIR / "tracker.db")))


def normalize_database_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return f"sqlite:///{DB_PATH}"
    # DigitalOcean / Heroku style postgres:// → SQLAlchemy + psycopg3
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    return url


SQLALCHEMY_DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", ""))
IS_SQLITE = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

_connect_args: dict = {}
if IS_SQLITE:
    _connect_args = {"check_same_thread": False, "timeout": 30}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=not IS_SQLITE,
)

if IS_SQLITE:

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _connection_record) -> None:  # noqa: ANN001
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def db_backend_label() -> str:
    if IS_SQLITE:
        return f"sqlite:{DB_PATH}"
    # Hide password in URL for health checks
    raw = SQLALCHEMY_DATABASE_URL
    if "@" in raw:
        scheme, rest = raw.split("://", 1)
        creds, hostpart = rest.split("@", 1)
        user = creds.split(":", 1)[0] if creds else ""
        return f"{scheme}://{user}:***@{hostpart}"
    return "postgres"


def ping_db() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:  # noqa: BLE001
        return False
