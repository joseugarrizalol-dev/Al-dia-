import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "sentinel.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                title           TEXT    NOT NULL,
                url             TEXT    UNIQUE NOT NULL,
                outlet          TEXT    NOT NULL,
                published_at    TEXT,
                scraped_at      TEXT    NOT NULL,
                summary         TEXT,
                body            TEXT,

                -- analysis state
                analyzed        INTEGER NOT NULL DEFAULT 0,
                analyzed_at     TEXT,
                error           TEXT,

                -- sentinel score (5 × 20)
                score_total          INTEGER,
                score_factual        INTEGER,
                score_linguistic     INTEGER,
                score_context        INTEGER,
                score_framing        INTEGER,
                score_transparency   INTEGER,

                -- linguistic breakdown
                hecho                TEXT,
                intensidad           TEXT,
                precision_ling       TEXT,
                carga_emocional      TEXT,
                verbos               TEXT,   -- JSON array stored as text
                encuadre             TEXT,
                encuadre_just        TEXT,
                score_just           TEXT,

                -- raw Groq response (for debugging)
                analysis_raw         TEXT
            )
        """)
        try:
            conn.execute("ALTER TABLE articles ADD COLUMN body TEXT")
            conn.commit()
        except Exception:
            pass  # column already exists
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_analyzed ON articles(analyzed)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_outlet ON articles(outlet)"
        )
        conn.commit()
