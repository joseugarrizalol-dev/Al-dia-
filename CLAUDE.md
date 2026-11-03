# AL DÍA — Mercados Paraguay

Dashboard financiero y de noticias para Paraguay. Flask app con tres secciones principales.

## Arrancar el servidor

```bash
# Doble click en start.bat  (auto-restart si crashea)
# O manualmente:
venv\Scripts\python.exe app.py
```

Servidor corre en `http://localhost:5000` con **waitress** (4 threads).

## Estructura del proyecto

```
app.py                  # Flask app principal, rutas API
start.bat               # Arranque con waitress + auto-restart
scrapers/
  bcp.py                # Tipos de cambio PYG (Yahoo Finance)
  crypto.py             # Precios crypto en PYG
  economic.py           # Datos económicos
  markets.py            # Commodities y mercados US
  news.py               # Noticias locales Paraguay
  intl_news.py          # Noticias internacionales geolocalizadas (RSS)
  _cache.py             # Cache en memoria (TTL configurable)
templates/
  index.html            # Dashboard principal (Mercados)
  sentinel.html         # Sentinel — análisis de medios
  world.html            # World Intel — mapa de noticias globales
static/
  css/style.css         # Estilos base (variables, layout, header)
  css/world.css         # Estilos exclusivos del dashboard World
  js/dashboard.js       # JS del dashboard principal
  js/world.js           # JS del mapa mundial
  img/world-map.svg     # Mapa SVG estático generado (Mercator, 2400x1600)
sentinel/backend/       # Submódulo Sentinel (análisis de noticias con IA)
```

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard mercados (BCP, crypto, noticias PY) |
| `/sentinel` | Análisis de medios paraguayos |
| `/world` | Mapa de noticias internacionales |
| `/api/rates` | Tipos de cambio PYG |
| `/api/crypto` | Precios crypto |
| `/api/intl_news` | Noticias internacionales geolocalizadas |
| `/api/news` | Noticias locales |

## World Intel (`/world`)

Mapa interactivo con noticias globales geolocalizadas.

- **Mapa**: SVG estático en `static/img/world-map.svg` — proyección Mercator, generado con `gen_map_svg.py` (script temporal, se borra después de usar)
- **Proyección JS**: Mercator con `LAT_MAX = 82°`, fórmula en `world.js` debe coincidir exactamente con el SVG
- **Pins**: Azul = normal, Rojo = conflicto. Pulso animado con SMIL
- **Headline ticker**: Cicla titulares cada 5s sobre el mapa con línea punteada al pin
- **Fuentes RSS** (paralelas con ThreadPoolExecutor, timeout 8s, máx 8 items/fuente):
  - BBC World, Al Jazeera, DW News, France 24, AP News, NPR, Mercopress
- **Cap total**: 50 noticias, máx 8 por fuente
- **Cache**: 900 segundos (15 min)

## Regenerar el mapa SVG

Si hay que regenerar `world-map.svg` (artefactos, cambiar proyección, etc.):

```bash
# 1. Descargar world-atlas
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json" -OutFile "static/world-110m.json"

# 2. Correr el generador (crearlo si no existe — ver historial de conversación)
python gen_map_svg.py

# 3. Limpiar
Remove-Item gen_map_svg.py, static/world-110m.json
```

La proyección en `gen_map_svg.py` y en `world.js` deben usar la misma fórmula Mercator.

## Tecnologías

- **Backend**: Python 3, Flask, waitress
- **Datos**: yfinance, feedparser, requests
- **Frontend**: D3.js v7, TopoJSON, Space Grotesk + JetBrains Mono + Syne (Google Fonts)
- **Cache**: In-memory dict con TTL (`scrapers/_cache.py`)

## Notas importantes

- `use_reloader=False` en Flask para evitar doble arranque del scheduler
- El scheduler de Sentinel está **deshabilitado** (comentado en `app.py`)
- Reuters RSS (`feeds.reuters.com`) está **muerto** — no usar
- CNN RSS da falsos positivos geográficos (Michael Jordan → "Jordan") — no usar
- `start.bat` usa un loop que reinicia el servidor automáticamente si crashea
- Para arranque automático al iniciar Windows: poner acceso directo de `start.bat` en `shell:startup`
