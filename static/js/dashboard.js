// ── Session logging & welcome overlay ────────────────────────
(function(){
  const KEY='ald_username_v3';
  const LAST_KEY='ald_last_visit';
  const SESSION_START=Date.now();
  const overlay=document.getElementById('welcome-overlay');
  const input=document.getElementById('welcome-input');
  const btn=document.getElementById('welcome-btn');
  let _name='';

  function _logVisit(name){
    if(!window._GS_WEBHOOK)return;
    const ua=navigator.userAgent;
    const device=/Mobi|Android/i.test(ua)?'Mobile':'Desktop';
    const lang=navigator.language||'';
    const lastVisit=localStorage.getItem(LAST_KEY)||'First visit';
    localStorage.setItem(LAST_KEY,new Date().toISOString());
    fetch(window._GS_WEBHOOK,{method:'POST',mode:'no-cors',
      body:JSON.stringify({name,ts:new Date().toISOString(),device,lang,lastVisit})
    }).catch(()=>{});
  }

  function _logSessionEnd(name){
    if(!window._GS_WEBHOOK||!name)return;
    const mins=Math.round((Date.now()-SESSION_START)/60000);
    navigator.sendBeacon(window._GS_WEBHOOK,JSON.stringify({type:'session',name,duration:mins+'min'}));
  }

  function enter(name){
    _name=name;
    localStorage.setItem(KEY,name);
    if(overlay)overlay.classList.add('hidden');
    _logVisit(name);
    window._userName=name;
  }

  const saved=localStorage.getItem(KEY);
  if(saved){_name=saved;if(overlay)overlay.classList.add('hidden');window._userName=saved;}

  if(input){
    input.addEventListener('input',()=>btn.disabled=!input.value.trim());
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&input.value.trim())enter(input.value.trim());});
  }
  if(btn)btn.addEventListener('click',()=>{if(input&&input.value.trim())enter(input.value.trim());});
  window.addEventListener('beforeunload',()=>_logSessionEnd(_name));
})();

// ── Helpers ───────────────────────────────────────────────────
const N=(n,d=0)=>n==null?'—':new Intl.NumberFormat('es-PY',{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);

function cc(s){
  if(!s||s==='—')return'n';
  const v=parseFloat(String(s).replace(',','.'));
  if(!isNaN(v))return v>0?'p':v<0?'m':'n';
  return String(s).startsWith('+')?'p':String(s).startsWith('-')?'m':'n';
}
function cbg(s){const c=cc(s);return c==='p'?'cu':c==='m'?'cd':'cn';}
function ctxt(s){const c=cc(s);return c==='p'?'up':c==='m'?'down':'';}

function outletCls(o){
  const l=o.toLowerCase();
  if(l.includes('valor')||l.includes('vagro'))return'o-vagro';
  if(l.includes('rural')||l.includes('rurales'))return'o-rural';
  if(l.includes('abc'))return'o-abc';
  if(l.includes('ltima')||l.includes('hora'))return'o-uh';
  if(l.includes('naci'))return'o-ln';
  if(l.includes('hoy'))return'o-hoy';
  return'o-other';
}

function outletBdr(o){
  const l=o.toLowerCase();
  if(l.includes('vagro')||l.includes('rural')||l.includes('rurales'))return'#16a34a';
  if(l.includes('abc'))return'#b91c1c';
  if(l.includes('ltima')||l.includes('hora'))return'#1d4ed8';
  if(l.includes('naci'))return'#15803d';
  if(l.includes('hoy'))return'#c2410c';
  return'#2a3d50';
}

function setT(ids,val,cls){
  ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;el.textContent=' '+val;el.className='tv'+(cls?' '+cls:'');});
}

