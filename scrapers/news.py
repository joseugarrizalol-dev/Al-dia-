import requests
import feedparser
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers import _cache

# ── Outlets: RSS feeds where available, HTML fallback ────────────────────────

OUTLETS_RSS = {
    "ABC Color": [
        "https://www.abc.com.py/arc/outboundfeeds/rss/nacionales/",
        "https://www.abc.com.py/arc/outboundfeeds/rss/noticias-del-dia/",
    ],
}

OUTLETS_HTML = {
    "Última Hora": [
        "https://www.ultimahora.com/economia",
        "https://www.ultimahora.com/politica",
    ],
    "La Nación": [
        "https://www.lanacion.com.py/",
    ],
    "Diario HOY": [
        "https://www.hoy.com.py/categoria/economia",
        "https://www.hoy.com.py/politica",
    ],
}

# ── Agro outlets ─────────────────────────────────────────────────────────────

AGRO_OUTLETS_RSS = {}

AGRO_OUTLETS_HTML = {
    "Valor Agro": [
        "https://valoragro.com.py/",
        "https://valoragro.com.py/category/noticias/",
    ],
}

AGRO_KEYWORDS = {
    "soja", "maíz", "maiz", "trigo", "arroz", "algodón", "algodon",
    "girasol", "canola", "sorgo", "stevia", "yerba", "caña", "cana",
    "ganado", "bovino", "porcino", "avícola", "avicola", "tambo",
    "agro", "rural", "campo", "siembra", "cosecha", "zafra",
    "commodit", "bushel", "tonelad", "hectárea", "hectarea",
    "fertiliz", "pesticid", "herbicid", "semilla", "export",
    "cbot", "chicago", "paraguay agro", "senacsa", "mag ",
    "capeco", "umss", "uagrm", "frigorífico", "frigorifico",
    "deforestaci", "sequía", "sequia", "lluvia", "climátic", "climatico",
    "precio soja", "precio maíz", "precio trigo", "precio ganado",
}

INCLUDE_KEYWORDS = {
    "econom", "finanz", "mercado", "dólar", "guaraní", "inflaci",
    "banco", "bcp", "inversión", "inversi", "exporta", "importa",
    "comercio", "empresa", "bolsa", "presupuest", "impuest",
    "tributar", "salario", "precio", "deuda", "crédit", "fiscal",
    "monetar", "tasa", "bvpasa", "acciones", "gobierno", "senado",
    "diputad", "president", "ministr", "partido", "elecci",
    "congreso", "legisl", "decreto", "políti", "politi",
    "corrupt", "judicial", "tribunal", "fiscalí", "fiscali",
    "reforma", "ley ", " ley", "proyecto", "hacienda", "itaipú",
    "itaipu", "inversor", "capital", "recesi", "crecimient",
    "pib", "gdp", "fmi", "banco mundial", "bid ", "devalua",
    "reservas", "exportacion", "importacion", "rivas", "alliana",
    "pena", "peña", "congreso", "poder", "ejecutivo", "ministerio",
}

EXCLUDE_KEYWORDS = {
    "fútbol", "futbol", "olimpia", "cerro porteño", "libertad fc",
    "atletismo", "baloncesto", "tenis", "rugby", "boxeo", "natación",
    "salud", "médico", "hospital", "vacuna", "cáncer", "covid",
    "farándula", "farandula", "entretenimient", "espectácul", "espectacul",
    "moda", "belleza", "música", "musica", "cine", "novela",
    "horóscopo", "horoscopo", "receta", "cocina", "deportes",
}

DEMO_NEWS = [
    {"title": "BCP mantiene tasa de interés referencial en 6%",                       "url": "#", "outlet": "ABC Color"},
    {"title": "Senado aprueba nueva ley de inversiones extranjeras",                   "url": "#", "outlet": "ABC Color"},
    {"title": "Guaraní se aprecia frente al dólar en la jornada de hoy",               "url": "#", "outlet": "Última Hora"},
    {"title": "Gobierno anuncia plan de pagos a constructoras por USD 150 millones",   "url": "#", "outlet": "Última Hora"},
    {"title": "Exportaciones de soja superan los USD 2.000 millones en el trimestre",  "url": "#", "outlet": "La Nación"},
    {"title": "Diputados debaten reforma tributaria para el sector agropecuario",      "url": "#", "outlet": "La Nación"},
    {"title": "Inflación de marzo se ubica por debajo del 4% anual",                   "url": "#", "outlet": "Diario HOY"},
    {"title": "Paraguay negocia acuerdo comercial con la Unión Europea",               "url": "#", "outlet": "Diario HOY"},
]


def _is_relevant(title: str) -> bool:
    t = title.lower()
    if any(ex in t for ex in EXCLUDE_KEYWORDS):
        return False
    if any(inc in t for inc in INCLUDE_KEYWORDS):
        return True
    return False


def _is_article_link(href: str, base_domain: str) -> bool:
    if not href or href.startswith("#") or href.startswith("mailto"):
        return False
    if href.startswith("http") and base_domain not in href:
        return False
    return len([s for s in href.split("/") if s]) >= 2


def _scrape_rss(outlet_name: str, urls: list) -> list:
    seen = set()
    articles = []
    for url in urls:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                title = entry.get("title", "").strip()
                link  = entry.get("link", "#")
                if title and title not in seen and _is_relevant(title):
                    seen.add(title)
                    articles.append({"title": title, "url": link, "outlet": outlet_name})
                if len(articles) >= 6:
                    return articles
        except Exception:
            pass
    return articles


