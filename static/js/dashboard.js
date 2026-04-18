// ── Theme ─────────────────────────────────────────────────
const MOON=`<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
const SUN=`<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
function toggleTheme(){const d=document.documentElement.getAttribute("data-theme")!=="dark";document.documentElement.setAttribute("data-theme",d?"dark":"light");document.getElementById("theme-icon").innerHTML=d?MOON:SUN;localStorage.setItem("theme",d?"dark":"light")}
(()=>{const s=localStorage.getItem("theme")||"light";document.documentElement.setAttribute("data-theme",s);if(s==="dark")document.getElementById("theme-icon").innerHTML=MOON})();

// ── Helpers ───────────────────────────────────────────────
const N=(n,d=0)=>n==null?"—":new Intl.NumberFormat("es-PY",{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
function chgClass(s){if(!s||s==="—"||s==="flat")return"flat";return s.startsWith("+")||Number(s)>0?"up":s.startsWith("-")||Number(s)<0?"down":"flat"}
function chgBg(s){const c=chgClass(s);return c==="up"?"chg-up":c==="down"?"chg-dn":"chg-fl"}
function outletCls(o){const l=o.toLowerCase();if(l.includes("abc"))return"o-abc";if(l.includes("ltima")||l.includes("hora"))return"o-uh";if(l.includes("naci"))return"o-ln";if(l.includes("hoy"))return"o-hoy";return"o-other"}

// ── Data row builder ──────────────────────────────────────
function row({icon="",code,name="",val,chg="",unit="",noChg=false}){
  const chgHtml=noChg?"":(`<span class="dr-chg ${chgBg(chg)}">${chg&&chg!=="—"?chg:"—"}</span>`);
  return `<div class="dr${noChg?" dr--no-chg":""}">
    <span class="dr-icon">${icon}</span>
    <div class="dr-info">
      <span class="dr-code">${code}</span>
      <span class="dr-name">${name}</span>
    </div>
    <span class="dr-val">${val}${unit?`<span class="dr-unit">${unit}</span>`:""}</span>
    ${chgHtml}
  </div>`
}

// ── Market clocks ─────────────────────────────────────────
const MARKETS=[
  {id:"nyc", flag:"🇺🇸", name:"Nueva York", tz:"America/New_York",  open:[9,30],  close:[16,0]},
  {id:"lon", flag:"🇬🇧", name:"Londres",    tz:"Europe/London",      open:[8,0],   close:[16,30]},
  {id:"ffm", flag:"🇩🇪", name:"Fráncfort",  tz:"Europe/Berlin",      open:[9,0],   close:[17,30]},
  {id:"tyo", flag:"🇯🇵", name:"Tokio",      tz:"Asia/Tokyo",         open:[9,0],   close:[15,0]},
  {id:"hkg", flag:"🇭🇰", name:"Hong Kong",  tz:"Asia/Hong_Kong",     open:[9,30],  close:[16,0]},
];

function _isOpen(tz,oh,om,ch,cm){
  const now=new Date();
  const local=new Date(now.toLocaleString("en-US",{timeZone:tz}));
  const day=local.getDay();
  if(day===0||day===6)return false;
  const mins=local.getHours()*60+local.getMinutes();
  return mins>=oh*60+om && mins<ch*60+cm;
}

function _localTime(tz){
  return new Date().toLocaleTimeString("es-PY",{timeZone:tz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false});
}

function _buildMarketBar(){
  const bar=document.getElementById("mkt-bar");
  if(!bar)return;
  bar.innerHTML=MARKETS.map(m=>{
    const open=_isOpen(m.tz,...m.open,...m.close);
    const time=_localTime(m.tz);
    return `<div class="mkt-item">
      <span class="mkt-flag">${m.flag}</span>
      <span class="mkt-name">${m.name}</span>
      <span class="mkt-time" id="mkt-t-${m.id}">${time}</span>
      <span class="mkt-dot ${open?"mkt-open-dot":"mkt-closed-dot"}"></span>
      <span class="mkt-status ${open?"mkt-open":"mkt-closed"}" id="mkt-s-${m.id}">${open?"Abierto":"Cerrado"}</span>
    </div>`;
  }).join("");
}

function _tickMarkets(){
  MARKETS.forEach(m=>{
    const open=_isOpen(m.tz,...m.open,...m.close);
    const tEl=document.getElementById("mkt-t-"+m.id);
    const sEl=document.getElementById("mkt-s-"+m.id);
    if(tEl)tEl.textContent=_localTime(m.tz);
    if(sEl){sEl.textContent=open?"Abierto":"Cerrado";sEl.className="mkt-status "+(open?"mkt-open":"mkt-closed");}
  });
}

_buildMarketBar();
setInterval(_tickMarkets,1000);

// ── Ticker helper ─────────────────────────────────────────
function setT(ids,val,cls=""){ids.forEach(id=>{const el=document.getElementById(id);if(el){el.textContent=val;el.className="tv "+(cls||"")}})}

// ── Exchange Rates ────────────────────────────────────────
async function loadRates(){
  try{
    const d=await(await fetch("/api/rates")).json();
    const FLAGS={USD:"🇺🇸",EUR:"🇪🇺",BRL:"🇧🇷",ARS:"🇦🇷"};
    const NAMES={USD:"Dólar USD",EUR:"Euro EUR",BRL:"Real BRL",ARS:"Peso ARS"};
    document.getElementById("rates-list").innerHTML=Object.entries(d).map(([c,v])=>
      row({icon:FLAGS[c],code:c,name:NAMES[c]||c,val:N(v.sell),chg:v.change!=="live"?v.change:"—"})
    ).join("");
    setT(["t-usd","t-usd2"],N(d.USD?.sell)+" ₲");
    setT(["t-eur","t-eur2"],N(d.EUR?.sell)+" ₲");
    setT(["t-brl","t-brl2"],N(d.BRL?.sell)+" ₲");
  }catch{document.getElementById("rates-list").innerHTML=`<div class="dr"><span class="dr-name">Sin datos</span></div>`}
}

// ── Economic ──────────────────────────────────────────────
async function loadEconomic(){
  try{
    const d=await(await fetch("/api/economic")).json();
    document.getElementById("economic-list").innerHTML=Object.values(d).map(v=>
      row({code:v.label,name:String(v.year||""),val:String(v.value),unit:v.unit,noChg:true})
    ).join("");
  }catch{}
}

// ── Commodities ───────────────────────────────────────────
async function loadCommodities(){
  try{
    const d=await(await fetch("/api/commodities")).json();
    document.getElementById("commodities-list").innerHTML=Object.values(d).map(v=>
      row({icon:v.flag,code:v.label,val:N(v.price,2),chg:v.change,unit:v.unit})
    ).join("");
    setT(["t-gold","t-gold2"],"$"+N(d["GC=F"]?.price,0),chgClass(d["GC=F"]?.change));
    setT(["t-soja","t-soja2"],N(d["ZS=F"]?.price,0)+"¢",chgClass(d["ZS=F"]?.change));
  }catch{document.getElementById("commodities-list").innerHTML=`<div class="dr"><span class="dr-name">Sin datos</span></div>`}
}

// ── US Markets ────────────────────────────────────────────
async function loadUSMarkets(){
  try{
    const d=await(await fetch("/api/markets")).json();
    const {treasuries,indexes,effr}=d;

    // Rates list: EFFR first, then treasuries
    const rateRows=[];
    if(effr) rateRows.push(row({icon:"🏦",code:"EFFR",name:"Fed Funds",val:effr.price+"%",chg:effr.change}));
    if(treasuries) Object.values(treasuries).forEach(v=>{
      if(v) rateRows.push(row({icon:"🇺🇸",code:v.label,val:N(v.price,2)+"%",chg:v.change}));
    });
    document.getElementById("rates-us-list").innerHTML=rateRows.join("");
    if(treasuries?.["^TNX"]) setT(["t-10y","t-10y2"],N(treasuries["^TNX"].price,2)+"%",chgClass(treasuries["^TNX"].change));

    // Indexes list
    if(indexes){
      document.getElementById("indexes-list").innerHTML=Object.values(indexes).map(v=>
        row({icon:v.flag,code:v.label,val:N(v.price,0),chg:v.change})
      ).join("");
      setT(["t-sp","t-sp2"],N(indexes["^GSPC"]?.price,0),chgClass(indexes["^GSPC"]?.change));
    }
  }catch{}
}

// ── Crypto ────────────────────────────────────────────────
async function loadCrypto(){
  try{
    const d=await(await fetch("/api/crypto")).json();
    const ICONS={BTC:"₿",ETH:"Ξ",USDT:"₮"};
    document.getElementById("crypto-list").innerHTML=Object.values(d).map(v=>
      row({icon:ICONS[v.symbol]||"",code:v.symbol,name:v.name,val:"$"+N(v.usd,2),chg:v.change_24h})
    ).join("");
    setT(["t-btc","t-btc2"],"$"+N(d.bitcoin?.usd,0),chgClass(d.bitcoin?.change_24h));
    setT(["t-eth","t-eth2"],"$"+N(d.ethereum?.usd,0),chgClass(d.ethereum?.change_24h));
  }catch{}
}

// ── Ticker news injection ─────────────────────────────────
function injectTickerNews(items){
  const track=document.querySelector('.ticker-track');
  if(!track||!items.length)return;
  track.querySelectorAll('.ti[data-news]').forEach(el=>el.remove());
  const tops=items.slice(0,5);
  const make=n=>{
    const s=document.createElement('span');
    s.className='ti';s.dataset.news='1';
    s.innerHTML=`<b>📰</b><span class="tv" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle">${n.title}</span>`;
    return s;
  };
  const all=[...track.querySelectorAll('.ti:not([data-news])')];
  const mid=Math.floor(all.length/2);
  const pivot=all[mid];
  tops.forEach(n=>track.insertBefore(make(n),pivot));
  tops.forEach(n=>track.appendChild(make(n)));
}

// ── News ──────────────────────────────────────────────────
let allNews=[],activeFilter="Todos";
async function loadNews(){
  try{
    allNews=await(await fetch("/api/news")).json();
    buildFilters();renderNews(allNews);injectTickerNews(allNews);
  }catch{document.getElementById("news-feed").innerHTML=`<div class="ni"><span class="nt">Error al cargar noticias</span></div>`}
}
function buildFilters(){
  const outlets=["Todos",...new Set(allNews.map(n=>n.outlet))];
  document.getElementById("news-filter").innerHTML=outlets.map(o=>`<button class="fbtn ${o===activeFilter?"active":""}" onclick="filterNews('${o}')">${o}</button>`).join("");
}
function filterNews(o){activeFilter=o;buildFilters();renderNews(o==="Todos"?allNews:allNews.filter(n=>n.outlet===o))}
function renderNews(items){
  document.getElementById("news-feed").innerHTML=items.map(n=>`
    <div class="ni">
      <span class="no ${outletCls(n.outlet)}">${n.outlet}</span>
      <a class="nt" href="${n.url}" target="_blank" rel="noopener">${n.title}</a>
    </div>`).join("");
}

// ── Summary ───────────────────────────────────────────────
async function loadSummary(force=false){
  const t=document.getElementById("summary-text"),d=document.getElementById("summary-date");
  try{
    const url="/api/summary"+(force?"?force=1":"");
    const r=await(await fetch(url)).json();
    if(t)t.textContent=r.summary;
    if(d)d.textContent=(r.cached?"Guardado":"Generado")+" · "+r.date;
  }catch{if(t)t.textContent="Error al generar el resumen."}
}
async function refreshSummary(){
  const b=document.getElementById("summary-btn");
  if(b)b.disabled=true;
  await loadSummary(true);
  if(b)b.disabled=false;
}

// ── Refresh & Init ────────────────────────────────────────
function updateTime(){
  const el=document.getElementById("last-updated");
  if(!el)return;
  const now=new Date();
  const date=now.toLocaleDateString("es-PY",{weekday:"short",day:"2-digit",month:"short"});
  const time=now.toLocaleTimeString("es-PY",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  el.textContent=date+" · "+time;
}
setInterval(updateTime,1000);

async function refreshAll(){
  await Promise.all([loadRates(),loadEconomic(),loadCommodities(),loadUSMarkets(),loadCrypto(),loadNews()]);
  updateTime();
}

(async()=>{
  await refreshAll();
  loadSummary();
  setInterval(refreshAll,5*60*1000);
})();