// ── Sparkline ─────────────────────────────────────────────────
let _sparkIdx=0;
function spark(seed,chg,w,h){
  w=w||88;h=h||26;
  let r=String(seed).split('').reduce((a,c)=>a+c.charCodeAt(0)*31,0)^0xdeadbeef;
  const rnd=()=>{r=(r*1664525+1013904223)&0xffffffff;return(r>>>0)/0xffffffff;};
  const dir=cc(chg)==='p'?0.013:cc(chg)==='m'?-0.013:0;
  const d=[0.5];
  for(let i=1;i<28;i++) d.push(Math.max(.05,Math.min(.95,d[i-1]+(rnd()-.5)*.17+dir)));
  const mn=Math.min(...d),mx=Math.max(...d),rg=mx-mn||.1;
  const pts=d.map((v,i)=>`${((i/27)*w).toFixed(1)},${(h-((v-mn)/rg)*(h-5)-2.5).toFixed(1)}`);
  const isP=cc(chg)==='p',isM=cc(chg)==='m';
  const col=isP?'#0dc98a':isM?'#f0405a':'#4a6a84';
  const ly=parseFloat(pts[pts.length-1].split(',')[1]);
  const uid='sg'+(++_sparkIdx);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}" stop-opacity=".4"/>
      <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    <polygon points="${pts.join(' ')} ${w},${h} 0,${h}" fill="url(#${uid})"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${w}" cy="${ly.toFixed(1)}" r="3" fill="${col}"/>
  </svg>`;
}

// ── Section countdowns ────────────────────────────────────────
const _CDS={
  'cd-rates':       {r:60,   t:60},
  'cd-crypto':      {r:30,   t:30},
  'cd-rates-us':    {r:30,   t:30},
  'cd-indexes':     {r:30,   t:30},
  'cd-commodities': {r:60,   t:60},
  'cd-macro':       {r:900,  t:900},
  'cd-news':        {r:180,  t:180},
};
function _fmtCd(s){return s>=60?Math.floor(s/60)+'m'+(s%60?String(s%60).padStart(2,'0')+'s':''):s+'s';}
function _tickCds(){
  for(const[id,cd]of Object.entries(_CDS)){
    cd.r=Math.max(0,cd.r-1);
    const el=document.getElementById(id);
    if(el)el.textContent=_fmtCd(cd.r);
  }
}
function _resetCd(id){if(_CDS[id]){_CDS[id].r=_CDS[id].t;const el=document.getElementById(id);if(el)el.textContent=_fmtCd(_CDS[id].t);}}

// ── Shared state for hero ──────────────────────────────────────
let _rates={},_crypto={},_comm={},_markets={};

function buildHero(){
  const usd=_rates.USD?.sell;
  const eur=_rates.EUR?.sell;
  const btc=_crypto.bitcoin;
  const sp=_markets.indexes?.['%5EGSPC']||Object.values(_markets.indexes||{}).find(v=>v.label==='S&P 500');
  const gold=Object.values(_comm).find(v=>v.label==='Oro'||v.label==='Gold');
  const soja=Object.values(_comm).find(v=>v.label==='Soja');

  const items=[
    {label:'USD / PYG', val:usd?N(usd):'—', chg:_rates.USD?.change||'—', seed:'USD'},
    {label:'EUR / PYG', val:eur?N(eur):'—', chg:_rates.EUR?.change||'—', seed:'EUR'},
    {label:'BTC',       val:btc?'$'+N(btc.usd,0):'—', chg:btc?.change_1y||'—', seed:'BTC'},
    {label:'S&P 500',   val:sp?N(sp.price,0):'—',    chg:sp?.change||'—',      seed:'SPX'},
    {label:'ORO',       val:gold?'$'+N(gold.price,0):'—', chg:gold?.change||'—', seed:'GOLD'},
    {label:'SOJA',      val:soja?N(soja.price,0)+'¢':'—', chg:soja?.change||'—', seed:'SOJA'},
  ];

  document.getElementById('hero').innerHTML=items.map(it=>{
    const c=cc(it.chg);
    const cls=c==='p'?'pos':c==='m'?'neg':'neu';
    return `<div class="hi ${cls}">
      <div class="hi-label">${it.label}</div>
      <div class="hi-val">${it.val}</div>
      <div class="hi-bottom">
        <span class="hi-chg ${cls}">${it.chg}</span>
        ${spark(it.seed,it.chg,Math.round(window.innerWidth*0.065),Math.round(window.innerHeight*0.042))}
      </div>
    </div>`;
  }).join('');
}

// ── Exchange Rates ────────────────────────────────────────────
async function loadRates(){
  try{
    const d=await(await fetch('/api/rates')).json();
    _rates=d;
    const FLAGS={USD:'🇺🇸',EUR:'🇪🇺',BRL:'🇧🇷',ARS:'🇦🇷'};
    const PAIRS={USD:'USD / PYG',EUR:'EUR / PYG',BRL:'BRL / PYG',ARS:'ARS / PYG'};
    const ORDER=['USD','EUR','BRL','ARS'];
    document.getElementById('rates-list').innerHTML=ORDER.filter(c=>d[c]).map(c=>{
      const v=d[c];
      const chg=v.change||'—';
      return `<div class="dr">
        <span class="dr-flag">${FLAGS[c]||''}</span>
        <div class="dr-info"><span class="dr-code">${PAIRS[c]}</span></div>
        <div class="dr-spark">${spark(c,chg)}</div>
        <span class="dr-val">${N(v.sell)}<span class="dr-unit">₲</span></span>
        <span class="dr-chg ${cbg(chg)}">${chg}</span>
      </div>`;
    }).join('');
    setT(['t-usd','t-usd2'],N(d.USD?.sell)+' ₲',ctxt(d.USD?.change));
    setT(['t-eur','t-eur2'],N(d.EUR?.sell)+' ₲',ctxt(d.EUR?.change));
    setT(['t-brl','t-brl2'],N(d.BRL?.sell)+' ₲',ctxt(d.BRL?.change));
    _resetCd('cd-rates');
    buildHero();
  }catch{document.getElementById('rates-list').innerHTML='<div class="mac-row"><span class="mac-label">Sin datos</span></div>';}
}

// ── Crypto ────────────────────────────────────────────────────
async function loadCrypto(){
  try{
    const rates=await(await fetch('/api/rates')).json();
    const usd_pyg=rates.USD?.sell||7300;
    const d=await(await fetch('/api/crypto')).json();
    _crypto=d;
    const IC={BTC:'₿',ETH:'Ξ',XMR:'ɱ',SOL:'◎',BNB:'⬡'};
    document.getElementById('crypto-list').innerHTML=Object.values(d).map(v=>{
      const chg=v.change_1y;
      const dec=v.usd>=1000?0:v.usd>=1?2:4;
      return `<div class="dr">
        <span class="dr-flag" style="font-family:'JetBrains Mono',monospace;font-size:clamp(12px,1.2vw,19px);color:var(--amber)">${IC[v.symbol]||'●'}</span>
        <div class="dr-info"><span class="dr-code">${v.symbol}</span><span class="dr-name">${v.symbol} / USD</span></div>
        <div class="dr-spark">${spark(v.symbol,chg)}</div>
        <span class="dr-val">$${N(v.usd,dec)}<span class="dr-unit">USD</span></span>
        <span class="dr-chg ${cbg(chg)}">${chg||'—'}</span>
      </div>`;
    }).join('');
    setT(['t-btc','t-btc2'],'$'+N(d.bitcoin?.usd,0),ctxt(d.bitcoin?.change_1y));
    setT(['t-eth','t-eth2'],'$'+N(d.ethereum?.usd,0),ctxt(d.ethereum?.change_1y));
    _resetCd('cd-crypto');
    buildHero();
  }catch{document.getElementById('crypto-list').innerHTML='<div class="mac-row"><span class="mac-label">Sin datos</span></div>';}
}

// ── US Markets ────────────────────────────────────────────────
async function loadUSMarkets(){
  try{
    const d=await(await fetch('/api/markets')).json();
    const {treasuries,indexes,effr}=d;
    _markets={treasuries,indexes,effr};

    const rateRows=[];
    if(effr)rateRows.push(`<div class="dr dr-ns">
      <span class="dr-flag">🏦</span>
      <div class="dr-info"><span class="dr-code">EFFR</span><span class="dr-name">Fed Funds Rate</span></div>
      <span class="dr-val">${effr.price}<span class="dr-unit">% anual</span></span>
      <span class="dr-chg cn">flat</span>
    </div>`);
    if(treasuries)Object.values(treasuries).forEach(v=>{
      if(!v)return;
      rateRows.push(`<div class="dr dr-ns">
        <span class="dr-flag">🇺🇸</span>
        <div class="dr-info"><span class="dr-code">${v.label}</span><span class="dr-name">US Treasury</span></div>
        <span class="dr-val">${N(v.price,2)}<span class="dr-unit">%</span></span>
        <span class="dr-chg ${cbg(v.change)}">${v.change||'—'}</span>
      </div>`);
    });
    document.getElementById('rates-us-list').innerHTML=rateRows.join('');
    if(treasuries?.['%5ETNX']||Object.values(treasuries||{}).find(v=>v?.label==='10Y')){
      const t10=Object.values(treasuries).find(v=>v?.label==='10Y')||Object.values(treasuries)[2];
      if(t10)setT(['t-10y','t-10y2'],N(t10.price,2)+'%',ctxt(t10.change));
    }

    if(indexes){
      document.getElementById('indexes-list').innerHTML=Object.values(indexes).map(v=>`
        <div class="dr dr-ns">
          <span class="dr-flag">${v.flag||'🇺🇸'}</span>
          <div class="dr-info"><span class="dr-code">${v.label}</span><span class="dr-name">NYSE / NASDAQ</span></div>
          <span class="dr-val">${N(v.price,0)}</span>
          <span class="dr-chg ${cbg(v.change)}">${v.change||'—'}</span>
        </div>`).join('');
      const sp=Object.values(indexes).find(v=>v.label==='S&P 500');
      const ndx=Object.values(indexes).find(v=>v.label==='Nasdaq'||v.label==='NASDAQ');
      if(sp)setT(['t-sp','t-sp2'],N(sp.price,0),ctxt(sp.change));
      if(ndx)setT(['t-ndx','t-ndx2'],N(ndx.price,0),ctxt(ndx.change));
    }
    _resetCd('cd-rates-us');_resetCd('cd-indexes');
    buildHero();
  }catch{}
}

// ── Economic ──────────────────────────────────────────────────
async function loadEconomic(){
  try{
    const d=await(await fetch('/api/economic')).json();
    const SHOW=['pib_crec','inflacion','tpm','deficit_fiscal','reservas'];
    document.getElementById('economic-list').innerHTML=SHOW.filter(k=>d[k]).map(k=>{
      const v=d[k];
      const sym=v.unit==='%'?'%':v.unit?' '+v.unit:'';
      return `<div class="mac-row">
        <span class="mac-label">${v.label}</span>
        <span class="mac-year">${v.year||''}</span>
        <span class="mac-val">${v.value}${sym}</span>
      </div>`;
    }).join('');
    _resetCd('cd-macro');
  }catch{}
}

// ── Commodities ───────────────────────────────────────────────
async function loadCommodities(){
  try{
    const d=await(await fetch('/api/commodities')).json();
    _comm=d;
    const ORDER=['GC=F','CL=F','ZS=F','ZC=F','SI=F','NG=F','ZW=F'];
    const sorted=ORDER.filter(k=>d[k]).map(k=>d[k]).concat(Object.entries(d).filter(([k])=>!ORDER.includes(k)).map(([,v])=>v)).slice(0,7);
    document.getElementById('commodities-list').innerHTML=sorted.map(v=>`
      <div class="dr dr-ns">
        <span class="dr-flag">${v.flag||''}</span>
        <div class="dr-info"><span class="dr-code">${v.label}</span><span class="dr-name">${v.unit||''}</span></div>
        <span class="dr-val">${v.unit?.startsWith('USD')?'$':''}${N(v.price,2)}${v.unit?.startsWith('¢')||v.unit==='¢/bu'?' ¢':''}</span>
        <span class="dr-chg ${cbg(v.change)}">${v.change||'—'}</span>
      </div>`).join('');
    const gold=Object.values(d).find(v=>v.label==='Oro');
    const soja=Object.values(d).find(v=>v.label==='Soja');
    if(gold)setT(['t-gold','t-gold2'],'$'+N(gold.price,0),ctxt(gold.change));
    if(soja)setT(['t-soja','t-soja2'],N(soja.price,0)+'¢',ctxt(soja.change));
    _resetCd('cd-commodities');
    buildHero();
  }catch{}
}

// ── News ──────────────────────────────────────────────────────
let allNews=[],activeFilter='Todos',_newsPaused=false,_newsRaf=null,_newsOffset=0,_newsLastTs=null,_newsListenersAdded=false;
const NEWS_SPEED_PX_S=28.125; // antes: 0.45px/16ms (equivalente), ahora en px/segundo reales

function buildFilters(){
  const outlets=['Todos',...new Set(allNews.filter(n=>!n.agro).map(n=>n.outlet))];
  const hasAgro=allNews.some(n=>n.agro);
  const btns=outlets.map(o=>`<button class="fbtn${o===activeFilter?' on':''}" onclick="filterNews('${o}')">${o}</button>`).join('');
  const agroBtn=hasAgro?`<button class="fbtn fbtn--agro${activeFilter==='Agro'?' on':''}" onclick="filterNews('Agro')">Agro</button>`:'';
  document.getElementById('news-filter').innerHTML=btns+agroBtn;
}

function renderNews(items){
  const html=items.map(n=>`
    <div class="ni" style="border-left-color:${outletBdr(n.outlet)}">
      <span class="no ${outletCls(n.outlet)}">${n.outlet}</span>
      <a class="nt" href="${n.url}" target="_blank" rel="noopener">${n.title}</a>
    </div>`).join('');
  document.getElementById('news-track').innerHTML=html+html;
}

// Mueve `#news-track` con transform (sub-píxel, vía GPU) en vez de
// scrollTop (que el navegador redondea a enteros y se ve "a saltos" a
// velocidades bajas). requestAnimationFrame + delta de tiempo real en
// vez de un setInterval de paso fijo, para que sea fluido de verdad.
function _newsTick(ts){
  const track=document.getElementById('news-track');
  if(track && _newsLastTs!=null && !_newsPaused){
    const dt=ts-_newsLastTs;
    const half=track.scrollHeight/2;
    _newsOffset+=NEWS_SPEED_PX_S*dt/1000;
    if(half>0)_newsOffset%=half;
    track.style.transform=`translateY(${-_newsOffset}px)`;
  }
  _newsLastTs=ts;
  _newsRaf=requestAnimationFrame(_newsTick);
}

