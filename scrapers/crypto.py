import requests
from scrapers import _cache

DEMO_CRYPTO = {
    "bitcoin":     {"usd": 67500, "name": "Bitcoin",  "symbol": "BTC", "change_1y": "+120.0%"},
    "ethereum":    {"usd": 3520,  "name": "Ethereum", "symbol": "ETH", "change_1y": "+80.0%"},
    "monero":      {"usd": 320.0, "name": "Monero",   "symbol": "XMR", "change_1y": "+60.0%"},
    "solana":      {"usd": 165.0, "name": "Solana",   "symbol": "SOL", "change_1y": "+200.0%"},
    "binancecoin": {"usd": 580.0, "name": "BNB",      "symbol": "BNB", "change_1y": "+90.0%"},
}

COINS = {
    "bitcoin":     ("Bitcoin",  "BTC"),
    "ethereum":    ("Ethereum", "ETH"),
    "monero":      ("Monero",   "XMR"),
    "solana":      ("Solana",   "SOL"),
    "binancecoin": ("BNB",      "BNB"),
}

def get_crypto(usd_pyg_rate=7300):
    cached = _cache.get("crypto")
    if cached is not None:
        return cached

    try:
        url = "https://api.coingecko.com/api/v3/coins/markets"
        params = {
            "vs_currency": "usd",
            "ids": ",".join(COINS.keys()),
            "price_change_percentage": "1y",
            "per_page": 10,
            "page": 1,
        }
        res = requests.get(url, params=params, timeout=8)
        data = res.json()

        result = {}
        for item in data:
            coin_id = item["id"]
            if coin_id not in COINS:
                continue
            name, symbol = COINS[coin_id]
            usd_price = item.get("current_price", 0)
            change_1y = item.get("price_change_percentage_1y_in_currency")
            chg_str = f"{change_1y:+.2f}%" if change_1y is not None else "—"
            result[coin_id] = {
                "usd":      round(usd_price, 2),
                "pyg":      round(usd_price * usd_pyg_rate),
                "name":     name,
                "symbol":   symbol,
                "change_1y": chg_str,
            }

        final = result if result else DEMO_CRYPTO
        _cache.set("crypto", final, 60)
        return final
    except Exception:
        return DEMO_CRYPTO
