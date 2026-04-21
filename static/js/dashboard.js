// ── User name & greeting ──────────────────────────────────
(function(){
  const KEY="ald_username";
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
  function enter(name){
    _name=name;
    localStorage.setItem(KEY,name);
    if(overlay)overlay.classList.add("hidden");
    startClock();
  }
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
function outletCls(o){const l=o.toLowerCase();if(l.includes("abc"))return"o-abc";if(l.includes("ltima")||l.includes("hora"))return"o-uh";if(l.includes("naci"))return"o-ln";if(l.includes("hoy"))return"o-hoy";return"o-other"}

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
let _scrollRaf=null,_scrollPaused=false,_scrollPos=0;
const _SCROLL_PX_PER_SEC = 1000/105; // ~9.5 px/s

function _startAutoscroll(){
  const feed=document.getElementById("news-feed");
  if(!feed)return;
  if(_scrollRaf)cancelAnimationFrame(_scrollRaf);
  let last=null;
  function step(ts){
    if(!_scrollPaused){
      if(last!==null){
        const delta=(ts-last)/1000;
        _scrollPos+=_SCROLL_PX_PER_SEC*delta;
        if(_scrollPos>=feed.scrollHeight-feed.clientHeight){
          _scrollPos=0;
        }
        feed.scrollTop=_scrollPos;
      }
      last=ts;
    } else {
      last=null;
    }
    _scrollRaf=requestAnimationFrame(step);
  }
  _scrollRaf=requestAnimationFrame(step);
}

async function loadNews(){
  try{
    allNews=await(await fetch("/api/news")).json();
    buildFilters();renderNews(allNews);injectTickerNews(allNews);
    const feed=document.getElementById("news-feed");
    if(feed){
      feed.addEventListener("mouseenter",()=>{_scrollPaused=true;});
      feed.addEventListener("mouseleave",()=>{_scrollPaused=false;});
    }
    _startAutoscroll();
  }catch{document.getElementById("news-feed").innerHTML=`<div class="ni"><span class="nt">Error al cargar noticias</span></div>`}
}
function buildFilters(){
  const outlets=["Todos",...new Set(allNews.map(n=>n.outlet))];
  document.getElementById("news-filter").innerHTML=outlets.map(o=>`<button class="fbtn ${o===activeFilter?"active":""}" onclick="filterNews('${o}')">${o}</button>`).join("");
}
function filterNews(o){
  activeFilter=o;buildFilters();
  renderNews(o==="Todos"?allNews:allNews.filter(n=>n.outlet===o));
  const feed=document.getElementById("news-feed");
  if(feed){feed.scrollTop=0;_scrollPos=0;}
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
      const TAG_LBL={pol:"Política",eco:"Economía",fx:"Divisas",py:"Paraguay",mkt:"Mercados"};
      const points=Array.isArray(r.summary)?r.summary:[{text:r.summary,sentiment:"flat",tag:""}];
      t.innerHTML=points.map(p=>{
        const key=(p.tag||"").toLowerCase();
        const lbl=TAG_LBL[key]||p.tag||"";
        const badge=lbl?`<span class="sum-tag tag-${key}">${lbl}</span>`:"";
        return `<li class="sum-item">${badge}<span class="sum-text">${p.text}</span></li>`;
      }).join("");
    }
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

if(document.getElementById('rates-list')){
  (async()=>{
    await refreshAll();
    loadSummary();
    setInterval(loadNews,3*60*1000);
    setInterval(()=>{loadCrypto();loadUSMarkets();},30*1000);          // rápidos: crypto + índices
    setInterval(()=>{loadRates();loadCommodities();},60*1000);         // medios: divisas + commodities
    setInterval(loadEconomic,15*60*1000);                              // lentos: macro PY
  })();
}
