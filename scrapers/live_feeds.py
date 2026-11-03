import re
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers import _cache

CHANNELS = {
    "abc":        {"name": "ABC TV",           "source": "ABC Color", "channel_id": "UCEklbFbPoMaV1ciEb-0mAxg"},
    "monumental": {"name": "Radio Monumental", "source": "AM 1080",   "channel_id": "UCApQkTY6oHoGjZr6jfMajwQ"},
    "nanduti":    {"name": "Ñandutí",          "source": "AM 1020",   "channel_id": "UC3MzWfxWB6ImezkL5_DSd4A"},
    "rockandpop": {"name": "Rock & Pop",       "source": "FM 95.5",   "channel_id": "UCFii8hQ3sYpusp-8r_DmGeg"},
}

#  El <link rel="canonical"> es la fuente confiable del video actual del
#  canal: si no está en vivo, canoniza a la página del canal (sin "watch?v=")
#  en vez de a un video al azar. Un regex genérico de "videoId" en el HTML
#  puede matchear cualquiera de las decenas de IDs de videos recomendados/
#  relacionados que trae la página — eso rompía la resolución en producción.
_CANONICAL_RE = re.compile(r'<link rel="canonical" href="https://www\.youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})"')
_HEADERS = {
    "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Accept-Language": "es-PY,es;q=0.9,en;q=0.8",
}
# Sin esta cookie, YouTube le sirve a IPs de datacenter (como las de Render)
# una interstitial de consentimiento de cookies en vez de la página real,
# que no trae el <link rel="canonical"> con el video en vivo.
_COOKIES = {"CONSENT": "YES+cb.20240101-00-p0.es+FX+100"}


def _resolve_youtube(slug, info):
    try:
        r = requests.get(
            f"https://www.youtube.com/channel/{info['channel_id']}/live",
            headers=_HEADERS, cookies=_COOKIES, timeout=6,
        )
        match = _CANONICAL_RE.search(r.text)
        video_id = match.group(1) if match else None
    except Exception:
        video_id = None

    embed_url = f"https://www.youtube.com/embed/{video_id}?autoplay=0" if video_id else None
    fallback_url = f"https://www.youtube.com/channel/{info['channel_id']}/live"

    return slug, {
        "name":         info["name"],
        "source":       info["source"],
        "embed_url":    embed_url,
        "fallback_url": fallback_url,
        "embeddable":   True,
    }


def get_live_feeds() -> dict:
    cached = _cache.get("live_feeds")
    if cached is not None:
        return cached

    feeds = {}
    with ThreadPoolExecutor(max_workers=3) as ex:
        tasks = [ex.submit(_resolve_youtube, slug, info) for slug, info in CHANNELS.items()]
        for f in as_completed(tasks):
            slug, result = f.result()
            feeds[slug] = result

    ordered = {slug: feeds[slug] for slug in CHANNELS if slug in feeds}
    _cache.set("live_feeds", ordered, 300)
    return ordered
