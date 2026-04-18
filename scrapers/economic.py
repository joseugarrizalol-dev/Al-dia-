import requests

# ── Static data (BCP policy rates, ratings — change infrequently) ──────────
STATIC = {
    "rating_sp":  {"label": "Rating S&P",        "value": "BB",    "unit": "",    "year": "S&P"},
    "rating_mdy": {"label": "Rating Moody's",     "value": "Ba1",   "unit": "",    "year": "Moody's"},
    "tpm":        {"label": "TPM · BCP",          "value": "6,00",  "unit": "%",   "year": "BCP"},
    "reservas":   {"label": "Reservas intern.",   "value": "10.100","unit": "M USD","year": "BCP"},
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
        r = requests.get(url, timeout=10, headers={"Accept": "application/json"})
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
    result = {}

    # PIB crecimiento real 2025
    val, yr = _imf_latest("NGDP_RPCH", prefer_year=2025)
    if val is not None:
        result["pib_crec"] = {"label": "Crec. PIB", "value": _fmt(val), "unit": "%", "year": f"FMI {yr}"}
    else:
        result["pib_crec"] = DEMO_IMF["pib_crec"]

    # PIB nominal en USD (miles de millones)
    val, yr = _imf_latest("NGDPD", prefer_year=2025)
    if val is not None:
        result["pib_nom"] = {"label": "PIB nominal", "value": _fmt(val), "unit": "B USD", "year": f"FMI {yr}"}
    else:
        result["pib_nom"] = DEMO_IMF["pib_nom"]

    # Inflación proyectada
    val, yr = _imf_latest("PCPIPCH", prefer_year=2025)
    if val is not None:
        result["inflacion"] = {"label": "Inflación", "value": _fmt(val), "unit": "%", "year": f"FMI {yr}"}
    else:
        result["inflacion"] = DEMO_IMF["inflacion"]

    # Desempleo proyectado
    val, yr = _imf_latest("LUR", prefer_year=2026)
    if val is not None:
        result["desempleo"] = {"label": "Desempleo", "value": _fmt(val), "unit": "%", "year": f"FMI {yr}"}
    else:
        result["desempleo"] = DEMO_IMF["desempleo"]

    # Merge static indicators
    result.update(STATIC)

    return result
