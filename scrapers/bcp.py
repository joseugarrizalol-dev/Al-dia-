import re
import requests
from bs4 import BeautifulSoup

URL = "https://www.maxicambios.com.py"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

DEMO_RATES = {
    "USD": {"buy": 7280, "sell": 7320, "change": "—"},
    "EUR": {"buy": 8100, "sell": 8160, "change": "—"},
    "BRL": {"buy": 1310, "sell": 1340, "change": "—"},
    "ARS": {"buy": 7.2,  "sell": 7.5,  "change": "—"},
}

# Map flag filename / currency name to standard code
_CODE_MAP = {
    "USD": "USD", "DOLAR": "USD", "DÓLAR": "USD",
    "EUR": "EUR", "EURO": "EUR",
    "BRL": "BRL", "REAL": "BRL",
    "ARS": "ARS", "PESO": "ARS",
}

WANT = {"USD", "EUR", "BRL", "ARS"}


def _to_float(s: str) -> float:
    return float(s.replace(".", "").replace(",", ".").strip())


def _via_soup(soup) -> dict:
    """
    Strategy A: walk the DOM looking for flag <img> tags.
    The first occurrence of each currency is the Asunción branch rate.
    """
    rates = {}
    seen = set()

    for img in soup.find_all("img", src=True):
        src: str = img["src"]
        if "flags/" not in src:
            continue
        fname = src.split("/")[-1].upper().replace(".PNG", "").replace(".JPG", "")
        code = _CODE_MAP.get(fname)
        if not code or code in seen or code not in WANT:
            continue

        # Walk up to a container that holds Compra + Venta text
        node = img.parent
        for _ in range(8):
            txt = node.get_text(" ", strip=True)
            if re.search(r'[Cc]ompra', txt) and re.search(r'[Vv]enta', txt):
                buy  = re.search(r'[Cc]ompra\D{0,30}?(\d[\d.]+)', txt)
                sell = re.search(r'[Vv]enta\D{0,30}?(\d[\d.]+)', txt)
                if buy and sell:
                    try:
                        rates[code] = {
                            "buy":    _to_float(buy.group(1)),
                            "sell":   _to_float(sell.group(1)),
                            "change": "—",
                        }
                        seen.add(code)
                    except ValueError:
                        pass
                break
            if node.parent:
                node = node.parent
            else:
                break

    return rates


def _via_text(html: str) -> dict:
    """
    Strategy B: regex over raw HTML text — find flag src, then
    the first compra/venta pair that follows within ~600 chars.
    """
    rates = {}
    for code, aliases in [
        ("USD", ["USD"]),
        ("EUR", ["EUR"]),
        ("BRL", ["BRL"]),
        ("ARS", ["ARS"]),
    ]:
        for alias in aliases:
            pattern = rf'flags/{alias}\.png[^<]{{0,600}}?[Cc]ompra\D{{0,30}}?(\d[\d.]+)\D{{0,30}}?[Vv]enta\D{{0,30}}?(\d[\d.]+)'
            m = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
            if m:
                try:
                    rates[code] = {
                        "buy":    _to_float(m.group(1)),
                        "sell":   _to_float(m.group(2)),
                        "change": "—",
                    }
                    break
                except ValueError:
                    pass
    return rates


def get_rates() -> dict:
    try:
        res = requests.get(URL, headers=HEADERS, timeout=10)
        res.raise_for_status()
        html = res.text
        soup = BeautifulSoup(html, "html.parser")

        rates = _via_soup(soup)
        if len(rates) < 2:
            rates = _via_text(html)

        # Fill missing currencies from demo so the UI never breaks
        for k, v in DEMO_RATES.items():
            if k not in rates:
                rates[k] = v

        return rates if rates else DEMO_RATES

    except Exception:
        return DEMO_RATES
