"""
RSS scraper: fetches news from configured outlets and persists new
articles to SQLite. Runs in parallel (one thread per outlet).
"""

import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

from snt.db.database import get_connection
from snt.scrapers.outlets import OUTLETS_RSS, OUTLETS_HTML, is_relevant


# ── RSS ───────────────────────────────────────────────────────────────────────

def _fetch_rss(outlet: str, urls: list[str]) -> list[dict]:
    articles: list[dict] = []
    seen: set[str] = set()

    for url in urls:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                title   = entry.get("title", "").strip()
                link    = entry.get("link", "").strip()
                summary = entry.get("summary", "") or entry.get("description", "")
                summary = summary.strip()[:800] if summary else None

                # Rough date parsing
                pub = None
                for field in ("published_parsed", "updated_parsed"):
                    parsed = entry.get(field)
                    if parsed:
                        try:
                            pub = datetime(*parsed[:6], tzinfo=timezone.utc).isoformat()
                        except Exception:
                            pass
                        break

                if not title or not link:
                    continue
                if link in seen or not is_relevant(title):
                    continue

                seen.add(link)
                articles.append({
                    "title":        title,
                    "url":          link,
                    "outlet":       outlet,
                    "published_at": pub,
                    "summary":      summary,
                })

                if len(articles) >= 15:
                    return articles
        except Exception:
            pass

    return articles


# ── HTML fallback ─────────────────────────────────────────────────────────────

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
    )
}


def _is_article_link(href: str, base_domain: str) -> bool:
    if not href or href.startswith("#") or href.startswith("mailto"):
        return False
    if href.startswith("http") and base_domain not in href:
        return False
    return len([s for s in href.split("/") if s]) >= 2


def _fetch_html(outlet: str, urls: list[str]) -> list[dict]:
    articles: list[dict] = []
    seen: set[str] = set()

    for url in urls:
        try:
            res = requests.get(url, headers=_HEADERS, timeout=6)
            if not res.ok:
                continue
            soup = BeautifulSoup(res.text, "lxml")
            base_domain = urlparse(url).netloc

            # Collect candidates: links inside headings OR standalone anchor tags
            candidates: list[tuple[str, str]] = []
            for tag in soup.find_all(["h1", "h2", "h3", "h4"]):
                a = tag.find("a", href=True) or tag.find_parent("a", href=True)
                if a:
                    candidates.append((tag.get_text(strip=True), urljoin(url, a["href"])))
            for a in soup.find_all("a", href=True):
                text = a.get_text(strip=True)
                if len(text) > 35:
                    candidates.append((text, urljoin(url, a["href"])))

            for title, href in candidates:
                if (len(title) > 25
                        and href not in seen
                        and _is_article_link(href, base_domain)
                        and is_relevant(title)):
                    seen.add(href)
                    articles.append({
                        "title":        title,
                        "url":          href,
                        "outlet":       outlet,
                        "published_at": None,
                        "summary":      None,
                    })
                if len(articles) >= 15:
                    return articles
        except Exception:
            pass

    return articles


# ── Article body fetcher ──────────────────────────────────────────────────────

def _fetch_article_body(url: str, timeout: int = 10) -> str:
    try:
        r = requests.get(url, timeout=timeout, headers=_HEADERS)
        if not r.ok:
            return ""
        soup = BeautifulSoup(r.text, "lxml")
        for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
            tag.decompose()
        text = " ".join(p.get_text(" ", strip=True) for p in soup.find_all("p"))
        return text[:3000]
    except Exception:
        return ""


# ── Persistence ───────────────────────────────────────────────────────────────

def _save(articles: list[dict]) -> tuple[int, int]:
    """Returns (inserted, skipped)."""
    inserted = skipped = 0
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        for art in articles:
            try:
                conn.execute(
                    """
                    INSERT OR IGNORE INTO articles
                        (title, url, outlet, published_at, scraped_at, summary, body)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        art["title"],
                        art["url"],
                        art["outlet"],
                        art["published_at"],
                        now,
                        art["summary"],
                        art.get("body"),
                    ),
                )
                if conn.execute(
                    "SELECT changes()"
                ).fetchone()[0]:
                    inserted += 1
                else:
                    skipped += 1
            except Exception:
                skipped += 1
        conn.commit()

    return inserted, skipped


# ── Public entry point ────────────────────────────────────────────────────────

def _cleanup_old_articles() -> int:
    """Delete articles not from today."""
    with get_connection() as conn:
        result = conn.execute(
            "DELETE FROM articles WHERE DATE(scraped_at) < DATE('now')"
        )
        conn.commit()
        return result.rowcount


def run_scraper() -> dict:
    """
    Fetch all outlets in parallel and persist results.
    Returns {"inserted": n, "skipped": n, "outlets_fetched": [...]}
    """
    deleted = _cleanup_old_articles()
    tasks: list[tuple[str, list[str], str]] = []
    for outlet, urls in OUTLETS_RSS.items():
        tasks.append((outlet, urls, "rss"))
    for outlet, urls in OUTLETS_HTML.items():
        tasks.append((outlet, urls, "html"))

    all_articles: list[dict] = []
    outlets_fetched: list[str] = []

    def _run(outlet, urls, mode):
        if mode == "rss":
            return outlet, _fetch_rss(outlet, urls)
        return outlet, _fetch_html(outlet, urls)

    with ThreadPoolExecutor(max_workers=len(tasks)) as ex:
        futures = {ex.submit(_run, *t): t[0] for t in tasks}
        for f in as_completed(futures):
            outlet, articles = f.result()
            if articles:
                all_articles.extend(articles)
                outlets_fetched.append(outlet)

    # Fetch article bodies in parallel
    def _add_body(art):
        art["body"] = _fetch_article_body(art["url"])
        return art

    with ThreadPoolExecutor(max_workers=8) as ex:
        all_articles = list(ex.map(_add_body, all_articles))

    inserted, skipped = _save(all_articles)
    return {
        "inserted":        inserted,
        "skipped":         skipped,
        "deleted_old":     deleted,
        "outlets_fetched": outlets_fetched,
    }
