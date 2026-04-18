import re
from datetime import date
from collections import Counter

_cache: dict = {}

# ── Keyword sets ──────────────────────────────────────────

POLITICAL_KW = {
    "senado", "gobierno", "presidente", "ministr", "partido", "elecci",
    "decreto", "congreso", "diputad", "fiscal", "judicial", "tribunal",
    "rivas", "alliana", "peña", "pena", "ejecutivo", "legislativ",
    "corrupci", "poder", "reform", "ley ", " ley", "proyecto de ley",
    "cartista", "colorado", "liberal", "plra", "anr",
}

ECONOMIC_KW = {
    "dólar", "dollar", "guaraní", "salario", "precio", "banco", "bcp",
    "inflaci", "exporta", "importa", "inversi", "presupuest", "empresa",
    "mercado", "tributar", "deuda", "hacienda", "comercio", "itaipu",
    "itaipú", "bvpasa", "acciones", "bonos", "crédit", "tasa",
    "pib", "gdp", "fmi", "reservas", "financi", "econom", "fiscal",
    "impuest", "recaud", "crecimient", "producci",
}

# Regex patterns for concrete figures
RE_USD     = re.compile(r"USD[\s\$]?[\d.,]+\s*(?:millones?|mil|bn)?", re.IGNORECASE)
RE_PYG     = re.compile(r"G\.?\s*[\d.,]+(?:\s*(?:millones?|mil))?", re.IGNORECASE)
RE_PCT     = re.compile(r"\d+[,.]?\d*\s*%")
RE_CAPITAL = re.compile(r"\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,}\b")


def _classify(title: str):
    t = title.lower()
    is_pol = any(kw in t for kw in POLITICAL_KW)
    is_eco = any(kw in t for kw in ECONOMIC_KW)
    if is_pol and is_eco:
        return "both"
    if is_pol:
        return "political"
    if is_eco:
        return "economic"
    return "other"


def _extract_figures(titles: list) -> list:
    found = []
    text = " ".join(titles)
    for pattern in (RE_USD, RE_PYG, RE_PCT):
        found.extend(m.group().strip() for m in pattern.finditer(text))
    # deduplicate preserving order
    seen, unique = set(), []
    for f in found:
        key = f.lower().replace(" ", "")
        if key not in seen:
            seen.add(key)
            unique.append(f)
    return unique[:6]


def _top_actors(titles: list, n=3) -> list:
    words = []
    for t in titles:
        words.extend(RE_CAPITAL.findall(t))
    # filter out common non-entity words
    STOPWORDS = {"Paraguay", "Gobierno", "Senado", "Banco", "Este", "Esta",
                 "Los", "Las", "Del", "Para", "Tras", "Tras", "Sobre", "Entre"}
    filtered = [w for w in words if w not in STOPWORDS and len(w) > 4]
    counts = Counter(filtered)
    return [w for w, _ in counts.most_common(n)]


def _build_summary(news: list) -> str:
    if not news:
        return "No hay noticias disponibles hoy."

    political = [n for n in news if _classify(n["title"]) in ("political", "both")]
    economic  = [n for n in news if _classify(n["title"]) in ("economic", "both")]
    figures   = _extract_figures([n["title"] for n in news])

    parts = []

    # One line: top political headline
    if political:
        parts.append(f"Política: {political[0]['title'].rstrip('.')}.")

    # One line: top economic headline
    if economic:
        parts.append(f"Economía: {economic[0]['title'].rstrip('.')}.")
    elif not political:
        parts.append(news[0]["title"].rstrip(".") + ".")

    # One line: key figures if any
    if figures:
        parts.append(f"Cifras del día: {' · '.join(figures[:3])}.")

    return " ".join(parts)


def generate_daily_summary(news: list, force: bool = False) -> dict:
    today = str(date.today())
    if not force and today in _cache:
        return {"summary": _cache[today], "date": today, "cached": True}

    summary = _build_summary(news)
    _cache[today] = summary
    return {"summary": summary, "date": today, "cached": False}
