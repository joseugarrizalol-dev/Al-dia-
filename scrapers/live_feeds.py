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

_YT_VIDEO_ID_RE = re.compile(r'"videoId":"([a-zA-Z0-9_-]{11})"')
_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def _resolve_youtube(slug, info):
    try:
        r = requests.get(
            f"https://www.youtube.com/channel/{info['channel_id']}/live",
            headers=_HEADERS, timeout=6,
        )
        match = _YT_VIDEO_ID_RE.search(r.text)
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