function startNewsScroll(){
  const feed=document.getElementById('news-feed');
  const track=document.getElementById('news-track');
  if(!feed||!track)return;
  if(_newsRaf)cancelAnimationFrame(_newsRaf);
  _newsOffset=0;
  _newsLastTs=null;
  _newsPaused=false;
  track.style.transform='translateY(0)';
  _newsRaf=requestAnimationFrame(_newsTick);

  if(!_newsListenersAdded){
    _newsListenersAdded=true;
    feed.addEventListener('mouseenter',()=>{_newsPaused=true;});
    feed.addEventListener('mouseleave',()=>{_newsPaused=false;});
    feed.addEventListener('wheel',e=>{
      e.preventDefault();
      const half=track.scrollHeight/2;
      _newsOffset+=e.deltaY*.7;
      if(half>0){_newsOffset%=half;if(_newsOffset<0)_newsOffset+=half;}
      track.style.transform=`translateY(${-_newsOffset}px)`;
    },{passive:false});
  }
}

function filterNews(o){
  activeFilter=o; buildFilters();
  const items=o==='Todos'?allNews:o==='Agro'?allNews.filter(n=>n.agro):allNews.filter(n=>n.outlet===o&&!n.agro);
  renderNews(items);
  startNewsScroll();
}

async function loadNews(){
  try{
    allNews=await(await fetch('/api/news')).json();
    buildFilters();
    renderNews(allNews);
    startNewsScroll();
    _resetCd('cd-news');
  }catch{document.getElementById('news-track').innerHTML='<div class="ni"><span class="nt">Error al cargar noticias</span></div>';}
}

