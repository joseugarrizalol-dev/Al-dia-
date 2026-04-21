import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers import _cache

# ── Symbol definitions ────────────────────────────────────

COMMODITIES = {
    "GC=F":  {"label": "Oro",          "unit": "USD/oz",     "flag": "🥇"},
    "SI=F":  {"label": "Plata",        "unit": "USD/oz",     "flag": "🥈"},
    "CL=F":  {"label": "Petróleo WTI", "unit": "USD/bbl",    "flag": "🛢️"},
    "NG=F":  {"label": "Gas Natural",  "unit": "USD/mmBtu",  "flag": "🔥"},
    "ZS=F":  {"label": "Soja",         "unit": "¢/bu",       "flag": "🌱"},
    "ZC=F":  {"label": "Maíz",         "unit": "¢/bu",       "flag": "🌽"},
    "ZW=F":  {"label": "Trigo",        "unit": "¢/bu",       "flag": "🌾"},
}

TREASURIES = {
    "^IRX":  {"label": "T-Bill 3M",    "unit": "%"},
    "^FVX":  {"label": "Treasury 5A",  "unit": "%"},
    "^TNX":  {"label": "Treasury 10A", "unit": "%"},
    "^TYX":  {"label": "Treasury 30A", "unit": "%"},
}

INDEXES = {
    "^GSPC": {"label": "S&P 500",   "flag": "🇺🇸"},
    "^IXIC": {"label": "Nasdaq",    "flag": "💻"},
    "^DJI":  {"label": "Dow Jones", "flag": "📈"},
    "^VIX":  {"label": "VIX",       "flag": "⚡"},
    "^MERV": {"label": "Merval",    "flag": "🇦🇷"},
    "^RUT":  {"label": "Russell 2000", "flag": "📊"},
}

DEMO_COMMODITIES = {
    "GC=F":  {"label":"Oro",          "unit":"USD/oz",    "flag":"🥇", "price":2350.0, "change":"+0.45%"},
    "SI=F":  {"label":"Plata",        "unit":"USD/oz",    "flag":"🥈", "price":28.4,   "change":"+0.30%"},
    "CL=F":  {"label":"Petróleo WTI", "unit":"USD/bbl",   "flag":"🛢️", "price":82.5,   "change":"-0.80%"},
    "NG=F":  {"label":"Gas Natural",  "unit":"USD/mmBtu", "flag":"🔥", "price":2.10,   "change":"+1.20%"},
    "ZS=F":  {"label":"Soja",         "unit":"¢/bu",      "flag":"🌱", "price":1185.0, "change":"-0.60%"},
    "ZC=F":  {"label":"Maíz",         "unit":"¢/bu",      "flag":"🌽", "price":445.0,  "change":"-0.20%"},
    "ZW=F":  {"label":"Trigo",        "unit":"¢/bu",      "flag":"🌾", "price":598.0,  "change":"+0.50%"},
}

DEMO_TREASURIES = {
    "^IRX":  {"label":"T-Bill 3M",    "unit":"%", "price":5.25, "change":"flat"},
    "^FVX":  {"label":"Treasury 5A",  "unit":"%", "price":4.52, "change":"-0.02%"},
    "^TNX":  {"label":"Treasury 10A", "unit":"%", "price":4.68, "change":"+0.03%"},
    "^TYX":  {"label":"Treasury 30A", "unit":"%", "price":4.82, "change":"+0.02%"},
}

DEMO_INDEXES = {
    "^GSPC": {"label":"S&P 500",      "flag":"🇺🇸", "price":5240.0,   "change":"+0.55%"},
    "^IXIC": {"label":"Nasdaq",       "flag":"💻",  "price":16430.0,  "change":"+0.80%"},
    "^DJI":  {"label":"Dow Jones",    "flag":"📈",  "price":38950.0,  "change":"+0.30%"},
    "^VIX":  {"label":"VIX",          "flag":"⚡",  "price":14.2,     "change":"-3.10%"},
    "^MERV": {"label":"Merval",       "flag":"🇦🇷", "price":1950000.0,"change":"+1.20%"},
    "^RUT":  {"label":"Russell 2000", "flag":"📊",  "price":2050.0,   "change":"+0.40%"},
}


def _fetch_ticker(symbol, meta):
    try:
        t = yf.Ticker(symbol)
        fi = t.fast_info
        price = fi.last_price
        prev  = fi.previous_close
        if price is None or price == 0:
            return symbol, None
        change_pct = ((price - prev) / prev * 100) if prev else 0
        return symbol, {
            **meta,
            "price":  round(price, 2),
            "change": f"{change_pct:+.2f}%",
        }
    except Exception:
        return symbol, None


def _fetch_batch(symbols_meta: dict) -> dict:
    result = {}
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(_fetch_ticker, sym, meta): sym for sym, meta in symbols_meta.items()}
        for f in as_completed(futures):
            sym, data = f.result()
            if data:
                result[sym] = data
    return result


def get_commodities() -> dict:
    cached = _cache.get("commodities")
    if cached is not None:
        return cached

    data = _fetch_batch(COMMODITIES)
    if not data:
        return DEMO_COMMODITIES
    for k, v in DEMO_COMMODITIES.items():
        if k not in data:
            data[k] = v
    result = {k: data[k] for k in COMMODITIES if k in data}
    _cache.set("commodities", result, 120)
    return result


def get_us_markets() -> dict:
    cached = _cache.get("us_markets")
    if cached is not None:
        return cached

    all_meta = {**TREASURIES, **INDEXES}
    data = _fetch_batch(all_meta)

    treasuries = {}
    for k in TREASURIES:
        treasuries[k] = data.get(k, DEMO_TREASURIES.get(k))

    indexes = {}
    for k in INDEXES:
        indexes[k] = data.get(k, DEMO_INDEXES.get(k))

    effr = _get_effr()
    result = {"treasuries": treasuries, "indexes": indexes, "effr": effr}
    _cache.set("us_markets", result, 120)
    return result


def _get_effr() -> dict:
    try:
        import requests
        res = requests.get(
            "https://markets.newyorkfed.org/api/rates/effr/last/1.json",
            timeout=6,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        if res.ok:
            j = res.json()
            rate = j["refRates"][0]["percentRate"]
            date = j["refRates"][0]["effectiveDate"]
            return {"label": "Fed Funds (EFFR)", "price": rate, "change": "—", "unit": "%", "date": date}
    except Exception:
        pass
    return {"label": "Fed Funds (EFFR)", "price": 5.33, "change": "—", "unit": "%", "date": "demo"}
