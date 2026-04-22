// ── User name & greeting ──────────────────────────────────
(function(){
  const KEY="ald_username_v3";
  const overlay=document.getElementById("welcome-overlay");
  const input=document.getElementById("welcome-input");
  const btn=document.getElementById("welcome-btn");
  const greetEl=document.getElementById("hd-greeting");
  const DIAS=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const MESES=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  let _name="";
  function pad(n){return String(n).padStart(2,"0");}
  function buildGreeting(){
    const now=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Asuncion"}));
    const dia=DIAS[now.getDay()],d=now.getDate(),mes=MESES[now.getMonth()];
    const t=`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return `Bienvenido, ${_name} · ${dia} ${d} ${mes} · ${t}`;
  }
  function startClock(){
    if(!greetEl||!_name)return;
    greetEl.textContent=buildGreeting();
    setInterval(()=>{if(greetEl&&_name)greetEl.textContent=buildGreeting();},1000);
  }
  const _SESSION_START=Date.now();
  const _LAST_VISIT_KEY='ald_last_visit';

  function _logVisit(name){
    if(!window._GS_WEBHOOK)return;
    const ua=navigator.userAgent;
    const device=/Mobi|Android/i.test(ua)?'Mobile':'Desktop';
    const lang=navigator.language||'';
    const lastVisit=localStorage.getItem(_LAST_VISIT_KEY)||'First visit';
    localStorage.setItem(_LAST_VISIT_KEY,new Date().toISOString());
    fetch(window._GS_WEBHOOK,{method:'POST',mode:'no-cors',
      body:JSON.stringify({name,ts:new Date().toISOString(),device,lang,lastVisit})
    }).catch(()=>{});
  }

  function _logSessionEnd(name){
    if(!window._GS_WEBHOOK||!name)return;
    const mins=Math.round((Date.now()-_SESSION_START)/60000);
    navigator.sendBeacon(window._GS_WEBHOOK,
      JSON.stringify({type:'session',name,duration:mins+'min'})
    );
  }

  function enter(name){
    _name=name;
    localStorage.setItem(KEY,name);
    if(overlay)overlay.classList.add("hidden");
    startClock();
    _logVisit(name);
  }

  window.addEventListener('beforeunload',()=>_logSessionEnd(_name));
  const saved=localStorage.getItem(KEY);
  if(saved){_name=saved;if(overlay)overlay.classList.add("hidden");startClock();}
  if(input){
    input.addEventListener("input",()=>btn.disabled=!input.value.trim());
    input.addEventListener("keydown",e=>{if(e.key==="Enter"&&input.value.trim())enter(input.value.trim());});
  }
  if(btn)btn.addEventListener("click",()=>{if(input&&input.value.trim())enter(input.value.trim());});
})();

// ── Theme ─────────────────────────────────────────────────
const MOON=`<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`;
const SUN=`<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
function toggleTheme(){const d=document.documentElement.getAttribute("data-theme")!=="dark";document.documentElement.setAttribute("data-theme",d?"dark":"light");document.getElementById("theme-icon").innerHTML=d?MOON:SUN;localStorage.setItem("theme",d?"dark":"light")}
(()=>{const s=localStorage.getItem("theme")||"light";document.documentElement.setAttribute("data-theme",s);if(s==="dark")document.getElementById("theme-icon").innerHTML=MOON})();

// ── Helpers ───────────────────────────────────────────────
const N=(n,d=0)=>n==null?"—":new Intl.NumberFormat("es-PY",{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
function chgClass(s){if(!s||s==="—"||s==="flat")return"flat";return s.startsWith("+")||Number(s)>0?"up":s.startsWith("-")||Number(s)<0?"down":"flat"}
function chgBg(s){const c=chgClass(s);return c==="up"?"chg-up":c==="down"?"chg-dn":"chg-fl"}
function outletCls(o){const l=o.toLowerCase();if(l.includes("valor")||l.includes("vagro"))return"o-vagro";if(l.includes("rural")||l.includes("rurales"))return"o-rural";if(l.includes("abc"))return"o-abc";if(l.includes("ltima")||l.includes("hora"))return"o-uh";if(l.includes("naci"))return"o-ln";if(l.includes("hoy"))return"o-hoy";return"o-other"}

// ── Flash on change ───────────────────────────────────────
function snapVals(id){
  const m={};
  document.getElementById(id)?.querySelectorAll('[data-id]').forEach(e=>m[e.dataset.id]=e.textContent.trim());
  return m;
}
function flashDiff(id,snap){
  if(!snap||!Object.keys(snap).length)return;
  document.getElementById(id)?.querySelectorAll('[data-id]').forEach(e=>{
    const old=snap[e.dataset.id],cur=e.textContent.trim();
    if(old!==undefined&&old!==cur&&old!=="—"&&cur!=="—"){
      e.classList.remove('flash-up','flash-dn');
      void e.offsetWidth;
      const chgEl=e.closest('.dr')?.querySelector('.dr-chg');
      e.classList.add(chgEl?.classList.contains('chg-up')?'flash-up':'flash-dn');
      setTimeout(()=>e.classList.remove('flash-up','flash-dn'),900);
    }
  });
}

// ── Data row builder ──────────────────────────────────────
function row({icon="",code,name="",val,chg="",unit="",noChg=false,wrapName=false}){
  const chgHtml=noChg?"":(`<span class="dr-chg ${chgBg(chg)}">${chg&&chg!=="—"?chg:"—"}</span>`);
  return `<div class="dr${noChg?" dr--no-chg":""}">
    <span class="dr-icon">${icon}</span>
    <div class="dr-info">
      <span class="dr-code">${code}</span>
      <span class="dr-name${wrapName?" dr-name--wrap":""}">${name}</span>
    </div>
    <span class="dr-val" data-id="${code}">${val}${unit?`<span class="dr-unit">${unit}</span>`:""}</span>
    ${chgHtml}
  </div>`
}

// ── Market clocks ─────────────────────────────────────────
const MARKETS=[
  {id:"asu", flag:"🇵🇾", name:"Asunción",   tz:"America/Asuncion",   open:[9,0],   close:[17,0]},
  {id:"nyc", flag:"🇺🇸", name:"Nueva York", tz:"America/New_York",   open:[9,30],  close:[16,0]},
  {id:"lon", flag:"🇬🇧", name:"Londres",    tz:"Europe/London",       open:[8,0],   close:[16,30]},
  {id:"ffm", flag:"🇩🇪", name:"Fráncfort",  tz:"Europe/Berlin",       open:[9,0],   close:[17,30]},
  {id:"tyo", flag:"🇯🇵", name:"Tokio",      tz:"Asia/Tokyo",          open:[9,0],   close:[15,0]},
  {id:"hkg", flag:"🇭🇰", name:"Hong Kong",  tz:"Asia/Hong_Kong",      open:[9,30],  close:[16,0]},
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

if(document.getElementById('mkt-bar')){_buildMarketBar();setInterval(_tickMarkets,1000);}

// ── Ticker helper ─────────────────────────────────────────
function setT(ids,val,cls=""){ids.forEach(id=>{const el=document.getElementById(id);if(el){el.textContent=val;el.className="tv "+(cls||"")}})}

// ── Exchange Rates ────────────────────────────────────────
function rateRow({icon,code,name,buy,sell}){
  return `<div class="dr dr--rate">
    <span class="dr-icon">${icon}</span>
    <div class="dr-info"><span class="dr-code">${code}</span><span class="dr-name">${name}</span></div>
    <div class="dr-buysell">
      <span class="dr-bs-label">Compra</span><span class="dr-bs-val" data-id="${code}-buy">${N(buy)}</span>
      <span class="dr-bs-label">Venta</span><span class="dr-bs-val dr-bs-sell" data-id="${code}-sell">${N(sell)}</span>
    </div>
  </div>`;
}
async function loadRates(){
  const snap=snapVals("rates-list");
  try{
    const d=await(await fetch("/api/rates")).json();
    const FLAGS={USD:"🇺🇸",EUR:"🇪🇺",BRL:"🇧🇷",ARS:"🇦🇷"};
    const NAMES={USD:"USD / PYG",EUR:"EUR / PYG",BRL:"BRL / PYG",ARS:"ARS / PYG"};
    const ORDER=["USD","EUR","BRL","ARS"];
    const entries=Object.entries(d).sort(([a],[b])=>{const ai=ORDER.indexOf(a),bi=ORDER.indexOf(b);return(ai===-1?99:ai)-(bi===-1?99:bi);});
    document.getElementById("rates-list").innerHTML=entries.map(([c,v])=>
      rateRow({icon:FLAGS[c]||"",code:c,name:NAMES[c]||c,buy:v.buy,sell:v.sell})
    ).join("");
    flashDiff("rates-list",snap);
    setT(["t-usd","t-usd2"],N(d.USD?.sell)+" ₲");
    setT(["t-eur","t-eur2"],N(d.EUR?.sell)+" ₲");
    setT(["t-brl","t-brl2"],N(d.BRL?.sell)+" ₲");
  }catch{document.getElementById("rates-list").innerHTML=`<div class="dr"><span class="dr-name">Sin datos</span></div>`}
}

// ── Economic ──────────────────────────────────────────────
async function loadEconomic(){
  try{
    const d=await(await fetch("/api/economic")).json();
    const SHOW=["pib_crec","inflacion","tpm","rating_sp","reservas"];
    document.getElementById("economic-list").innerHTML=SHOW.filter(k=>d[k]).map(k=>{const v=d[k];
      const sym=v.unit==="%" ? "%" : v.unit&&v.unit.includes("USD") ? " USD" : v.unit?" "+v.unit:"";
      return row({code:v.label,name:String(v.year||""),val:String(v.value)+sym,unit:"",noChg:true});
    }).join("");
  }catch{}
}

// ── Commodities ───────────────────────────────────────────
async function loadCommodities(){
  const snap=snapVals("commodities-list");
  try{
    const d=await(await fetch("/api/commodities")).json();
    const COMD_DESC={"USD/oz":"Onza troy · USD","USD/bbl":"Barril · USD","USD/mmBtu":"mmBtu · USD","¢/bu":"Bushel · ¢ USD"};
    const COMD_ORDER=["GC=F","CL=F","ZS=F","ZC=F","SI=F","NG=F","ZW=F"];
    const sorted=COMD_ORDER.filter(k=>d[k]).map(k=>d[k]).concat(Object.entries(d).filter(([k])=>!COMD_ORDER.includes(k)).map(([,v])=>v)).slice(0,5);
    document.getElementById("commodities-list").innerHTML=sorted.map(v=>{
      const desc=COMD_DESC[v.unit]||v.unit||"";
      const isUSD=v.unit&&v.unit.startsWith("USD");
      const val=(isUSD?"$":"")+N(v.price,2)+(isUSD?"":" ¢");
      return row({icon:v.flag,code:v.label,name:desc,val,chg:v.change,unit:"",wrapName:true});
    }).join("");
    flashDiff("commodities-list",snap);
    setT(["t-gold","t-gold2"],"$"+N(d["GC=F"]?.price,0),chgClass(d["GC=F"]?.change));
    setT(["t-soja","t-soja2"],N(d["ZS=F"]?.price,0)+"¢",chgClass(d["ZS=F"]?.change));
  }catch{document.getElementById("commodities-list").innerHTML=`<div class="dr"><span class="dr-name">Sin datos</span></div>`}
}

// ── US Markets ────────────────────────────────────────────
async function loadUSMarkets(){
  const snapRates=snapVals("rates-us-list");
  const snapIdx=snapVals("indexes-list");
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
    flashDiff("rates-us-list",snapRates);
    if(treasuries?.["^TNX"]) setT(["t-10y","t-10y2"],N(treasuries["^TNX"].price,2)+"%",chgClass(treasuries["^TNX"].change));

    // Indexes list
    if(indexes){
      document.getElementById("indexes-list").innerHTML=Object.values(indexes).map(v=>
        row({icon:v.flag,code:v.label,name:"USD · pts",val:"$"+N(v.price,0),chg:v.change})
      ).join("");
      flashDiff("indexes-list",snapIdx);
      setT(["t-sp","t-sp2"],N(indexes["^GSPC"]?.price,0),chgClass(indexes["^GSPC"]?.change));
    }
  }catch{}
}

// ── Crypto ────────────────────────────────────────────────
async function loadCrypto(){
  const snap=snapVals("crypto-list");
  try{
    const d=await(await fetch("/api/crypto")).json();
    const ICONS={BTC:"₿",ETH:"Ξ",USDT:"₮",SOL:"◎",BNB:"⬡"};
    document.getElementById("crypto-list").innerHTML=Object.values(d).map(v=>
      row({icon:ICONS[v.symbol]||"●",code:v.symbol,name:`${v.symbol} / USD`,val:"$"+N(v.usd,2),chg:v.change_24h})
    ).join("");
    flashDiff("crypto-list",snap);
    setT(["t-btc","t-btc2"],"$"+N(d.bitcoin?.usd,0),chgClass(d.bitcoin?.change_24h));
    setT(["t-eth","t-eth2"],"$"+N(d.ethereum?.usd,0),chgClass(d.ethereum?.change_24h));
  }catch{}
}

// ── Ticker news injection ─────────────────────────────────
function injectTickerNews(items){
  const track=document.querySelector('.ticker-track');
  if(!track||!items.length)return;
  track.querySelectorAll('.ti[data-news]').forEach(el=>el.remove());
  const tops=items.slice(0,8);
  const make=n=>{
    const s=document.createElement('span');
    s.className='ti ti--news';s.dataset.news='1';
    const href=n.url&&n.url!=='#'?n.url:'#';
    const tag=href!=='#'?'a':'span';
    s.innerHTML=`<b>📰</b><${tag} class="ti-headline"${tag==='a'?` href="${href}" target="_blank" rel="noopener"`:''} title="${n.outlet}">${n.title}</${tag}>`;
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
let _scrollPaused=false,_scrollPos=0;
let _scrollTrack=null,_scrollClone=null;
const _SCROLL_PX_PER_SEC=1000/105;

function _nftApplyAnim(track,pos){
  const halfH=track.scrollHeight/2;
  const dur=Math.round((halfH/_SCROLL_PX_PER_SEC)*1000);
  track._nftDur=dur;
  const delay=-Math.round((pos/halfH)*dur);
  track.style.animation=`news-scroll ${dur}ms ${delay}ms linear infinite`;
}

function _startAutoscroll(){
  const feed=document.getElementById("news-feed");
  if(!feed||!feed.children.length)return;

  const items=Array.from(feed.children);
  const track=document.createElement('div');
  track.className='nft';
  items.forEach(el=>track.appendChild(el));
  items.forEach(el=>track.appendChild(el.cloneNode(true)));
  feed.innerHTML='';
  feed.appendChild(track);
  _scrollTrack=track;
  _scrollClone=null;
  _scrollPos=0;
  _scrollPaused=false;

  requestAnimationFrame(()=>_nftApplyAnim(track,0));
}

async function loadNews(){
  try{
    allNews=await(await fetch("/api/news")).json();
    buildFilters();renderNews(allNews);injectTickerNews(allNews);
    const feed=document.getElementById("news-feed");
    if(feed){
      feed.addEventListener("mouseenter",()=>{
        if(!_scrollTrack)return;
        const m=new DOMMatrix(getComputedStyle(_scrollTrack).transform);
        _scrollPos=Math.max(0,-m.m42);
        _scrollTrack.style.animation='none';
        _scrollTrack.style.transform=`translateY(${-_scrollPos}px)`;
        _scrollPaused=true;
      });
      feed.addEventListener("mouseleave",()=>{
        if(!_scrollTrack)return;
        _scrollPaused=false;
        _scrollTrack.style.transform='';
        _nftApplyAnim(_scrollTrack,_scrollPos);
      });
      feed.addEventListener("wheel",e=>{
        if(!_scrollPaused||!_scrollTrack)return;
        e.preventDefault();
        const halfH=_scrollTrack.scrollHeight/2;
        _scrollPos=((_scrollPos+e.deltaY*0.6)%halfH+halfH)%halfH;
        _scrollTrack.style.transform=`translateY(${-_scrollPos}px)`;
      },{passive:false});
    }
    _startAutoscroll();
  }catch{document.getElementById("news-feed").innerHTML=`<div class="ni"><span class="nt">Error al cargar noticias</span></div>`}
}
const AGRO_OUTLETS=new Set(["ABC Rural","Valor Agro"]);
function buildFilters(){
  const outlets=["Todos",...new Set(allNews.filter(n=>!n.agro).map(n=>n.outlet))];
  const hasAgro=allNews.some(n=>n.agro);
  const btns=outlets.map(o=>`<button class="fbtn ${o===activeFilter?"active":""}" onclick="filterNews('${o}')">${o}</button>`).join("");
  const agroBtn=hasAgro?`<button class="fbtn fbtn--agro ${activeFilter==="Agro"?"active":""}" onclick="filterNews('Agro')">Agro</button>`:"";
  document.getElementById("news-filter").innerHTML=btns+agroBtn;
}
function filterNews(o){
  activeFilter=o;buildFilters();
  const items=o==="Todos"?allNews:o==="Agro"?allNews.filter(n=>n.agro):allNews.filter(n=>n.outlet===o&&!n.agro);
  renderNews(items);
  _scrollPos=0;
  _startAutoscroll();
}
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
    if(t){
      const TAG_LBL={pol:"Política",eco:"Economía",fx:"Divisas",py:"Paraguay",mkt:"Mercados",agro:"Agro"};
      const points=Array.isArray(r.summary)?r.summary:[{text:r.summary,sentiment:"flat",tag:""}];
      t.innerHTML=points.map(p=>{
        const key=(p.tag||"").toLowerCase();
        const lbl=TAG_LBL[key]||p.tag||"";
        const badge=lbl?`<span class="sum-tag tag-${key}">${lbl}</span>`:"";
        return `<li class="sum-item">${badge}<span class="sum-text">${p.text}</span></li>`;
      }).join("");
    }
    if(d)d.textContent="";
  }catch{if(t)t.textContent="Error al generar el resumen."}
}
async function refreshSummary(){
  const b=document.getElementById("summary-btn");
  if(b)b.disabled=true;
  await loadSummary(true);
  if(b)b.disabled=false;
}

// ── Refresh & Init ────────────────────────────────────────
const _DAYS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const _MONTHS= ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function updateTime(){
  const el=document.getElementById("last-updated");
  if(!el)return;
  const n=new Date();
  const pad=v=>String(v).padStart(2,"0");
  const dateStr=`${_DAYS[n.getDay()]} ${n.getDate()} ${_MONTHS[n.getMonth()]}`;
  const timeStr=`${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  el.textContent=`${dateStr}  ·  ${timeStr}`;
}
updateTime();setInterval(updateTime,1000);

async function refreshAll(){
  await Promise.all([loadRates(),loadEconomic(),loadCommodities(),loadUSMarkets(),loadCrypto(),loadNews()]);
  updateTime();
}

// ── Dashboard scaling ─────────────────────────────────────
(function(){
  const BASE_W  = 1440;
  const HEADER_H = 44;
  const MKT_H    = 28;
  function fit(){
    const grid = document.querySelector('.grid');
    if(!grid) return;
    const availH = window.innerHeight - HEADER_H - MKT_H;
    const scale  = window.innerWidth / BASE_W;
    grid.style.width           = BASE_W + 'px';
    grid.style.height          = Math.round(availH / scale) + 'px';
    grid.style.transform       = `scale(${scale})`;
    grid.style.transformOrigin = 'top left';
    grid.style.zoom            = '';
  }
  fit();
  window.addEventListener('resize', fit);
})();

if(document.getElementById('rates-list')){
  (async()=>{
    await refreshAll();
    loadSummary();
    setInterval(loadNews,3*60*1000);
    setInterval(()=>{loadCrypto();loadUSMarkets();},30*1000);
    setInterval(()=>{loadRates();loadCommodities();},60*1000);
    setInterval(loadEconomic,15*60*1000);
  })();
}

// ── Weather widget ────────────────────────────────────────
(function(){
  const CITIES=[
    {name:"Asunción",  flag:"🇵🇾", lat:-25.2867, lon:-57.6470},
    {name:"Miami",     flag:"🇺🇸", lat: 25.7617, lon:-80.1918},
    {name:"Orlando",   flag:"🇺🇸", lat: 28.5383, lon:-81.3792},
    {name:"B. Aires",  flag:"🇦🇷", lat:-34.6037, lon:-58.3816},
    {name:"Lawrence",  flag:"🇺🇸", lat: 38.9717, lon:-95.2353},
  ];

  function wmoIcon(code,wind){
    if(code===0)  return wind>25?"☀️":"☀️";
    if(code<=2)   return"🌤️";
    if(code<=3)   return"⛅";
    if(code<=48)  return"☁️";
    if(code<=55)  return"🌦️";
    if(code<=65)  return"🌧️";
    if(code<=75)  return"🌨️";
    if(code<=82)  return"🌧️";
    return"⛈️";
  }
  function wmoLabel(code,wind){
    if(code===0)  return wind>25?"Viento":"Despejado";
    if(code<=2)   return"Mayormente despejado";
    if(code<=3)   return"Parcial nublado";
    if(code<=48)  return"Nublado";
    if(code<=55)  return"Llovizna";
    if(code<=65)  return"Lluvia";
    if(code<=75)  return"Nieve";
    if(code<=82)  return"Lluvias";
    return"Tormenta";
  }

  let _data=[];
  let _idx=0;

  async function fetchWeather(){
    const results=await Promise.all(CITIES.map(async c=>{
      try{
        const url=`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh&timezone=auto`;
        const r=await(await fetch(url)).json();
        const cur=r.current;
        return {...c,temp:Math.round(cur.temperature_2m),code:cur.weather_code,wind:Math.round(cur.wind_speed_10m)};
      }catch{return{...c,temp:null};}
    }));
    _data=results.filter(r=>r.temp!==null);
  }

  function render(){
    const el=document.getElementById("weather-widget");
    if(!el||!_data.length)return;
    const c=_data[_idx%_data.length];
    const icon=wmoIcon(c.code,c.wind);
    const label=wmoLabel(c.code,c.wind);
    el.innerHTML=`<span class="ww-inner ww-anim">${c.flag} ${c.name} · ${icon} ${c.temp}°C · ${label}</span>`;
    // remove and re-add class to restart animation
    const inner=el.querySelector('.ww-inner');
    void inner.offsetWidth;
  }

  function cycle(){
    _idx=(_idx+1)%(_data.length||1);
    render();
  }

  fetchWeather().then(()=>{
    render();
    setInterval(cycle,4500);
    setInterval(fetchWeather,10*60*1000); // refresh weather every 10 min
  });
})();

// ── Card divider resize ───────────────────────────────────
(function(){
  const divider=document.querySelector('.card-divider');
  if(!divider)return;
  const card=divider.closest('.card--tall');
  if(!card)return;
  const halves=card.querySelectorAll('.card-half');
  const newsPanel=halves[1];

  let dragging=false,startY=0,startTopPct=50,hasMoved=false;

  function _getScale(){
    return parseFloat(document.querySelector('.grid').style.transform.match(/scale\(([^)]+)\)/)?.[1]||1);
  }

  function _setTop(pct){
    newsPanel.style.top=pct+'%';
    divider.style.top='calc('+pct+'% - 3px)';
  }

  divider.addEventListener('mousedown',e=>{
    e.preventDefault();
    dragging=true;
    hasMoved=false;
    startY=e.clientY;
    startTopPct=parseFloat(newsPanel.style.top)||50;
    divider.classList.add('dragging');
    document.body.style.cursor='ns-resize';
    document.body.style.userSelect='none';
  });

  document.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const dy=(e.clientY-startY)/_getScale();
    if(!hasMoved&&Math.abs(dy)<3)return;
    hasMoved=true;
    const cardH=card.getBoundingClientRect().height/_getScale();
    const dyPct=(dy/cardH)*100;
    // Only allow dragging upward from 50% (min ~10%)
    const newPct=Math.min(50,Math.max(10,startTopPct+dyPct));
    _setTop(newPct);
  });

  document.addEventListener('mouseup',()=>{
    if(!dragging)return;
    dragging=false;
    divider.classList.remove('dragging');
    document.body.style.cursor='';
    document.body.style.userSelect='';
  });
})();

// ── Logo slider ───────────────────────────────────────────
(function(){
  const slides=document.querySelectorAll('.logo-slide');
  if(slides.length<2)return;
  let cur=0;
  setInterval(()=>{
    const next=(cur+1)%slides.length;
    slides[cur].classList.add('exit');
    slides[cur].classList.remove('active');
    slides[next].classList.add('active');
    slides[next].classList.remove('exit');
    setTimeout(()=>slides[cur].classList.remove('exit'),450);
    cur=next;
  },3500);
})();