// ── Clock ─────────────────────────────────────────────────────
function updateClock(){
  const now=new Date();
  const ct=document.getElementById('clock-t');
  const cd=document.getElementById('clock-d');
  if(ct)ct.textContent=now.toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
  if(cd)cd.textContent=now.toLocaleDateString('es-PY',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
}

// ── Refresh countdown ─────────────────────────────────────────
let _cd=15*60;
function tickRefresh(){
  _cd--;
  if(_cd<=0){_cd=15*60;refreshAll();}
  const el=document.getElementById('refresh-cd');
  if(el)el.textContent=String(Math.floor(_cd/60)).padStart(2,'0')+':'+String(_cd%60).padStart(2,'0');
}

// ── Market bar ────────────────────────────────────────────────
const MARKETS=[
  {id:'asu',flag:'🇵🇾',name:'Asunción',  tz:'America/Asuncion', o:[9,0],  c:[17,0]},
  {id:'nyc',flag:'🇺🇸',name:'Nueva York',tz:'America/New_York',  o:[9,30], c:[16,0]},
  {id:'lon',flag:'🇬🇧',name:'Londres',   tz:'Europe/London',     o:[8,0],  c:[16,30]},
  {id:'ffm',flag:'🇩🇪',name:'Fráncfort', tz:'Europe/Berlin',     o:[9,0],  c:[17,30]},
  {id:'tyo',flag:'🇯🇵',name:'Tokio',     tz:'Asia/Tokyo',        o:[9,0],  c:[15,0]},
  {id:'hkg',flag:'🇭🇰',name:'Hong Kong', tz:'Asia/Hong_Kong',    o:[9,30], c:[16,0]},
];

function _isOpen(m){
  const local=new Date(new Date().toLocaleString('en-US',{timeZone:m.tz}));
  const day=local.getDay(); if(day===0||day===6)return false;
  const mins=local.getHours()*60+local.getMinutes();
  return mins>=m.o[0]*60+m.o[1]&&mins<m.c[0]*60+m.c[1];
}
function _localTime(tz){return new Date().toLocaleTimeString('es-PY',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});}

