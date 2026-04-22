import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers import _cache

# ── Static data (BCP policy rates, ratings — change infrequently) ──────────
STATIC = {
    "rating_sp":  {"label": "Rating S&P",        "value": "BB",    "unit": "",    "year": "S&P"},
    "rating_mdy": {"label": "Rating Moody's",     "value": "Ba1",   "unit": "",    "year": "Moody's"},
    "tpm":        {"label": "TPM · BCP",          "value": "6,00",  "unit": "%",   "year": "BCP"},
    "reservas":   {"label": "Reservas intern.",   "value": "10,1",  "unit": "B USD","year": "BCP"},
    "deuda_ext":  {"label": "Deuda externa",      "value": "29,9",  "unit": "B USD","year": "FMI"},
}

# ── IMF WEO fallback values (April 2025 edition) ────────────────────────────
DEMO_IMF = {
    "pib_crec":  {"label": "Crec. PIB 2025",   "value": "6,0", "unit": "%",    "year": "FMI"},
    "pib_nom":   {"label": "PIB nominal",       "value": "45,0","unit": "B USD","year": "FMI"},
    "inflacion": {"label": "Inflación 2025",    "value": "3,8", "unit": "%",    "year": "FMI"},
    "desempleo": {"label": "Desempleo 2026",    "value": "5,2", "unit": "%",    "year": "FMI"},
}

IMF_BASE = "https://www.imf.org/external/datamapper/api/v1"


def _imf_latest(indicator: str, country: str = "PRY", prefer_year: int = 2025) -> tuple:
    """Return (value_str, year_str) for the closest available year."""
    try:
        url = f"{IMF_BASE}/{indicator}/{country}"
        r = requests.get(url, timeout=6, headers={"Accept": "application/json"})
        data = r.json()
        series: dict = data["values"][indicator][country]
        # Try preferred year, then fall back to nearest available
        for yr in (prefer_year, prefer_year - 1, prefer_year + 1, prefer_year - 2):
            v = series.get(str(yr))
            if v is not None:
                return round(float(v), 1), str(yr)
    except Exception:
        pass
    return None, None


def _fmt(n: float) -> str:
    """Format number with comma as decimal separator (es-PY style)."""
    s = f"{n:.1f}"
    return s.replace(".", ",")


def get_economic() -> dict:
    cached = _cache.get("economic")
    if cached is not None:
        return cached

    indicators = [
        ("NGDP_RPCH", 2025, "pib_crec",  "Crec. PIB",  "%",     "pib_crec"),
        ("NGDPD",     2025, "pib_nom",   "PIB nominal", "B USD", "pib_nom"),
        ("PCPIPCH",   2025, "inflacion", "Inflación",   "%",     "inflacion"),
        ("LUR",       2026, "desempleo", "Desempleo",   "%",     "desempleo"),
    ]

    def _fetch(ind, yr, key, label, unit, demo_key):
        val, actual_yr = _imf_latest(ind, prefer_year=yr)
        if val is not None:
            return key, {"label": label, "value": _fmt(val), "unit": unit, "year": f"FMI {actual_yr}"}
        return key, DEMO_IMF[demo_key]

    result = {}
    with ThreadPoolExecutor(max_workers=4) as ex:
        futures = [ex.submit(_fetch, *args) for args in indicators]
        for f in as_completed(futures):
            key, data = f.result()
            result[key] = data

    result.update(STATIC)
    _cache.set("economic", result, 3600)
    return result
