from fastapi import APIRouter, Query
from app.db.database import get_connection

router = APIRouter()


@router.get("/")
def get_news(
    outlet: str | None = Query(None),
    analyzed: int | None = Query(None, description="0=pending, 1=done, -1=error"),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
):
    with get_connection() as conn:
        where, params = [], []
        if outlet is not None:
            where.append("outlet = ?")
            params.append(outlet)
        if analyzed is not None:
            where.append("analyzed = ?")
            params.append(analyzed)

        clause = f"WHERE {' AND '.join(where)}" if where else ""
        rows = conn.execute(
            f"""
            SELECT id, title, url, outlet, published_at, scraped_at, summary,
                   analyzed, score_total, encuadre, intensidad, carga_emocional,
                   hecho, score_just
            FROM   articles
            {clause}
            ORDER  BY scraped_at DESC
            LIMIT  ? OFFSET ?
            """,
            (*params, limit, offset),
        ).fetchall()

        total = conn.execute(
            f"SELECT COUNT(*) FROM articles {clause}", params
        ).fetchone()[0]

    return {
        "total":   total,
        "limit":   limit,
        "offset":  offset,
        "results": [dict(r) for r in rows],
    }


@router.get("/{article_id}")
def get_article(article_id: int):
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM articles WHERE id = ?", (article_id,)
        ).fetchone()
    if row is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Article not found")
    return dict(row)


@router.get("/stats/outlets")
def outlet_stats():
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT outlet,
                   COUNT(*)                              AS total,
                   SUM(CASE WHEN analyzed=1 THEN 1 END) AS analyzed,
                   ROUND(AVG(CASE WHEN analyzed=1 THEN score_total END), 1) AS avg_score
            FROM   articles
            GROUP  BY outlet
            ORDER  BY total DESC
            """
        ).fetchall()
    return [dict(r) for r in rows]
