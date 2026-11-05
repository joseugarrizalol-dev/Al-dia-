import os
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers import _cache

CHANNELS = {
    "abc":        {"name": "ABC TV",           "source": "ABC Color", "channel_id": "UCEklbFbPoMaV1ciEb-0mAxg"},
    "monumental": {"name": "Radio Monumental", "source": "AM 1080",   "channel_id": "UCApQkTY6oHoGjZr6jfMajwQ"},
    "nanduti":    {"name": "Ñandutí",          "source": "AM 1020",   "channel_id": "UC3MzWfxWB6ImezkL5_DSd4A"},
    "rockandpop": {"name": "Rock & Pop",       "source": "FM 95.5",   "channel_id": "UCFii8hQ3sYpusp-8r_DmGeg"},
    "senadotv":   {"name": "SenadoTV",         "source": "Congreso",  "channel_id": "UCMXLvWR4z1Z4P4JvubxMQtg"},
    "npy":        {"name": "NPY",              "source": "NPYoficial","channel_id": "UCXm5UbX1eXIFmFE0lz1etiA"},
}

_YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")
_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# search.list con eventType=live cuesta 100 unidades de cuota por llamada.
# Con 6 canales y la cuota gratis (10,000/día), el techo real son ~16
# refrescos/día → se cachea 90 min para no pasarnos.
_CACHE_TTL = 90 * 60


def _resolve_youtube(slug, info):
    video_id = None
    if _YOUTUBE_API_KEY:
        try:
            r = requests.get(_SEARCH_URL, params={
                "part":       "snippet",
                "channelId":  info["channel_id"],
                "eventType":  "live",
                "type":       "video",
                "maxResults": 1,
                "key":        _YOUTUBE_API_KEY,
            }, timeout=8)
            items = r.json().get("items", [])
            if items:
                video_id = items[0]["id"]["videoId"]
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
    with ThreadPoolExecutor(max_workers=6) as ex:
        tasks = [ex.submit(_resolve_youtube, slug, info) for slug, info in CHANNELS.items()]
        for f in as_completed(tasks):
            slug, result = f.result()
            feeds[slug] = result

    ordered = {slug: feeds[slug] for slug in CHANNELS if slug in feeds}
    _cache.set("live_feeds", ordered, _CACHE_TTL)
    return ordered
