import re
import json
from datetime import date, timedelta
from pathlib import Path
from collections import Counter

_SNAPSHOT_FILE = Path(__file__).parent.parent / "data" / "market_snapshot.json"

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

FX_KW      = {"guaraní", "guarani", "dólar", "dollar", "euro", "real", "tipo de cambio", "cambio"}
MKT_KW     = {"s&p", "nasdaq", "dow", "bolsa", "índice", "indice", "acciones", "wall street", "nyse"}
COMD_KW    = {"oro", "soja", "petróleo", "petroleo", "maíz", "maiz", "trigo", "cobre", "commodity", "commodities"}
MACRO_PY_KW= {"bcp", "fmi", "moody", "s&p", "crecimiento", "pib", "inflaci", "reservas", "tasa de interés", "tasa referencial"}

UP_KW   = {"sube", "crece", "estable", "supera", "récord", "record", "alza", "aprecia", "mantiene", "positiv", "aumento", "gana", "sólido", "solido", "máximo", "maximo"}
DOWN_KW = {"cede", "baja", "cae", "contrae", "negativ", "pérdida", "perdida", "reduce", "mínimo", "minimo", "retrocede", "presión", "presion", "riesgo", "deterioro"}

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


def _sentiment(text: str) -> str:
    t = text.lower()
    up   = sum(1 for kw in UP_KW   if kw in t)
    down = sum(1 for kw in DOWN_KW if kw in t)
    if up > down:
        return "up"
    if down > up:
        return "down"
    return "flat"


def _tag(text: str) -> str:
    t = text.lower()
    if any(kw in t for kw in FX_KW):
        return "FX"
    if any(kw in t for kw in MKT_KW):
        return "MKT"
    if any(kw in t for kw in COMD_KW):
        return "COMD"
    if any(kw in t for kw in MACRO_PY_KW):
        return "PY"
    if any(kw in t for kw in POLITICAL_KW):
        return "POL"
    return "ECO"


def _extract_figures(titles: list) -> list:
    found = []
    text = " ".join(titles)
    for pattern in (RE_USD, RE_PYG, RE_PCT):
        found.extend(m.group().strip() for m in pattern.finditer(text))
    seen, unique = set(), []
    for f in found:
        key = f.lower().replace(" ", "")
        if key not in seen:
            seen.add(key)
            unique.append(f)
    return unique[:6]


def _extract_snapshot(market_data: dict) -> dict:
    """Pull key numeric values from market data for comparison."""
    snap = {"date": str(date.today())}
    rates = market_data.get("rates", {})
    for cur in ("USD", "EUR", "BRL"):
        v = rates.get(cur, {}).get("sell")
        if v:
            try: snap[cur] = float(str(v).replace(",", ".").replace(".", "", str(v).count(".") - 1))
            except: pass
    crypto = market_data.get("crypto", {})
    for key, label in (("BTC", "BTC"), ("ETH", "ETH")):
        item = crypto.get(key) or next((v for v in crypto.values() if label in v.get("name", "").upper()), None)
        if item:
            try: snap[key] = float(str(item.get("price_usd", 0)).replace(",", ""))
            except: pass
    for item in market_data.get("commodities", {}).values():
        name = item.get("name", "")
        for label in ("Oro", "Soja", "Petróleo"):
            if label.lower() in name.lower():
                try: snap[label] = float(str(item.get("price", 0)).replace(",", ""))
                except: pass
    for item in market_data.get("markets", {}).values():
        name = item.get("name", "")
        for label in ("S&P 500", "Nasdaq", "Dow Jones"):
            if label.lower() in name.lower():
                try: snap[label] = float(str(item.get("price", 0)).replace(",", ""))
                except: pass
    return snap


def _save_snapshot(snap: dict):
    _SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing = []
    if _SNAPSHOT_FILE.exists():
        try: existing = json.loads(_SNAPSHOT_FILE.read_text())
        except: existing = []
    # Keep last 2 snapshots only
    existing = [s for s in existing if s.get("date") != snap["date"]]
    existing.append(snap)
    existing = existing[-2:]
    _SNAPSHOT_FILE.write_text(json.dumps(existing, ensure_ascii=False))


def _load_yesterday_snapshot() -> dict | None:
    if not _SNAPSHOT_FILE.exists():
        return None
    try:
        snaps = json.loads(_SNAPSHOT_FILE.read_text())
        yesterday = str(date.today() - timedelta(days=1))
        return next((s for s in snaps if s.get("date") == yesterday), None)
    except:
        return None


