from flask import Flask, render_template, jsonify
from scrapers.bcp import get_rates
from scrapers.crypto import get_crypto
from scrapers.news import get_news
from scrapers.economic import get_economic
from scrapers.markets import get_commodities, get_us_markets
import os
from scrapers.live_feeds import get_live_feeds

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/en-vivo")
def en_vivo():
    return render_template("en-vivo.html")

@app.route("/api/live_feeds")
def api_live_feeds():
    return jsonify(get_live_feeds())

@app.route("/api/debug_env")
def api_debug_env():
    key = os.environ.get("YOUTUBE_API_KEY")
    return jsonify({
        "has_key":   bool(key),
        "key_length": len(key) if key else 0,
        "key_prefix": key[:6] if key else None,
    })

@app.route("/api/rates")
def api_rates():
    return jsonify(get_rates())

@app.route("/api/crypto")
def api_crypto():
    rates   = get_rates()
    usd_pyg = rates.get("USD", {}).get("sell", 7300)
    return jsonify(get_crypto(usd_pyg))

@app.route("/api/news")
def api_news():
    return jsonify(get_news())

@app.route("/api/economic")
def api_economic():
    return jsonify(get_economic())

@app.route("/api/commodities")
def api_commodities():
    return jsonify(get_commodities())

@app.route("/api/markets")
def api_markets():
    return jsonify(get_us_markets())

if __name__ == "__main__":
    print("AL DÍA — http://localhost:5000")
    app.run(debug=True, use_reloader=False)