def _scrape_html(outlet_name: str, urls: list) -> list:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"}
    seen = set()
    articles = []
    for url in urls:
        try:
            res = requests.get(url, headers=headers, timeout=5)
            if not res.ok:
                continue
            soup = BeautifulSoup(res.text, "html.parser")
            base_domain = urlparse(url).netloc

            for tag in soup.find_all(["h1", "h2", "h3", "h4"]):
                a = tag.find("a", href=True) or tag.find_parent("a", href=True)
                if a and a.get("href"):
                    title = tag.get_text(strip=True)
                    href  = urljoin(url, a["href"])
                    if len(title) > 25 and title not in seen and _is_article_link(href, base_domain) and _is_relevant(title):
                        seen.add(title)
                        articles.append({"title": title, "url": href, "outlet": outlet_name})
                if len(articles) >= 5:
                    break

            if len(articles) < 3:
                for a in soup.find_all("a", href=True):
                    title = a.get_text(strip=True)
                    href  = urljoin(url, a["href"])
                    if len(title) > 40 and title not in seen and _is_article_link(href, base_domain) and _is_relevant(title):
                        seen.add(title)
                        articles.append({"title": title, "url": href, "outlet": outlet_name})
                    if len(articles) >= 5:
                        break
        except Exception:
            pass
    return articles


def _interleave(buckets: list) -> list:
    """Round-robin merge so no outlet appears in a long run."""
    result = []
    buckets = [b for b in buckets if b]
    while buckets:
        for b in buckets[:]:
            if b:
                result.append(b.pop(0))
            else:
                buckets.remove(b)
    return result


def _is_agro_relevant(title: str) -> bool:
    t = title.lower()
    return any(kw in t for kw in AGRO_KEYWORDS)


def _scrape_rss_agro(outlet_name: str, urls: list) -> list:
    seen = set()
    articles = []
    for url in urls:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                title = entry.get("title", "").strip()
                link  = entry.get("link", "#")
                if title and title not in seen:
                    seen.add(title)
                    articles.append({"title": title, "url": link, "outlet": outlet_name, "agro": True})
                if len(articles) >= 10:
                    return articles
        except Exception:
            pass
    return articles


def _scrape_abc_rural() -> list:
    import re as _re
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"}
    try:
        res = requests.get("https://www.abc.com.py/negocios/abc-campo/", headers=headers, timeout=8)
        if not res.ok:
            return []
        text = res.content.decode("utf-8")

        # Arc JSON: canonical_url appears first, then headlines.basic within ~3000 chars
        seen = set()
        articles = []
        for m in _re.finditer(r'"canonical_url":"(/negocios/abc-campo/[^"]+)"', text):
            path  = m.group(1)
            chunk = text[m.start(): m.start() + 3000]
            h     = _re.search(r'"headlines":\{[^}]*"basic":"([^"]{10,})"', chunk)
            if not h:
                continue
            url   = "https://www.abc.com.py" + path
            title = h.group(1).strip()
            if url not in seen:
                seen.add(url)
                articles.append({"title": title, "url": url, "outlet": "ABC Rural", "agro": True})
            if len(articles) >= 8:
                break
        return articles
    except Exception:
        return []


def _scrape_html_agro(outlet_name: str, urls: list) -> list:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"}
    seen_urls = set()
    articles = []
    for url in urls:
        try:
            res = requests.get(url, headers=headers, timeout=6)
            if not res.ok:
                continue
            res.encoding = res.apparent_encoding or "utf-8"
            soup = BeautifulSoup(res.text, "html.parser")
            base_domain = urlparse(url).netloc
            for a in soup.find_all("a", href=True):
                # Get only direct text nodes, skipping child span categories
                title = " ".join(t.strip() for t in a.find_all(string=True, recursive=False) if t.strip())
                if not title:
                    title = a.get_text(strip=True)
                href  = urljoin(url, a["href"])
                if (len(title) > 35 and href not in seen_urls
                        and _is_article_link(href, base_domain)):
                    seen_urls.add(href)
                    articles.append({"title": title, "url": href, "outlet": outlet_name, "agro": True})
                if len(articles) >= 10:
                    break
        except Exception:
            pass
    return articles


def get_news() -> list:
    cached = _cache.get("news")
    if cached is not None:
        return cached

    tasks = []
    with ThreadPoolExecutor(max_workers=10) as ex:
        for name, urls in OUTLETS_RSS.items():
            tasks.append(ex.submit(_scrape_rss, name, urls))
        for name, urls in OUTLETS_HTML.items():
            tasks.append(ex.submit(_scrape_html, name, urls))
        for name, urls in AGRO_OUTLETS_RSS.items():
            tasks.append(ex.submit(_scrape_rss_agro, name, urls))
        for name, urls in AGRO_OUTLETS_HTML.items():
            tasks.append(ex.submit(_scrape_html_agro, name, urls))
        tasks.append(ex.submit(_scrape_abc_rural))
        buckets = [f.result() for f in as_completed(tasks)]

    # Separate agro buckets from general, preserve per-outlet structure for interleave
    agro_buckets    = [b for b in buckets if b and b[0].get("agro")]
    general_buckets = [b for b in buckets if b and not b[0].get("agro")]
    mixed       = _interleave(general_buckets)
    mixed_agro  = _interleave(agro_buckets)
    result = (mixed if mixed else DEMO_NEWS) + mixed_agro
    _cache.set("news", result, 180)
    return result
