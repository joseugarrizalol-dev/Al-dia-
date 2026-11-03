// ── Columna derecha: modo Precios ↔ 2do reproductor en vivo ──
// Reutiliza CHANNEL_LABELS y _liveSrc() ya definidos en live.js.

let _feeds2 = {};
let _activeSlug2 = Object.keys(CHANNEL_LABELS)[1] || Object.keys(CHANNEL_LABELS)[0];
let _loadedEmbed2 = null;
let _live2Initialized = false;

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
  const channelSel = document.getElementById("live2-channel-select");

  // El atributo hidden pierde contra `.markets-panel{display:flex}` (misma
  // especificidad, definida después) — se fuerza con style.display directo.
  if (mode === "live") {
    pricesEl.style.display = "none";
    liveEl.style.display = "block";
    channelSel.hidden = false;
    if (!_live2Initialized) {
      _live2Initialized = true;
      loadLiveFeeds2();
      setInterval(loadLiveFeeds2, 5 * 60 * 1000);
    } else {
      _renderPlayer2();
    }
  } else {
    pricesEl.style.display = "flex";
    liveEl.style.display = "none";
    channelSel.hidden = true;
  }
}

// Por default la columna derecha abre en "Transmisión en vivo" (el <select>
// del HTML ya trae esa opción seleccionada) — arranca el 2do reproductor.
setRightMode(document.getElementById("right-mode-select").value);