function buildMktBar(){
  const bar=document.getElementById('mkt-bar');
  if(!bar)return;
  bar.innerHTML=MARKETS.map(m=>{
    const on=_isOpen(m);
    return `<div class="mkt-item">
      <span class="mkt-flag">${m.flag}</span>
      <span class="mkt-name">${m.name}</span>
      <span class="mkt-time" id="mt-${m.id}">${_localTime(m.tz)}</span>
      <span class="mkt-dot ${on?'dot-on':'dot-off'}"></span>
      <span class="mkt-st ${on?'mkt-on':'mkt-off'}" id="ms-${m.id}">${on?'Abierto':'Cerrado'}</span>
    </div>`;
  }).join('');
}
function tickMkts(){
  MARKETS.forEach(m=>{
    const on=_isOpen(m);
    const te=document.getElementById('mt-'+m.id);
    const se=document.getElementById('ms-'+m.id);
    if(te)te.textContent=_localTime(m.tz);
    if(se){se.textContent=on?'Abierto':'Cerrado';se.className='mkt-st '+(on?'mkt-on':'mkt-off');}
  });
}

// ── Init ──────────────────────────────────────────────────────
async function refreshAll(){
  await Promise.all([loadRates(),loadCrypto(),loadUSMarkets(),loadEconomic(),loadCommodities(),loadNews()]);
}

buildMktBar();
updateClock();
setInterval(()=>{updateClock();tickMkts();tickRefresh();_tickCds();},1000);

(async()=>{
  await refreshAll();
  setInterval(loadNews,3*60*1000);
  setInterval(()=>{loadCrypto();loadUSMarkets();},30*1000);
  setInterval(()=>{loadRates();loadCommodities();},60*1000);
  setInterval(loadEconomic,15*60*1000);
})();
