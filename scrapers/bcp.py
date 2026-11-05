import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers import _cache

# Direct PYG pairs (available on Yahoo Finance)
DIRECT_PAIRS = {
    "USD": "USDPYG=X",
    "EUR": "EURPYG=X",
}

# Cross-rate pairs: calculated as USDPYG / USD{code}
CROSS_PAIRS = {
    "BRL": "USDBRL=X",
    "ARS": "USDARS=X",
}

DEMO_RATES = {
    "USD": {"buy": 7280, "sell": 7320, "change": "—"},
    "EUR": {"buy": 8100, "sell": 8160, "change": "—"},
    "BRL": {"buy": 1310, "sell": 1340, "change": "—"},
    "ARS": {"buy": 7.2,  "sell": 7.5,  "change": "—"},
}


def _pct(current, past):
    if not past or past == 0:
        return "—"
    val = ((current - past) / past) * 100
    return f"{'+' if val >= 0 else ''}{val:.2f}%"


def _fetch_direct(code, ticker_sym):
    try:
        hist = yf.Ticker(ticker_sym).history(period="5d")
        if hist.empty:
            return code, None
        current = float(hist["Close"].iloc[-1])
        prev_day = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current
        spread = current * 0.005
        return code, {
            "buy":    round(current - spread, 2),
            "sell":   round(current, 2),
            "change": _pct(current, prev_day),
        }
    except Exception:
        return code, None


def _fetch_cross(code, cross_sym, usd_pyg_hist):
    try:
        cross_hist = yf.Ticker(cross_sym).history(period="5d")
        if cross_hist.empty or usd_pyg_hist.empty:
            return code, None
        current = float(usd_pyg_hist["Close"].iloc[-1]) / float(cross_hist["Close"].iloc[-1])
        if len(usd_pyg_hist) > 1 and len(cross_hist) > 1:
            prev_day = float(usd_pyg_hist["Close"].iloc[-2]) / float(cross_hist["Close"].iloc[-2])
        else:
            prev_day = current
        spread = current * 0.005
        return code, {
            "buy":    round(current - spread, 2),
            "sell":   round(current, 2),
            "change": _pct(current, prev_day),
        }
    except Exception:
        return code, None


def get_rates() -> dict:
    cached = _cache.get("rates")
    if cached is not None:
        return cached

    rates = {}

    try:
        usd_hist = yf.Ticker("USDPYG=X").history(period="5d")

        tasks = {}
        with ThreadPoolExecutor(max_workers=6) as ex:
            for code, sym in DIRECT_PAIRS.items():
                tasks[ex.submit(_fetch_direct, code, sym)] = code
            for code, sym in CROSS_PAIRS.items():
                tasks[ex.submit(_fetch_cross, code, sym, usd_hist)] = code
            for f in as_completed(tasks):
                code, result = f.result()
                if result:
                    rates[code] = result
    except Exception:
        pass

    for k, v in DEMO_RATES.items():
        if k not in rates:
            rates[k] = v

    final = rates if rates else DEMO_RATES
    _cache.set("rates", final, 60)
    return final