_LABELS = {
    "USD": ("el dólar", "₲", True),
    "EUR": ("el euro", "₲", True),
    "BRL": ("el real", "₲", True),
    "BTC": ("Bitcoin", "USD", False),
    "ETH": ("Ethereum", "USD", False),
    "Oro": ("el oro", "USD", False),
    "Soja": ("la soja", "USD", False),
    "S&P 500": ("el S&P 500", "pts", False),
    "Nasdaq": ("el Nasdaq", "pts", False),
}


def _market_mover_point(today_snap: dict, yesterday_snap: dict) -> dict | None:
    best_key, best_pct = None, 0.0
    for key in _LABELS:
        t = today_snap.get(key)
        y = yesterday_snap.get(key)
        if t and y and y != 0:
            pct = abs((t - y) / y) * 100
            if pct > best_pct:
                best_pct, best_key = pct, key
    if best_key is None or best_pct < 0.3:
        return None
    t = today_snap[best_key]
    y = yesterday_snap[best_key]
    pct = (t - y) / y * 100
    label, unit, is_pyg = _LABELS[best_key]
    direction = "subió" if pct > 0 else "bajó"
    sentiment = "up" if pct > 0 else "down"
    if is_pyg:
        val_fmt = f"₲{t:,.0f}".replace(",", ".")
    else:
        val_fmt = f"USD {t:,.0f}".replace(",", ".") if t > 100 else f"USD {t:,.2f}"
    text = f"{label.capitalize()} {direction} {abs(pct):.1f}% respecto a ayer, cotizando a {val_fmt}."
    return {"text": text, "sentiment": sentiment, "tag": "FX" if best_key in ("USD","EUR","BRL") else "MKT"}


def _build_summary(news: list, market_data: dict | None = None) -> list:
    if not news:
        return [{"text": "No hay noticias disponibles hoy.", "sentiment": "flat", "tag": "PY"}]

    t_all     = [n["title"] for n in news]
    political = [n for n in news if _classify(n["title"]) in ("political", "both")]
    economic  = [n for n in news if _classify(n["title"]) in ("economic",  "both")]
    fx        = [n for n in news if any(kw in n["title"].lower() for kw in FX_KW)]
    agro      = [n for n in news if n.get("agro")]
    figures   = _extract_figures(t_all)

    # News with concrete numbers get priority for the figures slot
    RE_NUM = re.compile(r"\d")
    numeric = [n for n in news if RE_NUM.search(n["title"])]

    used = set()
    points = []

    def _add(n, forced_tag=None):
        if n["title"] in used:
            return False
        used.add(n["title"])
        text = n["title"].rstrip(".") + "."
        tag  = forced_tag or _tag(text)
        points.append({"text": text, "sentiment": _sentiment(text), "tag": tag})
        return True

    # Slot 1 — Política
    for n in political:
        if _add(n, "POL"):
            break

    # Slot 2 — Economía (exclude fx-only, prefer broad economic news)
    econ_non_fx = [n for n in economic if not any(kw in n["title"].lower() for kw in FX_KW)]
    pool = econ_non_fx or economic
    for n in pool:
        if _add(n, "ECO"):
            break

    # Slot 3 — Moneda / dato numérico destacado
    # prefer fx news, fallback to any headline with a number
    for n in (fx + numeric):
        if _add(n):
            break

    # Slot 4 — Additional headline (economic > political > any)
    for n in (economic + political + news):
        if len(points) >= 4:
            break
        _add(n)

    # Slot 5 — Any remaining headline not yet used (priority: economic > political > other)
    for n in (economic + political + news):
        if len(points) >= 5:
            break
        _add(n)

    # Slot agro — one agro headline if available
    for n in agro:
        if _add(n, "AGRO"):
            break

    # Inject market mover if available
    if market_data:
        today_snap = _extract_snapshot(market_data)
        yesterday_snap = _load_yesterday_snapshot()
        _save_snapshot(today_snap)
        if yesterday_snap:
            mover = _market_mover_point(today_snap, yesterday_snap)
            if mover:
                # Replace slot 3 (FX/numeric) with market mover
                points = [p for p in points if p.get("tag") not in ("FX",)][:2] + [mover] + [p for p in points if p.get("tag") not in ("FX",)][2:]

    return points if points else [{"text": news[0]["title"].rstrip(".") + ".", "sentiment": "flat", "tag": "ECO"}]


def generate_daily_summary(news: list, force: bool = False, market_data: dict | None = None) -> dict:
    today = str(date.today())
    if not force and today in _cache:
        return {"summary": _cache[today], "date": today, "cached": True}

    points = _build_summary(news, market_data=market_data)
    _cache[today] = points
    return {"summary": points, "date": today, "cached": False}
