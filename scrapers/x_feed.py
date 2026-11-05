import json
import re
import requests
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers import _cache

ACCOUNTS = {
    "ip":        {"handle": "IPParaguay",     "label": "Agencia IP"},
    "mef":       {"handle": "MEF_Paraguay",   "label": "Min. Economía y Finanzas"},
    "bcp":       {"handle": "BCP_PY",         "label": "Banco Central del Paraguay"},
    "abc":       {"handle": "ABCDigital",     "label": "ABC Color"},
    "ultimahora":{"handle": "UltimaHoracom",  "label": "Última Hora"},
}

_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
_NEXT_DATA_RE = re.compile(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.DOTALL)

# Cada 25 min, una sola vez para las 5 cuentas (no por visitante) — mismo
# endpoint sin documentar que usa el widget oficial de X. Si cambia de
# formato, _parse_tweet devuelve None y la cuenta cae al link directo.
_CACHE_TTL = 25 * 60


_EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)


def _parse_date(created_at):
    try:
        # Formato de X: "Wed Oct 10 20:19:24 +0000 2018"
        return datetime.strptime(created_at, "%a %b %d %H:%M:%S %z %Y")
    except Exception:
        return _EPOCH


def _parse_tweet(html: str):
    match = _NEXT_DATA_RE.search(html)
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
        entries = data["props"]["pageProps"]["timeline"]["entries"]
    except Exception:
        return None

    # El primer entry suele ser el tweet fijado (pinned), que puede tener
    # años — se recorren todos y se queda con el más reciente de verdad.
    best = None
    best_date = _EPOCH
    for entry in entries:
        tweet = entry.get("content", {}).get("tweet")
        if not tweet:
            continue
        text = tweet.get("full_text") or tweet.get("text")
        if not text:
            continue
        date = _parse_date(tweet.get("created_at"))
        if date >= best_date:
            best_date = date
            best = {
                "text":       text,
                "created_at": tweet.get("created_at"),
                "id":         tweet.get("id_str"),
            }
    return best


def _fetch_account(slug, info):
    handle = info["handle"]
    tweet = None
    try:
        r = requests.get(
            f"https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}",
            params={"dnt": "false", "showReplies": "false", "lang": "es"},
            headers=_HEADERS, timeout=8,
        )
        if r.ok:
            tweet = _parse_tweet(r.text)
    except Exception:
        tweet = None

    return slug, {
        "handle": handle,
        "label":  info["label"],
        "tweet":  tweet,
        "url":    f"https://twitter.com/{handle}",
    }


def get_x_feed() -> dict:
    cached = _cache.get("x_feed")
    if cached is not None:
        return cached

    feeds = {}
    with ThreadPoolExecutor(max_workers=5) as ex:
        tasks = [ex.submit(_fetch_account, slug, info) for slug, info in ACCOUNTS.items()]
        for f in as_completed(tasks):
            slug, result = f.result()
            feeds[slug] = result

    ordered = {slug: feeds[slug] for slug in ACCOUNTS if slug in feeds}
    _cache.set("x_feed", ordered, _CACHE_TTL)
    return ordered
