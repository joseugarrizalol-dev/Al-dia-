import sys
import sqlite3 as _sqlite
from pathlib import Path as _Path
from flask import Flask, render_template, jsonify, request
from scrapers.bcp import get_rates
from scrapers.crypto import get_crypto
from scrapers.news import get_news
from scrapers.economic import get_economic
from scrapers.markets import get_commodities, get_us_markets
from ai.summary import generate_daily_summary

_SENTINEL_DB = _Path(__file__).parent / "sentinel" / "backend" / "data" / "sentinel.db"
_SENTINEL_BACKEND = _Path(__file__).parent / "sentinel" / "backend"

def _snt_conn():
    conn = _sqlite.connect(str(_SENTINEL_DB))
    conn.row_factory = _sqlite.Row
    return conn

app = Flask(__name__)


# ── Sentinel scheduler ────────────────────────────────────────────────────────

def _sentinel_refresh():
    if str(_SENTINEL_BACKEND) not in sys.path:
        sys.path.insert(0, str(_SENTINEL_BACKEND))
    try:
        from snt.scrapers.rss import run_scraper
        from snt.analysis.sentinel import run_analysis
        scrape = run_scraper()
        analysis = run_analysis(batch=30)
        print(f"[Sentinel] refresh — scraped: {scrape}, analyzed: {analysis}")
    except Exception as e:
        print(f"[Sentinel] refresh error: {e}")


def _start_scheduler():
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(_sentinel_refresh, "interval", hours=4, id="sentinel_refresh")
    scheduler.add_job(_sentinel_refresh, "date", id="sentinel_boot")  # run once on startup
    scheduler.start()
    print("[Sentinel] scheduler started — refresh every 4 hours")


# Start scheduler when loaded by gunicorn (not just __main__)
import os as _os
if not _os.environ.get("WERKZEUG_RUN_MAIN"):
    _start_scheduler()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/sentinel")
def sentinel():
    return render_template("sentinel.html")

@app.route("/api/rates")
def api_rates():
    return jsonify(get_rates())

@app.route("/api/crypto")
def api_crypto():
    rates   = get_rates()
    usd_pyg = rates.get("USD", {}).get("sell", 7300)
    return jsonify(get_crypto(usd_pyg))

@app.route("/api/news")
def api_news():
    return jsonify(get_news())

@app.route("/api/economic")
def api_economic():
    return jsonify(get_economic())

@app.route("/api/commodities")
def api_commodities():
    return jsonify(get_commodities())

@app.route("/api/markets")
def api_markets():
    return jsonify(get_us_markets())

@app.route("/api/summary")
def api_summary():
    news  = get_news()
    force = request.args.get("force") == "1"
    rates      = get_rates()
    usd_pyg    = rates.get("USD", {}).get("sell", 7300)
    market_data = {
        "rates":      rates,
        "crypto":     get_crypto(usd_pyg),
        "commodities":get_commodities(),
        "markets":    get_us_markets(),
    }
    return jsonify(generate_daily_summary(news, force=force, market_data=market_data))


@app.route("/sentinel/api/news")
def sentinel_api_news():
    if not _SENTINEL_DB.exists():
        return jsonify({"results": [], "total": 0})
    conn = _snt_conn()
    rows = conn.execute("""
        SELECT id, title, url, outlet, scraped_at,
               score_total, score_factual, score_linguistic, score_context,
               score_framing, score_transparency,
               hecho, intensidad, carga_emocional, verbos,
               encuadre, encuadre_just, score_just
        FROM articles WHERE analyzed = 1 AND DATE(scraped_at) = DATE('now')
        ORDER BY scraped_at DESC
    """).fetchall()
    conn.close()
    return jsonify({"results": [dict(r) for r in rows], "total": len(rows)})

@app.route("/sentinel/api/stats")
def sentinel_api_stats():
    if not _SENTINEL_DB.exists():
        return jsonify({"total": 0, "analyzed": 0, "avg_score": None, "outlets": []})
    conn = _snt_conn()
    total    = conn.execute("SELECT COUNT(*) FROM articles WHERE DATE(scraped_at) = DATE('now')").fetchone()[0]
    analyzed = conn.execute("SELECT COUNT(*) FROM articles WHERE analyzed=1 AND DATE(scraped_at) = DATE('now')").fetchone()[0]
    avg      = conn.execute("SELECT ROUND(AVG(score_total),1) FROM articles WHERE analyzed=1 AND DATE(scraped_at) = DATE('now')").fetchone()[0]
    outlets  = conn.execute("""
        SELECT outlet, COUNT(*) AS total,
               ROUND(AVG(score_total),1) AS avg_score
        FROM articles WHERE analyzed=1 AND DATE(scraped_at) = DATE('now')
        GROUP BY outlet ORDER BY avg_score DESC
    """).fetchall()
    conn.close()
    return jsonify({"total": total, "analyzed": analyzed, "avg_score": avg,
                    "outlets": [dict(r) for r in outlets]})

if __name__ == "__main__":
    print("AL DÍA — http://localhost:5000")
    app.run(debug=True, use_reloader=False)
