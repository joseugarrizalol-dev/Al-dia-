import requests

DEMO_CRYPTO = {
    "bitcoin":  {"usd": 67500, "name": "Bitcoin",  "symbol": "BTC", "change_24h": "+2.3%"},
    "ethereum": {"usd": 3520,  "name": "Ethereum", "symbol": "ETH", "change_24h": "+1.8%"},
    "tether":   {"usd": 1.00,  "name": "Tether",   "symbol": "USDT","change_24h": "0.0%"},
}

def get_crypto(usd_pyg_rate=7300):
    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {
            "ids": "bitcoin,ethereum,tether",
            "vs_currencies": "usd",
            "include_24hr_change": "true",
        }
        res = requests.get(url, params=params, timeout=8)
        data = res.json()

        names = {"bitcoin": ("Bitcoin","BTC"), "ethereum": ("Ethereum","ETH"), "tether": ("Tether","USDT")}
        result = {}
        for coin_id, info in names.items():
            if coin_id in data:
                usd_price = data[coin_id].get("usd", 0)
                change    = data[coin_id].get("usd_24h_change", 0)
                result[coin_id] = {
                    "usd":        round(usd_price, 2),
                    "pyg":        round(usd_price * usd_pyg_rate),
                    "name":       info[0],
                    "symbol":     info[1],
                    "change_24h": f"{change:+.2f}%",
                }
        return result if result else DEMO_CRYPTO
    except Exception:
        return DEMO_CRYPTO
