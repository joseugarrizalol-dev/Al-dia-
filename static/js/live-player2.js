// ── Columna derecha: Precios ↔ 2do reproductor en vivo ↔ X ──
// Reutiliza CHANNEL_LABELS y _liveSrc() ya definidos en live.js.

let _feeds2 = {};
let _activeSlug2 = Object.keys(CHANNEL_LABELS)[1] || Object.keys(CHANNEL_LABELS)[0];
let _loadedEmbed2 = null;
let _live2Initialized = false;
let _xInitialized = false;

// El servidor trae los tweets (1 por cuenta, cacheado 25 min) — el
// navegador del visitante nunca le pide nada a X directamente, así que
// no hay bloqueador de rastreo/anuncios que pueda frenarlo.
function _xInitials(label) {
  return label.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function _xTimeAgo(iso) {
  if (!iso) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

function _xCard(item) {
  if (!item.tweet) {
    return `
      <div class="x-card">
        <div class="x-head">
          <div class="x-avatar">${_xInitials(item.label)}</div>
          <div class="x-who">
            <div class="x-name">${item.label}</div>
            <div class="x-handle">@${item.handle}</div>
          </div>
        </div>
        <div class="x-body x-body-empty">Sin datos disponibles en este momento.</div>
        <a class="x-link" href="${item.url}" target="_blank" rel="noopener">Ver @${item.handle} en X →</a>
      </div>`;
  }
  return `
    <div class="x-card">
      <div class="x-head">
        <div class="x-avatar">${_xInitials(item.label)}</div>
        <div class="x-who">
          <div class="x-name">${item.label}</div>
          <div class="x-handle">@${item.handle}</div>
        </div>
        <span class="x-time">${_xTimeAgo(item.tweet.created_at)}</span>
      </div>
      <div class="x-body">${item.tweet.text}</div>
      <a class="x-link" href="${item.url}" target="_blank" rel="noopener">Ver en X →</a>
    </div>`;
}

async function _renderXPanel() {
  const panel = document.getElementById("x-panel");
  if (!panel.dataset.loaded) panel.innerHTML = `<div class="live-loading" style="position:static;min-height:120px">Cargando…</div>`;
  try {
    const res = await fetch("/api/x_feed");
    const feed = await res.json();
    panel.innerHTML = Object.values(feed).map(_xCard).join("");
    panel.dataset.loaded = "1";
  } catch (e) {
    if (!panel.dataset.loaded) {
      panel.innerHTML = `<div class="x-empty">No se pudo cargar X en este momento.</div>`;
    }
  }
}

function _renderChannelSelect2() {
  const sel = document.getElementById("live2-channel-select");
  sel.innerHTML = Object.keys(CHANNEL_LABELS).map((slug) => {
    const feed = _feeds2[slug];
    const offline = !(feed && feed.embed_url);
    return `<option value="${slug}"${slug === _activeSlug2 ? " selected" : ""}>${CHANNEL_LABELS[slug]}${offline ? " (sin señal)" : ""}</option>`;
  }).join("");
}

function _renderPlayer2() {
  const frame = document.getElementById("live2-panel");
  const feed = _feeds2[_activeSlug2];

  if (feed && feed.embed_url) {
    if (_loadedEmbed2 === feed.embed_url) return;
    _loadedEmbed2 = feed.embed_url;
    frame.innerHTML = `<iframe
        src="${_liveSrc(feed.embed_url)}"
        title="${CHANNEL_LABELS[_activeSlug2]} en vivo"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>`;
  } else {
    _loadedEmbed2 = null;
    const fallbackUrl = feed ? feed.fallback_url : "";
    const msg = feed && feed.embeddable === false
      ? "Este canal no permite embeberse aquí."
      : "Canal sin transmisión en vivo en este momento.";
    frame.innerHTML = `
      <div class="live-offline">
        <span>${msg}</span>
        ${fallbackUrl ? `<a href="${fallbackUrl}" target="_blank" rel="noopener">Ver en vivo →</a>` : ""}
      </div>`;
  }
}

function selectChannel2(slug) {
  _activeSlug2 = slug;
  _renderPlayer2();
}

async function loadLiveFeeds2() {
  try {
    const res = await fetch("/api/live_feeds");
    _feeds2 = await res.json();
  } catch (e) {
    _feeds2 = {};
  }
  _renderChannelSelect2();
  if (document.getElementById("right-mode-select").value === "live") {
    _renderPlayer2();
  }
}

function setRightMode(mode) {
  const pricesEl = document.getElementById("markets-panel");
  const liveEl = document.getElementById("live2-panel");
  const xEl = document.getElementById("x-panel");
  const channelSel = document.getElementById("live2-channel-select");

  // El atributo hidden pierde contra `.markets-panel{display:flex}` (misma
  // especificidad, definida después) — se fuerza con style.display directo.
  pricesEl.style.display = mode === "prices" ? "flex" : "none";
  liveEl.style.display = mode === "live" ? "block" : "none";
  xEl.style.display = mode === "x" ? "flex" : "none";
  channelSel.hidden = mode !== "live";

  if (mode === "live") {
    if (!_live2Initialized) {
      _live2Initialized = true;
      loadLiveFeeds2();
      setInterval(loadLiveFeeds2, 5 * 60 * 1000);
    } else {
      _renderPlayer2();
    }
  } else if (mode === "x" && !_xInitialized) {
    _xInitialized = true;
    _renderXPanel();
    setInterval(_renderXPanel, 25 * 60 * 1000);
  }
}

// Por default la columna derecha abre en "Transmisión en vivo" (el <select>
// del HTML ya trae esa opción seleccionada) — arranca el 2do reproductor.
setRightMode(document.getElementById("right-mode-select").value);
