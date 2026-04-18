from flask import Flask, render_template, jsonify, request
from scrapers.bcp import get_rates
from scrapers.crypto import get_crypto
from scrapers.news import get_news
from scrapers.economic import get_economic
from scrapers.markets import get_commodities, get_us_markets
from ai.summary import generate_daily_summary

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

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

@app.route("/api/summary")
def api_summary():
    news  = get_news()
    force = request.args.get("force") == "1"
    return jsonify(generate_daily_summary(news, force=force))

if __name__ == "__main__":
    print("AL DÍA — http://localhost:5000")
    app.run(debug=True)
