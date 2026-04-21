"""
Media outlet configuration for Paraguay.
Outlets with confirmed public RSS feeds are in OUTLETS_RSS.
HTML fallback outlets are in OUTLETS_HTML.
"""

OUTLETS_RSS: dict[str, list[str]] = {
    "ABC Color": [
        "https://www.abc.com.py/arc/outboundfeeds/rss/nacionales/",
        "https://www.abc.com.py/arc/outboundfeeds/rss/noticias-del-dia/",
        "https://www.abc.com.py/arc/outboundfeeds/rss/economia/",
        "https://www.abc.com.py/arc/outboundfeeds/rss/politica/",
    ],
}

OUTLETS_HTML: dict[str, list[str]] = {
    "Diario HOY": [
        "https://www.hoy.com.py/categoria/economia",
        "https://www.hoy.com.py/politica",
    ],
    "Paraguay.com": [
        "https://www.paraguay.com/nacionales",
        "https://www.paraguay.com",
    ],
}

# Keywords to accept
INCLUDE_KW: set[str] = {
    # Economía y finanzas
    "econom", "finanz", "mercado", "dólar", "dollar", "guaraní", "inflaci",
    "banco", "bcp", "inversi", "exporta", "importa", "comercio",
    "empresa", "bolsa", "presupuest", "impuest", "tributar", "salario",
    "precio", "deuda", "crédit", "fiscal", "monetar", "tasa",
    "acciones", "hacienda", "itaipú", "itaipu", "inversor", "capital",
    "recesi", "crecimient", "pib", "gdp", "fmi", "reservas",
    "combustible", "contrabando", "arancel", "licitaci", "concesi",
    # Política y gobierno
    "gobierno", "senado", "diputad", "president", "ministr",
    "partido", "elecci", "congreso", "legisl", "decreto", "políti",
    "politi", "ejecutivo", "ministerio", "poder", "reforma", "ley ",
    " ley", "proyecto", "canciller", "embajad", "tratado", "acuerdo",
    "peña", "pena", "alliana", "cartismo", "oposici",
    # Justicia y seguridad
    "corrupt", "judicial", "tribunal", "fiscalí", "fiscali",
    "juicio", "sentencia", "condena", "imputad", "deteni", "arrest",
    "narcotráfi", "narcotráfico", "droga", "crimen", "organ",
    "lavado", "estafa", "fraude", "investigaci", "allanamient",
    "seguridad", "policí", "polici", "militar", "defensa",
    # Infraestructura y obras
    "obras", "infraestructura", "construcci", "ruta", "puente",
    "energía", "energia", "agua", "vivienda", "urbanismo",
    # Social relevante
    "protesta", "manifestaci", "huelga", "sindicato", "gremio",
    "desapareci", "asesin", "homicidi", "secuestr",
}

EXCLUDE_KW: set[str] = {
    "fútbol", "futbol", "olimpia", "cerro porteño", "libertad fc",
    "atletismo", "baloncesto", "tenis", "rugby", "boxeo", "natación",
    "farándula", "farandula", "entretenimient", "espectácul",
    "moda", "belleza", "música", "musica", "cine", "novela",
    "horóscopo", "receta", "cocina", "deportes", "torneo",
    "mascota", "viral", "vori vori", "gastronomí", "gastronom",
    "salud mental", "dieta", "nutrici", "receta",
}


def is_relevant(title: str) -> bool:
    t = title.lower()
    if any(kw in t for kw in EXCLUDE_KW):
        return False
    return any(kw in t for kw in INCLUDE_KW)
