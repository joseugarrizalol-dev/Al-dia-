import requests
from scrapers import _cache

DEMO_CRYPTO = {
    "bitcoin":  {"usd": 67500, "name": "Bitcoin",  "symbol": "BTC", "change_24h": "+2.3%"},
    "ethereum": {"usd": 3520,  "name": "Ethereum", "symbol": "ETH", "change_24h": "+1.8%"},
    "tether":   {"usd": 1.00,  "name": "Tether",   "symbol": "USDT","change_24h": "0.0%"},
    "solana":   {"usd": 165.0, "name": "Solana",   "symbol": "SOL", "change_24h": "+3.1%"},
    "binancecoin": {"usd": 580.0, "name": "BNB",   "symbol": "BNB", "change_24h": "+0.9%"},
}

COINS = {
    "bitcoin":     ("Bitcoin",  "BTC"),
    "ethereum":    ("Ethereum", "ETH"),
    "tether":      ("Tether",   "USDT"),
    "solana":      ("Solana",   "SOL"),
    "binancecoin": ("BNB",      "BNB"),
}

def get_crypto(usd_pyg_rate=7300):
    cached = _cache.get("crypto")
    if cached is not None:
        return cached

    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": ",".join(COINS.keys()),
            "vs_currencies": "usd",
            "include_24hr_change": "true",
        }
        res = requests.get(url, params=params, timeout=8)
        data = res.json()

        result = {}
        for coin_id, (name, symbol) in COINS.items():
            if coin_id in data:
                usd_price = data[coin_id].get("usd", 0)
                change    = data[coin_id].get("usd_24h_change", 0)
                result[coin_id] = {
                    "usd":        round(usd_price, 2),
                    "pyg":        round(usd_price * usd_pyg_rate),
                    "name":       name,
                    "symbol":     symbol,
                    "change_24h": f"{change:+.2f}%",
                }
        final = result if result else DEMO_CRYPTO
        _cache.set("crypto", final, 60)
        return final
    except Exception:
        return DEMO_CRYPTO
