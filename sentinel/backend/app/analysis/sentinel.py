"""
Sentinel Score engine.
For each unanalyzed article, sends title + summary to Groq (llama3-8b-8192)
and persists the structured analysis back to SQLite.

Score breakdown (5 × 20 = 100 points):
  precision_factual    — ¿los hechos son verificables y precisos?
  claridad_linguistica — ¿el lenguaje es claro, sin ambigüedades?
  integridad_contexto  — ¿se incluye el contexto necesario?
  balance_encuadre     — ¿el encuadre es equilibrado?
  transparencia_fuente — ¿la fuente está identificada y es confiable?
"""

import json
import time
import os
from datetime import datetime, timezone

from groq import Groq
from dotenv import load_dotenv

from app.db.database import get_connection

load_dotenv()

MODEL   = "llama-3.1-8b-instant"
BATCH   = 20          # articles per run
DELAY   = 1.2         # seconds between Groq calls (free tier: 30 req/min)

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        _client = Groq(api_key=api_key)
    return _client


# ── Prompt ────────────────────────────────────────────────────────────────────

_SYSTEM = (
    "Eres un analista experto en lingüística de medios latinoamericanos. "
    "Analizas titulares paraguayos con rigor académico. "
    "Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional."
)


def _build_prompt(title: str, summary: str | None, outlet: str, body: str = "") -> str:
    if body and len(body) > 200:
        content = f'Titular: "{title}"\n\nCuerpo del artículo:\n"{body[:3000]}"'
    elif summary:
        clean = summary.replace("\n", " ").strip()[:800]
        content = f'Titular: "{title}"\nResumen: "{clean}"'
    else:
        content = f'Titular: "{title}"'

    return f"""Analiza esta noticia del medio paraguayo "{outlet}":

{content}

Devuelve ÚNICAMENTE el siguiente JSON (sin ``` ni texto extra):
{{
  "hecho": "<descripción objetiva del hecho central, máx. 2 oraciones>",
  "linguistico": {{
    "intensidad": "<alta|media|baja>",
    "precision": "<alta|media|baja>",
    "carga_emocional": "<positiva|negativa|neutra|mixta>",
    "verbos_clave": ["<verbo1>", "<verbo2>"]
  }},
  "encuadre": "<descriptivo|interpretativo|selectivo|amplificado|atenuado|contextual>",
  "encuadre_justificacion": "<1 oración explicando el encuadre detectado>",
  "scores": {{
    "precision_factual": <entero 0-20>,
    "claridad_linguistica": <entero 0-20>,
    "integridad_contexto": <entero 0-20>,
    "balance_encuadre": <entero 0-20>,
    "transparencia_fuente": <entero 0-20>
  }},
  "justificacion": "<1-2 oraciones explicando el puntaje total>"
}}"""


# ── Groq call ─────────────────────────────────────────────────────────────────

def _call_groq(title: str, summary: str | None, outlet: str, body: str = "") -> dict:
    client = _get_client()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM},
            {"role": "user",   "content": _build_prompt(title, summary, outlet, body)},
        ],
        temperature=0.2,
        max_tokens=600,
    )
    raw = response.choices[0].message.content.strip()

    # Strip accidental markdown fences if the model adds them
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    return json.loads(raw)


# ── Persistence ───────────────────────────────────────────────────────────────

def _save_analysis(article_id: int, data: dict, raw: str) -> None:
    scores  = data.get("scores", {})
    ling    = data.get("linguistico", {})
    verbos  = json.dumps(ling.get("verbos_clave", []), ensure_ascii=False)
    total   = sum([
        scores.get("precision_factual",   0),
        scores.get("claridad_linguistica", 0),
        scores.get("integridad_contexto",  0),
        scores.get("balance_encuadre",     0),
        scores.get("transparencia_fuente", 0),
    ])
    now = datetime.now(timezone.utc).isoformat()

    with get_connection() as conn:
        conn.execute(
            """
            UPDATE articles SET
                analyzed            = 1,
                analyzed_at         = ?,
                error               = NULL,
                score_total         = ?,
                score_factual       = ?,
                score_linguistic    = ?,
                score_context       = ?,
                score_framing       = ?,
                score_transparency  = ?,
                hecho               = ?,
                intensidad          = ?,
                precision_ling      = ?,
                carga_emocional     = ?,
                verbos              = ?,
                encuadre            = ?,
                encuadre_just       = ?,
                score_just          = ?,
                analysis_raw        = ?
            WHERE id = ?
            """,
            (
                now,
                total,
                scores.get("precision_factual"),
                scores.get("claridad_linguistica"),
                scores.get("integridad_contexto"),
                scores.get("balance_encuadre"),
                scores.get("transparencia_fuente"),
                data.get("hecho"),
                ling.get("intensidad"),
                ling.get("precision"),
                ling.get("carga_emocional"),
                verbos,
                data.get("encuadre"),
                data.get("encuadre_justificacion"),
                data.get("justificacion"),
                raw,
                article_id,
            ),
        )
        conn.commit()


def _mark_error(article_id: int, msg: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE articles SET analyzed = -1, error = ? WHERE id = ?",
            (msg[:300], article_id),
        )
        conn.commit()


# ── Public entry point ────────────────────────────────────────────────────────

def run_analysis(batch: int = BATCH) -> dict:
    """
    Analyze up to `batch` unanalyzed articles.
    analyzed = 0  → pending
    analyzed = 1  → done
    analyzed = -1 → error (will not be retried unless reset)
    Returns {"analyzed": n, "errors": n, "skipped": n}
    """
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, title, summary, body, outlet
            FROM   articles
            WHERE  analyzed = 0
            ORDER  BY scraped_at DESC
            LIMIT  ?
            """,
            (batch,),
        ).fetchall()

    analyzed = errors = 0

    for row in rows:
        article_id = row["id"]
        try:
            data = _call_groq(row["title"], row["summary"], row["outlet"], row["body"] or "")
            raw  = json.dumps(data, ensure_ascii=False)
            _save_analysis(article_id, data, raw)
            analyzed += 1
        except json.JSONDecodeError as e:
            _mark_error(article_id, f"JSON parse error: {e}")
            errors += 1
        except Exception as e:
            _mark_error(article_id, str(e))
            errors += 1

        time.sleep(DELAY)

    return {
        "analyzed": analyzed,
        "errors":   errors,
        "skipped":  max(0, len(rows) - analyzed - errors),
    }
