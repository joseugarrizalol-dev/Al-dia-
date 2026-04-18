import os
from dotenv import load_dotenv
load_dotenv()

def generate_brief(rates, crypto, economic, news):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return "Add your ANTHROPIC_API_KEY to the .env file to enable AI morning briefs."

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        headlines = "\n".join(f"- {n['outlet']}: {n['title']}" for n in news[:12])
        usd = rates.get("USD", {})
        btc = crypto.get("bitcoin", {})

        prompt = f"""You are a financial analyst for Paraguay. Write a concise morning brief (3-4 sentences)
for a Paraguayan investor based on the following data:

EXCHANGE RATES (vs PYG):
- USD: buy {usd.get('buy','N/A')} / sell {usd.get('sell','N/A')}
- EUR: buy {rates.get('EUR',{}).get('buy','N/A')} / sell {rates.get('EUR',{}).get('sell','N/A')}
- BRL: buy {rates.get('BRL',{}).get('buy','N/A')} / sell {rates.get('BRL',{}).get('sell','N/A')}

CRYPTO:
- BTC: USD {btc.get('usd','N/A')} ({btc.get('change_24h','N/A')} 24h)
- ETH: USD {crypto.get('ethereum',{}).get('usd','N/A')}

ECONOMIC:
- GDP Growth: {economic.get('gdp_growth',{}).get('value','N/A')}%
- Inflation: {economic.get('inflation',{}).get('value','N/A')}%

TOP NEWS HEADLINES:
{headlines}

Write the brief in English. Be specific and reference the actual numbers above."""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text
    except Exception as e:
        return f"Could not generate brief: {str(e)}"
