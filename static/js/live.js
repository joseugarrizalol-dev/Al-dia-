const CHANNEL_LABELS = {
  abc: "ABC TV",
  monumental: "Radio Monumental",
  nanduti: "Ñandutí",
  rockandpop: "Rock & Pop",
  senadotv: "SenadoTV",
};

let _feeds = {};
let _activeSlug = null;
let _loadedEmbed = null; // embed_url actualmente en el iframe (para no recargar de más)

function _liveSrc(embedUrl) {
  return embedUrl.replace("autoplay=0", "autoplay=1") + "&mute=1";
}

function _renderTabs() {
  const el = document.getElementById("live-tabs");
  el.innerHTML = Object.keys(CHANNEL_LABELS).map((slug) => {
    const feed = _feeds[slug];
    const offline = !(feed && feed.embed_url);
    const cls = ["live-tab", slug === _activeSlug ? "on" : "", offline ? "offline" : ""].filter(Boolean).join(" ");
    return `<button class="${cls}" data-slug="${slug}" onclick="selectChannel('${slug}')">${CHANNEL_LABELS[slug]}</button>`;
  }).join("");
}

function _renderPlayer() {
  const frame = document.getElementById("live-player-frame");
  const nowEl = document.getElementById("live-now");
  const feed = _feeds[_activeSlug];

  nowEl.textContent = CHANNEL_LABELS[_activeSlug] || "—";

  if (feed && feed.embed_url) {
    // Mismo video ya cargado: no tocar el iframe (no pausar/recargar).
    if (_loadedEmbed === feed.embed_url) return;
    _loadedEmbed = feed.embed_url;
    frame.innerHTML = `<iframe
        src="${_liveSrc(feed.embed_url)}"
        title="${CHANNEL_LABELS[_activeSlug]} en vivo"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>`;
  } else {
    _loadedEmbed = null;
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

function selectChannel(slug) {
  _activeSlug = slug;
  _renderTabs();
  _renderPlayer();
}

async function loadLiveFeeds() {
  try {
    const res = await fetch("/api/live_feeds");
    _feeds = await res.json();
  } catch (e) {
    _feeds = {};
  }

  if (!_activeSlug) {
    // Primera carga: elegir el primer canal que esté efectivamente en vivo.
    _activeSlug = Object.keys(CHANNEL_LABELS).find((s) => _feeds[s] && _feeds[s].embed_url) || Object.keys(CHANNEL_LABELS)[0];
  }

  _renderTabs();
  _renderPlayer();
}

loadLiveFeeds();
setInterval(loadLiveFeeds, 5 * 60 * 1000);
